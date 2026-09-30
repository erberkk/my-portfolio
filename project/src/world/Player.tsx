import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AREAS, GRACES, LANDMARKS, SPAWN, bridgeY, inBounds, inPondWater } from './layout';
import { collide, groundAt } from './physics';
import { bamboo, dummies } from './placements';
import { input } from './input';
import { discover, getUI, live, setUI } from './store';
import { MOON_DIR } from './Environment';
import { windUniforms } from './wind';
import { sfx } from './audio';
import { ripples } from './Pond';
import {
  applyBlade, buildSamurai, pose, solveArm, SHOULDER_L, SHOULDER_R, type BladePose, type Rig,
} from './samurai';

/* ---------------- blade poses (torso space) ---------------- */

const GUARD = pose(-0.06, 0.1, 0.34, 0.05, 0.4, 1);
const RUN = pose(-0.24, 0.06, 0.02, -0.3, -0.5, -1);
const KNEEL = pose(0.0, 0.06, 0.42, 0.02, -1, 0.12);
const GUARD_POSE = pose(-0.02, 0.44, 0.4, 1, 0.22, 0.18);
const DEFLECT = pose(0.12, 0.56, 0.46, 0.75, 0.55, 0.3);
type Attack = { wind: BladePose; mid: BladePose; strike: BladePose; angle: number; tilt: number; height: number; twist: [number, number] };
const ATTACKS: Attack[] = [
  { wind: pose(-0.4, 0.34, 0.0, -1, 0.15, -0.35), mid: pose(0, 0.3, 0.52, 0, 0.06, 1), strike: pose(0.36, 0.22, 0.28, 1, -0.02, 0.4), angle: 2.6, tilt: 0.12, height: 1.3, twist: [0.6, -0.65] },
  { wind: pose(0.24, 0.66, 0.08, 0.35, 1, -0.45), mid: pose(0.02, 0.38, 0.5, -0.1, 0.1, 1), strike: pose(-0.26, -0.02, 0.4, -0.55, -0.8, 0.5), angle: 2.3, tilt: 0.8, height: 1.2, twist: [-0.4, 0.5] },
  { wind: pose(0, 0.82, 0.02, 0, 0.6, -1), mid: pose(0, 0.58, 0.46, 0, 0.35, 1), strike: pose(0, 0.12, 0.52, 0, -0.5, 1), angle: 1.7, tilt: 1.45, height: 1.0, twist: [0, 0] },
];
const T_WIND = 0.12, T_STRIKE = 0.24, T_HOLD = 0.34, T_END = 0.52;

const FWD = new THREE.Vector3(0, 0, 1);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
const blend = { pos: new THREE.Vector3(), dir: new THREE.Vector3() };

function mixPose(a: BladePose, b: BladePose, t: number, out = blend) {
  out.pos.lerpVectors(a.pos, b.pos, t);
  qa.setFromUnitVectors(FWD, a.dir);
  qb.setFromUnitVectors(FWD, b.dir);
  qc.slerpQuaternions(qa, qb, t);
  out.dir.copy(FWD).applyQuaternion(qc);
  return out;
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/* ---------------- aim assist ---------------- */

type Aim = { pos: THREE.Vector3; yaw: number; heading: number };
/**
 * Where a new swing should point: at the locked foe, else at the nearest
 * foe or target within a generous cone of where you are looking.
 */
function aimHeading(st: Aim, target: { x: number; z: number } | null) {
  if (target) return Math.atan2(target.x - st.pos.x, target.z - st.pos.z);
  const move = input.forward || input.right ? Math.atan2(
    Math.sin(st.yaw) * input.forward - Math.cos(st.yaw) * input.right,
    Math.cos(st.yaw) * input.forward + Math.sin(st.yaw) * input.right,
  ) : st.yaw;
  let best = move, bestScore = Infinity;
  const consider = (x: number, z: number, range: number, weight: number) => {
    const d = Math.hypot(x - st.pos.x, z - st.pos.z);
    if (d > range || d < 0.05) return;
    const h = Math.atan2(x - st.pos.x, z - st.pos.z);
    let a = h - move;
    a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    if (a > 1.3) return;
    const score = (a * 2 + d) * weight;
    if (score < bestScore) { bestScore = score; best = h; }
  };
  live.enemies.forEach((e) => { if (e.state !== 'dead') consider(e.x, e.z, 3.6, 0.6); });
  dummies.forEach((d) => consider(d.x, d.z, 2.8, 1));
  for (const b of bamboo) consider(b.x, b.z, 2.4, 1.2);
  return best;
}

/* ---------------- scarf + trail ---------------- */

const SCARF_N = 9;
function useScarf(rig: Rig) {
  const pts = useMemo(() => Array.from({ length: SCARF_N }, () => ({ p: new THREE.Vector3(), prev: new THREE.Vector3() })), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SCARF_N * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < SCARF_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    return g;
  }, []);
  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#c42a22', side: THREE.DoubleSide, roughness: 0.8, emissive: '#3a0604' }));
    m.frustumCulled = false;
    m.castShadow = true;
    return m;
  }, [geo]);
  const init = useRef(false);
  const a = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const back = useMemo(() => new THREE.Vector3(), []);
  const step = (dt: number, t: number, heading: number) => {
    rig.scarfAnchor.getWorldPosition(a);
    if (!init.current) { pts.forEach((p, i) => { p.p.copy(a).setY(a.y - i * 0.1); p.prev.copy(p.p); }); init.current = true; }
    back.set(-Math.sin(heading), 0, -Math.cos(heading));
    const seg = 0.12;
    pts[0].p.copy(a); pts[0].prev.copy(a);
    for (let i = 1; i < SCARF_N; i++) {
      const p = pts[i];
      const vx = (p.p.x - p.prev.x) * 0.94, vy = (p.p.y - p.prev.y) * 0.94, vz = (p.p.z - p.prev.z) * 0.94;
      p.prev.copy(p.p);
      const wind = Math.sin(t * 3 + i * 0.7) * 0.6 + 0.8;
      p.p.x += vx + (back.x * 1.2 + 0.5 * wind) * dt * dt * 12;
      p.p.y += vy - 9.8 * dt * dt * 0.5;
      p.p.z += vz + (back.z * 1.2 + Math.cos(t * 2.3 + i) * 0.3) * dt * dt * 12;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < SCARF_N; i++) {
        const p0 = pts[i - 1].p, p1 = pts[i].p;
        const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        const k = (d - seg) / d;
        p1.x -= dx * k; p1.y -= dy * k; p1.z -= dz * k;
        // Keep the cloth behind the body.
        const f = (p1.x - a.x) * -back.x + (p1.z - a.z) * -back.z;
        if (f > -0.05 && i < 4) { p1.x += back.x * (f + 0.05); p1.z += back.z * (f + 0.05); }
      }
    }
    side.set(Math.cos(heading), 0, -Math.sin(heading));
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    pts.forEach((p, i) => {
      const w = 0.07 * (1 - i / SCARF_N * 0.4);
      pos.setXYZ(i * 2, p.p.x + side.x * w, p.p.y, p.p.z + side.z * w);
      pos.setXYZ(i * 2 + 1, p.p.x - side.x * w, p.p.y, p.p.z - side.z * w);
    });
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return { mesh, step };
}

const TRAIL_N = 14;
function useTrail(rig: Rig) {
  const samples = useMemo(() => Array.from({ length: TRAIL_N }, () => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), age: 99 })), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 2 * 3), 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 2), 1));
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    return g;
  }, []);
  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: `attribute float aAlpha; varying float vA; varying float vEdge;
        void main(){ vA = aAlpha; vEdge = mod(float(gl_VertexID), 2.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float vA; varying float vEdge;
        void main(){ vec3 c = mix(vec3(1.0, 0.35, 0.3), vec3(1.0, 0.95, 0.9), vEdge); gl_FragColor = vec4(c * 2.2, vA * (0.25 + vEdge * 0.6)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    }));
    m.frustumCulled = false;
    return m;
  }, [geo]);
  const tick = (dt: number, active: boolean) => {
    for (const s of samples) s.age += dt;
    if (active) {
      const s = samples.pop()!;
      rig.base.getWorldPosition(s.a);
      rig.tip.getWorldPosition(s.b);
      s.age = 0;
      samples.unshift(s);
    }
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const al = geo.getAttribute('aAlpha') as THREE.BufferAttribute;
    samples.forEach((s, i) => {
      pos.setXYZ(i * 2, s.a.x, s.a.y, s.a.z);
      pos.setXYZ(i * 2 + 1, s.b.x, s.b.y, s.b.z);
      const alpha = Math.max(0, 1 - s.age / 0.16) * (1 - i / TRAIL_N);
      al.setX(i * 2, alpha); al.setX(i * 2 + 1, alpha);
    });
    pos.needsUpdate = true;
    al.needsUpdate = true;
  };
  return { mesh, tick };
}

/* ---------------- player ---------------- */

type Mode = 'move' | 'attack' | 'dodge' | 'kneel' | 'hurt' | 'broken' | 'dead';

export default function Player() {
  const rig = useMemo(buildSamurai, []);
  const scarf = useScarf(rig);
  const trail = useTrail(rig);
  const { camera, scene, gl } = useThree();

  const s = useRef({
    pos: new THREE.Vector3(SPAWN.x, 0, SPAWN.z),
    vel: new THREE.Vector3(),
    heading: SPAWN.heading,
    yaw: SPAWN.heading,
    pitch: 0.18,
    mode: 'move' as Mode,
    t: 0,
    attack: 0,
    queued: false,
    swingId: 0,
    dodgeDir: new THREE.Vector3(),
    phase: 0,
    speed: 0,
    area: '',
    areaTimer: 0,
    seenAreas: new Set<string>(),
    camPos: new THREE.Vector3(0, 6, 34),
    camLook: new THREE.Vector3(0, 3, 10),
    bellTimer: -1,
    deflectT: 0,
    lock: -1,
    knock: new THREE.Vector3(),
  });

  useEffect(() => {
    const st = s.current;
    st.pos.y = groundAt(st.pos.x, st.pos.z);
    scene.add(rig.root);
    live.canvas = gl.domElement;
    return () => { scene.remove(rig.root); };
  }, [scene, rig, gl]);

  const moon = useRef<THREE.DirectionalLight | undefined>(undefined);
  const tmp = useMemo(() => ({
    move: new THREE.Vector3(), target: new THREE.Vector3(), camTarget: new THREE.Vector3(), look: new THREE.Vector3(),
    poleL: new THREE.Vector3(0.6, -0.4, -0.5), poleR: new THREE.Vector3(-0.6, -0.4, -0.5),
    gripL: new THREE.Vector3(), gripR: new THREE.Vector3(), freeL: new THREE.Vector3(),
  }), []);

  useFrame((state, rawDt) => {
    const real = Math.min(rawDt, 0.05);
    live.hitstop = Math.max(0, live.hitstop - real);
    const dt = real * (live.hitstop > 0 ? 0.08 : 1);
    const st = s.current;
    const ui = getUI();
    const t = state.clock.elapsedTime;
    const pc = live.combat;
    live.camera = camera;
    const canAct = st.mode !== 'hurt' && st.mode !== 'broken' && st.mode !== 'dead';
    const playing = ui.phase === 'playing' && !ui.menu && canAct;

    if (live.teleport) {
      st.pos.set(live.teleport.x, 0, live.teleport.z);
      st.pos.y = groundAt(st.pos.x, st.pos.z);
      live.teleport = null;
      st.camPos.set(st.pos.x - Math.sin(st.yaw) * 4, st.pos.y + 2.5, st.pos.z - Math.cos(st.yaw) * 4);
    }

    /* ---- look ---- */
    // Lock-on: toggle, validate, and steer the camera toward the target.
    if (input.lock) {
      input.lock = false;
      if (st.lock >= 0) st.lock = -1;
      else {
        let best = -1, bestScore = Infinity;
        live.enemies.forEach((e, i) => {
          if (e.state === 'dead') return;
          const d = Math.hypot(e.x - st.pos.x, e.z - st.pos.z);
          if (d > 18) return;
          let a = Math.atan2(e.x - st.pos.x, e.z - st.pos.z) - st.yaw;
          a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
          if (a > 1.4) return;
          const score = a * 6 + d;
          if (score < bestScore) { bestScore = score; best = i; }
        });
        st.lock = best;
      }
    }
    const locked = st.lock >= 0 ? live.enemies[st.lock] : null;
    if (locked && (locked.state === 'dead' || Math.hypot(locked.x - st.pos.x, locked.z - st.pos.z) > 22)) st.lock = -1;
    live.lockIndex = st.lock;
    const target = st.lock >= 0 ? live.enemies[st.lock] : null;
    if (ui.phase === 'playing' && !ui.menu) {
      if (target) {
        const want = Math.atan2(target.x - st.pos.x, target.z - st.pos.z);
        let d = want - st.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        st.yaw += d * Math.min(1, real * 7);
        input.lookX = 0;
      }
      st.yaw -= input.lookX * 0.0028;
      st.pitch = Math.min(0.95, Math.max(-0.3, st.pitch + input.lookY * 0.0022));
    }
    input.lookX = input.lookY = 0;

    /* ---- actions ---- */
    const fwd = tmp.look.set(Math.sin(st.yaw), 0, Math.cos(st.yaw));
    if (playing) {
      if (input.parry) {
        input.parry = false;
        pc.parryAt = t;
        st.deflectT = 0.18;
      }
      if (input.attack) {
        input.attack = false;
        if (st.mode === 'move') {
          st.mode = 'attack'; st.t = 0; st.heading = aimHeading(st, target);
          // A staggered foe in reach gets the overhead finishing cut.
          st.attack = ui.deathblow ? 2 : 0;
          sfx.swing();
        }
        else if (st.mode === 'attack' && st.t > 0.18) st.queued = true;
      }
      if (input.dodge) {
        input.dodge = false;
        if (st.mode === 'move' || (st.mode === 'attack' && st.t > T_STRIKE)) {
          st.mode = 'dodge'; st.t = 0;
          const mv = tmp.move.set(0, 0, 0).addScaledVector(fwd, input.forward || input.stick.y).addScaledVector(new THREE.Vector3(-fwd.z, 0, fwd.x), input.right || input.stick.x);
          if (mv.lengthSq() < 0.01) mv.set(Math.sin(st.heading), 0, Math.cos(st.heading));
          st.dodgeDir.copy(mv.normalize());
          st.heading = Math.atan2(mv.x, mv.z);
          sfx.dodge();
          live.bursts.push({ x: st.pos.x, y: st.pos.y + 0.2, z: st.pos.z, n: 6, t: 0 });
        }
      }
      if (input.interact) {
        input.interact = false;
        if (ui.nearGrace) {
          st.mode = 'kneel'; st.t = 0;
          const g = GRACES.find((x) => x.id === ui.nearGrace)!;
          st.heading = Math.atan2(g.x - st.pos.x, g.z - st.pos.z);
          sfx.grace();
          if (document.pointerLockElement) document.exitPointerLock();
          setUI({ menu: ui.nearGrace });
        } else if (ui.nearBell) {
          live.bellRang = t;
          sfx.bell();
          const b = LANDMARKS.bell;
          live.bursts.push({ x: b.x, y: b.y, z: b.z, n: 60, t: 0 });
          st.bellTimer = 1.4;
        }
      }
    } else {
      input.attack = input.dodge = input.interact = false;
    }
    if (ui.menu) {
      if (st.mode !== 'kneel') { st.mode = 'kneel'; st.t = 0; }
      // Resting heals and marks this grace as the place you return to.
      pc.hp = 100; pc.posture = 0;
      const g = GRACES.find((x) => x.id === ui.menu);
      if (g) live.checkpoint = { x: g.x - 1.2, z: g.z + 1.2 };
    } else if (st.mode === 'kneel') st.mode = 'move';
    pc.guarding = playing && input.guard && (st.mode === 'move');
    pc.invulnerable = st.mode === 'dodge' && st.t > 0.02 && st.t < 0.32;
    st.deflectT = Math.max(0, st.deflectT - dt);

    /* ---- blows landing on us ---- */
    while (live.incoming.length) {
      const ev = live.incoming.shift()!;
      const away = new THREE.Vector3(st.pos.x - ev.x, 0, st.pos.z - ev.z).normalize();
      const at = new THREE.Vector3();
      rig.tip.getWorldPosition(at);
      if (ev.kind === 'deflect') {
        sfx.clang(true);
        live.bursts.push({ x: at.x, y: at.y, z: at.z, n: 26, t: 2 });
        live.hitstop = 0.1; live.shake = 0.25;
        pc.posture = Math.min(100, pc.posture + (ev.perilous ? 8 : 4));
        st.deflectT = 0.22;
        st.knock.copy(away).multiplyScalar(1.2);
      } else if (ev.kind === 'block') {
        sfx.clang(false);
        live.bursts.push({ x: at.x, y: at.y, z: at.z, n: 10, t: 2 });
        live.hitstop = 0.05; live.shake = 0.15;
        pc.posture += 24;
        pc.lastHitAt = t;
        st.knock.copy(away).multiplyScalar(2.5);
        if (pc.posture >= 100) {
          st.mode = 'broken'; st.t = 0; pc.hp -= 10; pc.posture = 60;
          sfx.hurt();
        }
      } else {
        pc.hp -= ev.dmg;
        pc.lastHitAt = t;
        pc.posture = Math.min(100, pc.posture + 12);
        live.bursts.push({ x: st.pos.x, y: st.pos.y + 1.2, z: st.pos.z, n: 14, t: 3 });
        live.hitstop = 0.08; live.shake = 0.45;
        sfx.hurt();
        st.knock.copy(away).multiplyScalar(ev.perilous ? 7 : 4.5);
        st.mode = 'hurt'; st.t = 0;
      }
      if (pc.hp <= 0 && st.mode !== 'dead') {
        pc.hp = 0; pc.dead = true;
        st.mode = 'dead'; st.t = 0;
        sfx.death();
        setUI((u) => ({ death: u.death + 1 }));
      }
    }
    if (t - pc.lastHitAt > 1.4 && st.mode !== 'broken') pc.posture = Math.max(0, pc.posture - dt * (pc.guarding ? 22 : 12));
    if (st.mode === 'hurt' && st.t > 0.4) st.mode = 'move';
    if (st.mode === 'broken' && st.t > 1.1) st.mode = 'move';
    if (st.mode === 'dead' && st.t > 3.6) {
      const cp = live.checkpoint ?? { x: SPAWN.x, z: SPAWN.z };
      st.pos.set(cp.x, groundAt(cp.x, cp.z), cp.z);
      st.camPos.set(cp.x - Math.sin(st.yaw) * 4, st.pos.y + 2.5, cp.z - Math.cos(st.yaw) * 4);
      pc.hp = 100; pc.posture = 0; pc.dead = false;
      st.mode = 'move';
    }

    if (st.bellTimer > 0) {
      st.bellTimer -= dt;
      if (st.bellTimer <= 0) setUI((u) => ({ omikuji: u.omikuji + 1 }));
    }

    /* ---- movement ---- */
    st.t += dt;
    let wantSpeed = 0;
    const move = tmp.move.set(0, 0, 0);
    if (playing && (st.mode === 'move')) {
      const f = input.forward || input.stick.y;
      const r = input.right || input.stick.x;
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      move.addScaledVector(fwd, f).addScaledVector(right, r);
      const mag = Math.min(1, move.length());
      if (mag > 0.05) {
        move.normalize();
        wantSpeed = (pc.guarding ? 1.8 : input.sprint || (input.stick.active && mag > 0.95) ? 7.4 : 4.3) * mag;
        // Locked on (and not sprinting), keep facing the foe and strafe around it.
        const want = target && !input.sprint ? Math.atan2(target.x - st.pos.x, target.z - st.pos.z) : Math.atan2(move.x, move.z);
        let d = want - st.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        st.heading += d * Math.min(1, dt * 12);
      }
    }
    const wading = inPondWater(st.pos.x, st.pos.z) && bridgeY(st.pos.x, st.pos.z) === null;
    if (wading) wantSpeed *= 0.55;
    st.speed += (wantSpeed - st.speed) * Math.min(1, dt * 10);

    const dir = new THREE.Vector3(Math.sin(st.heading), 0, Math.cos(st.heading));
    const next = st.pos.clone();
    if (st.mode === 'move') next.addScaledVector(dir, st.speed * dt);
    if (st.mode === 'attack') {
      // A short step into each cut.
      const lunge = st.t > T_WIND && st.t < T_STRIKE + 0.05 ? 3.2 : 0;
      next.addScaledVector(dir, lunge * dt);
      st.speed *= 0.8;
    }
    if (st.mode === 'dodge') {
      const k = st.t < 0.32 ? 11 * (1 - st.t / 0.4) : 0;
      next.addScaledVector(st.dodgeDir, k * dt);
      if (st.t > 0.42) st.mode = 'move';
    }
    next.addScaledVector(st.knock, dt);
    st.knock.multiplyScalar(Math.max(0, 1 - dt * 7));
    collide(next, 0.34);
    if (inBounds(next.x, next.z)) { st.pos.x = next.x; st.pos.z = next.z; }
    const gy = groundAt(st.pos.x, st.pos.z);
    st.pos.y += (gy - st.pos.y) * Math.min(1, dt * 16);

    /* ---- attack timeline ---- */
    live.swing = null;
    if (st.mode === 'attack') {
      const a = ATTACKS[st.attack];
      if (st.t >= T_WIND && st.t <= T_STRIKE + 0.02) {
        live.swing = {
          id: st.swingId, x: st.pos.x, z: st.pos.z, dirX: Math.sin(st.heading), dirZ: Math.cos(st.heading),
          angle: a.angle, reach: 2.55, y: a.height, tilt: a.tilt,
        };
      }
      if (st.t >= T_HOLD && st.queued) {
        st.queued = false;
        st.attack = (st.attack + 1) % ATTACKS.length;
        st.t = 0;
        st.swingId++;
        st.heading = aimHeading(st, target);
        sfx.swing();
      } else if (st.t >= T_END) {
        st.mode = 'move';
        st.attack = 0;
        st.swingId++;
      }
    }

    /* ---- pose ---- */
    const moving = st.mode === 'move' ? Math.min(1, st.speed / 4.3) : 0;
    const sprint = Math.max(0, (st.speed - 4.5) / 3);
    st.phase += dt * (4 + st.speed * 1.55) * (moving > 0.05 ? 1 : 0);
    const sw = Math.sin(st.phase);

    rig.root.position.copy(st.pos);
    rig.root.rotation.y = st.heading;
    rig.body.position.y = Math.abs(Math.cos(st.phase)) * 0.06 * moving;
    rig.body.rotation.x = 0;
    rig.torso.rotation.set(0.1 * moving + 0.18 * sprint, 0, 0);
    rig.head.rotation.set(-0.08 * moving, 0, 0);

    // Legs: walk cycle by default
    let tl = -sw * 0.65 * moving, tr = sw * 0.65 * moving;
    let sl = Math.max(0, Math.sin(st.phase + 1.2)) * 1.1 * moving + 0.05, sr = Math.max(0, Math.sin(st.phase + 1.2 + Math.PI)) * 1.1 * moving + 0.05;
    let bodyY = rig.body.position.y;

    let blade: BladePose = mixPose(GUARD, RUN, clamp01(moving * 1.4));
    let twoHands = moving < 0.5;
    let twist = 0;

    if (st.mode === 'attack') {
      const a = ATTACKS[st.attack];
      const cur = mixPose(GUARD, RUN, 0);
      if (st.t < T_WIND) blade = mixPose(cur, a.wind, ease(st.t / T_WIND), { pos: new THREE.Vector3(), dir: new THREE.Vector3() });
      else if (st.t < T_STRIKE) {
        const k = (st.t - T_WIND) / (T_STRIKE - T_WIND);
        blade = k < 0.5
          ? mixPose(a.wind, a.mid, ease(k * 2), { pos: new THREE.Vector3(), dir: new THREE.Vector3() })
          : mixPose(a.mid, a.strike, ease((k - 0.5) * 2), { pos: new THREE.Vector3(), dir: new THREE.Vector3() });
      } else if (st.t < T_HOLD) blade = a.strike;
      else blade = mixPose(a.strike, GUARD, ease(clamp01((st.t - T_HOLD) / (T_END - T_HOLD))), { pos: new THREE.Vector3(), dir: new THREE.Vector3() });
      const tw = st.t < T_WIND ? ease(st.t / T_WIND) * a.twist[0]
        : st.t < T_STRIKE ? a.twist[0] + (a.twist[1] - a.twist[0]) * ease((st.t - T_WIND) / (T_STRIKE - T_WIND))
          : a.twist[1] * (1 - clamp01((st.t - T_HOLD) / (T_END - T_HOLD)));
      twist = tw;
      twoHands = true;
      tl = -0.45; sl = 0.4; tr = 0.35; sr = 0.25; bodyY = -0.06;
      rig.torso.rotation.x = 0.12 + (st.t > T_WIND && st.t < T_HOLD ? 0.12 : 0);
    }
    if (st.mode === 'dodge') {
      const k = Math.sin(clamp01(st.t / 0.42) * Math.PI);
      tl = -0.9 * k; sl = 1.3 * k; tr = 0.4 * k; sr = 1.1 * k; bodyY = -0.25 * k;
      rig.torso.rotation.x = 0.55 * k;
      blade = RUN; twoHands = false;
    }
    if (st.mode === 'kneel') {
      const k = ease(clamp01(st.t / 0.6));
      tl = -1.45 * k; sl = 1.5 * k; tr = -0.05 * k; sr = 1.5 * k; bodyY = -0.4 * k;
      rig.torso.rotation.x = 0.12 * k;
      rig.head.rotation.x = 0.25 * k;
      blade = mixPose(GUARD, KNEEL, k, { pos: new THREE.Vector3(), dir: new THREE.Vector3() });
      twoHands = true;
    }
    if (st.mode === 'move' && (pc.guarding || st.deflectT > 0)) {
      blade = st.deflectT > 0 ? mixPose(GUARD_POSE, DEFLECT, Math.sin((st.deflectT / 0.22) * Math.PI), { pos: new THREE.Vector3(), dir: new THREE.Vector3() }) : GUARD_POSE;
      twoHands = true;
      tl = -0.3 + tl * 0.4; sl = 0.35; tr = 0.3 + tr * 0.4; sr = 0.25; bodyY = -0.05;
    }
    if (st.mode === 'hurt') {
      const k = Math.sin(clamp01(st.t / 0.4) * Math.PI);
      rig.torso.rotation.x = -0.35 * k; bodyY = -0.05 * k;
      blade = GUARD; twoHands = false;
    }
    if (st.mode === 'broken') {
      rig.torso.rotation.x = -0.25 + Math.sin(t * 6) * 0.04; bodyY = -0.12;
      tl = -0.5; sl = 0.8; tr = 0.2; sr = 0.5;
      blade = mixPose(GUARD, KNEEL, 0.6, { pos: new THREE.Vector3(), dir: new THREE.Vector3() });
    }
    if (st.mode === 'dead') {
      const k = ease(clamp01(st.t / 1.2));
      tl = -1.45 * k; sl = 1.5 * k; tr = -1.2 * k; sr = 1.5 * k; bodyY = -0.45 * k;
      rig.torso.rotation.x = 0.7 * k; rig.head.rotation.x = 0.4 * k;
      blade = KNEEL; twoHands = false;
    }
    rig.body.position.y = bodyY;
    rig.torso.rotation.y = twist;
    rig.thighL.rotation.x = tl; rig.shinL.rotation.x = sl;
    rig.thighR.rotation.x = tr; rig.shinR.rotation.x = sr;

    applyBlade(rig, blade);
    // Hands on the grip: right by the guard, left toward the pommel.
    tmp.gripR.copy(blade.pos).addScaledVector(blade.dir, -0.05);
    tmp.gripL.copy(blade.pos).addScaledVector(blade.dir, -0.2);
    solveArm(rig.upperR, rig.foreR, SHOULDER_R, tmp.gripR, tmp.poleR);
    if (twoHands) solveArm(rig.upperL, rig.foreL, SHOULDER_L, tmp.gripL, tmp.poleL);
    else {
      tmp.freeL.set(0.3, 0.02 + Math.max(0, sw) * 0.08, sw * 0.28 * moving + 0.05);
      solveArm(rig.upperL, rig.foreL, SHOULDER_L, tmp.freeL, tmp.poleL);
    }
    rig.root.updateMatrixWorld(true);
    scarf.step(dt, t, st.heading);
    trail.tick(dt, st.mode === 'attack' && st.t > T_WIND * 0.6 && st.t < T_HOLD);

    /* ---- shared state ---- */
    live.player.x = st.pos.x; live.player.y = st.pos.y; live.player.z = st.pos.z;
    live.player.heading = st.heading; live.player.speed = st.speed;
    live.camYaw = st.yaw;
    windUniforms.uTime.value = t;
    windUniforms.uPlayer.value.set(st.pos.x, st.pos.y, st.pos.z);

    /* ---- places ---- */
    st.areaTimer -= dt;
    if (st.areaTimer <= 0 && ui.phase === 'playing') {
      st.areaTimer = 0.25;
      const area = AREAS.find((a) => a.test(st.pos.x, st.pos.z));
      if (area && area.id !== st.area) {
        st.area = area.id;
        if (!st.seenAreas.has(area.id)) {
          st.seenAreas.add(area.id);
          setUI({ area: { name: area.name, kanji: area.kanji, key: Date.now() } });
          sfx.discover();
        }
      }
      let near: typeof ui.nearGrace = null;
      for (const g of GRACES) {
        const d = Math.hypot(g.x - st.pos.x, g.z - st.pos.z);
        if (d < 2.4) near = g.id;
        if (d < 3.2 && discover(g.id)) {
          setUI({ banner: { title: 'Site of Grace Discovered', kanji: '恩寵', key: Date.now() } });
          sfx.grace();
        }
      }
      const b = LANDMARKS.bell;
      const nearBell = Math.hypot(b.x - st.pos.x, -117.3 + 1.2 - st.pos.z) < 2.2;
      setUI({ nearGrace: near, nearBell });
    }
    if (wading && Math.random() < dt * 2) ripples.add(st.pos.x, st.pos.z, 0.2, t);

    /* ---- camera ---- */
    const light = moon.current ??= scene.getObjectByName('moonlight') as THREE.DirectionalLight | undefined;
    if (light) {
      light.position.set(st.pos.x + MOON_DIR.x * 40, st.pos.y + MOON_DIR.y * 40, st.pos.z + MOON_DIR.z * 40);
      light.target.position.copy(st.pos);
      light.target.updateMatrixWorld();
    }

    const k = 1 - Math.exp(-dt * (ui.phase === 'title' ? 1.5 : 9));
    if (ui.phase === 'title') {
      // Slow establishing drift, looking up the path through the gate.
      tmp.camTarget.set(Math.sin(t * 0.07) * 2.2, 2.4 + Math.sin(t * 0.13) * 0.25, 33.5);
      tmp.target.set(0, 4.4, 4);
    } else if (ui.menu) {
      // Cinematic side view of the kneeling samurai.
      const side = new THREE.Vector3(Math.cos(st.heading), 0, -Math.sin(st.heading));
      tmp.camTarget.copy(st.pos).addScaledVector(side, 2.6).addScaledVector(dir, 1.4).add(new THREE.Vector3(0, 1.3, 0));
      tmp.target.copy(st.pos).add(new THREE.Vector3(0, 0.9, 0)).addScaledVector(dir, 0.6);
    } else {
      const dist = (target ? 5.3 : 4.6) + sprint * 0.8 - (st.mode === 'attack' ? 0.3 : 0);
      tmp.target.copy(st.pos).add(new THREE.Vector3(0, 1.5, 0));
      // Frame both fighters: look a third of the way toward the foe.
      if (target) tmp.target.lerp(new THREE.Vector3(target.x, target.y - 0.9, target.z), 0.32);
      tmp.camTarget.set(
        tmp.target.x - Math.sin(st.yaw) * Math.cos(st.pitch) * dist,
        tmp.target.y + Math.sin(st.pitch) * dist,
        tmp.target.z - Math.cos(st.yaw) * Math.cos(st.pitch) * dist,
      );
      const floor = groundAt(tmp.camTarget.x, tmp.camTarget.z) + 0.45;
      if (tmp.camTarget.y < floor) tmp.camTarget.y = floor;
    }
    st.camPos.lerp(tmp.camTarget, k);
    st.camLook.lerp(tmp.target, Math.min(1, k * 1.4));
    camera.position.copy(st.camPos);
    if (live.shake > 0) {
      live.shake = Math.max(0, live.shake - real * 1.8);
      const a = live.shake * 0.12;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    camera.lookAt(st.camLook);
  });

  return (
    <>
      <primitive object={scarf.mesh} />
      <primitive object={trail.mesh} />
    </>
  );
}

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyBlade, buildSamurai, pose, solveArm, SHOULDER_L, SHOULDER_R, type BladePose, type Rig } from './samurai';
import { collide, groundAt } from './physics';
import { hitBy } from './combat';
import { getUI, live, setUI } from './store';
import { sfx } from './audio';

/** Ink ronin guard the bamboo grove and spar in the training yard. The main path stays peaceful. */
const SPAWNS = [
  { x: -15.5, z: -8, aggro: 8 },
  { x: -18, z: -22, aggro: 8 },
  { x: 14.5, z: 10.5, aggro: 5.5 },
];

type State = 'idle' | 'chase' | 'windup' | 'recover' | 'guard' | 'flinch' | 'stagger' | 'dead' | 'return';

type Enemy = {
  rig: Rig;
  home: { x: number; z: number; aggro: number };
  pos: THREE.Vector3;
  heading: number;
  state: State;
  t: number;
  hp: number;
  posture: number;
  lastHurt: number;
  cooldown: number;
  perilous: boolean;
  struck: boolean;
  lastSwing: number;
  phase: number;
  respawnAt: number;
};

const STANCE = pose(-0.05, 0.12, 0.34, 0.05, 0.45, 1);
const CHASE = pose(-0.2, 0.08, 0.2, -0.1, 0.1, 1);
const RAISE = pose(0.05, 0.86, 0.02, 0.1, 0.6, -1);
const THRUST_BACK = pose(-0.2, 0.2, -0.05, 0.05, 0.05, 1);
const CUT = pose(-0.2, 0.05, 0.52, -0.35, -0.55, 1);
const THRUST = pose(-0.05, 0.25, 0.75, 0, 0.05, 1);
const GUARD = pose(-0.02, 0.42, 0.38, 1, 0.25, 0.2);
const LOW = pose(0.1, -0.1, 0.3, 0.3, -1, 0.2);

const FWD = new THREE.Vector3(0, 0, 1);
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
function mix(a: BladePose, b: BladePose, t: number): BladePose {
  qa.setFromUnitVectors(FWD, a.dir);
  qb.setFromUnitVectors(FWD, b.dir);
  qa.slerp(qb, t);
  return { pos: a.pos.clone().lerp(b.pos, t), dir: FWD.clone().applyQuaternion(qa) };
}
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const c01 = (t: number) => Math.min(1, Math.max(0, t));

const WINDUP = 0.6, PERIL_WINDUP = 0.95, ACTIVE = 0.12, REACH = 2.3;

export default function Enemies() {
  const { scene } = useThree();
  const enemies = useMemo<Enemy[]>(() => SPAWNS.map((h) => ({
    rig: buildSamurai('ronin'),
    home: h,
    pos: new THREE.Vector3(h.x, groundAt(h.x, h.z), h.z),
    heading: Math.random() * Math.PI * 2,
    state: 'idle', t: 0, hp: 100, posture: 0, lastHurt: -10, cooldown: 1,
    perilous: false, struck: false, lastSwing: -1, phase: Math.random() * 10, respawnAt: 0,
  })), []);

  useEffect(() => {
    enemies.forEach((e) => scene.add(e.rig.root));
    live.enemies = enemies.map(() => ({ x: 0, y: 0, z: 0, sx: 0, sy: 0, cx: 0, cy: 0, visible: false, hp: 100, posture: 0, state: 'idle', engaged: false, perilous: false }));
    return () => enemies.forEach((e) => scene.remove(e.rig.root));
  }, [enemies, scene]);

  const tmp = useMemo(() => ({ proj: new THREE.Vector3(), gl: new THREE.Vector3(), gr: new THREE.Vector3(), poleL: new THREE.Vector3(0.6, -0.4, -0.5), poleR: new THREE.Vector3(-0.6, -0.4, -0.5) }), []);

  useFrame((state, rawDt) => {
    const now = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 0.05) * (live.hitstop > 0 ? 0.08 : 1);
    const ui = getUI();
    const active = ui.phase === 'playing' && !ui.menu;
    const pl = live.player;
    const pc = live.combat;
    let anyEngaged = false, anyStaggerNear = false;

    enemies.forEach((e, i) => {
      e.t += dt;
      const dx = pl.x - e.pos.x, dz = pl.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      const toPlayer = Math.atan2(dx, dz);
      const face = (target: number, rate: number) => {
        let d = target - e.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        e.heading += d * Math.min(1, dt * rate);
      };
      const homeD = Math.hypot(e.home.x - e.pos.x, e.home.z - e.pos.z);
      const canFight = active && !pc.dead;

      // Recover posture when left alone for a moment.
      if (now - e.lastHurt > 1.6 && e.state !== 'stagger') e.posture = Math.max(0, e.posture - dt * 14);

      /* ---- the player's blade ---- */
      const sw = live.swing;
      if (sw && sw.id !== e.lastSwing && e.state !== 'dead' && hitBy(e.pos.x, e.pos.z, 0.55)) {
        e.lastSwing = sw.id;
        e.lastHurt = now;
        const at = { x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z };
        if (e.state === 'stagger') {
          // 忍殺 — the deathblow.
          e.state = 'dead'; e.t = 0; e.respawnAt = now + 28;
          live.bursts.push({ ...at, n: 70, t: 3 }, { ...at, n: 20, t: 2 });
          live.hitstop = 0.18; live.shake = 0.5;
          sfx.deathblow();
          setUI((u) => ({ shinobi: u.shinobi + 1 }));
        } else if (e.state === 'guard' || (e.state === 'chase' && Math.random() < 0.4)) {
          e.state = 'guard'; e.t = 0;
          e.posture += 14;
          live.bursts.push({ ...at, n: 10, t: 2 });
          live.hitstop = 0.05;
          sfx.clang(false);
        } else {
          e.hp -= 25;
          e.posture += 10;
          live.bursts.push({ ...at, n: 16, t: 3 });
          live.hitstop = 0.07; live.shake = 0.2;
          sfx.hurt();
          if (e.state !== 'windup' || !e.perilous) { e.state = 'flinch'; e.t = 0; }
        }
        if (e.state !== 'dead' && (e.posture >= 100 || e.hp <= 0)) {
          e.state = 'stagger'; e.t = 0; e.posture = 100;
          sfx.clang(true);
        }
      }

      /* ---- behaviour ---- */
      let move = 0;
      switch (e.state) {
        case 'idle':
          e.heading += Math.sin(now * 0.4 + i) * dt * 0.3;
          if (canFight && dist < e.home.aggro) { e.state = 'chase'; e.t = 0; e.cooldown = 0.6; }
          break;
        case 'return':
          face(Math.atan2(e.home.x - e.pos.x, e.home.z - e.pos.z), 6);
          move = 2.6;
          if (homeD < 0.6) { e.state = 'idle'; e.hp = 100; e.posture = 0; }
          if (canFight && dist < e.home.aggro * 0.7) e.state = 'chase';
          break;
        case 'chase':
          face(toPlayer, 7);
          e.cooldown -= dt;
          if (!canFight || homeD > 16 || dist > e.home.aggro * 2.2) { e.state = 'return'; break; }
          if (dist > 2.0) move = dist > 5 ? 4.2 : 3;
          else if (dist < 1.4) move = -1.5;
          else {
            // Circle a little while waiting to strike.
            e.pos.x += Math.cos(e.heading) * dt * 0.9 * Math.sin(now * 0.8 + i);
            e.pos.z -= Math.sin(e.heading) * dt * 0.9 * Math.sin(now * 0.8 + i);
          }
          if (dist < REACH + 0.2 && e.cooldown <= 0) {
            e.state = 'windup'; e.t = 0; e.struck = false;
            e.perilous = Math.random() < 0.3;
            if (e.perilous) { setUI((u) => ({ perilous: u.perilous + 1 })); sfx.warn(); }
          }
          break;
        case 'windup': {
          const W = e.perilous ? PERIL_WINDUP : WINDUP;
          if (e.t < W * 0.7) face(toPlayer, 8);
          if (e.t > W - 0.05 && e.t < W + ACTIVE) move = e.perilous ? 9 : 5; // lunge
          if (!e.struck && e.t >= W) {
            e.struck = true;
            const inFront = Math.cos(toPlayer - e.heading) > 0.35;
            if (dist < REACH && inFront && canFight && !pc.invulnerable) {
              const parried = now - pc.parryAt < 0.24;
              const kind = parried ? 'deflect' : pc.guarding && !e.perilous ? 'block' : 'hit';
              live.incoming.push({ kind, dmg: e.perilous ? 38 : 22, x: e.pos.x, z: e.pos.z, perilous: e.perilous });
              if (kind === 'deflect') {
                e.posture += e.perilous ? 40 : 26;
                e.lastHurt = now;
                e.state = 'recover'; e.t = -0.35; // knocked off balance
                if (e.posture >= 100) { e.state = 'stagger'; e.t = 0; e.posture = 100; }
              }
            }
          }
          if (e.state === 'windup' && e.t >= W + ACTIVE + 0.05) { e.state = 'recover'; e.t = 0; }
          break;
        }
        case 'recover':
          if (e.t > 0.55) { e.state = 'chase'; e.t = 0; e.cooldown = 0.7 + Math.random() * 1.2; }
          break;
        case 'guard':
          face(toPlayer, 10);
          if (e.t > 0.6) { e.state = 'chase'; e.t = 0; e.cooldown = Math.min(e.cooldown, 0.25); }
          break;
        case 'flinch':
          move = -1.2;
          if (e.t > 0.3) { e.state = 'chase'; e.t = 0; e.cooldown = 0.3 + Math.random() * 0.5; }
          break;
        case 'stagger':
          if (e.t > 2.6) { e.state = 'chase'; e.t = 0; e.posture = 50; e.hp = Math.max(e.hp, 30); e.cooldown = 0.5; }
          break;
        case 'dead':
          if (now > e.respawnAt) {
            e.state = 'idle'; e.t = 0; e.hp = 100; e.posture = 0;
            e.pos.set(e.home.x, groundAt(e.home.x, e.home.z), e.home.z);
          }
          break;
      }

      if (move !== 0) {
        e.pos.x += Math.sin(e.heading) * move * dt;
        e.pos.z += Math.cos(e.heading) * move * dt;
      }
      // Don't walk through the samurai, or the world.
      if (e.state !== 'dead' && dist < 0.8 && dist > 0.001) {
        e.pos.x -= (dx / dist) * (0.8 - dist);
        e.pos.z -= (dz / dist) * (0.8 - dist);
      }
      collide(e.pos, 0.34);
      e.pos.y += (groundAt(e.pos.x, e.pos.z) - e.pos.y) * Math.min(1, dt * 14);

      /* ---- pose ---- */
      const r = e.rig;
      e.phase += dt * (move !== 0 ? 4 + Math.abs(move) * 1.5 : 0);
      const walk = Math.min(1, Math.abs(move) / 3);
      const s = Math.sin(e.phase);
      let blade: BladePose = e.state === 'chase' || e.state === 'return' ? mix(STANCE, CHASE, walk) : STANCE;
      let tl = -s * 0.6 * walk, tr = s * 0.6 * walk, sl = Math.max(0, Math.sin(e.phase + 1.2)) * walk + 0.05, sr = Math.max(0, Math.sin(e.phase + 4.3)) * walk + 0.05;
      let bodyY = 0, lean = 0.08 * walk, twist = 0;
      let visible = true, scale = 1;

      if (e.state === 'windup') {
        const W = e.perilous ? PERIL_WINDUP : WINDUP;
        if (e.perilous) {
          // A thrust: draw back, then lunge.
          blade = e.t < W ? mix(STANCE, THRUST_BACK, ease(c01(e.t / (W * 0.7)))) : mix(THRUST_BACK, THRUST, ease(c01((e.t - W) / ACTIVE)));
          lean = e.t < W ? -0.1 : 0.35;
        } else {
          blade = e.t < W ? mix(STANCE, RAISE, ease(c01(e.t / (W * 0.75)))) : mix(RAISE, CUT, ease(c01((e.t - W) / ACTIVE)));
          lean = e.t < W ? -0.08 : 0.3;
          twist = e.t < W ? 0.25 : -0.3;
        }
        tl = -0.45; sl = 0.4; tr = 0.35; sr = 0.25; bodyY = -0.06;
      } else if (e.state === 'recover') {
        blade = mix(e.perilous ? THRUST : CUT, STANCE, ease(c01(e.t / 0.55)));
        if (e.t < 0) { lean = -0.3; blade = mix(STANCE, RAISE, 0.4); }
        tl = -0.3; sl = 0.3; tr = 0.3; sr = 0.2;
      } else if (e.state === 'guard') {
        blade = GUARD; tl = -0.3; sl = 0.35; tr = 0.35; sr = 0.25; bodyY = -0.05;
      } else if (e.state === 'flinch') {
        lean = -0.35 * Math.sin(c01(e.t / 0.3) * Math.PI);
      } else if (e.state === 'stagger') {
        blade = LOW; lean = -0.25 + Math.sin(now * 3) * 0.05; bodyY = -0.15; tl = -0.6; sl = 0.9; tr = 0.2; sr = 0.6;
      } else if (e.state === 'dead') {
        blade = LOW;
        const k = c01(e.t / 1.4);
        bodyY = -0.5 * k; lean = 0.6 * k; tl = -1.4 * k; sl = 1.5 * k; tr = -1.2 * k; sr = 1.5 * k;
        scale = 1 - c01((e.t - 0.8) / 1.2);
        visible = scale > 0.01;
      }

      r.root.visible = visible;
      r.root.position.copy(e.pos);
      r.root.rotation.y = e.heading;
      r.root.scale.setScalar(Math.max(0.001, scale));
      r.body.position.y = bodyY + Math.abs(Math.cos(e.phase)) * 0.05 * walk;
      r.torso.rotation.set(lean, twist, 0);
      r.thighL.rotation.x = tl; r.shinL.rotation.x = sl;
      r.thighR.rotation.x = tr; r.shinR.rotation.x = sr;
      applyBlade(r, blade);
      tmp.gr.copy(blade.pos).addScaledVector(blade.dir, -0.05);
      tmp.gl.copy(blade.pos).addScaledVector(blade.dir, -0.2);
      solveArm(r.upperR, r.foreR, SHOULDER_R, tmp.gr, tmp.poleR);
      solveArm(r.upperL, r.foreL, SHOULDER_L, tmp.gl, tmp.poleL);

      /* ---- HUD snapshot ---- */
      const engaged = e.state !== 'idle' && e.state !== 'dead' && e.state !== 'return' && dist < 14;
      anyEngaged ||= engaged;
      if (e.state === 'stagger' && dist < REACH + 0.4) anyStaggerNear = true;
      const snap = live.enemies[i];
      if (snap) {
        snap.x = e.pos.x; snap.y = e.pos.y + 2.25 * scale; snap.z = e.pos.z;
        // Screen position (0..1) for the HUD bars.
        tmp.proj.set(snap.x, snap.y, snap.z).project(state.camera);
        snap.sx = tmp.proj.x * 0.5 + 0.5; snap.sy = -tmp.proj.y * 0.5 + 0.5; snap.visible = tmp.proj.z < 1;
        tmp.proj.set(e.pos.x, e.pos.y + 1.25, e.pos.z).project(state.camera);
        snap.cx = tmp.proj.x * 0.5 + 0.5; snap.cy = -tmp.proj.y * 0.5 + 0.5;
        snap.hp = Math.max(0, e.hp); snap.posture = Math.min(100, e.posture);
        snap.state = e.state; snap.engaged = engaged;
        snap.perilous = e.state === 'windup' && e.perilous && e.t < PERIL_WINDUP;
      }
    });

    setUI({ combat: anyEngaged, deathblow: anyStaggerNear });
  });

  return null;
}

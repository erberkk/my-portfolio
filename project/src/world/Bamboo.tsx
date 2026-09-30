import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bamboo, rng } from './placements';
import { hitBy } from './combat';
import { live, setUI } from './store';
import { addWind } from './wind';
import { sfx } from './audio';

const LEAVES_PER = 9;
const FALLERS = 14;
const REGROW = 16;

function stalkGeometry() {
  // Unit height; the node rings are baked in as darker vertex colours.
  const g = new THREE.CylinderGeometry(1, 1, 1, 7, 40, false);
  g.translate(0, 0.5, 0);
  const pos = g.getAttribute('position');
  const col: number[] = [];
  const green = new THREE.Color('#58764a'), node = new THREE.Color('#2f4429'), top = new THREE.Color('#7e9a5c');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ring = Math.abs(((y * 40) % 5) - 0) < 0.6 ? 1 : 0;
    const c = green.clone().lerp(top, y * 0.6).lerp(node, ring * 0.8);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.09, 0.35, 0, 0.75);
  s.quadraticCurveTo(-0.09, 0.35, 0, 0);
  const g = new THREE.ShapeGeometry(s, 3);
  g.rotateX(-Math.PI / 2 + 0.5);
  return g;
}

type State = { cutAt: number; cutH: number; lastSwing: number };

export default function Bamboo() {
  const r = useMemo(() => rng(3), []);
  const { stalks, leaves, fallers, states, leafBase, falls } = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true });
    const geo = stalkGeometry();
    const stalks = new THREE.InstancedMesh(geo, addWind(mat.clone(), { height: 1, sway: 0.25 }), bamboo.length);
    stalks.receiveShadow = true;
    const fallers = new THREE.InstancedMesh(geo, mat, FALLERS);
    const leafMat = addWind(new THREE.MeshStandardMaterial({ color: '#4f7a3e', roughness: 0.8, side: THREE.DoubleSide, emissive: '#0d1a08' }), { height: 0.8, sway: 0.35 });
    const leaves = new THREE.InstancedMesh(leafGeometry(), leafMat, bamboo.length * LEAVES_PER);
    const leafBase: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const rr = rng(17);
    bamboo.forEach((b, i) => {
      const axis = new THREE.Vector3(Math.sin(b.leanDir), 0, -Math.cos(b.leanDir));
      m.compose(p.set(b.x, b.y, b.z), q.setFromAxisAngle(axis, b.lean), s.set(b.r, b.h, b.r));
      stalks.setMatrixAt(i, m);
      for (let k = 0; k < LEAVES_PER; k++) {
        const y = b.h * (0.62 + rr() * 0.4);
        const lx = b.x + Math.cos(b.leanDir) * b.lean * y, lz = b.z + Math.sin(b.leanDir) * b.lean * y;
        q.setFromEuler(e.set(rr() * 0.6 - 0.3, rr() * Math.PI * 2, rr() * 0.4));
        const sc = 0.9 + rr() * 0.8;
        m.compose(p.set(lx, b.y + y, lz), q, s.set(sc, sc, sc));
        leafBase.push(m.clone());
        leaves.setMatrixAt(i * LEAVES_PER + k, m);
      }
    });
    leaves.computeBoundingSphere();
    const states: State[] = bamboo.map(() => ({ cutAt: -1, cutH: 0, lastSwing: -1 }));
    const falls = Array.from({ length: FALLERS }, () => ({
      active: false, t: 0, pivot: new THREE.Vector3(), axis: new THREE.Vector3(), len: 0, rad: 0, lean: new THREE.Quaternion(), slide: new THREE.Vector3(),
    }));
    return { stalks, leaves, fallers, states, leafBase, falls };
  }, []);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const q2 = useMemo(() => new THREE.Quaternion(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  const nextFaller = useRef(0);

  const leanQuat = (i: number, out: THREE.Quaternion) => {
    const b = bamboo[i];
    const axis = new THREE.Vector3(Math.sin(b.leanDir), 0, -Math.cos(b.leanDir));
    return out.setFromAxisAngle(axis, b.lean);
  };

  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const now = st.clock.elapsedTime;
    let dirty = false, leafDirty = false;

    // New cuts
    const sw = live.swing;
    if (sw) {
      let cuts = 0;
      for (let i = 0; i < bamboo.length && cuts < 3; i++) {
        const b = bamboo[i], stt = states[i];
        if (stt.cutAt >= 0 || stt.lastSwing === sw.id) continue;
        if (!hitBy(b.x, b.z, 0.25)) continue;
        stt.lastSwing = sw.id;
        stt.cutAt = now;
        stt.cutH = 0.9 + r() * 0.5;
        cuts++;
        const f = falls[nextFaller.current];
        nextFaller.current = (nextFaller.current + 1) % FALLERS;
        f.active = true;
        f.t = 0;
        f.len = b.h - stt.cutH;
        f.rad = b.r;
        f.pivot.set(b.x, b.y + stt.cutH, b.z);
        // Fall away from the samurai, along the swing.
        const away = new THREE.Vector3(b.x - sw.x, 0, b.z - sw.z).normalize().multiplyScalar(0.6).add(new THREE.Vector3(sw.dirZ, 0, -sw.dirX).multiplyScalar(0.4)).normalize();
        f.axis.set(away.z, 0, -away.x);
        f.slide.copy(away);
        leanQuat(i, f.lean);
        for (let k = 0; k < LEAVES_PER; k++) leaves.setMatrixAt(i * LEAVES_PER + k, zero);
        leafDirty = true;
        live.bursts.push({ x: b.x, y: b.y + b.h * 0.8, z: b.z, n: 18, t: 1 });
      }
      if (cuts) { sfx.cut(); setUI((u) => ({ cuts: u.cuts + cuts })); }
    }

    // Stumps regrow after a while.
    for (let i = 0; i < bamboo.length; i++) {
      const b = bamboo[i], stt = states[i];
      if (stt.cutAt < 0) continue;
      const age = now - stt.cutAt;
      let h = stt.cutH;
      if (age > REGROW) {
        const g = Math.min(1, (age - REGROW) / 2.5);
        h = stt.cutH + (b.h - stt.cutH) * g * g;
        if (g >= 1) {
          stt.cutAt = -1;
          for (let k = 0; k < LEAVES_PER; k++) leaves.setMatrixAt(i * LEAVES_PER + k, leafBase[i * LEAVES_PER + k]);
          leafDirty = true;
        }
      }
      leanQuat(i, q);
      m.compose(p.set(b.x, b.y, b.z), q, s.set(b.r, h, b.r));
      stalks.setMatrixAt(i, m);
      dirty = true;
    }
    if (dirty) stalks.instanceMatrix.needsUpdate = true;
    if (leafDirty) leaves.instanceMatrix.needsUpdate = true;

    // Falling tops
    for (let k = 0; k < FALLERS; k++) {
      const f = falls[k];
      if (!f.active) { fallers.setMatrixAt(k, zero); continue; }
      f.t += dt;
      const tip = Math.min(Math.PI / 2 - 0.08, 0.35 * f.t * f.t * 3.2 + f.t * 0.2);
      q2.setFromAxisAngle(f.axis, tip);
      q.copy(q2).multiply(f.lean);
      const slide = Math.min(0.35, f.t * 0.8);
      p.copy(f.pivot).addScaledVector(f.slide, slide);
      p.y -= Math.min(f.pivot.y - 0.2, Math.max(0, f.t - 0.6) * 0.8);
      const sink = Math.max(0, f.t - 4.5);
      const sc = Math.max(0, 1 - sink);
      m.compose(p, q, s.set(f.rad * sc, f.len * sc, f.rad * sc));
      fallers.setMatrixAt(k, m);
      if (sc <= 0) f.active = false;
    }
    fallers.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <primitive object={stalks} />
      <primitive object={leaves} />
      <primitive object={fallers} />
    </>
  );
}

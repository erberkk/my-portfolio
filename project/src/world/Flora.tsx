import { useMemo } from 'react';
import * as THREE from 'three';
import { heightAt, pathX, POND, STAIRS_END, STAIRS_START, LANDMARKS } from './layout';
import { rng } from './placements';
import { addWind } from './wind';

const STEM_H = 0.55;

/** Flat ribbon along a curve: far fewer vertices than a tube. */
function strip(pts: THREE.Vector3[], width: number, out: number[]) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dir = b.clone().sub(a).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize().multiplyScalar(width / 2);
    if (side.lengthSq() < 1e-6) side.set(width / 2, 0, 0);
    const w1 = side.clone().multiplyScalar(1 - (i + 1) / pts.length * 0.6);
    const p = [a.clone().add(side), a.clone().sub(side), b.clone().add(w1), b.clone().sub(w1)];
    out.push(...p[0].toArray(), ...p[1].toArray(), ...p[2].toArray(), ...p[1].toArray(), ...p[3].toArray(), ...p[2].toArray());
  }
}

/** Red spider lily head: six recurved petals and long upswept stamens. */
function lilyHead() {
  const pos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    strip([
      new THREE.Vector3(0, 0, 0),
      d.clone().multiplyScalar(0.07).setY(0.035),
      d.clone().multiplyScalar(0.12).setY(0.005),
      d.clone().multiplyScalar(0.1).setY(-0.04),
    ], 0.03, pos);
    const a2 = a + Math.PI / 6;
    const d2 = new THREE.Vector3(Math.cos(a2), 0, Math.sin(a2));
    strip([
      new THREE.Vector3(0, 0, 0),
      d2.clone().multiplyScalar(0.1).setY(0.06),
      d2.clone().multiplyScalar(0.2).setY(0.14),
      d2.clone().multiplyScalar(0.24).setY(0.21),
    ], 0.012, pos);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.translate(0, STEM_H, 0);
  return g;
}

function bladeTuft() {
  const pos: number[] = [];
  const col: number[] = [];
  const dark = new THREE.Color('#14201c'), tip = new THREE.Color('#3f5a45');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + i;
    const lean = 0.08 + (i % 2) * 0.06;
    const h = 0.32 + (i % 3) * 0.08;
    const cx = Math.cos(a), cz = Math.sin(a);
    const w = 0.035;
    pos.push(-cz * w, 0, cx * w, cz * w, 0, -cx * w, cx * lean, h, cz * lean);
    col.push(dark.r, dark.g, dark.b, dark.r, dark.g, dark.b, tip.r, tip.g, tip.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function inPond(x: number, z: number, pad = 0) {
  return ((x - POND.x) / (POND.rx + pad)) ** 2 + ((z - POND.z) / (POND.rz + pad)) ** 2 < 1;
}

function lilySpots(): THREE.Vector3[] {
  const r = rng(314);
  const out: THREE.Vector3[] = [];
  const tryAdd = (x: number, z: number) => {
    if (inPond(x, z, 0.3)) return;
    if (Math.abs(x - pathX(z)) < 1.9) return;
    out.push(new THREE.Vector3(x, heightAt(x, z) - 0.02, z));
  };
  // A ring around the pond.
  for (let i = 0; i < 220; i++) {
    const a = r() * Math.PI * 2;
    const k = 1.05 + r() * 0.5;
    tryAdd(POND.x + Math.cos(a) * POND.rx * k, POND.z + Math.sin(a) * POND.rz * k);
  }
  // Clumps along the path after the tunnel.
  for (let i = 0; i < 340; i++) {
    const z = -42 - r() * 44;
    const side = r() < 0.5 ? -1 : 1;
    const off = 2 + Math.pow(r(), 1.6) * 7;
    // Clump along a few bands so it reads as planted drifts.
    if (Math.sin(z * 0.45 + side) < -0.2) continue;
    tryAdd(pathX(z) + side * off, z);
  }
  // Banks beside the stairs.
  for (let i = 0; i < 160; i++) {
    const z = STAIRS_START - r() * (STAIRS_START - STAIRS_END);
    const side = r() < 0.5 ? -1 : 1;
    tryAdd(side * (2.9 + r() * 4), z);
  }
  // Around the pagoda.
  for (let i = 0; i < 80; i++) {
    const a = r() * Math.PI * 2, d = 4.5 + r() * 3;
    tryAdd(LANDMARKS.pagoda.x + Math.cos(a) * d, LANDMARKS.pagoda.z + Math.sin(a) * d);
  }
  return out;
}

function grassSpots(): THREE.Vector3[] {
  const r = rng(8);
  const out: THREE.Vector3[] = [];
  let tries = 0;
  while (out.length < 4500 && tries++ < 30000) {
    const z = 32 - r() * 160;
    const off = (r() - 0.5) * 2 * 26;
    const x = pathX(z) + off;
    if (Math.abs(off) < 2.2) continue;
    if (inPond(x, z, 0.2)) continue;
    if (z < STAIRS_START && z > STAIRS_END && Math.abs(x) < 2.8) continue;
    out.push(new THREE.Vector3(x, heightAt(x, z) - 0.02, z));
  }
  return out;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, spots: THREE.Vector3[], scale: [number, number], seed: number) {
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const r = rng(seed);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  spots.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
    const k = scale[0] + r() * (scale[1] - scale[0]);
    m.compose(p, q, s.set(k, k * (0.85 + r() * 0.3), k));
    im.setMatrixAt(i, m);
  });
  im.computeBoundingSphere();
  return im;
}

export default function Flora() {
  const meshes = useMemo(() => {
    const lilies = lilySpots();
    const stem = new THREE.CylinderGeometry(0.008, 0.012, STEM_H, 4).translate(0, STEM_H / 2, 0);
    const stemMat = addWind(new THREE.MeshStandardMaterial({ color: '#2f4a2c', roughness: 1 }), { height: STEM_H, sway: 0.06, push: 0.5, radius: 1.1 });
    const headMat = addWind(
      new THREE.MeshStandardMaterial({ color: '#e0203a', emissive: '#ff1030', emissiveIntensity: 0.9, roughness: 0.6, side: THREE.DoubleSide }),
      { height: STEM_H, sway: 0.06, push: 0.5, radius: 1.1 },
    );
    const grassMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), { height: 0.4, sway: 0.08, push: 0.35, radius: 0.9 });
    const grass = instanced(bladeTuft(), grassMat, grassSpots(), [0.8, 1.4], 2);
    grass.receiveShadow = true;
    return [
      instanced(stem, stemMat, lilies, [0.85, 1.25], 1),
      instanced(lilyHead(), headMat, lilies, [0.85, 1.25], 1),
      grass,
    ];
  }, []);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
}

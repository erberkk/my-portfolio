import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng, trees, type Tree } from './placements';
import { addWind } from './wind';

const PINKS = ['#f7b3c6', '#f39bb4', '#fcd1dc', '#f5a7bd', '#ffe0e8', '#ee8aa8'].map((c) => new THREE.Color(c));
const UP = new THREE.Vector3(0, 1, 0);

type Blossom = { p: THREE.Vector3; s: number; c: THREE.Color };

function growTree(tree: Tree, bark: THREE.BufferGeometry[], blossoms: Blossom[]) {
  const r = rng(tree.seed * 7919);
  const base = new THREE.Vector3(tree.x, tree.y, tree.z);
  const S = tree.scale;

  const branch = (start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const end = start.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.68, rad, len, 6, 1);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
    g.translate(start.x, start.y, start.z);
    bark.push(g);

    if (depth === 0) {
      if (tree.weeping) {
        // Hanging strands of blossom.
        const strands = 2 + Math.floor(r() * 2);
        for (let k = 0; k < strands; k++) {
          const o = new THREE.Vector3((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.2).multiplyScalar(S);
          const drop = (2.2 + r() * 2.2) * S;
          const steps = 7;
          for (let j = 0; j < steps; j++) {
            const t = j / (steps - 1);
            const p = end.clone().add(o).add(new THREE.Vector3(o.x * t * 0.6, -drop * t * t * 0.9 - t * 0.3, o.z * t * 0.6));
            blossoms.push({ p, s: (0.26 - t * 0.1) * S * (0.8 + r() * 0.4), c: PINKS[Math.floor(r() * PINKS.length)] });
          }
        }
      }
      const n = tree.weeping ? 2 : 4 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const p = end.clone().add(new THREE.Vector3((r() - 0.5) * 1.5, (r() - 0.3) * 1.0, (r() - 0.5) * 1.5).multiplyScalar(S));
        blossoms.push({ p, s: (0.45 + r() * 0.5) * S, c: PINKS[Math.floor(r() * PINKS.length)] });
      }
      return;
    }
    const kids = depth > 2 ? 2 + Math.floor(r() * 2) : 2;
    for (let k = 0; k < kids; k++) {
      const spread = 0.45 + r() * 0.55;
      const around = r() * Math.PI * 2;
      const axis = new THREE.Vector3(Math.cos(around), 0, Math.sin(around)).cross(dir).normalize();
      const nd = dir.clone().applyAxisAngle(axis, spread);
      if (tree.weeping && depth <= 2) nd.y -= 0.35;
      else nd.y += 0.25;
      nd.normalize();
      branch(end, nd, len * (0.68 + r() * 0.12), rad * 0.62, depth - 1);
    }
  };

  const lean = new THREE.Vector3((r() - 0.5) * 0.35, 1, (r() - 0.5) * 0.35).normalize();
  branch(base, lean, (1.9 + r() * 0.7) * S, 0.24 * S, 4);
}

export default function Sakura() {
  const { barkMesh, blossomMesh } = useMemo(() => {
    const bark: THREE.BufferGeometry[] = [];
    const blossoms: Blossom[] = [];
    trees.forEach((t) => growTree(t, bark, blossoms));
    const barkGeo = mergeGeometries(bark)!;
    bark.forEach((g) => g.dispose());
    const barkMesh = new THREE.Mesh(barkGeo, new THREE.MeshStandardMaterial({ color: '#2a1b1f', roughness: 1, flatShading: true }));
    barkMesh.receiveShadow = true;

    const puff = new THREE.IcosahedronGeometry(1, 0);
    const mat = addWind(
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true, emissive: '#ff7fa3', emissiveIntensity: 0.22 }),
      { height: 1, sway: 0.08 },
    );
    const blossomMesh = new THREE.InstancedMesh(puff, mat, blossoms.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    const r = rng(5);
    blossoms.forEach((b, i) => {
      q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3));
      m.compose(b.p, q, s.set(b.s, b.s * 0.8, b.s));
      blossomMesh.setMatrixAt(i, m);
      blossomMesh.setColorAt(i, b.c);
    });
    blossomMesh.computeBoundingSphere();
    return { barkMesh, blossomMesh };
  }, []);

  return (
    <>
      <primitive object={barkMesh} />
      <primitive object={blossomMesh} />
    </>
  );
}

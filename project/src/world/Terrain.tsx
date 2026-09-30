import { useMemo } from 'react';
import * as THREE from 'three';
import { heightAt, pathHeight, pathX, STAIRS_END, STAIRS_START, SUMMIT } from './layout';
import { rng } from './placements';

function Ground() {
  const geo = useMemo(() => {
    const W = 190, D = 220, SX = 190, SZ = 220;
    const g = new THREE.PlaneGeometry(W, D, SX, SZ);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -50);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const grass = new THREE.Color('#1b2a27'), moss = new THREE.Color('#263626'), dirt = new THREE.Color('#2b2226');
    const path = new THREE.Color('#3b3638');
    const c = new THREE.Color();
    const r = rng(11);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);
      const off = Math.abs(x - pathX(z));
      c.copy(grass).lerp(moss, r() * 0.6).lerp(dirt, Math.max(0, Math.min(1, (y - 2) / 10)) * 0.5);
      if (off < 2.6) c.lerp(path, 1 - Math.max(0, off - 1.6));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

/** Flat stepping stones along the sandō, and the stone stairs. */
function PathStones() {
  const { stones, steps, walls } = useMemo(() => {
    const r = rng(21);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const stoneMats: THREE.Matrix4[] = [];
    for (let z = 30; z > STAIRS_START; z -= 1.15) {
      if (z < -8 && z > -40) {
        // Inside the tunnel: two stones side by side.
        for (const dx of [-0.55, 0.55]) {
          const x = pathX(z) + dx + (r() - 0.5) * 0.1;
          q.setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.3, 0));
          p.set(x, heightAt(x, z) + 0.04, z + (r() - 0.5) * 0.2);
          s.set(0.95 + r() * 0.2, 1, 0.9 + r() * 0.15);
          stoneMats.push(m.clone().compose(p, q, s));
        }
        continue;
      }
      const x = pathX(z) + (r() - 0.5) * 0.3;
      q.setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.5, 0));
      p.set(x, heightAt(x, z) + 0.04, z);
      s.set(1.6 + r() * 0.5, 1, 0.9 + r() * 0.2);
      stoneMats.push(m.clone().compose(p, q, s));
    }
    // Summit plaza flagstones
    for (let z = STAIRS_END - 0.6; z > -118; z -= 1.1) {
      for (let x = -2.2; x <= 2.2; x += 1.1) {
        q.setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.1, 0));
        p.set(x, SUMMIT + 0.04, z);
        s.set(1.0, 1, 1.0);
        stoneMats.push(m.clone().compose(p, q, s));
      }
    }

    const stepMats: THREE.Matrix4[] = [];
    const n = 26;
    const len = STAIRS_START - STAIRS_END;
    for (let i = 1; i <= n; i++) {
      const z = STAIRS_START - (i - 0.5) * (len / n);
      const h = pathHeight(z);
      p.set(0, h / 2, z);
      q.identity();
      s.set(4.4, h, len / n + 0.02);
      stepMats.push(m.clone().compose(p, q, s));
    }
    // Low stone walls flanking the stairs
    const wallMats: THREE.Matrix4[] = [];
    for (let i = 1; i <= n; i++) {
      const z = STAIRS_START - (i - 0.5) * (len / n);
      const h = pathHeight(z) + 0.45;
      for (const x of [-2.45, 2.45]) {
        p.set(x, h / 2, z);
        s.set(0.5, h, len / n + 0.02);
        wallMats.push(m.clone().compose(p, q, s));
      }
    }
    return { stones: stoneMats, steps: stepMats, walls: wallMats };
  }, []);

  const stoneGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.5, 0.52, 0.12, 7);
    g.scale(1, 1, 1);
    return g;
  }, []);

  return (
    <>
      <Instanced geometry={stoneGeo} matrices={stones} color="#5d585a" roughness={0.95} castShadow={false} />
      <Instanced geometry={useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])} matrices={steps} color="#6a6567" roughness={0.9} castShadow={false} />
      <Instanced geometry={useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])} matrices={walls} color="#4d4a4e" roughness={1} castShadow={false} />
    </>
  );
}

export function Instanced({ geometry, matrices, color, roughness = 0.9, emissive, castShadow = true }: {
  geometry: THREE.BufferGeometry; matrices: THREE.Matrix4[]; color: string; roughness?: number; emissive?: string; castShadow?: boolean;
}) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, flatShading: true, emissive: emissive ?? '#000' });
    const im = new THREE.InstancedMesh(geometry, mat, matrices.length);
    matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = castShadow;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    return im;
  }, [geometry, matrices, color, roughness, emissive, castShadow]);
  return <primitive object={mesh} />;
}

export default function Terrain() {
  return (
    <>
      <Ground />
      <PathStones />
    </>
  );
}

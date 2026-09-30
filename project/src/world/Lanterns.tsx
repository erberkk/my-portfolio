import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lanterns } from './placements';
import { GRACES, LANDMARKS, SUMMIT, heightAt } from './layout';
import { live } from './store';
import { textTexture } from './label';

const WARM = '#ffb35c';

/** Kasuga-style stone lantern, built bottom to top. */
function lanternGeometry() {
  const stone = mergeGeometries([
    new THREE.CylinderGeometry(0.34, 0.4, 0.14, 6).translate(0, 0.07, 0),
    new THREE.CylinderGeometry(0.1, 0.13, 0.9, 8).translate(0, 0.59, 0),
    new THREE.CylinderGeometry(0.32, 0.22, 0.14, 6).translate(0, 1.1, 0),
    // Frame posts around the fire box
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      return new THREE.BoxGeometry(0.05, 0.36, 0.05).translate(Math.cos(a) * 0.21, 1.35, Math.sin(a) * 0.21);
    }),
    new THREE.ConeGeometry(0.5, 0.32, 6).translate(0, 1.7, 0),
    new THREE.CylinderGeometry(0.05, 0.08, 0.1, 6).translate(0, 1.9, 0),
    new THREE.SphereGeometry(0.075, 8, 6).translate(0, 2.0, 0),
  ])!;
  const fire = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 6).translate(0, 1.34, 0);
  return { stone, fire };
}

function YearLabel({ x, y, z, year }: { x: number; y: number; z: number; year: string }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const { tex: t } = textTexture(year, { font: '"Geist Mono Variable", monospace', weight: 500, size: 64, color: '#ffd9a0' });
    setTex(t);
    return () => t.dispose();
  }, [year]);
  if (!tex) return null;
  return (
    <sprite position={[x, y + 2.55, z]} scale={[1.1, 0.45, 1]}>
      <spriteMaterial map={tex} transparent toneMapped={false} depthWrite={false} opacity={0.9} />
    </sprite>
  );
}

export default function Lanterns() {
  const { stoneMesh, fireMesh } = useMemo(() => {
    const { stone, fire } = lanternGeometry();
    const stoneMesh = new THREE.InstancedMesh(stone, new THREE.MeshStandardMaterial({ color: '#7a7470', roughness: 0.95, flatShading: true }), lanterns.length);
    const fireMesh = new THREE.InstancedMesh(fire, new THREE.MeshBasicMaterial({ color: new THREE.Color(WARM).multiplyScalar(2.4), toneMapped: false }), lanterns.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    lanterns.forEach((l, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), l.rot);
      m.compose(p.set(l.x, l.y, l.z), q, s.setScalar(l.scale));
      stoneMesh.setMatrixAt(i, m);
      fireMesh.setMatrixAt(i, m);
    });
    stoneMesh.receiveShadow = true;
    stoneMesh.computeBoundingSphere();
    fireMesh.computeBoundingSphere();
    return { stoneMesh, fireMesh };
  }, []);

  // Only a handful of real lights exist; they hop to whichever glowing
  // things (lanterns, graces, pagoda, shrine) are nearest the player.
  const sources = useMemo(() => [
    ...lanterns.map((l) => ({ x: l.x, y: l.y + 1.35 * l.scale, z: l.z, color: new THREE.Color(WARM), power: 5 })),
    ...GRACES.map((g) => ({ x: g.x, y: heightAt(g.x, g.z) + 1.2, z: g.z, color: new THREE.Color('#ffc166'), power: 6 })),
    { x: LANDMARKS.pagoda.x + 1, y: 3, z: LANDMARKS.pagoda.z + 5, color: new THREE.Color('#ffae5c'), power: 9 },
    { x: 0, y: SUMMIT + 2.3, z: -119, color: new THREE.Color('#ffbe78'), power: 10 },
  ], []);
  const pool = useRef<(THREE.PointLight | null)[]>([]);
  const order = useMemo(() => sources.map((_, i) => i), [sources]);
  useFrame((st) => {
    const { x, z } = live.player;
    const d = (i: number) => (sources[i].x - x) ** 2 + (sources[i].z - z) ** 2;
    order.sort((a, b) => d(a) - d(b));
    const t = st.clock.elapsedTime;
    pool.current.forEach((light, k) => {
      if (!light) return;
      const src = sources[order[k]];
      light.position.set(src.x, src.y, src.z);
      light.color.copy(src.color);
      light.intensity = src.power + Math.sin(t * 9 + k * 3) * 0.4 + Math.sin(t * 23 + k) * 0.25;
    });
  });

  return (
    <>
      <primitive object={stoneMesh} />
      <primitive object={fireMesh} />
      {[0, 1, 2, 3].map((i) => (
        <pointLight key={i} ref={(el) => { pool.current[i] = el; }} color={WARM} intensity={5} distance={10} decay={2} />
      ))}
      {lanterns.filter((l) => l.year).map((l, i) => <YearLabel key={i} x={l.x} y={l.y} z={l.z} year={l.year!} />)}
    </>
  );
}

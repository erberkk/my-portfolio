import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANDMARKS, SUMMIT } from './layout';
import { live } from './store';
import { VERMILION } from './Torii';

/** A roof slab whose eave edge sweeps upward. */
function slab(width: number, len: number, thick: number, curl: number) {
  const g = new THREE.BoxGeometry(width, thick, len, 20, 1, 8);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i) / (len / 2); // -1 ridge … +1 eave
    const x = pos.getX(i) / (width / 2);
    const eave = Math.max(0, z);
    pos.setY(i, pos.getY(i) + Math.pow(eave, 3) * curl + Math.pow(Math.abs(x), 6) * curl * 0.6 * (0.3 + eave));
  }
  g.computeVertexNormals();
  return g;
}

export default function Shrine() {
  const F = SUMMIT + 0.7; // hall floor
  const geo = useMemo(() => {
    const stone: THREE.BufferGeometry[] = [];
    const red: THREE.BufferGeometry[] = [];
    const wood: THREE.BufferGeometry[] = [];
    const roof: THREE.BufferGeometry[] = [];
    const gold: THREE.BufferGeometry[] = [];
    const glow: THREE.BufferGeometry[] = [];

    stone.push(new THREE.BoxGeometry(11, 0.7, 8.4).translate(0, SUMMIT + 0.35, -124.5));
    for (let i = 0; i < 3; i++) stone.push(new THREE.BoxGeometry(3.4, 0.7 - i * 0.23, 0.45).translate(0, SUMMIT + (0.7 - i * 0.23) / 2, -120.1 + i * 0.45));

    // Pillars
    for (const x of [-4.2, -1.4, 1.4, 4.2]) for (const z of [-121, -127.6]) red.push(new THREE.CylinderGeometry(0.2, 0.22, 3.2, 12).translate(x, F + 1.6, z));
    // Beams
    red.push(new THREE.BoxGeometry(9.2, 0.35, 0.35).translate(0, F + 3.05, -121));
    red.push(new THREE.BoxGeometry(9.2, 0.25, 0.3).translate(0, F + 0.35, -121));
    // Walls
    wood.push(new THREE.BoxGeometry(8.4, 3, 0.2).translate(0, F + 1.5, -127.5));
    for (const x of [-4.2, 4.2]) wood.push(new THREE.BoxGeometry(0.2, 3, 6.4).translate(x, F + 1.5, -124.3));
    wood.push(new THREE.BoxGeometry(9, 0.2, 7).translate(0, F + 0.1, -124.3));
    // Veranda rail
    red.push(new THREE.BoxGeometry(9.4, 0.08, 0.08).translate(0, F + 0.8, -120.4));
    for (let x = -4.5; x <= 4.5; x += 0.9) if (Math.abs(x) > 1.2) red.push(new THREE.BoxGeometry(0.08, 0.8, 0.08).translate(x, F + 0.4, -120.4));
    // Shoji panels between the centre pillars glow warm from inside.
    for (const [x0, x1] of [[-4.1, -1.5], [-1.3, 1.3], [1.5, 4.1]]) {
      glow.push(new THREE.PlaneGeometry(x1 - x0, 2.3).translate((x0 + x1) / 2, F + 1.55, -121.2));
    }
    // Lattice over the shoji
    for (let x = -4; x <= 4; x += 0.45) wood.push(new THREE.BoxGeometry(0.04, 2.3, 0.05).translate(x, F + 1.55, -121.15));
    for (let y = 0.5; y <= 2.6; y += 0.42) wood.push(new THREE.BoxGeometry(8.2, 0.04, 0.05).translate(0, F + y, -121.15));

    // Gabled roof
    const ridgeY = F + 6.2, eaveY = F + 3.3, depth = 4.9;
    const slope = Math.atan2(ridgeY - eaveY, depth);
    const L = Math.hypot(ridgeY - eaveY, depth) + 1.1;
    for (const side of [-1, 1]) {
      const g = slab(12.4, L, 0.35, 0.9);
      // Point the eave outward first, then tip it down.
      if (side < 0) g.rotateY(Math.PI);
      g.rotateX(side * slope);
      g.translate(0, (ridgeY + eaveY) / 2 + 0.2, -124.3 + side * (depth / 2 + 0.3));
      roof.push(g);
    }
    roof.push(new THREE.BoxGeometry(12.6, 0.4, 0.5).translate(0, ridgeY + 0.35, -124.3));
    // Chigi: crossed boards at the gable ends
    for (const x of [-6.1, 6.1]) {
      for (const side of [-1, 1]) {
        roof.push(new THREE.BoxGeometry(0.12, 2.4, 0.35).rotateX(side * 0.6).translate(x, ridgeY + 0.9, -124.3 + side * 0.4));
      }
    }
    // Katsuogi logs on the ridge
    for (let i = -2; i <= 2; i++) {
      roof.push(new THREE.CylinderGeometry(0.18, 0.18, 1.1, 10).rotateX(Math.PI / 2).translate(i * 2.1, ridgeY + 0.75, -124.3));
      gold.push(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 10).rotateX(Math.PI / 2).translate(i * 2.1, ridgeY + 0.75, -123.73));
    }
    // Kōhai: the porch roof reaching over the steps
    const k = slab(5.6, 3.2, 0.25, 0.5);
    k.rotateX(0.32);
    k.translate(0, F + 3.25, -119.3);
    roof.push(k);
    for (const x of [-2.4, 2.4]) red.push(new THREE.CylinderGeometry(0.14, 0.15, 3.1, 10).translate(x, SUMMIT + 1.55, -118.3));
    red.push(new THREE.BoxGeometry(5.2, 0.25, 0.25).translate(0, SUMMIT + 3.0, -118.3));

    // Offering box
    wood.push(new THREE.BoxGeometry(1.5, 0.7, 0.8).translate(0, SUMMIT + 0.35, -117.3));
    for (let x = -0.6; x <= 0.6; x += 0.15) wood.push(new THREE.BoxGeometry(0.06, 0.04, 0.8).translate(x, SUMMIT + 0.72, -117.3));

    return {
      stone: mergeGeometries(stone)!, red: mergeGeometries(red)!, wood: mergeGeometries(wood)!,
      roof: mergeGeometries(roof)!, gold: mergeGeometries(gold)!, glow: mergeGeometries(glow)!,
    };
  }, [F]);

  // Shimenawa rope and shide paper streamers.
  const rope = useMemo(() => {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const t = i / 15;
      return new THREE.Vector3(-4 + t * 8, F + 2.75 - Math.sin(t * Math.PI) * 0.45, -120.85);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.13, 8, false);
  }, [F]);
  const shide = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      const x = -4 + t * 8, y = F + 2.75 - Math.sin(t * Math.PI) * 0.45 - 0.12;
      for (let j = 0; j < 4; j++) {
        const w = new THREE.PlaneGeometry(0.16, 0.2);
        w.translate(x + (j % 2 ? 0.08 : -0.08), y - 0.12 - j * 0.18, -120.8);
        parts.push(w);
      }
    }
    return mergeGeometries(parts)!;
  }, [F]);

  // The bell swings when rung.
  const bell = useRef<THREE.Group>(null);
  useFrame((st) => {
    const g = bell.current;
    if (!g) return;
    const age = st.clock.elapsedTime - live.bellRang;
    const amp = age >= 0 && age < 4 ? Math.exp(-age * 1.2) * 0.35 : 0;
    g.rotation.x = Math.sin(age * 9) * amp;
    g.rotation.z = Math.sin(age * 7 + 1) * amp * 0.4;
  });
  const b = LANDMARKS.bell;
  const bellRope = useMemo(() => {
    const pts = Array.from({ length: 10 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.8) * 0.02, -0.25 - i * 0.22, 0));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.05, 8, false);
  }, []);

  return (
    <group>
      <mesh geometry={geo.stone} receiveShadow><meshStandardMaterial color="#6d686a" roughness={0.95} flatShading /></mesh>
      <mesh geometry={geo.red} receiveShadow><meshStandardMaterial color={VERMILION} roughness={0.55} emissive="#2a0703" /></mesh>
      <mesh geometry={geo.wood} receiveShadow><meshStandardMaterial color="#2a1e1a" roughness={0.85} /></mesh>
      <mesh geometry={geo.roof} receiveShadow><meshStandardMaterial color="#1b1920" roughness={0.75} flatShading /></mesh>
      <mesh geometry={geo.gold}><meshStandardMaterial color="#d6a84a" metalness={0.8} roughness={0.3} emissive="#3a2806" /></mesh>
      <mesh geometry={geo.glow}><meshBasicMaterial color={new THREE.Color('#ffcf8a').multiplyScalar(1.5)} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={rope} castShadow><meshStandardMaterial color="#c9ad6a" roughness={1} /></mesh>
      <mesh geometry={shide}><meshStandardMaterial color="#f4f1ea" side={THREE.DoubleSide} emissive="#6a6660" /></mesh>

      <group ref={bell} position={[b.x, b.y, b.z]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <sphereGeometry args={[0.26, 20, 16]} />
          <meshStandardMaterial color="#e2b24c" metalness={0.9} roughness={0.25} emissive="#4a3208" />
        </mesh>
        <mesh position={[0, -0.12, 0.2]}>
          <boxGeometry args={[0.3, 0.04, 0.12]} />
          <meshStandardMaterial color="#1a1410" />
        </mesh>
        <mesh geometry={bellRope} castShadow>
          <meshStandardMaterial color="#d8322a" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

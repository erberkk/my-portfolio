import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANDMARKS, heightAt } from './layout';

/** A square roof with upswept corners: a flattened pyramid, corners lifted. */
function roof(w: number, h: number, overhang: number) {
  const g = new THREE.CylinderGeometry(w * 0.32, (w / 2 + overhang) * Math.SQRT2, h, 4, 3, false);
  g.rotateY(Math.PI / 4);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const r = Math.max(Math.abs(x), Math.abs(z)) / (w / 2 + overhang);
    // Lift the eaves toward the corners.
    const corner = Math.abs(Math.abs(x) - Math.abs(z)) < 0.01 * w ? 1 : Math.min(Math.abs(x), Math.abs(z)) / (w / 2 + overhang);
    if (y < 0) pos.setY(i, y + Math.pow(r, 3) * corner * h * 0.9);
  }
  g.computeVertexNormals();
  return g;
}

export default function Pagoda() {
  const { walls, roofs, trims, glow, spire } = useMemo(() => {
    const walls: THREE.BufferGeometry[] = [];
    const roofs: THREE.BufferGeometry[] = [];
    const trims: THREE.BufferGeometry[] = [];
    const glow: THREE.BufferGeometry[] = [];
    // Stone plinth
    trims.push(new THREE.BoxGeometry(8.4, 0.8, 8.4).translate(0, 0.4, 0));
    let y = 0.8;
    for (let i = 0; i < 5; i++) {
      const w = 5.4 - i * 0.62;
      const h = 2.2 - i * 0.12;
      walls.push(new THREE.BoxGeometry(w, h, w).translate(0, y + h / 2, 0));
      // Balcony rail band
      trims.push(new THREE.BoxGeometry(w + 0.5, 0.12, w + 0.5).translate(0, y + 0.15, 0));
      // Warm windows on each face
      for (let f = 0; f < 4; f++) {
        const win = new THREE.PlaneGeometry(w * 0.35, h * 0.35);
        win.translate(0, y + h * 0.55, w / 2 + 0.01);
        win.rotateY((f * Math.PI) / 2);
        glow.push(win);
      }
      y += h;
      const rh = 0.9 - i * 0.05;
      roofs.push(roof(w, rh, 1.35 - i * 0.08).translate(0, y + rh / 2 - 0.1, 0));
      y += rh * 0.7;
    }
    const spire = mergeGeometries([
      new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8).translate(0, y + 2.1, 0),
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => new THREE.TorusGeometry(0.26 - k * 0.012, 0.045, 6, 16).rotateX(Math.PI / 2).translate(0, y + 0.6 + k * 0.32, 0)),
      new THREE.SphereGeometry(0.18, 12, 8).translate(0, y + 4.35, 0),
    ])!;
    return {
      walls: mergeGeometries(walls)!,
      roofs: mergeGeometries(roofs)!,
      trims: mergeGeometries(trims)!,
      glow: mergeGeometries(glow)!,
      spire,
    };
  }, []);
  const p = LANDMARKS.pagoda;
  return (
    <group position={[p.x, heightAt(p.x, p.z) - 0.2, p.z]} rotation={[0, 0.25, 0]}>
      <mesh geometry={walls} receiveShadow>
        <meshStandardMaterial color="#b83a28" roughness={0.7} emissive="#2a0602" />
      </mesh>
      <mesh geometry={roofs} receiveShadow>
        <meshStandardMaterial color="#1c1a22" roughness={0.8} flatShading />
      </mesh>
      <mesh geometry={trims} receiveShadow>
        <meshStandardMaterial color="#6b6568" roughness={0.95} flatShading />
      </mesh>
      <mesh geometry={glow}>
        <meshBasicMaterial color={new THREE.Color('#ffb060').multiplyScalar(1.8)} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={spire}>
        <meshStandardMaterial color="#c9a14a" metalness={0.8} roughness={0.35} emissive="#3a2a08" />
      </mesh>
    </group>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANDMARKS, SUMMIT, heightAt } from './layout';
import { gates } from './placements';
import { loadJapaneseFont, textTexture } from './label';

export const VERMILION = '#c8412a';

/** A curved-lintel myōjin torii. Returns geometry split by material. */
export function toriiGeometry(span: number, height: number, pillarR: number) {
  const red: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];

  for (const sx of [-1, 1]) {
    const p = new THREE.CylinderGeometry(pillarR * 0.9, pillarR, height, 12);
    p.translate(sx * span / 2, height / 2, 0);
    // A slight inward lean, like real gates.
    p.rotateZ(-sx * 0.02);
    red.push(p);
    const base = new THREE.CylinderGeometry(pillarR * 1.25, pillarR * 1.3, height * 0.08, 12);
    base.translate(sx * span / 2, height * 0.04, 0);
    black.push(base);
  }
  // Nuki: the lower straight beam that pierces the pillars.
  const nuki = new THREE.BoxGeometry(span * 1.28, pillarR * 0.75, pillarR * 0.55);
  nuki.translate(0, height * 0.76, 0);
  red.push(nuki);
  // Shimaki + kasagi: the upper lintel, curved up at the ends.
  const lintel = (w: number, h: number, d: number, y: number, lift: number) => {
    const g = new THREE.BoxGeometry(w, h, d, 24, 1, 1);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (w / 2);
      pos.setY(i, pos.getY(i) + Math.pow(Math.abs(x), 2.4) * lift);
    }
    g.computeVertexNormals();
    g.translate(0, y, 0);
    return g;
  };
  red.push(lintel(span * 1.42, pillarR * 0.7, pillarR * 0.9, height * 0.97, height * 0.04));
  black.push(lintel(span * 1.62, pillarR * 0.55, pillarR * 1.15, height * 1.04, height * 0.07));
  // Gakuzuka: the short post holding the name plaque.
  const post = new THREE.BoxGeometry(pillarR * 0.6, height * 0.2, pillarR * 0.5);
  post.translate(0, height * 0.87, 0);
  red.push(post);

  return { red: mergeGeometries(red)!, black: mergeGeometries(black)! };
}

const redMat = new THREE.MeshStandardMaterial({ color: VERMILION, roughness: 0.55, emissive: '#2a0703', flatShading: false });
const blackMat = new THREE.MeshStandardMaterial({ color: '#17121a', roughness: 0.7 });

function Gate({ position, span, height, pillarR, plaque }: {
  position: [number, number, number]; span: number; height: number; pillarR: number; plaque?: string;
}) {
  const geo = useMemo(() => toriiGeometry(span, height, pillarR), [span, height, pillarR]);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!plaque) return;
    let alive = true;
    loadJapaneseFont(plaque).then(() => {
      if (!alive) return;
      const { tex: t } = textTexture(plaque, { vertical: true, size: 120, color: '#e8c27a', bg: '#141016', pad: 40 });
      setTex(t);
    });
    return () => { alive = false; };
  }, [plaque]);
  const plaqueH = height * 0.2;
  return (
    <group position={position}>
      <mesh geometry={geo.red} material={redMat} castShadow receiveShadow />
      <mesh geometry={geo.black} material={blackMat} castShadow />
      {plaque && tex && (
        <group position={[0, height * 0.87, pillarR * 0.3]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[plaqueH * 0.42 + 0.12, plaqueH + 0.12, 0.08]} />
            <meshStandardMaterial color="#2a1f18" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[plaqueH * 0.42, plaqueH]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** The thousand-gate tunnel as instanced meshes, with paper lanterns. */
function Tunnel() {
  const { red, black } = useMemo(() => toriiGeometry(3.5, 4.2, 0.17), []);
  const meshes = useMemo(() => {
    const r = new THREE.InstancedMesh(red, redMat, gates.length);
    const b = new THREE.InstancedMesh(black, blackMat, gates.length);
    const m = new THREE.Matrix4();
    gates.forEach((g, i) => {
      m.makeTranslation(g.x, g.y, g.z);
      r.setMatrixAt(i, m);
      b.setMatrixAt(i, m);
    });
    for (const im of [r, b]) { im.receiveShadow = true; im.computeBoundingSphere(); }
    return [r, b];
  }, [red, black]);
  return (
    <>
      {meshes.map((m, i) => <primitive key={i} object={m} />)}
      <Chochin />
    </>
  );
}

/** Red paper lanterns hanging from every few gates; they sway. */
function Chochin() {
  const hung = useMemo(() => gates.filter((_, i) => i % 4 === 1), []);
  const { body, caps, im } = useMemo(() => {
    const body = new THREE.SphereGeometry(0.28, 16, 12);
    body.scale(1, 1.3, 1);
    const caps = mergeGeometries([
      new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12).translate(0, 0.36, 0),
      new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12).translate(0, -0.36, 0),
      new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4).translate(0, 0.62, 0),
    ])!;
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a2a').multiplyScalar(2.2), toneMapped: false });
    const im = new THREE.InstancedMesh(body, mat, hung.length);
    return { body, caps, im };
  }, [hung]);
  const capIm = useMemo(() => new THREE.InstancedMesh(caps, blackMat, hung.length), [caps]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    hung.forEach((g, i) => {
      e.set(Math.sin(t * 1.3 + i) * 0.06, 0, Math.cos(t * 1.1 + i * 2) * 0.05);
      q.setFromEuler(e);
      // Pivot at the rope's top: offset the body down along the swing.
      p.set(0, -0.62, 0).applyQuaternion(q).add(new THREE.Vector3(g.x, g.y + 3.85, g.z));
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
      capIm.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
    capIm.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => () => { body.dispose(); caps.dispose(); }, [body, caps]);
  return (
    <>
      <primitive object={im} />
      <primitive object={capIm} />
    </>
  );
}

export default function Torii() {
  const g = LANDMARKS.gate;
  return (
    <>
      <Gate position={[g.x, heightAt(g.x, g.z), g.z]} span={8} height={8.4} pillarR={0.42} plaque="エルベルク" />
      <Tunnel />
      <Gate position={[0, SUMMIT, -113.5]} span={4.4} height={5.2} pillarR={0.24} plaque="頂" />
    </>
  );
}

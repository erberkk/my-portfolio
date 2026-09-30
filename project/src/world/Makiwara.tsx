import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { dummies } from './placements';
import { hitBy } from './combat';
import { live, setUI } from './store';
import { sfx } from './audio';

const ROLL_R = 0.17, ROLL_Y0 = 0.5, ROLL_H = 1.25;

function rollGeometry() {
  const g = new THREE.CylinderGeometry(ROLL_R * 0.95, ROLL_R, ROLL_H, 16, 24);
  g.translate(0, ROLL_Y0 + ROLL_H / 2, 0);
  const pos = g.getAttribute('position');
  const col: number[] = [];
  const straw = new THREE.Color('#c9a862'), dark = new THREE.Color('#8a6d3a'), rope = new THREE.Color('#3b2b1c');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const fibre = (Math.sin(a * 40) + Math.sin(a * 17 + y * 3)) * 0.25 + 0.5;
    let c = straw.clone().lerp(dark, fibre * 0.5);
    for (const band of [0.75, 1.15, 1.55]) if (Math.abs(y - band) < 0.03) c = rope;
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

type Dummy = {
  lower: THREE.Mesh; upperGroup: THREE.Group; upper: THREE.Mesh;
  lowerPlane: THREE.Plane; upperPlane: THREE.Plane; basePlane: THREE.Plane;
  cutAt: number; lastSwing: number;
  slide: THREE.Vector3; axis: THREE.Vector3; home: THREE.Vector3; pivot: THREE.Vector3;
};

const FAR = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);

export default function Makiwara() {
  const geo = useMemo(() => rollGeometry(), []);
  const standGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.07, 0.09, 0.6, 8);
    g.translate(0, 0.3, 0);
    return g;
  }, []);
  const baseGeo = useMemo(() => new THREE.BoxGeometry(0.7, 0.08, 0.7).translate(0, 0.04, 0), []);

  const items = useMemo<Dummy[]>(() => dummies.map((d) => {
    const lowerPlane = FAR.clone(), upperPlane = FAR.clone();
    const mk = (plane: THREE.Plane) => new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide, clippingPlanes: [plane], clipShadows: true,
    });
    const lower = new THREE.Mesh(geo, mk(lowerPlane));
    lower.castShadow = true;
    lower.position.set(d.x, d.y, d.z);
    const upper = new THREE.Mesh(geo, mk(upperPlane));
    upper.castShadow = true;
    const upperGroup = new THREE.Group();
    upperGroup.add(upper);
    upperGroup.visible = false;
    return {
      lower, upper, upperGroup, lowerPlane, upperPlane, basePlane: new THREE.Plane(),
      cutAt: -1, lastSwing: -1, slide: new THREE.Vector3(), axis: new THREE.Vector3(), home: new THREE.Vector3(d.x, d.y, d.z), pivot: new THREE.Vector3(),
    };
  }), [geo]);

  const inv = useMemo(() => new THREE.Matrix4(), []);
  const rel = useMemo(() => new THREE.Matrix4(), []);
  const n = useMemo(() => new THREE.Vector3(), []);
  const c = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const cutCount = useRef(0);

  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const now = st.clock.elapsedTime;
    const sw = live.swing;
    for (const d of items) {
      if (sw && d.cutAt < 0 && d.lastSwing !== sw.id && hitBy(d.home.x, d.home.z, 0.3)) {
        d.lastSwing = sw.id;
        d.cutAt = now;
        cutCount.current++;
        // The cut plane follows the blade: tilted along the swing direction.
        const side = new THREE.Vector3(sw.dirZ, 0, -sw.dirX);
        n.set(0, 1, 0).applyAxisAngle(side, sw.tilt).normalize();
        c.set(d.home.x, d.home.y + Math.min(1.55, Math.max(0.85, sw.y)), d.home.z);
        d.pivot.copy(c);
        d.lowerPlane.setFromNormalAndCoplanarPoint(n.clone().negate(), c);
        d.basePlane.setFromNormalAndCoplanarPoint(n, c);
        d.upperPlane.copy(d.basePlane);
        // Slide down the cut face, then topple the same way.
        d.slide.set(0, -1, 0).addScaledVector(n, n.y).normalize();
        if (d.slide.lengthSq() < 0.01) d.slide.set(sw.dirX, 0, sw.dirZ);
        d.axis.set(d.slide.z, 0, -d.slide.x).normalize();
        d.upperGroup.position.copy(d.home);
        d.upperGroup.quaternion.identity();
        d.upperGroup.scale.setScalar(1);
        d.upper.position.set(0, 0, 0);
        d.upperGroup.visible = true;
        d.upperGroup.updateMatrixWorld(true);
        live.bursts.push({ x: c.x, y: c.y, z: c.z, n: 10, t: 0 });
        sfx.cut();
        setUI((u) => ({ cuts: u.cuts + 1 }));
      }
      if (d.cutAt < 0) continue;
      const t = now - d.cutAt;
      // Pivot the fall around the lower edge of the cut.
      const slide = Math.min(0.28, t * t * 3);
      const fall = Math.max(0, t - 0.18);
      const tip = Math.min(1.45, fall * fall * 4.5);
      q.setFromAxisAngle(d.axis, tip);
      d.upperGroup.quaternion.copy(q);
      // Rotate about the cut point rather than the dummy's feet.
      d.upperGroup.position.copy(d.home).sub(d.pivot).applyQuaternion(q).add(d.pivot).addScaledVector(d.slide, slide);
      d.upperGroup.position.y -= Math.min(d.pivot.y - d.home.y - 0.1, fall * fall * 3.2);
      const fade = Math.max(0, t - 3.5);
      d.upperGroup.scale.setScalar(Math.max(0.001, 1 - fade));
      d.upperGroup.updateMatrixWorld(true);
      // Keep the upper half's clip plane glued to it as it moves.
      inv.makeTranslation(d.home.x, d.home.y, d.home.z).invert();
      rel.multiplyMatrices(d.upperGroup.matrixWorld, inv);
      d.upperPlane.copy(d.basePlane).applyMatrix4(rel);

      if (t > 5) {
        // Re-roll a fresh target.
        d.cutAt = -1;
        d.upperGroup.visible = false;
        d.lowerPlane.copy(FAR);
        d.upperPlane.copy(FAR);
        d.lower.scale.set(1, 0.01, 1);
      }
    }
    for (const d of items) {
      if (d.lower.scale.y < 1) d.lower.scale.y = Math.min(1, d.lower.scale.y + dt * 2.5);
    }
  });

  return (
    <>
      {items.map((d, i) => (
        <group key={i}>
          <primitive object={d.lower} />
          <primitive object={d.upperGroup} />
          <mesh geometry={standGeo} position={d.home} castShadow>
            <meshStandardMaterial color="#3a2a20" roughness={0.9} />
          </mesh>
          <mesh geometry={baseGeo} position={d.home} castShadow receiveShadow>
            <meshStandardMaterial color="#2c211b" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

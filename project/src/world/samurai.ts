// The samurai, built from primitives. Model space: faces +z, right hand at -x.
// The katana is posed directly (position of the grip + blade direction, in
// torso space) and both arms reach for the grip with two-bone IK.

import * as THREE from 'three';

export type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  thighL: THREE.Group; thighR: THREE.Group;
  shinL: THREE.Group; shinR: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  upperL: THREE.Group; upperR: THREE.Group;
  foreL: THREE.Group; foreR: THREE.Group;
  katana: THREE.Group;
  tip: THREE.Object3D; base: THREE.Object3D;
  scarfAnchor: THREE.Object3D;
};

export const ARM_UPPER = 0.29;
export const ARM_FORE = 0.27;
export const SHOULDER_L = new THREE.Vector3(0.23, 0.5, 0);
export const SHOULDER_R = new THREE.Vector3(-0.23, 0.5, 0);
export const BLADE_LEN = 0.98;

const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

type Palette = Record<'straw' | 'strawDark' | 'hakama' | 'kimono' | 'lapel' | 'obi' | 'armour' | 'cord' | 'skin' | 'glove' | 'tabi' | 'steel' | 'gold' | 'wrap', THREE.MeshStandardMaterial>;

function palette(style: 'player' | 'ronin'): Palette {
  if (style === 'ronin') {
    // An ink-shadow ronin: nearly black, with a cursed red edge.
    return {
      straw: mat('#2d241c', { roughness: 1, flatShading: true }),
      strawDark: mat('#140f0b', { roughness: 1, side: THREE.BackSide }),
      hakama: mat('#0e0c11', { roughness: 0.95 }),
      kimono: mat('#1b161d', { roughness: 0.9 }),
      lapel: mat('#5a1414', { roughness: 0.8 }),
      obi: mat('#5e0d12', { roughness: 0.7, emissive: '#2a0204' }),
      armour: mat('#0b090c', { roughness: 0.4, metalness: 0.4 }),
      cord: mat('#8a1a1a', { roughness: 0.6, emissive: '#300404' }),
      skin: mat('#1e191d', { roughness: 0.8 }),
      glove: mat('#0a090c', { roughness: 0.7 }),
      tabi: mat('#2a2428', { roughness: 0.9 }),
      steel: mat('#9aa0ab', { metalness: 1, roughness: 0.25, emissive: '#ff2020', emissiveIntensity: 0.35 }),
      gold: mat('#5c4020', { metalness: 0.7, roughness: 0.4 }),
      wrap: mat('#2a0a0c', { roughness: 0.8 }),
    };
  }
  return {
    straw: mat('#b8935a', { roughness: 0.95, flatShading: true }),
    strawDark: mat('#6e5634', { roughness: 1, side: THREE.BackSide }),
    hakama: mat('#1d1a23', { roughness: 0.9 }),
    kimono: mat('#27325a', { roughness: 0.85 }),
    lapel: mat('#e9e1d3', { roughness: 0.8 }),
    obi: mat('#b3291f', { roughness: 0.7, emissive: '#2a0402' }),
    armour: mat('#241619', { roughness: 0.45, metalness: 0.3 }),
    cord: mat('#c2352a', { roughness: 0.6 }),
    skin: mat('#c99f86', { roughness: 0.7 }),
    glove: mat('#17151b', { roughness: 0.6 }),
    tabi: mat('#ddd6c8', { roughness: 0.9 }),
    steel: mat('#dfe6ef', { metalness: 1, roughness: 0.18, emissive: '#223', emissiveIntensity: 0.4 }),
    gold: mat('#c39a44', { metalness: 0.85, roughness: 0.3 }),
    wrap: mat('#141116', { roughness: 0.8 }),
  };
}

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, pos?: [number, number, number], rot?: [number, number, number]) {
  const o = new THREE.Mesh(geo, m);
  if (pos) o.position.set(...pos);
  if (rot) o.rotation.set(...rot);
  o.castShadow = true;
  return o;
}

function group(parent: THREE.Object3D, pos: [number, number, number] = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  return g;
}

function buildKatana(M: Palette) {
  const k = new THREE.Group();
  // Blade: a slightly curved, tapering strip along +z.
  const shape = new THREE.Shape();
  const L = BLADE_LEN;
  shape.moveTo(0, -0.018);
  shape.quadraticCurveTo(L * 0.5, -0.024, L * 0.96, 0.02);
  shape.lineTo(L, 0.045);
  shape.quadraticCurveTo(L * 0.5, 0.02, 0, 0.018);
  shape.closePath();
  const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 10 });
  blade.translate(0, 0, -0.003);
  blade.rotateY(-Math.PI / 2); // x → z
  k.add(mesh(blade, M.steel, [0, 0, 0.035]));
  k.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 16).rotateX(Math.PI / 2), M.gold, [0, 0, 0.03]));
  k.add(mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.28, 8).rotateX(Math.PI / 2), M.wrap, [0, 0, -0.12]));
  k.add(mesh(new THREE.SphereGeometry(0.024, 8, 6), M.gold, [0, 0, -0.26]));
  const tip = new THREE.Object3D(); tip.position.set(0, 0, L + 0.03); k.add(tip);
  const base = new THREE.Object3D(); base.position.set(0, 0, 0.12); k.add(base);
  return { k, tip, base };
}

export function buildSamurai(style: 'player' | 'ronin' = 'player'): Rig {
  const M = palette(style);
  const root = new THREE.Group();
  const body = group(root);
  const hips = group(body, [0, 0.93, 0]);

  // Legs: hakama thighs and shins, with tabi feet.
  const leg = (side: number) => {
    const thigh = group(hips, [side * 0.1, 0, 0]);
    thigh.add(mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.46, 10).translate(0, -0.23, 0), M.hakama));
    const shin = group(thigh, [0, -0.46, 0]);
    shin.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 10).translate(0, -0.21, 0), M.hakama));
    shin.add(mesh(new THREE.BoxGeometry(0.09, 0.06, 0.22), M.tabi, [0, -0.44, 0.04]));
    return { thigh, shin };
  };
  const L = leg(1), R = leg(-1);

  // Torso
  const torso = group(hips, [0, 0.02, 0]);
  const chest = new THREE.CylinderGeometry(0.2, 0.17, 0.52, 10);
  chest.scale(1, 1, 0.72);
  torso.add(mesh(chest.translate(0, 0.28, 0), M.kimono));
  torso.add(mesh(new THREE.BoxGeometry(0.38, 0.12, 0.28), M.obi, [0, 0.04, 0]));
  // Crossed lapels
  for (const s of [-1, 1]) {
    torso.add(mesh(new THREE.BoxGeometry(0.05, 0.36, 0.02), M.lapel, [s * 0.05, 0.36, 0.142], [0, 0, s * 0.42]));
  }
  // Lacquered shoulder plates (sode) with red lacing
  for (const s of [-1, 1]) {
    const sode = group(torso, [s * 0.27, 0.5, 0]);
    sode.rotation.z = s * 0.45;
    sode.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 0.24), M.armour));
    sode.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 0.24), M.armour, [s * 0.02, -0.07, 0]));
    sode.add(mesh(new THREE.BoxGeometry(0.21, 0.012, 0.25), M.cord, [s * 0.01, -0.035, 0]));
  }

  // Head and kasa hat
  const head = group(torso, [0, 0.6, 0]);
  head.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), M.skin, [0, 0, 0]));
  head.add(mesh(new THREE.SphereGeometry(0.115, 16, 12), M.skin, [0, 0.11, 0.01]));
  head.add(mesh(new THREE.SphereGeometry(0.118, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glove, [0, 0.12, -0.01]));
  const hat = group(head, [0, 0.21, 0.01]);
  hat.rotation.x = 0.1;
  hat.add(mesh(new THREE.ConeGeometry(0.4, 0.2, 24, 1, true), M.straw, [0, 0, 0]));
  hat.add(mesh(new THREE.ConeGeometry(0.4, 0.2, 24, 1, true), M.strawDark, [0, -0.005, 0]));
  hat.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), M.straw, [0, 0.1, 0]));
  // Chin cord
  hat.add(mesh(new THREE.TorusGeometry(0.1, 0.006, 4, 16, Math.PI), M.lapel, [0, -0.1, 0.02], [0, 0, Math.PI]));
  if (style === 'ronin') {
    // Two red embers where the eyes should be.
    const eye = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3020').multiplyScalar(3), toneMapped: false });
    for (const x of [-0.04, 0.04]) head.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), eye).translateX(x).translateY(0.12).translateZ(0.11));
  }

  // Arms: wide kimono sleeves over dark gauntlets.
  const arm = (shoulder: THREE.Vector3) => {
    const upper = group(torso, [shoulder.x, shoulder.y, shoulder.z]);
    upper.add(mesh(new THREE.CylinderGeometry(0.075, 0.12, ARM_UPPER, 10).translate(0, -ARM_UPPER / 2, 0), M.kimono));
    const fore = group(upper, [0, -ARM_UPPER, 0]);
    fore.add(mesh(new THREE.CylinderGeometry(0.045, 0.04, ARM_FORE, 8).translate(0, -ARM_FORE / 2, 0), M.glove));
    fore.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), M.glove, [0, -ARM_FORE, 0]));
    return { upper, fore };
  };
  const AL = arm(SHOULDER_L), AR = arm(SHOULDER_R);

  const { k: katana, tip, base } = buildKatana(M);
  torso.add(katana);

  // Scabbard on the left hip
  const saya = mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.9, 8), M.armour, [0.2, 0.02, -0.05], [1.2, 0.3, 0]);
  torso.add(saya);

  const scarfAnchor = new THREE.Object3D();
  scarfAnchor.position.set(0, 0.56, -0.1);
  torso.add(scarfAnchor);

  return {
    root, body, hips, thighL: L.thigh, thighR: R.thigh, shinL: L.shin, shinR: R.shin,
    torso, head, upperL: AL.upper, upperR: AR.upper, foreL: AL.fore, foreR: AR.fore,
    katana, tip, base, scarfAnchor,
  };
}

/* ---------------- posing helpers ---------------- */

const DOWN = new THREE.Vector3(0, -1, 0);
const FWD = new THREE.Vector3(0, 0, 1);
const tmp = { u: new THREE.Vector3(), perp: new THREE.Vector3(), up: new THREE.Vector3(), fore: new THREE.Vector3(), e: new THREE.Vector3(), q: new THREE.Quaternion(), qi: new THREE.Quaternion() };

/** Two-bone IK in torso space: reach `target` from `shoulder`, elbow toward `pole`. */
export function solveArm(upper: THREE.Group, fore: THREE.Group, shoulder: THREE.Vector3, target: THREE.Vector3, pole: THREE.Vector3) {
  const { u, perp, up, fore: fd, e, q, qi } = tmp;
  u.subVectors(target, shoulder);
  const a = ARM_UPPER, b = ARM_FORE;
  const d = Math.min(a + b - 0.001, Math.max(Math.abs(a - b) + 0.01, u.length()));
  u.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  perp.copy(pole).addScaledVector(u, -pole.dot(u)).normalize();
  up.copy(u).multiplyScalar(cosA).addScaledVector(perp, sinA).normalize();
  e.copy(shoulder).addScaledVector(up, a);
  fd.subVectors(target, e).normalize();
  q.setFromUnitVectors(DOWN, up);
  upper.quaternion.copy(q);
  qi.copy(q).invert();
  fore.quaternion.setFromUnitVectors(DOWN, fd).premultiply(qi);
}

export type BladePose = { pos: THREE.Vector3; dir: THREE.Vector3 };
export const pose = (x: number, y: number, z: number, dx: number, dy: number, dz: number): BladePose => ({
  pos: new THREE.Vector3(x, y, z),
  dir: new THREE.Vector3(dx, dy, dz).normalize(),
});

export function applyBlade(rig: Rig, p: BladePose) {
  rig.katana.position.copy(p.pos);
  rig.katana.quaternion.setFromUnitVectors(FWD, p.dir);
}

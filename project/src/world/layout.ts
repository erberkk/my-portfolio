// World layout shared by every scene piece: where the path runs, how high the
// ground is, and where each landmark sits. y is up; the walk heads toward -z.

import * as THREE from 'three';

/** Centre line of the stone path (sandō), as XZ control points. */
const PATH_POINTS: [number, number][] = [
  [0, 30], [0, 12], [0, -6], [0, -40], [-1.5, -50], [0.5, -60], [2.5, -70], [0.8, -79], [0, -86], [0, -112], [0, -128],
];

const pathCurve = new THREE.CatmullRomCurve3(
  PATH_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false, 'centripetal',
);
// z → x lookup so terrain and props can ask "where is the path here?"
const LUT: { z: number; x: number }[] = pathCurve.getSpacedPoints(400).map((p) => ({ z: p.z, x: p.x }));

export function pathX(z: number) {
  if (z >= LUT[0].z) return LUT[0].x;
  for (let i = 1; i < LUT.length; i++) {
    if (LUT[i].z <= z) {
      const a = LUT[i - 1], b = LUT[i];
      const t = (z - a.z) / (b.z - a.z || 1);
      return a.x + (b.x - a.x) * t;
    }
  }
  return LUT[LUT.length - 1].x;
}

// Stairs climb from STAIRS_START to STAIRS_END, reaching SUMMIT height.
export const STAIRS_START = -86;
export const STAIRS_END = -112;
export const SUMMIT = 9;
export const POND = { x: 12, z: -71, rx: 7.5, rz: 5.5, depth: 0.7 };

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// Cheap deterministic value noise for the hills.
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Height of the ground, before the stairs are carved in. */
export function heightAt(x: number, z: number) {
  // The hill the shrine sits on.
  const climb = smooth(STAIRS_START, STAIRS_END, z) * SUMMIT;
  // Rolling hills that grow away from the path.
  const off = Math.abs(x - pathX(z));
  const hills = (noise(x * 0.06, z * 0.06) * 2 + noise(x * 0.15, z * 0.15) * 0.6) * smooth(6, 30, off) * 3.2;
  // Keep a flat terrace around the path and the pond.
  const flat = 1 - smooth(3, 9, off);
  let h = climb + hills * (1 - flat * 0.9);
  const pdx = (x - POND.x) / POND.rx, pdz = (z - POND.z) / POND.rz;
  const pd = Math.sqrt(pdx * pdx + pdz * pdz);
  h -= (1 - smooth(0.85, 1.05, pd)) * POND.depth;
  // Beyond the summit edge the hill falls away behind the shrine.
  h -= smooth(-140, -170, z) * 12;
  return h;
}

/** Ground height on the path itself, stepping on the stairs. */
export function pathHeight(z: number) {
  if (z > STAIRS_START) return heightAt(pathX(z), z);
  if (z < STAIRS_END) return SUMMIT;
  const steps = 26;
  const t = (STAIRS_START - z) / (STAIRS_START - STAIRS_END);
  return Math.ceil(t * steps) / steps * SUMMIT;
}

export const LANDMARKS = {
  gate: new THREE.Vector3(0, 0, 8),
  tunnel: { from: -8, to: -40, spacing: 1.3, halfWidth: 1.75 },
  pagoda: new THREE.Vector3(-15, 0, -57),
  bridge: { x0: 5.4, x1: 18.6, z: -71, rise: 1.5 },
  shrine: new THREE.Vector3(0, SUMMIT, -124),
  bell: new THREE.Vector3(0, SUMMIT + 3.1, -118.6),
  bamboo: { x0: -24, x1: -7, z0: 4, z1: -30 },
  yard: new THREE.Vector3(9, 0, 14),
};

export const SPAWN = { x: 0, z: 23, heading: Math.PI };

export * from './sites';

/** Soft walk limits so the samurai stays on the island. */
export function inBounds(x: number, z: number) {
  return z < 34 && z > -134 && Math.abs(x - pathX(z)) < 30;
}

export const WATER_Y = -0.28;

/** Deck height of the arched bridge, or null when not on it. */
export function bridgeY(x: number, z: number): number | null {
  const b = LANDMARKS.bridge;
  if (Math.abs(z - b.z) > 1.05 || x < b.x0 || x > b.x1) return null;
  const t = (x - b.x0) / (b.x1 - b.x0);
  return 0.12 + Math.sin(t * Math.PI) * b.rise;
}

export function inPondWater(x: number, z: number) {
  return ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2 < 0.92;
}

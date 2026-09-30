// Where every repeated prop goes, computed once. Scene components render from
// these lists and the player collides against them, so they always agree.

import { heightAt, pathHeight, pathX, LANDMARKS, POND, STAIRS_END, STAIRS_START, SUMMIT, GRACES } from './layout';

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- colliders ---------- */
export type Circle = { x: number; z: number; r: number };
export type Box = { x0: number; x1: number; z0: number; z1: number };
export const circles: Circle[] = [];
export const boxes: Box[] = [];

/* ---------- stone lanterns (tōrō) ---------- */
export type Lantern = { x: number; y: number; z: number; rot: number; scale: number; year?: string };
export const lanterns: Lantern[] = [];
{
  const add = (x: number, z: number, scale = 1, year?: string) => {
    const onStairs = z < STAIRS_START && z > STAIRS_END;
    const y = onStairs ? pathHeight(z) : heightAt(x, z);
    lanterns.push({ x, y, z, rot: 0, scale, year });
    circles.push({ x, z, r: 0.42 * scale });
  };
  for (let z = 18; z >= 0; z -= 6) { add(pathX(z) - 2.7, z); add(pathX(z) + 2.7, z); }
  for (let z = -46; z >= -82; z -= 6) {
    if (z > -66 || z < -76) add(pathX(z) + 2.8, z);
    add(pathX(z) - 2.8, z);
  }
  // The stair lanterns carry the timeline, oldest at the bottom.
  const years = ['2021', '2024', '2024', '2025', '2026'];
  let i = 0;
  for (let z = -89; z >= -110; z -= 5.2, i++) {
    add(-2.9, z, 1, years[i]);
    add(2.9, z, 1);
  }
  add(-4.2, -116, 1.25); add(4.2, -116, 1.25);
  add(LANDMARKS.pagoda.x + 5.5, LANDMARKS.pagoda.z + 5, 1.1);
  add(LANDMARKS.pagoda.x - 5.5, LANDMARKS.pagoda.z + 5, 1.1);
}

/* ---------- sakura trees ---------- */
export type Tree = { x: number; y: number; z: number; scale: number; seed: number; weeping: boolean };
export const trees: Tree[] = [];
{
  const add = (x: number, z: number, scale: number, seed: number, weeping = false) => {
    trees.push({ x, y: heightAt(x, z) - 0.1, z, scale, seed, weeping });
    circles.push({ x, z, r: 0.45 * scale });
  };
  add(-7, 15, 1.15, 1); add(7.5, 4, 1.05, 2); add(-8.5, 2, 1.0, 3); add(-8.5, 27, 0.95, 4);
  add(8.5, 29, 1.0, 5); add(13.5, 2, 1.1, 6);
  add(-6, -47, 1.1, 7); add(6.5, -50, 1.0, 8); add(-22, -48, 1.3, 9);
  add(20.5, -64, 1.1, 10, true); add(3.5, -79, 1.0, 11, true); add(22, -78, 1.2, 12);
  add(-7.5, -121, 1.2, 13, true); add(7.5, -121, 1.2, 14, true);
  add(-6, -92, 0.9, 15); add(6.5, -102, 0.95, 16);
  // A loose ring of background trees so the horizon is never empty.
  const r = rng(99);
  for (let i = 0; i < 14; i++) {
    const z = 30 - r() * 160;
    const side = r() < 0.5 ? -1 : 1;
    const x = pathX(z) + side * (16 + r() * 12);
    if (x < -6 && z < 6 && z > -32) continue; // bamboo grove
    add(x, z, 0.9 + r() * 0.6, 200 + i, r() < 0.25);
  }
}

/* ---------- bamboo grove ---------- */
export type Stalk = { x: number; y: number; z: number; h: number; r: number; lean: number; leanDir: number };
export const bamboo: Stalk[] = [];
{
  const r = rng(7);
  const { x0, x1, z0, z1 } = LANDMARKS.bamboo;
  let tries = 0;
  while (bamboo.length < 170 && tries++ < 5000) {
    const x = x0 + r() * (x1 - x0), z = z1 + r() * (z0 - z1);
    // Leave a winding footpath through the grove.
    const trail = Math.abs(x - (-15 + Math.sin(z * 0.18) * 4));
    if (trail < 1.3) continue;
    if (bamboo.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < 0.55)) continue;
    const s = { x, y: heightAt(x, z) - 0.1, z, h: 7 + r() * 4.5, r: 0.085 + r() * 0.05, lean: r() * 0.08, leanDir: r() * Math.PI * 2 };
    bamboo.push(s);
    circles.push({ x, z, r: 0.16 });
  }
}

/* ---------- training dummies (makiwara) ---------- */
export const dummies: { x: number; y: number; z: number }[] = [];
{
  const { x, z } = LANDMARKS.yard;
  const spots: [number, number][] = [[0, 0], [2.4, -1.2], [-1.6, -2.4], [1.2, 2.6], [3.6, 1.6], [-0.4, 4.6]];
  for (const [dx, dz] of spots) {
    dummies.push({ x: x + dx, y: heightAt(x + dx, z + dz), z: z + dz });
    circles.push({ x: x + dx, z: z + dz, r: 0.3 });
  }
}

/* ---------- tunnel gates ---------- */
export const gates: { z: number; x: number; y: number; scale: number }[] = [];
{
  const { from, to, spacing, halfWidth } = LANDMARKS.tunnel;
  for (let z = from; z >= to; z -= spacing) {
    const x = pathX(z);
    gates.push({ z, x, y: heightAt(x, z), scale: 1 });
    circles.push({ x: x - halfWidth, z, r: 0.2 }, { x: x + halfWidth, z, r: 0.2 });
  }
}

/* ---------- big structures ---------- */
{
  const g = LANDMARKS.gate;
  circles.push({ x: g.x - 4, z: g.z, r: 0.5 }, { x: g.x + 4, z: g.z, r: 0.5 });
  const p = LANDMARKS.pagoda;
  boxes.push({ x0: p.x - 3.6, x1: p.x + 3.6, z0: p.z - 3.6, z1: p.z + 3.6 });
  const s = LANDMARKS.shrine;
  boxes.push({ x0: s.x - 5.2, x1: s.x + 5.2, z0: s.z - 4.2, z1: s.z + 3.2 });
  // Offering box in front of the shrine, and the low walls beside the stairs.
  circles.push({ x: 0, z: -117.3, r: 0.75 });
  boxes.push({ x0: -2.7, x1: -2.2, z0: -112, z1: -86 }, { x0: 2.2, x1: 2.7, z0: -112, z1: -86 });
  // Summit torii
  circles.push({ x: -2.2, z: -113.5, r: 0.3 }, { x: 2.2, z: -113.5, r: 0.3 });
  // Grace shrines are small but solid.
  for (const gr of GRACES) circles.push({ x: gr.x + 0.9, z: gr.z, r: 0.35 });
}

export { POND, SUMMIT };

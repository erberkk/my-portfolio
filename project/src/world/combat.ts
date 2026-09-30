import { live } from './store';

export type Swing = NonNullable<typeof live.swing>;

/** Is (x, z) inside the current blade arc? Returns the swing if so. */
export function hitBy(x: number, z: number, radius = 0.2): Swing | null {
  const s = live.swing;
  if (!s) return null;
  const dx = x - s.x, dz = z - s.z;
  const d = Math.hypot(dx, dz);
  if (d > s.reach + radius || d < 0.05) return null;
  const cos = (dx * s.dirX + dz * s.dirZ) / d;
  return cos >= Math.cos(s.angle / 2) ? s : null;
}

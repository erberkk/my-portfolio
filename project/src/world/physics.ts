import { STAIRS_END, STAIRS_START, bridgeY, heightAt, pathHeight } from './layout';
import { boxes, circles } from './placements';

export function groundAt(x: number, z: number) {
  const b = bridgeY(x, z);
  if (b !== null) return b;
  if (z < STAIRS_START && z > STAIRS_END && Math.abs(x) < 2.3) return pathHeight(z);
  if (z <= STAIRS_END && Math.abs(x) < 6) return Math.max(heightAt(x, z), pathHeight(z));
  return heightAt(x, z);
}

export function collide(p: { x: number; z: number }, R: number) {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of circles) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const min = c.r + R;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min && d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    for (const b of boxes) {
      const cx = Math.max(b.x0, Math.min(p.x, b.x1));
      const cz = Math.max(b.z0, Math.min(p.z, b.z1));
      const dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < R * R) {
        if (d2 < 1e-8) {
          // Inside: push out the shortest way.
          const opts = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z];
          const i = opts.indexOf(Math.min(...opts));
          if (i === 0) p.x = b.x0 - R; else if (i === 1) p.x = b.x1 + R; else if (i === 2) p.z = b.z0 - R; else p.z = b.z1 + R;
        } else {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * R;
          p.z = cz + (dz / d) * R;
        }
      }
    }
  }
}


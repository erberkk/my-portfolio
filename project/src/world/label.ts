import * as THREE from 'three';

export const JP_FONT = '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';

/** Make sure the web font glyphs we draw into canvases are actually loaded. */
export async function loadJapaneseFont(text: string) {
  try {
    await Promise.all([
      document.fonts.load(`800 64px ${JP_FONT}`, text),
      document.fonts.load(`500 64px ${JP_FONT}`, text),
    ]);
  } catch { /* fall back to system fonts */ }
}

type Opts = {
  font?: string;
  weight?: number;
  size?: number;
  color?: string;
  vertical?: boolean;
  bg?: string;
  pad?: number;
  width?: number;
  height?: number;
};

/** Draw text into a canvas texture (sharp, uses the page's web fonts). */
export function textTexture(text: string, o: Opts = {}) {
  const size = o.size ?? 128;
  const font = `${o.weight ?? 800} ${size}px ${o.font ?? JP_FONT}`;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  const chars = [...text];
  const pad = o.pad ?? size * 0.3;
  if (o.vertical) {
    c.width = o.width ?? Math.ceil(size + pad * 2);
    c.height = o.height ?? Math.ceil(chars.length * size * 1.05 + pad * 2);
  } else {
    c.width = o.width ?? Math.ceil(ctx.measureText(text).width + pad * 2);
    c.height = o.height ?? Math.ceil(size * 1.3 + pad * 2);
  }
  if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.font = font;
  ctx.fillStyle = o.color ?? '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (o.vertical) {
    const step = (c.height - pad * 2) / chars.length;
    chars.forEach((ch, i) => ctx.fillText(ch, c.width / 2, pad + step * (i + 0.5)));
  } else {
    ctx.fillText(text, c.width / 2, c.height / 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: c.width / c.height };
}

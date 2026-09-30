// Rewrites the Google Fonts link in index.html so it requests exactly the
// Japanese glyphs used in src/. Runs before every build.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const chars = new Set();
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(f)) {
      for (const ch of readFileSync(p, 'utf8')) if (/[　-鿿＀-￯]/.test(ch)) chars.add(ch);
    }
  }
};
walk('src');
const text = encodeURIComponent([...chars].sort().join(''));
const href = `https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;800&display=swap&text=${text}`;
const html = readFileSync('index.html', 'utf8');
const next = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Shippori\+Mincho[^"]*"\/>/, `<link rel="stylesheet" href="${href}"/>`);
if (next !== html) writeFileSync('index.html', next);
console.log(`jp-glyphs: ${chars.size} characters`);

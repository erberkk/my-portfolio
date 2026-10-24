/* ============================================================
   LIQUID CHROME — a raymarched mercury field on an OLED black page.
   Plain WebGL, one fullscreen triangle, no library.
   Shapes (weights sum to 1, the page blends between them on scroll):
     hero  · the mark: a liquid e that keeps gathering a drop, with satellites
     melt  · the body sags and drips
     ring  · a spinning liquid record
     chain · drops strung on a vertical line, one per milestone
     orb   · one calm mirror sphere
   Every change of shape throws a spray of droplets off the surface that fall
   back in, so the metal visibly tears and re-forms instead of cross-fading.
   The cursor is a drop of the same metal and merges with whatever it touches.
   ============================================================ */

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uSplash, uSplashT, uVel, uScale, uHover, uActive, uIntro, uDim, uLocal, uMorph;
uniform vec2 uOffset, uMove;
uniform vec3 uMouse;
uniform float uMouseOn;
uniform vec3 uLight;
uniform float wHero, wMelt, wRing, wChain, wOrb;

const float CAMZ = 4.2;
const float FOV = 0.62;       // tan(half vertical fov)

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
// two octaves of interfering sines: cheap, smooth, never repeats visibly
float wobble(vec3 p, float t) {
  float a = sin(p.x * 2.3 + t * 0.9) * sin(p.y * 2.1 + t * 1.1) * sin(p.z * 2.5 + t * 0.7);
  float b = sin(p.x * 4.7 - t * 1.3 + p.y) * sin(p.y * 5.1 + t * 0.8) * sin(p.z * 4.3 - t);
  return a + b * 0.35;
}
float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
vec3 hash3(float n) { return fract(sin(vec3(n, n + 1.7, n + 3.1)) * vec3(43758.5453, 22578.1459, 19642.3490)) * 2.0 - 1.0; }

// the hero is the mark itself: a liquid e whose open terminal keeps gathering a drop
float dHero(vec3 p, float t) {
  float g = uIntro;
  float form = ease(g * 1.3 - 0.2);
  vec3 q = p;
  q.xz *= rot(sin(t * 0.32) * 0.55);
  q.yz *= rot(0.18 + sin(t * 0.27) * 0.18);
  q.xy *= rot(sin(t * 0.2) * 0.08);
  float R = 0.7, tube = 0.17 * form + 0.001;
  // open bowl: a torus in the xy plane with a gap at the lower right
  float a = atan(q.y, q.x);
  const float GAP = 0.62;
  vec3 e0 = vec3(R, 0.0, 0.0), e1 = vec3(R * cos(-GAP), R * sin(-GAP), 0.0);
  float bowl = (a < 0.0 && a > -GAP)
    ? min(length(q - e0), length(q - e1)) - tube
    : length(vec2(length(q.xy) - R, q.z)) - tube;
  float d = smin(bowl, sdCapsule(q, vec3(-R, 0.0, 0.0), vec3(R, 0.0, 0.0), tube * 0.88), 0.12);
  // the terminal never ends: it gathers a drop, the drop lets go, a new one forms
  float cyc = fract(t * 0.16);
  float grow = ease(cyc / 0.7), fall = ease((cyc - 0.7) / 0.3);
  vec3 tip = e1 + vec3(0.03, -0.32 - 0.22 * grow, 0.0);
  d = smin(d, sdCapsule(q, e1, tip, 0.06 * form), 0.14);
  d = smin(d, length(q - tip) - (0.09 + 0.07 * grow) * (1.0 - fall) * form, 0.12);
  vec3 dropC = tip - vec3(0.0, 0.2 + fall * fall * 2.6, 0.0);
  d = smin(d, length(q - dropC) - 0.13 * fall * (1.0 - fall * 0.4), 0.1 * (1.0 - fall));
  d += 0.035 * wobble(p, t) * form;
  // satellites fly in for the intro, then orbit and graze the letter
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float arrive = ease((g - fi * 0.08) / 0.55);
    float an = t * (0.34 + fi * 0.06) + fi * 2.4;
    float rr = 1.15 + 0.18 * sin(t * 0.5 + fi * 2.1) + uSplash * (0.8 + fi * 0.12);
    vec3 orbit = vec3(cos(an) * rr, sin(an * 1.3 + fi) * 0.55 * rr, sin(an) * rr * 0.55);
    vec3 far = normalize(hash3(fi * 7.3) + vec3(0.0, 0.0, 0.4)) * (5.0 + fi * 0.4);
    vec3 c = mix(far, orbit, arrive);
    float rad = (0.09 + 0.05 * fract(fi * 0.618 + 0.2)) * (0.5 + 0.5 * arrive) + 0.25 * (1.0 - form) * arrive;
    d = smin(d, length(p - c) - rad, 0.36);
  }
  return d;
}

float dMelt(vec3 p, float t) {
  float sag = 0.75 + uLocal * 0.5;
  vec3 q = p; q.y -= 0.34;
  float d = length(q * vec3(1.0, 1.12, 1.0)) / 1.06 - 0.72 + 0.045 * wobble(p, t * 0.8);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float x = -0.45 + fi * 0.3 + 0.05 * sin(t * 0.7 + fi);
    float z = 0.22 * sin(fi * 2.3);
    float cyc = fract(t * (0.1 + fi * 0.03) + fi * 0.29);
    float len = ease(cyc / 0.75) * (0.7 + fi * 0.12) * sag;
    vec3 a = vec3(x, -0.08, z);
    vec3 b = vec3(x + 0.04 * sin(t + fi), -0.25 - len, z);
    float drip = sdCapsule(p, a, b, 0.045 + 0.035 * (1.0 - cyc));
    float tip = length(p - b) - (0.08 + 0.06 * ease((cyc - 0.25) / 0.5));
    d = smin(d, min(drip, tip), 0.3);
    float fall = ease((cyc - 0.75) / 0.25);
    vec3 dropC = vec3(b.x, b.y - 0.15 - fall * fall * 2.2, z);
    d = smin(d, length(p - dropC) - 0.11 * (1.0 - fall * 0.5), 0.12 * (1.0 - fall));
  }
  return d;
}

float dRing(vec3 p, float t) {
  vec3 q = p;
  q.yz *= rot(1.22 + 0.1 * sin(t * 0.4) - uLocal * 0.25);
  q.xy *= rot(uLocal * 0.35);
  q.xz *= rot(t * (0.3 + uHover * 1.4));
  float ang = atan(q.z, q.x);
  float tube = 0.24 + 0.035 * sin(ang * 5.0 + t * 1.6) + 0.05 * uHover * sin(ang * 11.0 - t * 6.0);
  vec2 tq = vec2(length(q.xz) - 0.98 - 0.03 * sin(ang * 3.0 - t), q.y);
  float d = length(tq) - tube;
  return smin(d, length(p) - (0.2 + 0.05 * sin(t * 2.0)), 0.5);
}

float dChain(vec3 p, float t) {
  float d = 1e5;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float on = 1.0 - ease(abs(uActive - fi));
    vec3 c = vec3(0.3 * sin(t * 0.7 + fi * 1.3 + uLocal * 3.0) - on * 0.15, 1.2 - fi * 0.6, 0.12 * cos(t + fi));
    d = smin(d, length(p - c) - (0.16 + on * 0.18 + 0.02 * sin(t * 2.0 + fi)), 0.32);
  }
  return d;
}

float dOrb(vec3 p, float t) {
  float r = length(p);
  float ripple = sin(p.y * 8.0 - t * 2.2) * 0.012 + sin(atan(p.z, p.x) * 6.0 + t) * 0.01;
  return r - 0.95 - uLocal * 0.08 + ripple + 0.03 * wobble(p, t * 0.5);
}

float scene(vec3 pw) {
  float t = uTime;
  vec3 p = (pw - vec3(uOffset, 0.0)) / uScale;
  // squash and stretch: the body leans into the direction it is being moved
  vec2 mv = clamp(uMove, -1.5, 1.5);
  p.xy -= mv * dot(normalize(p.xy + 1e-4), normalize(mv + 1e-4)) * 0.08 * length(mv);
  p.y /= 1.0 + clamp(uVel, -0.6, 0.6) * 0.22;
  p.xz *= rot(uVel * 0.25);
  float d = 0.0;
  if (wHero  > 0.001) d += wHero  * dHero(p, t);
  if (wMelt  > 0.001) d += wMelt  * dMelt(p, t);
  if (wRing  > 0.001) d += wRing  * dRing(p, t);
  if (wChain > 0.001) d += wChain * dChain(p, t);
  if (wOrb   > 0.001) d += wOrb   * dOrb(p, t);
  // the spray: droplets leave the surface while the shape is changing, then fall back in
  if (uMorph > 0.01) {
    // the body pinches in while it throws drops out
    d += 0.18 * uMorph;
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      vec3 dir = normalize(hash3(fi * 3.7 + 11.0) + vec3(0.0, 0.0, 0.35));
      float push = uMorph * (1.1 + 0.5 * fract(fi * 0.37));
      vec3 c = dir * (0.6 + push) + vec3(sin(t * 1.7 + fi) * 0.06, sin(t * 2.0 + fi) * 0.08, 0.0);
      d = smin(d, length(p - c) - (0.08 + 0.12 * uMorph) * (0.7 + 0.6 * fract(fi * 0.73)), 0.34);
    }
    d += 0.06 * uMorph * wobble(p * 1.8, t * 2.4);
  }
  float st = t - uSplashT;
  d += sin(length(p) * 14.0 - st * 14.0) * 0.025 * exp(-st * 2.2) * step(0.0, st);
  d *= uScale;
  // the cursor is a drop of the same metal
  float m = length(pw - uMouse) - 0.13 * uMouseOn;
  return smin(d, mix(1e3, m, step(0.01, uMouseOn)), 0.38 * uScale);
}

vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0015;
  return normalize(k.xyy * scene(p + k.xyy * e) + k.yyx * scene(p + k.yyx * e) +
                   k.yxy * scene(p + k.yxy * e) + k.xxx * scene(p + k.xxx * e));
}

// A studio built for chrome: black room, a long graded softbox overhead, two
// strip lights behind, a hard horizon, a faint cool/warm split, and a key light
// that follows the pointer.
vec3 env(vec3 r) {
  float y = r.y;
  float a = atan(r.x, r.z);
  vec3 c = vec3(0.0);
  c += mix(vec3(0.012, 0.012, 0.014), vec3(0.03, 0.032, 0.038), smoothstep(-0.3, 1.0, y));
  c += vec3(0.95) * exp(-pow((y + 0.03) * 15.0, 2.0)) * (0.6 + 0.4 * smoothstep(2.5, 0.0, abs(a)));
  c += vec3(0.045, 0.043, 0.04) * smoothstep(0.0, -0.9, y);
  float box = smoothstep(0.48, 0.66, y) * smoothstep(1.35, 0.55, abs(a));
  c += mix(vec3(1.3, 1.34, 1.42), vec3(2.1), smoothstep(0.66, 0.95, y)) * box;
  float strip = smoothstep(-0.45, 0.1, y) * smoothstep(0.95, 0.5, y);
  c += vec3(1.25, 1.27, 1.32) * smoothstep(0.1, 0.0, abs(a - 2.0)) * strip;
  c += vec3(1.15, 1.1, 1.05) * smoothstep(0.075, 0.0, abs(a + 2.25)) * strip;
  c += vec3(0.45) * smoothstep(0.035, 0.0, abs(a - 0.9)) * smoothstep(0.1, 0.55, y);
  c += vec3(0.3) * smoothstep(0.025, 0.0, abs(a + 0.7)) * smoothstep(-0.2, 0.3, y) * smoothstep(0.7, 0.3, y);
  float k = max(dot(r, uLight), 0.0);
  c += vec3(2.6) * pow(k, 110.0) + vec3(0.22) * pow(k, 7.0);
  return c;
}

vec3 shade(vec3 rd, vec3 n) {
  vec3 r = reflect(rd, n);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
  float disp = 0.03 + fres * 0.07;
  vec3 refl = vec3(env(normalize(r + n * disp)).r, env(r).g, env(normalize(r - n * disp)).b);
  return refl * mix(vec3(0.64, 0.65, 0.68), vec3(1.0), fres);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = vec3(0.0, 0.0, CAMZ);
  vec3 rd = normalize(vec3(uv * 2.0 * FOV, -1.0));

  // skip rays that cannot hit anything (the intro droplets fly in from outside the bound)
  vec3 oc = ro - vec3(uOffset, 0.0);
  float bR = (3.4 + (1.0 - uIntro) * 4.0) * uScale;
  float bb = dot(oc, rd), bc = dot(oc, oc) - bR * bR;
  float disc = bb * bb - bc;
  vec3 om = ro - uMouse;
  float mb = dot(om, rd), mc = dot(om, om) - 0.36;
  bool nearMouse = uMouseOn > 0.01 && mb * mb - mc > 0.0;
  if (disc < 0.0 && !nearMouse) { gl_FragColor = vec4(0.0); return; }

  float t = disc > 0.0 ? max(0.0, -bb - sqrt(disc)) : max(0.0, -mb - 0.6);
  float minD = 1e3, minT = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < minD) { minD = d; minT = t; }
    if (d < 0.0008 * t) { hit = true; break; }
    t += d * 0.82;
    if (t > 12.0) break;
  }

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float px = 1.5 / uRes.y * 2.0 * FOV;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 r = reflect(rd, n);
    col = shade(rd, n);
    // one bounce: chrome that faces other chrome reflects it
    float t2 = 0.03;
    for (int j = 0; j < 28; j++) {
      float d2 = scene(p + r * t2);
      if (d2 < 0.002) {
        vec3 n2 = normalAt(p + r * t2);
        col = mix(col, shade(r, n2) * 0.85, 0.9);
        break;
      }
      t2 += d2;
      if (t2 > 3.0) break;
    }
    float ao = clamp(scene(p + n * 0.12) / 0.12, 0.0, 1.0);
    col *= 0.5 + 0.5 * ao;
    alpha = 1.0;
  } else {
    // soft silhouette: a miss that passed close to the surface still covers part of the pixel
    float cover = 1.0 - smoothstep(0.0, px * minT, minD);
    if (cover > 0.001) { col = shade(rd, normalAt(ro + rd * minT)) * 0.85; alpha = cover; }
  }
  col = col / (1.0 + col * 0.5);
  col = pow(col, vec3(0.4545)) * uDim;
  // a whisper of dither so the gradients never band on OLED panels
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  // premultiplied: black where the metal is not, so whatever sits beneath shows through
  gl_FragColor = vec4(max(col, 0.0) * alpha, alpha);
}
`;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

export const SHAPES = ["hero", "melt", "ring", "chain", "orb"];

export function createChrome(canvas) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["uRes", "uTime", "uSplash", "uSplashT", "uVel", "uScale", "uHover", "uActive", "uIntro", "uDim", "uLocal", "uMorph", "uOffset", "uMove",
   "uMouse", "uMouseOn", "uLight", "wHero", "wMelt", "wRing", "wChain", "wOrb"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CAMZ = 4.2, FOV = 0.62;

  // target state the page writes; `cur` follows it with springs and easing
  const target = { shape: "hero", x: 0, y: 0, scale: 1, hover: 0, active: 0, vel: 0, dim: 1, intro: 0, local: 0 };
  const cur = { w: { hero: 1, melt: 0, ring: 0, chain: 0, orb: 0 }, hover: 0, active: 0, vel: 0, dim: 1, intro: 0, local: 0, morph: 0 };
  // slightly under-damped springs: the metal overshoots a touch and settles, like a heavy liquid
  const spring = { x: { v: 0, x: 0 }, y: { v: 0, x: 0 }, scale: { v: 0, x: 1 } };
  const mouse = { x: 0, y: 0, on: 0, tx: 0, ty: 0, ton: 0, has: false };
  let splash = 0, splashT = -10, time = 0, lastShape = "hero";

  let quality = matchMedia("(max-width: 860px)").matches ? 0.55 : 0.85;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  function resize() {
    const w = Math.max(1, Math.round(innerWidth * dpr * quality));
    const h = Math.max(1, Math.round(innerHeight * dpr * quality));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  addEventListener("resize", resize);
  resize();

  const halfH = () => CAMZ * FOV;
  const halfW = () => halfH() * (innerWidth / innerHeight);
  function toWorld(cx, cy) {
    const nx = (cx / innerWidth) * 2 - 1, ny = -((cy / innerHeight) * 2 - 1);
    const zPlane = 0.5, k = (CAMZ - zPlane) / CAMZ;
    return [nx * halfW() * k, ny * halfH() * k];
  }
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" && !fine) return;
    [mouse.tx, mouse.ty] = toWorld(e.clientX, e.clientY);
    if (!mouse.has) { mouse.x = mouse.tx; mouse.y = mouse.ty; mouse.has = true; }
    mouse.ton = 1;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.ton = 0; });

  function splashNow(strength = 1) {
    if (reduced) return;
    splash = Math.min(1, splash + strength);
    splashT = time;
  }

  let last = performance.now(), frames = 0, acc = 0, running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt * (reduced ? 0.25 : 1);
    const k = 1 - Math.pow(0.03, dt);        // ~1s glides
    const kSlow = 1 - Math.pow(0.12, dt);    // shape weights: slower, so a morph is watched, not snapped

    if (target.shape !== lastShape) { lastShape = target.shape; if (!reduced) cur.morph = Math.max(cur.morph, 1); }
    cur.morph *= Math.pow(0.3, dt);
    for (const s of SHAPES) cur.w[s] += ((target.shape === s ? 1 : 0) - cur.w[s]) * kSlow;
    const sum = SHAPES.reduce((a, s) => a + cur.w[s], 0);
    for (const key of ["hover", "active", "dim", "intro", "local"]) cur[key] += (target[key] - cur[key]) * k;
    cur.vel += (target.vel - cur.vel) * (1 - Math.pow(0.004, dt));
    target.vel *= Math.pow(0.03, dt);
    splash *= Math.pow(0.05, dt);

    // springs for placement; their velocity becomes squash and stretch
    const stiff = reduced ? 400 : 34, damp = reduced ? 40 : 7.5;
    for (const key of ["x", "y", "scale"]) {
      const s = spring[key];
      s.v += ((target[key] - s.x) * stiff - s.v * damp) * dt;
      s.x += s.v * dt;
    }

    const mk = 1 - Math.pow(0.0008, dt);
    mouse.x += (mouse.tx - mouse.x) * mk; mouse.y += (mouse.ty - mouse.y) * mk;
    mouse.on += (mouse.ton - mouse.on) * k;

    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uSplash, splash);
    gl.uniform1f(U.uSplashT, splashT);
    gl.uniform1f(U.uVel, cur.vel);
    gl.uniform1f(U.uScale, Math.max(0.05, spring.scale.x));
    gl.uniform1f(U.uHover, cur.hover);
    gl.uniform1f(U.uActive, cur.active);
    gl.uniform1f(U.uIntro, cur.intro);
    gl.uniform1f(U.uDim, cur.dim);
    gl.uniform1f(U.uLocal, cur.local);
    gl.uniform1f(U.uMorph, Math.min(1, cur.morph * (1 - cur.morph * 0.35) * 1.5));
    gl.uniform2f(U.uOffset, spring.x.x * halfW(), spring.y.x * halfH());
    gl.uniform2f(U.uMove, spring.x.v * 0.6, spring.y.v * 0.6);
    gl.uniform3f(U.uMouse, mouse.x, mouse.y, 0.5);
    gl.uniform1f(U.uMouseOn, mouse.on);
    const lx = mouse.has ? mouse.x / halfW() : 0.4, ly = mouse.has ? mouse.y / halfH() : 0.5;
    const l = [lx * 0.9, 0.35 + ly * 0.6, 0.75], ll = Math.hypot(...l);
    gl.uniform3f(U.uLight, l[0] / ll, l[1] / ll, l[2] / ll);
    for (const s of SHAPES) gl.uniform1f(U["w" + s[0].toUpperCase() + s.slice(1)], cur.w[s] / sum);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // adapt resolution every ~40 frames
    frames++; acc += dt;
    if (frames >= 40) {
      const avg = acc / frames;
      if (avg > 0.022 && quality > 0.4) { quality = Math.max(0.4, quality - 0.1); resize(); }
      else if (avg < 0.0135 && quality < 1) { quality = Math.min(1, quality + 0.05); resize(); }
      frames = 0; acc = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    target, splash: splashNow, halfW, halfH,
    // jump straight to the current target (first frame), so the page never opens mid-flight
    snap() { for (const key of ["x", "y", "scale"]) { spring[key].x = target[key]; spring[key].v = 0; } },
    get quality() { return quality; },
  };
}

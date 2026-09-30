// Every sound is synthesised with WebAudio; there are no audio files.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let ambient: { stop: () => void } | null = null;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext, seconds: number, brown = false) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}

/** A plucked string (Karplus–Strong), close enough to a koto at night. */
function pluck(freq: number, when: number, gain = 0.18) {
  const c = ac();
  const dur = 3.2;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  const period = Math.round(c.sampleRate / freq);
  const ring = new Float32Array(period).map(() => Math.random() * 2 - 1);
  for (let i = 0; i < d.length; i++) {
    const k = i % period;
    const next = (k + 1) % period;
    const v = ring[k];
    d[i] = v;
    ring[k] = (v + ring[next]) * 0.5 * 0.996;
  }
  const src = c.createBufferSource();
  src.buffer = b;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  src.connect(lp).connect(g).connect(master!);
  src.start(when);
}

function startAmbient() {
  const c = ac();
  const wind = c.createBufferSource();
  wind.buffer = noiseBuffer(c, 6, true);
  wind.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const wg = c.createGain();
  wg.gain.value = 0.16;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);
  wind.connect(lp).connect(wg).connect(master!);
  wind.start();
  lfo.start();

  // In scale (Miyako-bushi) on D: D Eb G A Bb.
  const scale = [293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99];
  let timer = 0;
  const phrase = () => {
    const t = c.currentTime + 0.05;
    const n = 1 + Math.floor(Math.random() * 3);
    let at = t;
    for (let i = 0; i < n; i++) {
      pluck(scale[Math.floor(Math.random() * scale.length)] / (Math.random() < 0.3 ? 2 : 1), at, 0.12);
      at += 0.25 + Math.random() * 0.5;
    }
    timer = window.setTimeout(phrase, 3500 + Math.random() * 5000);
  };
  timer = window.setTimeout(phrase, 1200);
  return {
    stop() {
      clearTimeout(timer);
      wg.gain.setTargetAtTime(0, c.currentTime, 0.4);
      setTimeout(() => { wind.stop(); lfo.stop(); }, 1500);
    },
  };
}

export function setSound(on: boolean) {
  enabled = on;
  if (on) {
    ac();
    if (!ambient) ambient = startAmbient();
  } else if (ambient) {
    ambient.stop();
    ambient = null;
  }
}

function noiseHit(dur: number, f0: number, f1: number, q: number, gain: number) {
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, c.currentTime);
  bp.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(bp).connect(g).connect(master!);
  src.start();
}

function tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', delay = 0, attack = 0.005) {
  const c = ac();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  swing() {
    if (!enabled) return;
    noiseHit(0.22, 3200, 600, 1.2, 0.35);
  },
  cut() {
    if (!enabled) return;
    noiseHit(0.12, 5000, 1800, 0.8, 0.5);
    tone(2600, 0.25, 0.05, 'triangle');
  },
  dodge() {
    if (!enabled) return;
    noiseHit(0.25, 700, 250, 0.8, 0.25);
  },
  /** The shrine bell: always plays, since ringing it is a deliberate click. */
  bell() {
    ac();
    const base = 523;
    [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(base * m, 3.2 - i * 0.6, 0.18 / (i + 1)));
    [0, 0.12, 0.26].forEach((d) => tone(base * 4.2, 0.4, 0.03, 'triangle', d));
  },
  clang(perfect = true) {
    if (!enabled) return;
    const f = perfect ? 1480 : 820;
    [1, 2.4, 3.9, 5.6].forEach((m, i) => tone(f * m * (0.98 + Math.random() * 0.04), perfect ? 0.9 - i * 0.15 : 0.35, (perfect ? 0.12 : 0.08) / (i + 1), 'triangle'));
    noiseHit(0.08, 7000, 3000, 0.7, perfect ? 0.5 : 0.3);
  },
  hurt() {
    if (!enabled) return;
    noiseHit(0.2, 400, 120, 0.9, 0.6);
    tone(90, 0.3, 0.2, 'sine');
  },
  warn() {
    if (!enabled) return;
    tone(110, 1.2, 0.25, 'sine');
    tone(165, 1.0, 0.12, 'triangle', 0.02);
    noiseHit(0.5, 300, 90, 0.6, 0.3);
  },
  deathblow() {
    if (!enabled) return;
    noiseHit(0.3, 6000, 500, 0.8, 0.6);
    tone(55, 1.6, 0.35, 'sine', 0.05);
    [196, 247, 294].forEach((f, i) => tone(f, 2, 0.05, 'sine', 0.2 + i * 0.05, 0.2));
  },
  death() {
    if (!enabled) return;
    tone(65, 3.5, 0.35, 'sine');
    tone(98, 3, 0.15, 'sine', 0.1);
    noiseHit(1.2, 200, 60, 0.5, 0.3);
  },
  grace() {
    if (!enabled) return;
    [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(f, 2.8, 0.06, 'sine', i * 0.08, 0.3));
  },
  discover() {
    if (!enabled) return;
    [293.66, 392, 440, 587.33].forEach((f, i) => pluck(f, ac().currentTime + i * 0.14, 0.16));
  },
};

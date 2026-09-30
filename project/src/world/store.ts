// Shared game state. The frame loop mutates `live` freely (no React renders);
// UI-facing state goes through `ui` + subscribe so the HUD re-renders only
// when something it shows actually changes.

import { useSyncExternalStore } from 'react';
import type { SectionId } from './sites';

export const live = {
  player: { x: 0, y: 0, z: 0, heading: 0, speed: 0 },
  /** Combat state of the samurai. */
  combat: {
    hp: 100, posture: 0,
    /** Clock time of the last deflect press, for the parry window. */
    parryAt: -10,
    guarding: false,
    invulnerable: false,
    dead: false,
    lastHitAt: -10,
  },
  /** Blows landed on the player this frame, queued by enemies. */
  incoming: [] as { kind: 'hit' | 'block' | 'deflect' | 'break'; dmg: number; x: number; z: number; perilous: boolean }[],
  /** Enemy snapshots for the HUD. */
  enemies: [] as { x: number; y: number; z: number; sx: number; sy: number; cx: number; cy: number; visible: boolean; hp: number; posture: number; state: string; engaged: boolean; perilous: boolean }[],
  camera: null as import('three').Camera | null,
  /** Hit-stop: the combat clock runs slower while > 0. */
  /** Index into `enemies` the camera is locked on to, or -1. */
  lockIndex: -1,
  hitstop: 0,
  shake: 0,
  /** Last grace the player rested at, where death returns you. */
  checkpoint: null as null | { x: number; z: number },
  camYaw: 0,
  /** Blade sweep of the current swing, for hit tests. */
  swing: null as null | { id: number; x: number; z: number; dirX: number; dirZ: number; angle: number; reach: number; y: number; tilt: number },
  /** Pond ripple / petal burst requests from anywhere. */
  bursts: [] as { x: number; y: number; z: number; n: number; t: number }[],
  bellRang: 0,
  canvas: null as HTMLCanvasElement | null,
  /** Fast-travel request, consumed by the player controller. */
  teleport: null as null | { x: number; z: number },
};

type UI = {
  phase: 'title' | 'playing' | 'paused';
  sound: boolean;
  nearGrace: SectionId | null;
  nearBell: boolean;
  menu: SectionId | null;
  discovered: SectionId[];
  area: { name: string; kanji: string; key: number } | null;
  banner: { title: string; kanji: string; key: number } | null;
  cuts: number;
  omikuji: number;
  touch: boolean;
  combat: boolean;
  shinobi: number;
  death: number;
  perilous: number;
  deathblow: boolean;
};

let ui: UI = {
  phase: 'title',
  sound: false,
  nearGrace: null,
  nearBell: false,
  menu: null,
  discovered: [],
  area: null,
  banner: null,
  cuts: 0,
  omikuji: 0,
  combat: false,
  shinobi: 0,
  death: 0,
  perilous: 0,
  deathblow: false,
  touch: typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches,
};

const listeners = new Set<() => void>();

export function setUI(patch: Partial<UI> | ((s: UI) => Partial<UI>)) {
  const p = typeof patch === 'function' ? patch(ui) : patch;
  let changed = false;
  for (const k in p) {
    if ((ui as Record<string, unknown>)[k] !== (p as Record<string, unknown>)[k]) { changed = true; break; }
  }
  if (!changed) return;
  ui = { ...ui, ...p };
  listeners.forEach((l) => l());
}

export const getUI = () => ui;

export function useUI<T>(select: (s: UI) => T): T {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => select(ui),
  );
}

export function discover(id: SectionId) {
  if (ui.discovered.includes(id)) return false;
  setUI({ discovered: [...ui.discovered, id] });
  return true;
}

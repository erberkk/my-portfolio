import type { PointerEvent as ReactPointerEvent } from 'react';
import Lenis from 'lenis';

let lenis: Lenis | null = null;

export function startSmoothScroll(reducedMotion: boolean) {
  if (reducedMotion || lenis) return () => {};
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
  let raf = 0;
  const loop = (time: number) => {
    lenis?.raf(time);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToId(id: string) {
  const el = id === 'top' ? document.body : document.getElementById(id);
  if (!el) return;
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
  if (lenis) lenis.scrollTo(el, { offset: id === 'top' ? 0 : -nav + 1, duration: 1.2 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
}

/** Pointer-follow highlight for `.spot` surfaces. */
export function trackSpot(e: ReactPointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

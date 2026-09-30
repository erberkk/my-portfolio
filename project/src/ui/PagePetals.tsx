import { useEffect, useRef, type CSSProperties } from 'react';

/** A few sakura petals drifting over the reading page. 2D canvas, cheap. */
export default function PagePetals({ fill = false, count = 26 }: { fill?: boolean; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = c.getContext('2d')!;
    let raf = 0, running = false, w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const petals = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h, s: 5 + Math.random() * 6,
      vx: 0.2 + Math.random() * 0.5, vy: 0.35 + Math.random() * 0.6,
      r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04, f: Math.random() * 6.28,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.f += 0.02;
        p.x += p.vx + Math.sin(p.f) * 0.4;
        p.y += p.vy;
        p.r += p.vr;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        if (p.x > w + 20) p.x = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, 0.55 + Math.abs(Math.sin(p.f)) * 0.45);
        ctx.fillStyle = 'rgba(244, 182, 198, 0.55)';
        ctx.beginPath();
        ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.4, p.s * 0.8, p.s * 0.6, p.s * 0.25, p.s);
        ctx.lineTo(0, p.s * 0.75);
        ctx.lineTo(-p.s * 0.25, p.s);
        ctx.bezierCurveTo(-p.s * 0.8, p.s * 0.6, -p.s * 0.9, -p.s * 0.4, 0, -p.s);
        ctx.fill();
        ctx.restore();
      }
      if (running) raf = requestAnimationFrame(draw);
    };
    // Only animate while the reading page is on screen.
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    });
    io.observe(c.parentElement!);
    window.addEventListener('resize', resize);
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', resize); };
  }, [count]);
  const style: CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, display: 'block' }
    : { position: 'sticky', top: 0, width: '100%', height: '100vh', marginBottom: '-100vh', pointerEvents: 'none', zIndex: 1, display: 'block' };
  return <canvas ref={ref} aria-hidden="true" style={style} />;
}

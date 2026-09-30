import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { live, useUI } from '../world/store';
import s from './Combat.module.css';

/** Re-show a transient overlay whenever `key` increments. */
function useFlash(key: number, ms: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!key) return;
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [key, ms]);
  return on;
}

export default function Combat() {
  const combat = useUI((u) => u.combat);
  const deathblow = useUI((u) => u.deathblow);
  const perilous = useFlash(useUI((u) => u.perilous), 850);
  const shinobi = useFlash(useUI((u) => u.shinobi), 1500);
  const death = useFlash(useUI((u) => u.death), 3500);

  const hp = useRef<HTMLDivElement>(null);
  const hpLag = useRef<HTMLDivElement>(null);
  const posture = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const foes = useRef<(HTMLDivElement | null)[]>([]);
  const reticle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let lag = 100;
    const loop = () => {
      const c = live.combat;
      lag += (c.hp - lag) * 0.04;
      if (hp.current) hp.current.style.transform = `scaleX(${c.hp / 100})`;
      if (hpLag.current) hpLag.current.style.transform = `scaleX(${Math.max(c.hp, lag) / 100})`;
      if (posture.current) {
        posture.current.style.transform = `scaleX(${c.posture / 100})`;
        posture.current.dataset.hot = c.posture > 75 ? '1' : '';
      }
      if (bars.current) bars.current.style.opacity = combat || c.hp < 100 || c.posture > 1 ? '1' : '0';
      const now = performance.now() / 1000;
      if (vignette.current) {
        // lastHitAt is in the game clock; approximate freshness from hp lag instead.
        vignette.current.style.opacity = String(Math.min(0.9, Math.max(0, (lag - c.hp) / 25)) + (c.hp < 30 ? 0.25 + Math.sin(now * 4) * 0.1 : 0));
      }
      const lockedFoe = live.enemies[live.lockIndex];
      if (reticle.current) {
        const box = reticle.current.parentElement!;
        if (lockedFoe && lockedFoe.visible) {
          reticle.current.style.opacity = '1';
          reticle.current.style.transform = `translate(${lockedFoe.cx * box.clientWidth}px, ${lockedFoe.cy * box.clientHeight}px)`;
        } else reticle.current.style.opacity = '0';
      }
      live.enemies.forEach((e, i) => {
        const el = foes.current[i];
        if (!el) return;
        if ((!e.engaged && live.lockIndex !== i) || !e.visible) { el.style.opacity = '0'; return; }
        el.style.opacity = '1';
        const box = el.parentElement!;
        el.style.transform = `translate(${e.sx * box.clientWidth}px, ${e.sy * box.clientHeight}px)`;
        const [h, p] = el.querySelectorAll<HTMLElement>('[data-bar]');
        h.style.transform = `scaleX(${e.hp / 100})`;
        p.style.transform = `scaleX(${e.posture / 100})`;
        p.dataset.hot = e.posture > 75 ? '1' : '';
        el.dataset.peril = e.perilous ? '1' : '';
        el.dataset.stagger = e.state === 'stagger' ? '1' : '';
      });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [combat]);

  return (
    <div className={s.layer}>
      <div ref={vignette} className={s.vignette} />
      <div ref={reticle} className={s.reticle}><span /></div>

      {[0, 1, 2].map((i) => (
        <div key={i} ref={(el) => { foes.current[i] = el; }} className={s.foe}>
          <span className={s.danger}>危</span>
          <div className={s.foePosture}><div data-bar="p" /></div>
          <div className={s.foeHp}><div data-bar="h" /></div>
        </div>
      ))}

      <div ref={bars} className={s.bars}>
        <div className={s.postureTrack}><div ref={posture} className={s.posture} /></div>
        <div className={s.hpTrack}>
          <div ref={hpLag} className={s.hpLag} />
          <div ref={hp} className={s.hp} />
        </div>
      </div>

      <AnimatePresence>
        {deathblow && !shinobi && (
          <motion.div className={s.deathblow} initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <span className={s.dbKanji}>忍殺</span> Strike now: deathblow
          </motion.div>
        )}
        {perilous && (
          <motion.div key="peril" className={s.perilous} initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>危</motion.div>
        )}
        {shinobi && (
          <motion.div key="shinobi" className={s.shinobi} initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            忍殺
          </motion.div>
        )}
        {death && (
          <motion.div key="death" className={s.death} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
            <motion.span initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>死</motion.span>
            <p>Returning to the last grace…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import { startSmoothScroll } from './lib/scroll';
import Nav from './ui/Nav';
import GameHero from './ui/GameHero';
import Sections from './ui/Sections';
import CommandMenu from './components/CommandMenu';
import Toast from './components/Toast';
import { getUI } from './world/store';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = !!useReducedMotion();

  useEffect(() => startSmoothScroll(reduced), [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (document.pointerLockElement) document.exitPointerLock();
        setMenuOpen((o) => !o);
      } else if (e.key === '/' && !menuOpen && getUI().phase !== 'playing' && !(e.target as HTMLElement).closest('input, textarea')) {
        e.preventDefault();
        setMenuOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <a href="#impact" className="skip">Skip to the portfolio</a>
      <Nav onOpenMenu={() => setMenuOpen(true)} />
      <main id="main">
        <GameHero />
        <Sections />
      </main>
      <CommandMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Toast />
    </MotionConfig>
  );
}

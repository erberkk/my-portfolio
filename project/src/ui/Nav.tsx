import { useEffect, useState } from 'react';
import { Command } from 'lucide-react';
import { profile, sections } from '../data/site';
import { scrollToId } from '../lib/scroll';
import { useUI } from '../world/store';
import s from './Nav.module.css';

export default function Nav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const phase = useUI((u) => u.phase);
  const menu = useUI((u) => u.menu);
  // Out of the way while you are actually playing at the top of the page.
  const immersive = phase === 'playing' && !menu && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id); },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((x) => { const el = document.getElementById(x.id); if (el) io.observe(el); });
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); };
  }, []);

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className={`${s.nav} ${scrolled ? s.solid : ''} ${immersive ? s.hidden : ''}`}>
      <div className={s.inner}>
        <a href="#top" className={s.mark} onClick={(e) => { e.preventDefault(); scrollToId('top'); }}>
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>{profile.name}</span>
        </a>
        <nav aria-label="Sections" className={s.links}>
          {sections.map((x) => (
            <a key={x.id} href={`#${x.id}`} aria-current={active === x.id ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); scrollToId(x.id); }}>
              <span className={s.k} aria-hidden="true">{x.kanji}</span>{x.label}
            </a>
          ))}
        </nav>
        <div className={s.actions}>
          <button className={s.cmd} onClick={onOpenMenu} aria-label="Open command menu">
            <span className={s.cmdKeys}>{isMac ? '⌘' : 'Ctrl'} K</span>
            <span className={s.cmdMenu}><Command size={13} />Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, Lock, MapPin, Volume2, VolumeX, X } from 'lucide-react';
import { fortunes, sections } from '../data/site';
import { GRACES, type SectionId } from '../world/sites';
import { getUI, live, setUI, useUI } from '../world/store';
import { clearInput, input } from '../world/input';
import { setSound } from '../world/audio';
import { CONTENT } from '../content/Content';
import { scrollToId } from '../lib/scroll';
import Combat from './Combat';
import s from './Hud.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

export function lockPointer() {
  const c = live.canvas;
  if (!c || getUI().touch) return;
  try { void c.requestPointerLock(); } catch { /* not allowed */ }
}

export function startGame(sound: boolean) {
  setSound(sound);
  setUI({ phase: 'playing', sound });
  window.scrollTo({ top: 0 });
  lockPointer();
}

/* ---------------- title ---------------- */

function Title({ ready }: { ready: boolean }) {
  return (
    <motion.div className={s.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
      <div className={s.titleInner}>
        <motion.div className={s.vertical} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 1.2, ease: EASE }}>夜桜の道</motion.div>
        <div>
          <motion.p className="mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}>
            Full-stack software engineer · Istanbul
          </motion.p>
          <motion.h1 className={s.name} initial={{ opacity: 0, letterSpacing: '0.3em' }} animate={{ opacity: 1, letterSpacing: '0.08em' }} transition={{ delay: 0.3, duration: 1.6, ease: EASE }}>
            Erberk Akbulut
          </motion.h1>
          <motion.p className={s.katakana} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }}>エルベルク・アクブルト</motion.p>
          <motion.p className={s.pitch} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.9, ease: EASE }}>
            I build the <em>boring parts</em>: the systems that quietly run themselves. This is a shrine I built to show them.
            Walk it, cut some bamboo, deflect a ronin or two, and pray at the golden lights to read about my work.
          </motion.p>
          <motion.div className={s.titleActions} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.9, ease: EASE }}>
            <button className={`btn btn-primary ${s.begin}`} disabled={!ready} onClick={() => startGame(true)}>
              {ready ? <>Begin the walk <Volume2 size={16} /></> : 'Lighting the lanterns…'}
            </button>
            <button className="btn btn-ghost" disabled={!ready} onClick={() => startGame(false)}>Begin muted</button>
            <button className={`btn btn-ghost ${s.read}`} onClick={() => scrollToId('impact')}>
              Just read the portfolio <ArrowDown size={15} />
            </button>
          </motion.div>
        </div>
      </div>
      <motion.div className={s.controls} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
        <Controls />
      </motion.div>
    </motion.div>
  );
}

function Controls() {
  const touch = useUI((u) => u.touch);
  if (touch) return <span>Left stick to move · drag to look · 斬 cut · 弾 deflect · 避 dodge · 狙 lock on · 祈 pray</span>;
  return (
    <>
      <span><span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span> move</span>
      <span><span className="kbd">Shift</span> run</span>
      <span>Mouse look</span>
      <span><span className="kbd">Click</span> cut</span>
      <span><span className="kbd">Q</span> / <span className="kbd">Right-click</span> deflect</span>
      <span><span className="kbd">Space</span> dodge</span>
      <span><span className="kbd">Middle-click</span> / <span className="kbd">R</span> lock on</span>
      <span><span className="kbd">E</span> pray</span>
      <span><span className="kbd">Esc</span> pause</span>
    </>
  );
}

/* ---------------- compass ---------------- */

const CARDINALS: [string, number][] = [['北', Math.PI], ['東', Math.PI / 2], ['南', 0], ['西', -Math.PI / 2]];

function Compass() {
  const bar = useRef<HTMLDivElement>(null);
  const discovered = useUI((u) => u.discovered);
  useEffect(() => {
    let raf = 0;
    const W = 440, FOV = Math.PI * 0.9;
    const loop = () => {
      const el = bar.current;
      if (el) {
        const yaw = live.camYaw;
        el.querySelectorAll<HTMLElement>('[data-bearing]').forEach((m) => {
          let b = Number(m.dataset.bearing);
          if (m.dataset.gx) b = Math.atan2(Number(m.dataset.gx) - live.player.x, Number(m.dataset.gz) - live.player.z);
          let d = Math.atan2(Math.sin(b - yaw), Math.cos(b - yaw));
          d = -d; // screen x grows to the right
          const x = (d / FOV) * W + W / 2;
          m.style.transform = `translateX(${x}px)`;
          m.style.opacity = String(Math.max(0, 1 - Math.abs(d) / (FOV / 2)) ** 0.6);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={s.compass} ref={bar} aria-hidden="true">
      <div className={s.compassLine} />
      {CARDINALS.map(([k, b]) => <span key={k} className={s.cardinal} data-bearing={b}>{k}</span>)}
      {GRACES.map((g) => (
        <span key={g.id} className={`${s.graceMark} ${discovered.includes(g.id) ? s.known : ''}`} data-bearing={0} data-gx={g.x} data-gz={g.z} title={g.name} />
      ))}
      <span className={s.compassTick} />
    </div>
  );
}

/* ---------------- banners ---------------- */

function AreaCard() {
  const area = useUI((u) => u.area);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!area) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), 3600);
    return () => clearTimeout(id);
  }, [area]);
  return (
    <AnimatePresence>
      {show && area && (
        <motion.div key={area.key} className={s.area} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}>
          <span className={s.areaKanji}>{area.kanji}</span>
          <span className={s.areaRule} />
          <span className={s.areaName}>{area.name}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Banner() {
  const banner = useUI((u) => u.banner);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!banner) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(id);
  }, [banner]);
  return (
    <AnimatePresence>
      {show && banner && (
        <motion.div key={banner.key} className={s.banner} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>
          <div className={s.bannerBand} />
          <span className={s.bannerText}>{banner.title}</span>
          <span className={s.bannerKanji}>{banner.kanji}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Prompt() {
  const nearGrace = useUI((u) => u.nearGrace);
  const nearBell = useUI((u) => u.nearBell);
  const touch = useUI((u) => u.touch);
  const grace = GRACES.find((g) => g.id === nearGrace);
  const meta = sections.find((x) => x.id === nearGrace);
  const text = grace ? <>Pray at <b>{grace.kanji}</b> · read “{meta?.label}”</> : nearBell ? <>Ring the bell <b>鈴</b> · draw a fortune</> : null;
  return (
    <AnimatePresence>
      {text && (
        <motion.div className={s.prompt} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
          {!touch && <span className="kbd">E</span>} {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stats() {
  const discovered = useUI((u) => u.discovered);
  const cuts = useUI((u) => u.cuts);
  return (
    <div className={s.stats}>
      <span title="Sites of grace found">
        {GRACES.map((g) => <i key={g.id} className={discovered.includes(g.id) ? s.lit : ''} />)}
        <em>{discovered.length}/{GRACES.length}</em>
      </span>
      {cuts > 0 && <span title="Cuts"><b className="jp">斬</b> {cuts}</span>}
    </div>
  );
}

/* ---------------- grace menu ---------------- */

function GraceMenu() {
  const menu = useUI((u) => u.menu);
  const discovered = useUI((u) => u.discovered);
  const [sel, setSel] = useState<SectionId | null>(null);
  useEffect(() => { if (menu) setSel(menu); }, [menu]);
  const close = () => { setUI({ menu: null }); lockPointer(); };
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);
  const current = sections.find((x) => x.id === sel);
  const Body = sel ? CONTENT[sel] : null;
  const travel = (id: SectionId) => {
    const g = GRACES.find((x) => x.id === id)!;
    live.teleport = { x: g.x - 1.2, z: g.z + 1.2 };
    setUI({ menu: null });
    lockPointer();
  };

  return (
    <AnimatePresence>
      {menu && current && Body && (
        <motion.div className={s.menu} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} data-lenis-prevent>
          <nav className={s.menuSide} aria-label="Sites of grace">
            <div className={s.menuHead}><span className="jp">恩寵</span> Sites of Grace</div>
            <ul>
              {GRACES.map((g) => {
                const meta = sections.find((x) => x.id === g.id)!;
                const known = discovered.includes(g.id);
                return (
                  <li key={g.id}>
                    <button className={`${s.menuItem} ${sel === g.id ? s.active : ''}`} disabled={!known} onClick={() => setSel(g.id)}>
                      <span className={s.menuKanji}>{known ? meta.kanji : '？'}</span>
                      <span>
                        <span className={s.menuLabel}>{known ? meta.label : 'Undiscovered'}</span>
                        <span className={s.menuPlace}>{known ? g.name : 'Keep walking the path'}</span>
                      </span>
                      {!known && <Lock size={13} className={s.menuLock} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className={s.menuActions}>
              {sel && sel !== menu && discovered.includes(sel) && (
                <button className="btn" onClick={() => travel(sel)}><MapPin size={15} /> Travel here</button>
              )}
              <button className="btn btn-ghost" onClick={close}><X size={15} /> Rise <span className="kbd">Esc</span></button>
            </div>
          </nav>
          <section className={s.menuBody} aria-labelledby="grace-title">
            <header className={s.menuTitle}>
              <span className={s.menuTitleKanji}>{current.kanji}</span>
              <div>
                <span className="mono">{current.label} · {current.reading}</span>
                <h2 id="grace-title">{current.title}</h2>
              </div>
            </header>
            <motion.div key={sel} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <Body compact />
            </motion.div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- pause & omikuji ---------------- */

function Paused() {
  const phase = useUI((u) => u.phase);
  return (
    <AnimatePresence>
      {phase === 'paused' && (
        <motion.div className={s.paused} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <span className={s.pausedKanji}>休</span>
          <p className="mono">Paused</p>
          <div className={s.titleActions}>
            <button className="btn btn-primary" onClick={() => { setUI({ phase: 'playing' }); window.scrollTo({ top: 0 }); lockPointer(); }}>Resume</button>
            <button className="btn btn-ghost" onClick={() => scrollToId('impact')}>Read the portfolio <ArrowDown size={15} /></button>
          </div>
          <div className={s.controls}><Controls /></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Omikuji() {
  const n = useUI((u) => u.omikuji);
  const [open, setOpen] = useState(false);
  const fortune = useMemo(() => fortunes[Math.floor(Math.random() * fortunes.length)], [n]);
  useEffect(() => {
    if (n === 0) return;
    setOpen(true);
    if (document.pointerLockElement) document.exitPointerLock();
  }, [n]);
  const close = () => { setOpen(false); if (getUI().phase === 'paused') setUI({ phase: 'playing' }); lockPointer(); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={s.omikujiWrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className={s.omikuji} initial={{ y: 40, rotate: -2, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ duration: 0.8, ease: EASE }}>
            <span className={s.slipHead}>御神籤</span>
            <span className={s.slipRank}>{fortune.kanji}</span>
            <span className="mono">{fortune.rank}</span>
            <p>{fortune.text}</p>
            <button className="btn" onClick={close}>Tie it to the tree</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- touch controls ---------------- */

function TouchControls() {
  const nearAny = useUI((u) => !!u.nearGrace || u.nearBell);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerId !== id.current || !base.current || !knob.current) return;
    const r = base.current.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    input.stick.x = dx; input.stick.y = -dy; input.stick.active = true;
    knob.current.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== id.current) return;
    id.current = null;
    input.stick.x = input.stick.y = 0; input.stick.active = false;
    if (knob.current) knob.current.style.transform = '';
  };
  return (
    <>
      <div
        ref={base}
        className={s.stick}
        onPointerDown={(e) => { e.stopPropagation(); id.current = e.pointerId; (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div ref={knob} className={s.knob} />
      </div>
      <div className={s.buttons}>
        {nearAny && <button className={`${s.tbtn} ${s.pray}`} onPointerDown={() => { input.interact = true; }}>祈</button>}
        <button className={s.tbtn} onPointerDown={() => { input.lock = true; }}>狙</button>
        <button className={s.tbtn} onPointerDown={() => { input.dodge = true; }}>避</button>
        <button className={s.tbtn} onPointerDown={() => { input.parry = true; input.guard = true; }} onPointerUp={() => { input.guard = false; }} onPointerCancel={() => { input.guard = false; }}>弾</button>
        <button className={`${s.tbtn} ${s.cut}`} onPointerDown={() => { input.attack = true; }}>斬</button>
      </div>
      <button className={s.touchPause} onClick={() => { clearInput(); setUI({ phase: 'paused' }); }}>休</button>
    </>
  );
}

/* ---------------- root ---------------- */

export default function Hud({ ready }: { ready: boolean }) {
  const phase = useUI((u) => u.phase);
  const menu = useUI((u) => u.menu);
  const sound = useUI((u) => u.sound);
  const touch = useUI((u) => u.touch);
  const playing = phase === 'playing' && !menu;

  return (
    <div className={s.hud} data-phase={phase}>
      <AnimatePresence>{phase === 'title' && <Title ready={ready} />}</AnimatePresence>
      {phase !== 'title' && (
        <>
          <div className={s.top} style={{ opacity: playing ? 1 : 0 }}>
            <Compass />
          </div>
          <Combat />
          <AreaCard />
          <Banner />
          {playing && <Prompt />}
          {playing && <Stats />}
          {playing && touch && <TouchControls />}
          <button
            className={s.soundBtn}
            style={{ opacity: playing ? 0.7 : 1 }}
            onClick={() => { setSound(!sound); setUI({ sound: !sound }); }}
            aria-label={sound ? 'Mute' : 'Unmute'}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </>
      )}
      <GraceMenu />
      <Paused />
      <Omikuji />
    </div>
  );
}

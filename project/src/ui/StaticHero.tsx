import { motion } from 'motion/react';
import { ArrowDown, Swords } from 'lucide-react';
import { scrollToId } from '../lib/scroll';
import PagePetals from './PagePetals';
import s from './StaticHero.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The phone-first opening: an illustrated night shrine drawn in SVG, no WebGL.
 * The 3D shrine only loads if someone asks for it.
 */
export default function StaticHero({ onPlay, canPlay }: { onPlay: () => void; canPlay: boolean }) {
  return (
    <div className={s.hero}>
      <svg className={s.scene} viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#07061a" />
            <stop offset="0.55" stopColor="#1b1230" />
            <stop offset="1" stopColor="#3a1d34" />
          </linearGradient>
          <radialGradient id="moonGlow">
            <stop offset="0" stopColor="#c9ccff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c9ccff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fuji" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a2446" />
            <stop offset="1" stopColor="#15112a" />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#120e1c" />
            <stop offset="1" stopColor="#0b0910" />
          </linearGradient>
        </defs>
        <rect width="400" height="700" fill="url(#sky)" />
        <circle cx="120" cy="150" r="130" fill="url(#moonGlow)" />
        <circle cx="120" cy="150" r="42" fill="#f6f1e6" />
        <circle cx="108" cy="140" r="9" fill="#e6dfd0" opacity="0.6" />
        <circle cx="132" cy="162" r="6" fill="#e6dfd0" opacity="0.5" />
        {/* Fuji and ridges */}
        <path d="M150 470 L250 300 Q262 285 274 300 L380 470 Z" fill="url(#fuji)" />
        <path d="M238 320 L250 300 Q262 285 274 300 L286 320 L276 314 L268 324 L258 312 L248 324 Z" fill="#8f97c4" />
        <path d="M-10 470 L40 420 L90 445 L150 400 L210 440 L260 410 L320 450 L410 405 L410 520 L-10 520 Z" fill="#1a1428" />
        <path d="M-10 520 L60 480 L130 505 L200 470 L280 500 L350 475 L410 495 L410 700 L-10 700 Z" fill="url(#ground)" />
        {/* Path of lanterns receding */}
        {[0, 1, 2, 3].map((i) => {
          const y = 520 + i * 36, x = 200 - (70 + i * 26), k = 0.5 + i * 0.25;
          return (
            <g key={i}>
              <rect x={x - 3 * k} y={y - 16 * k} width={6 * k} height={9 * k} fill="#ffb35c" className={s.flame} style={{ animationDelay: `${i * 0.4}s` }} />
              <rect x={400 - x - 3 * k} y={y - 16 * k} width={6 * k} height={9 * k} fill="#ffb35c" className={s.flame} style={{ animationDelay: `${i * 0.4 + 0.2}s` }} />
            </g>
          );
        })}
        {/* Torii */}
        <g className={s.torii}>
          <path d="M112 402 Q200 388 288 402 L290 414 Q200 402 110 414 Z" fill="#17121a" />
          <rect x="124" y="414" width="152" height="9" fill="#c8412a" />
          <rect x="130" y="438" width="140" height="8" fill="#c8412a" />
          <rect x="194" y="421" width="12" height="18" fill="#c8412a" />
          <rect x="146" y="414" width="11" height="170" fill="#c8412a" />
          <rect x="243" y="414" width="11" height="170" fill="#c8412a" />
          <rect x="143" y="578" width="17" height="8" fill="#17121a" />
          <rect x="240" y="578" width="17" height="8" fill="#17121a" />
        </g>
        {/* Sakura branches framing the top */}
        <g className={s.branch}>
          <path d="M410 40 Q330 70 300 120 Q280 150 240 160 M330 80 Q350 120 340 150" stroke="#1d1418" strokeWidth="7" fill="none" strokeLinecap="round" />
          {[[300, 110, 26], [262, 150, 22], [340, 150, 20], [360, 70, 28], [320, 70, 18], [240, 168, 16], [385, 100, 20]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#f39bb4' : '#f7b3c6'} opacity="0.92" />
          ))}
        </g>
        <g className={s.branch2}>
          <path d="M-10 250 Q40 240 70 270 Q90 290 80 320" stroke="#1d1418" strokeWidth="6" fill="none" strokeLinecap="round" />
          {[[60, 262, 20], [82, 300, 18], [30, 240, 16], [74, 330, 13]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#f5a7bd' : '#fcd1dc'} opacity="0.9" />
          ))}
        </g>
      </svg>
      <PagePetals fill count={18} />
      <div className={s.veil} />

      <div className={s.content}>
        <motion.span className={s.vertical} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 1 }}>夜桜の道</motion.span>
        <motion.p className="mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>Full-stack software engineer · Istanbul</motion.p>
        <motion.h1 className={s.name} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 1, ease: EASE }}>Erberk Akbulut</motion.h1>
        <motion.p className={s.katakana} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>エルベルク・アクブルト</motion.p>
        <motion.p className={s.pitch} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8, ease: EASE }}>
          I build the <em>boring parts</em>: the systems that quietly run themselves.
        </motion.p>
        <motion.div className={s.actions} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8, ease: EASE }}>
          <button className="btn btn-primary" onClick={() => scrollToId('impact')}>Read the portfolio <ArrowDown size={15} /></button>
          {canPlay && (
            <button className="btn btn-ghost" onClick={onPlay}><Swords size={15} /> Play the shrine</button>
          )}
        </motion.div>
        {canPlay && <p className={s.note}>A small 3D game. Best on a computer.</p>}
      </div>
    </div>
  );
}

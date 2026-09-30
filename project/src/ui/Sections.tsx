import { motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { profile, sections } from '../data/site';
import { CONTENT } from '../content/Content';
import { scrollToId } from '../lib/scroll';
import PagePetals from './PagePetals';
import s from './Sections.module.css';

const NUMERALS = ['壱', '弐', '参', '肆', '伍'];
const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: '0px 0px -15% 0px' } as const;

export default function Sections() {
  return (
    <div className={s.page}>
      <PagePetals />
      <div className={s.intro}>
        <div className="container">
          <motion.p className="mono" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW}>
            The portfolio, without the walking
          </motion.p>
          <motion.p
            className={s.introText}
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
            viewport={VIEW}
            transition={{ duration: 1.4, ease: EASE }}
          >
            Everything the shrine holds, in reading order. Five sections, one per site of grace.
          </motion.p>
        </div>
      </div>
      {sections.map((sec, i) => {
        const Body = CONTENT[sec.id];
        return (
          <motion.section
            key={sec.id}
            id={sec.id}
            className={s.section}
            aria-labelledby={`${sec.id}-title`}
            initial="hidden"
            whileInView="shown"
            viewport={VIEW}
          >
            <div className={`container ${s.grid}`}>
              <aside className={s.side} aria-hidden="true">
                <div className={s.sticky}>
                  <motion.span
                    className={s.hanko}
                    variants={{ hidden: { opacity: 0, scale: 1.6, rotate: -18 }, shown: { opacity: 1, scale: 1, rotate: -6 } }}
                    transition={{ duration: 0.45, delay: 0.5, ease: [0.3, 1.6, 0.5, 1] }}
                  >
                    {NUMERALS[i]}
                  </motion.span>
                  {/* Brush-stroke reveal, top to bottom like a vertical line of calligraphy */}
                  <motion.span
                    className={s.kanji}
                    variants={{ hidden: { clipPath: 'inset(0 0 100% 0)', filter: 'blur(6px)' }, shown: { clipPath: 'inset(0 0 0% 0)', filter: 'blur(0px)' } }}
                    transition={{ duration: 1.2, ease: EASE }}
                  >
                    {sec.kanji}
                  </motion.span>
                  <motion.span className={s.reading} variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }} transition={{ delay: 0.9 }}>
                    {sec.reading}
                  </motion.span>
                </div>
              </aside>
              <div>
                <header className={s.head}>
                  <motion.span className="mono" variants={{ hidden: { opacity: 0, x: -10 }, shown: { opacity: 1, x: 0 } }} transition={{ duration: 0.6, delay: 0.2 }}>
                    <b className={s.label}>{sec.label}</b>
                  </motion.span>
                  <motion.h2
                    id={`${sec.id}-title`}
                    className={s.title}
                    variants={{ hidden: { clipPath: 'inset(-10% 100% -10% 0)' }, shown: { clipPath: 'inset(-10% 0% -10% 0)' } }}
                    transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
                  >
                    {sec.title}
                  </motion.h2>
                  <motion.span className={s.rule} variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={{ duration: 1.2, delay: 0.4, ease: EASE }} />
                </header>
                <motion.div
                  className={s.body}
                  variants={{ hidden: { opacity: 0, y: 26 }, shown: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
                >
                  <Body />
                </motion.div>
              </div>
            </div>
          </motion.section>
        );
      })}
      <footer className={s.footer}>
        <div className={`container ${s.footInner}`}>
          <span>© {new Date().getFullYear()} {profile.name}</span>
          <span className={s.built}>Built with React, three.js and a lot of procedural geometry. No models were downloaded in the making of this shrine.</span>
          <button className={s.top} onClick={() => scrollToId('top')}>Back to the shrine <ArrowUp size={14} /></button>
        </div>
      </footer>
    </div>
  );
}

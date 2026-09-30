import { lazy, Suspense, useState } from 'react';
import Hud from './Hud';
import StaticHero from './StaticHero';
import s from './GameHero.module.css';

const Game = lazy(() => import('../world/Game'));

function webglOK() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

const touch = () => matchMedia('(pointer: coarse)').matches;

function pickQuality(): 'high' | 'low' {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const cores = navigator.hardwareConcurrency ?? 4;
  return touch() || small || cores <= 4 ? 'low' : 'high';
}

export default function GameHero() {
  const [ok] = useState(webglOK);
  const [quality] = useState(pickQuality);
  // Phones get the illustrated opening; the 3D shrine loads only on request.
  const [play, setPlay] = useState(() => ok && !touch());
  const [ready, setReady] = useState(false);

  return (
    <section id="top" className={s.hero} aria-label="Introduction">
      {play ? (
        <>
          <div className={s.stage} aria-hidden="true">
            <Suspense fallback={null}>
              <Game quality={quality} onReady={() => setTimeout(() => setReady(true), 400)} />
            </Suspense>
          </div>
          <div className={`${s.curtain} ${ready ? s.lifted : ''}`} aria-hidden="true" />
          <Hud ready={ready} />
        </>
      ) : (
        <StaticHero canPlay={ok} onPlay={() => setPlay(true)} />
      )}
    </section>
  );
}

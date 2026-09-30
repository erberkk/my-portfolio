import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, SMAA } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import Environment from './Environment';
import Terrain from './Terrain';
import Torii from './Torii';
import Lanterns from './Lanterns';
import Sakura from './Sakura';
import Petals from './Petals';
import Flora from './Flora';
import Pagoda from './Pagoda';
import Pond from './Pond';
import Shrine from './Shrine';
import Bamboo from './Bamboo';
import Makiwara from './Makiwara';
import Graces from './Grace';
import Player from './Player';
import Enemies from './Enemies';
import { bindInput, clearInput } from './input';
import { getUI, setUI } from './store';

export type Quality = 'high' | 'low';

function Wiring() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.localClippingEnabled = true;
    const canvas = gl.domElement;
    const off = bindInput(() => { const u = getUI(); return u.phase === 'playing' && !u.menu; }, canvas);
    const onLock = () => {
      const u = getUI();
      if (!document.pointerLockElement && u.phase === 'playing' && !u.menu && !u.touch) {
        clearInput();
        setUI({ phase: 'paused' });
      }
    };
    document.addEventListener('pointerlockchange', onLock);
    return () => { off(); document.removeEventListener('pointerlockchange', onLock); };
  }, [gl]);
  return null;
}

export default function Game({ quality, onReady }: { quality: Quality; onReady?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const high = quality === 'high';
  // Resolution adapts to the machine: start modest, step down if frames drop.
  const [dpr, setDpr] = useState(high ? 1.25 : 0.9);
  const [post, setPost] = useState(high);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (!e.isIntersecting && getUI().phase === 'playing') {
        if (document.pointerLockElement) document.exitPointerLock();
        clearInput();
        setUI({ phase: 'paused' });
      }
    }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        shadows={high ? 'percentage' : false}
        dpr={dpr}
        frameloop={visible ? 'always' : 'never'}
        camera={{ fov: 55, near: 0.1, far: 2000, position: [0, 6, 34] }}
        gl={{ antialias: !post, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          onReady?.();
        }}
      >
        <Wiring />
        <PerformanceMonitor
          bounds={() => [48, 90]}
          flipflops={4}
          onDecline={() => setDpr((d) => { const n = Math.max(0.6, +(d - 0.2).toFixed(2)); if (n <= 0.8) setPost(false); return n; })}
          onIncline={() => setDpr((d) => Math.min(high ? 1.5 : 1, +(d + 0.15).toFixed(2)))}
        />
        <Suspense fallback={null}>
          <Environment shadows={high} />
          <Terrain />
          <Torii />
          <Lanterns />
          <Sakura />
          <Flora />
          <Pagoda />
          <Pond />
          <Shrine />
          <Bamboo />
          <Makiwara />
          <Graces />
          <Petals count={high ? 1300 : 600} />
          <Player />
          <Enemies />
        </Suspense>
        {post && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <SMAA />
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.7} resolutionScale={0.5} />
            <Vignette darkness={0.62} offset={0.28} />
            <Noise opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

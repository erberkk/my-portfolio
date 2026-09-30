import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from './placements';

export const MOON_DIR = new THREE.Vector3(-0.35, 0.42, -0.84).normalize();
export const FOG = '#1a1426';

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // always at the far plane
  }
`;
const skyFrag = /* glsl */ `
  uniform vec3 uMoonDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 horizon = vec3(0.19, 0.11, 0.2);
    vec3 mid = vec3(0.07, 0.05, 0.13);
    vec3 top = vec3(0.015, 0.015, 0.045);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h));
    col = mix(col, top, smoothstep(0.18, 0.75, h));
    // Warm glow low on the horizon, like a distant town.
    col += vec3(0.25, 0.08, 0.06) * pow(1.0 - abs(h), 12.0) * 0.5;
    float m = max(dot(vDir, uMoonDir), 0.0);
    col += vec3(0.55, 0.6, 0.85) * pow(m, 60.0) * 0.6;
    col += vec3(0.3, 0.32, 0.5) * pow(m, 8.0) * 0.25;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Sky() {
  const camera = useThree((s) => s.camera);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[900, 32, 16]} />
      <shaderMaterial vertexShader={skyVert} fragmentShader={skyFrag} side={THREE.BackSide} depthWrite={false} fog={false}
        uniforms={{ uMoonDir: { value: MOON_DIR } }} />
    </mesh>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const r = rng(42);
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1;
      const y = 0.08 + Math.abs(u) * 0.92;
      const a = r() * Math.PI * 2;
      const s = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * s * 800, y * 800, Math.sin(a) * s * 800], i * 3);
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; varying float vA;
      void main() {
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0));
        vA *= smoothstep(0.05, 0.3, normalize(position).y);
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * p;
        gl_Position.z = gl_Position.w * 0.9999;
        gl_PointSize = 1.0 + aSeed * 2.2;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(0.9, 0.9, 1.0), smoothstep(0.5, 0.0, d) * vA);
      }`,
    transparent: true, depthWrite: false, fog: false,
  }), []);
  const camera = useThree((s) => s.camera);
  const ref = useRef<THREE.Points>(null);
  useFrame((st) => {
    mat.uniforms.uTime.value = st.clock.elapsedTime;
    ref.current?.position.copy(camera.position);
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-9} />;
}

function Moon() {
  const camera = useThree((s) => s.camera);
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      float n(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float d = length(p);
        float disk = smoothstep(0.34, 0.33, d);
        // Soft maria on the disk.
        float m = 0.0;
        m += smoothstep(0.14, 0.0, length(p - vec2(-0.08, 0.08))) * 0.18;
        m += smoothstep(0.11, 0.0, length(p - vec2(0.12, -0.05))) * 0.14;
        m += smoothstep(0.08, 0.0, length(p - vec2(0.02, -0.15))) * 0.12;
        vec3 moon = vec3(1.0, 0.97, 0.9) * (1.35 - m);
        float halo = pow(max(0.0, 1.0 - d), 3.0) * 0.55;
        vec3 col = moon * disk + vec3(0.7, 0.72, 1.0) * halo * (1.0 - disk);
        gl_FragColor = vec4(col * 1.6, max(disk, halo));
      }`,
    transparent: true, depthWrite: false, fog: false, toneMapped: false,
  }), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    m.position.copy(camera.position).addScaledVector(MOON_DIR, 700);
    m.lookAt(camera.position);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-8} frustumCulled={false}>
      <planeGeometry args={[240, 240]} />
    </mesh>
  );
}

/** Rings of jagged ridges around the valley, fading into the haze. */
function Ridges() {
  const meshes = useMemo(() => {
    const layers = [
      { r: 260, h: 38, col: '#241a33', seed: 3 },
      { r: 340, h: 60, col: '#1a1428', seed: 5 },
      { r: 430, h: 85, col: '#130f1f', seed: 8 },
    ];
    return layers.map((l) => {
      const rand = rng(l.seed);
      const seg = 220;
      const pos: number[] = [];
      const col: number[] = [];
      const base = new THREE.Color(l.col);
      const top = base.clone().lerp(new THREE.Color('#5a4a72'), 0.12);
      const heights = Array.from({ length: seg + 1 }, (_, i) => {
        const a = (i / seg) * Math.PI * 2;
        let h = 0;
        for (let o = 1; o <= 4; o++) h += Math.sin(a * (3 * o) + rand() * 0.4 + l.seed * o) / o;
        h = (h * 0.5 + 0.8) * l.h + rand() * l.h * 0.12;
        // Keep a low gap behind Fuji so it stands alone.
        const toFuji = Math.abs(Math.atan2(Math.sin(a - 4.65), Math.cos(a - 4.65)));
        return h * (0.35 + 0.65 * Math.min(1, toFuji / 0.5));
      });
      heights[seg] = heights[0];
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const x0 = Math.cos(a0) * l.r, z0 = Math.sin(a0) * l.r;
        const x1 = Math.cos(a1) * l.r, z1 = Math.sin(a1) * l.r;
        const h0 = heights[i], h1 = heights[i + 1];
        pos.push(x0, -30, z0, x1, -30, z1, x1, h1, z1, x0, -30, z0, x1, h1, z1, x0, h0, z0);
        for (const t of [0, 0, 1, 0, 1, 1]) { const c = t ? top : base; col.push(c.r, c.g, c.b); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return g;
    });
  }, []);
  return (
    <group position={[0, 0, -50]}>
      {meshes.map((g, i) => (
        <mesh key={i} geometry={g} renderOrder={-7 + i}>
          <meshBasicMaterial vertexColors fog={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Mount Fuji: a concave lathe with a moonlit snow cap. */
function Fuji() {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const r = 210 * Math.pow(1 - t, 1.7) + 14;
      pts.push(new THREE.Vector2(r, t * 170));
    }
    pts.push(new THREE.Vector2(0, 170));
    const g = new THREE.LatheGeometry(pts, 64);
    const pos = g.getAttribute('position');
    const col: number[] = [];
    const rock = new THREE.Color('#1c1830'), snow = new THREE.Color('#8f97c4');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), x = pos.getX(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const line = 118 + Math.sin(a * 9) * 7 + Math.sin(a * 23) * 3;
      const c = y > line ? snow : rock.clone().lerp(new THREE.Color('#2b2340'), y / 170);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[40, -40, -560]} renderOrder={-8}>
      <meshBasicMaterial vertexColors fog={false} />
    </mesh>
  );
}

export default function Environment({ shadows }: { shadows: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <color attach="background" args={['#0b0913']} />
      <fogExp2 attach="fog" args={[FOG, 0.018]} />
      <hemisphereLight args={['#5b5c9a', '#2a1720', 0.9]} />
      <ambientLight intensity={0.18} color="#8a7fb0" />
      <directionalLight
        ref={light}
        name="moonlight"
        color="#b9c3ff"
        intensity={1.1}
        position={[MOON_DIR.x * 40, MOON_DIR.y * 40, MOON_DIR.z * 40]}
        target={target}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
      />
      <primitive object={target} name="moonlight-target" />
      <Sky />
      <Stars />
      <Moon />
      <Ridges />
      <Fuji />
    </>
  );
}

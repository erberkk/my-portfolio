import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { live } from './store';
import { rng } from './placements';

/** A single sakura petal: a notched teardrop. */
function petalGeometry(size: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(0.45, -0.25, 0.42, 0.3, 0.14, 0.5);
  s.lineTo(0, 0.38);
  s.lineTo(-0.14, 0.5);
  s.bezierCurveTo(-0.42, 0.3, -0.45, -0.25, 0, -0.5);
  const g = new THREE.ShapeGeometry(s, 4);
  g.scale(size, size, size);
  return g;
}

/** Ambient petals: a box of drifting petals that travels with the player. */
function Drift({ count }: { count: number }) {
  const mesh = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry().copy(petalGeometry(0.11) as unknown as THREE.InstancedBufferGeometry);
    const seeds = new Float32Array(count * 4);
    const r = rng(77);
    for (let i = 0; i < count * 4; i++) seeds[i] = r();
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = count;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        fogColor: { value: new THREE.Color() },
        fogDensity: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime;
        uniform vec3 uCenter;
        varying float vShade;
        varying float vFogDepth;
        mat3 rot(vec3 a) {
          vec3 s = sin(a), c = cos(a);
          return mat3(c.y*c.z, c.y*s.z, -s.y,
                      s.x*s.y*c.z - c.x*s.z, s.x*s.y*s.z + c.x*c.z, s.x*c.y,
                      c.x*s.y*c.z + s.x*s.z, c.x*s.y*s.z - s.x*c.z, c.x*c.y);
        }
        void main() {
          vec3 box = vec3(44.0, 16.0, 44.0);
          float t = uTime * (0.55 + aSeed.w * 0.5);
          vec3 p = aSeed.xyz * box;
          p.y -= t * 1.1;
          p.x += t * 1.3 + sin(t * 1.7 + aSeed.w * 40.0) * 0.8;
          p.z += t * 0.4 + cos(t * 1.3 + aSeed.x * 30.0) * 0.6;
          // Wrap into a box centred on the player.
          vec3 rel = mod(p - uCenter + box * 0.5, box) - box * 0.5;
          rel.y += 5.0;
          vec3 world = uCenter + rel;
          vec3 a = vec3(t * 2.1, t * 1.3, t * 1.7) + aSeed.xyz * 6.28;
          vec3 local = rot(a) * position;
          vShade = 0.65 + 0.35 * abs(normalize(rot(a) * vec3(0.0, 0.0, 1.0)).y);
          // Fade near the edges of the box so wrapping never pops.
          vec3 e = abs(rel - vec3(0.0, 5.0, 0.0)) / (box * 0.5);
          vShade *= 1.0 - smoothstep(0.8, 1.0, max(e.x, max(e.y, e.z)));
          vec4 mv = modelViewMatrix * vec4(world + local, 1.0);
          vFogDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 fogColor;
        uniform float fogDensity;
        varying float vShade;
        varying float vFogDepth;
        void main() {
          vec3 col = vec3(1.0, 0.72, 0.8) * (0.55 + vShade * 0.6);
          float f = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          col = mix(col, fogColor, f * 0.8);
          gl_FragColor = vec4(col, vShade);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    return m;
  }, [count]);

  useFrame((st) => {
    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = st.clock.elapsedTime;
    mat.uniforms.uCenter.value.set(live.player.x, live.player.y, live.player.z);
    const fog = st.scene.fog as THREE.FogExp2 | null;
    if (fog) { mat.uniforms.fogColor.value.copy(fog.color); mat.uniforms.fogDensity.value = fog.density; }
  });
  return <primitive object={mesh} />;
}

/** Bursts: a pool of simulated petals thrown out by cuts, bells and trees. */
function Bursts({ max }: { max: number }) {
  const { mesh, parts } = useMemo(() => {
    const geo = petalGeometry(0.13);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc2d2').multiplyScalar(1.2), side: THREE.DoubleSide, transparent: true, toneMapped: false });
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.frustumCulled = false;
    const parts = Array.from({ length: max }, () => ({
      p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, colour: 0, size: 1, grav: 2.2,
    }));
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    return { mesh, parts };
  }, [max]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  // 0 sakura, 1 bamboo leaf, 2 blade sparks, 3 ink-red lily petals
  const colours = useMemo(() => [new THREE.Color(1, 1, 1), new THREE.Color('#9fd66b'), new THREE.Color('#ffd27a').multiplyScalar(3), new THREE.Color('#ff2a2a').multiplyScalar(1.6)], []);
  const cursorRef = useRef(0);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    while (live.bursts.length) {
      const b = live.bursts.shift()!;
      for (let k = 0; k < b.n; k++) {
        const idx = cursorRef.current;
        const pt = parts[idx];
        cursorRef.current = (idx + 1) % max;
        const spark = b.t === 2;
        const spread = spark ? 0.1 : 0.6;
        pt.p.set(b.x + (Math.random() - 0.5) * spread, b.y + (Math.random() - 0.5) * spread, b.z + (Math.random() - 0.5) * spread);
        const a = Math.random() * Math.PI * 2;
        const sp = spark ? 4 + Math.random() * 6 : 1.5 + Math.random() * 3.5;
        pt.v.set(Math.cos(a) * sp, (spark ? 2 : 1.5) + Math.random() * 3, Math.sin(a) * sp);
        pt.w.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
        pt.life = spark ? 0.35 + Math.random() * 0.3 : 2.5 + Math.random() * 2;
        pt.size = spark ? 0.35 : 1;
        pt.grav = spark ? 9 : 2.2;
        pt.colour = b.t;
        mesh.setColorAt(idx, colours[b.t] ?? colours[0]);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < max; i++) {
      const pt = parts[i];
      if (pt.life > 0) {
        pt.life -= dt;
        pt.v.multiplyScalar(1 - dt * 1.6);
        pt.v.y -= dt * pt.grav;
        if (pt.grav < 5) pt.v.y = Math.max(pt.v.y, -1.1);
        pt.p.addScaledVector(pt.v, dt);
        pt.p.x += Math.sin(pt.life * 3 + i) * dt * 0.5;
        pt.r.set(pt.r.x + pt.w.x * dt, pt.r.y + pt.w.y * dt, pt.r.z + pt.w.z * dt);
        q.setFromEuler(pt.r);
        m.compose(pt.p, q, one.setScalar(Math.min(1, pt.life * (pt.size < 1 ? 3 : 1)) * pt.size));
      } else {
        m.makeScale(0, 0, 0);
      }
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}

export default function Petals({ count }: { count: number }) {
  return (
    <>
      <Drift count={count} />
      <Bursts max={500} />
    </>
  );
}

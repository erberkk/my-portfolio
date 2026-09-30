import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LANDMARKS, POND, WATER_Y, bridgeY, heightAt, inPondWater } from './layout';
import { live } from './store';
import { MOON_DIR } from './Environment';
import { VERMILION } from './Torii';
import { rng } from './placements';

/* ---------------- water ---------------- */

const MAX_RIPPLES = 8;
export const ripples = {
  list: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)),
  next: 0,
  add(x: number, z: number, strength: number, t: number) {
    this.list[this.next].set(x, z, t, strength);
    this.next = (this.next + 1) % MAX_RIPPLES;
  },
};

function Water() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMoon: { value: MOON_DIR },
      uRipples: { value: ripples.list },
      fogColor: { value: new THREE.Color() },
      fogDensity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying float vFogDepth;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uMoon;
      uniform vec4 uRipples[${MAX_RIPPLES}];
      uniform vec3 fogColor;
      uniform float fogDensity;
      varying vec3 vWorld;
      varying float vFogDepth;
      float waves(vec2 p) {
        float h = sin(p.x * 1.7 + uTime * 0.9) * 0.5 + sin(p.y * 2.3 - uTime * 0.7) * 0.5;
        h += sin((p.x + p.y) * 4.1 + uTime * 1.6) * 0.25;
        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          vec4 r = uRipples[i];
          float age = uTime - r.z;
          if (age < 0.0 || age > 4.0) continue;
          float d = distance(p, r.xy);
          float front = age * 2.2;
          h += sin((d - front) * 9.0) * exp(-abs(d - front) * 3.0) * exp(-age * 0.9) * r.w * 3.0;
        }
        return h;
      }
      void main() {
        vec2 p = vWorld.xz;
        float e = 0.05;
        float hx = waves(p + vec2(e, 0.0)) - waves(p - vec2(e, 0.0));
        float hz = waves(p + vec2(0.0, e)) - waves(p - vec2(0.0, e));
        vec3 n = normalize(vec3(-hx * 0.35, 1.0, -hz * 0.35));
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-v, n);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 deep = vec3(0.02, 0.05, 0.08);
        vec3 sky = mix(vec3(0.16, 0.1, 0.2), vec3(0.04, 0.04, 0.1), clamp(r.y * 2.0, 0.0, 1.0));
        vec3 col = mix(deep, sky, 0.25 + fres * 0.75);
        float moon = pow(max(dot(r, uMoon), 0.0), 240.0);
        col += vec3(1.0, 0.95, 0.85) * moon * 3.0;
        col += vec3(1.0, 0.55, 0.25) * pow(max(dot(r, normalize(vec3(0.3, 0.2, 1.0))), 0.0), 40.0) * 0.25;
        float f = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, 0.8 + fres * 0.2);
        #include <colorspace_fragment>
      }`,
    transparent: true,
  }), []);
  useFrame((st) => {
    mat.uniforms.uTime.value = st.clock.elapsedTime;
    const fog = st.scene.fog as THREE.FogExp2 | null;
    if (fog) { mat.uniforms.fogColor.value.copy(fog.color); mat.uniforms.fogDensity.value = fog.density; }
  });
  return (
    <mesh position={[POND.x, WATER_Y, POND.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[POND.rx * 1.02, POND.rz * 1.02, 1]} material={mat} renderOrder={2}>
      <circleGeometry args={[1, 64]} />
    </mesh>
  );
}

/* ---------------- koi ---------------- */

function koiGeometry(r: () => number) {
  const body = new THREE.SphereGeometry(1, 14, 10);
  body.scale(0.11, 0.07, 0.34);
  const pos = body.getAttribute('position');
  const col: number[] = [];
  const white = new THREE.Color('#f4efe8'), orange = new THREE.Color('#ff5a1f'), gold = new THREE.Color('#ffb42a');
  const accent = r() < 0.3 ? gold : orange;
  const seeds = [r() * 10, r() * 10, r() * 10];
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i), x = pos.getX(i);
    const patch = Math.sin(z * 18 + seeds[0]) + Math.sin(x * 30 + seeds[1]) + Math.sin(z * 7 + seeds[2]);
    const c = patch > 0.4 ? accent : white;
    col.push(c.r, c.g, c.b);
  }
  body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return body;
}

function Koi({ count = 9 }) {
  const fish = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: count }, (_, i) => {
      const a = r() * Math.PI * 2;
      return {
        geo: koiGeometry(r),
        pos: new THREE.Vector3(POND.x + Math.cos(a) * 3, WATER_Y - 0.18, POND.z + Math.sin(a) * 2),
        heading: r() * Math.PI * 2,
        speed: 0.6 + r() * 0.5,
        phase: r() * 10,
        target: new THREE.Vector2(),
        retarget: 0,
        i,
      };
    });
  }, [count]);
  const tailGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.12, 0, -0.2, 0.12, 0, -0.2], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const tails = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const t = st.clock.elapsedTime;
    const pl = live.player;
    const playerNear = ((pl.x - POND.x) / (POND.rx + 3)) ** 2 + ((pl.z - POND.z) / (POND.rz + 3)) ** 2 < 1;
    fish.forEach((f) => {
      f.retarget -= dt;
      if (playerNear) {
        // Gather near the samurai, like at feeding time.
        f.target.set(pl.x + Math.sin(t * 0.7 + f.i) * 1.2, pl.z + Math.cos(t * 0.6 + f.i * 2) * 1.2);
      } else if (f.retarget <= 0) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * 0.8;
        f.target.set(POND.x + Math.cos(a) * POND.rx * d, POND.z + Math.sin(a) * POND.rz * d);
        f.retarget = 3 + Math.random() * 4;
      }
      // Clamp target inside the pond.
      const tx = (f.target.x - POND.x) / POND.rx, tz = (f.target.y - POND.z) / POND.rz;
      const tl = Math.hypot(tx, tz);
      if (tl > 0.8) f.target.set(POND.x + (tx / tl) * 0.8 * POND.rx, POND.z + (tz / tl) * 0.8 * POND.rz);

      const want = Math.atan2(f.target.x - f.pos.x, f.target.y - f.pos.z);
      let d = want - f.heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      f.heading += d * Math.min(1, dt * 1.8);
      const dist = Math.hypot(f.target.x - f.pos.x, f.target.y - f.pos.z);
      const sp = f.speed * Math.min(1, dist) * (playerNear ? 1.4 : 1);
      f.pos.x += Math.sin(f.heading) * sp * dt;
      f.pos.z += Math.cos(f.heading) * sp * dt;
      const g = groups.current[f.i];
      if (g) {
        g.position.copy(f.pos);
        g.rotation.y = f.heading + Math.sin(t * 6 + f.phase) * 0.08;
      }
      const tail = tails.current[f.i];
      if (tail) tail.rotation.y = Math.sin(t * (6 + sp * 4) + f.phase) * 0.5;
    });
  });

  return (
    <>
      {fish.map((f) => (
        <group key={f.i} ref={(el) => { groups.current[f.i] = el; }}>
          <mesh geometry={f.geo}>
            <meshStandardMaterial vertexColors roughness={0.4} emissive="#401505" emissiveIntensity={0.4} />
          </mesh>
          <mesh ref={(el) => { tails.current[f.i] = el; }} geometry={tailGeo} position={[0, 0, -0.3]}>
            <meshStandardMaterial color="#ffd9c4" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ---------------- lily pads and floating lanterns ---------------- */

function Surface() {
  const pads = useMemo(() => {
    const r = rng(4);
    const geo = new THREE.CircleGeometry(0.42, 16, 0.3, Math.PI * 2 - 0.6);
    geo.rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#2c4a30', roughness: 0.8, side: THREE.DoubleSide }), 22);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2, d = 0.35 + r() * 0.55;
      const x = POND.x + Math.cos(a) * POND.rx * d, z = POND.z + Math.sin(a) * POND.rz * d;
      if (bridgeY(x, z) !== null) continue;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
      const sc = 0.6 + r() * 0.8;
      m.compose(new THREE.Vector3(x, WATER_Y + 0.01, z), q, s.set(sc, 1, sc));
      im.setMatrixAt(k++, m);
    }
    im.count = k;
    im.computeBoundingSphere();
    return im;
  }, []);

  const floats = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2, d: 0.35 + (i % 3) * 0.17, s: 0.05 + (i % 2) * 0.03 })), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    floats.forEach((f, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = f.a + t * f.s;
      g.position.set(POND.x + Math.cos(a) * POND.rx * f.d, WATER_Y + 0.08 + Math.sin(t * 1.3 + i) * 0.02, POND.z + Math.sin(a) * POND.rz * f.d);
      g.rotation.set(Math.sin(t + i) * 0.05, a, Math.cos(t * 1.1 + i) * 0.05);
    });
  });
  return (
    <>
      <primitive object={pads} />
      {floats.map((_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.34]} />
            <meshStandardMaterial color="#3a2a22" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.26, 0.28, 0.26]} />
            <meshBasicMaterial color={new THREE.Color('#ffc27a').multiplyScalar(2.2)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ---------------- arched bridge ---------------- */

function Bridge() {
  const { deck, rails } = useMemo(() => {
    const b = LANDMARKS.bridge;
    const planks: THREE.BufferGeometry[] = [];
    const n = 34;
    for (let i = 0; i < n; i++) {
      const x = b.x0 + ((i + 0.5) / n) * (b.x1 - b.x0);
      const y = bridgeY(x, b.z)!;
      const slope = Math.atan2(bridgeY(Math.min(b.x1, x + 0.05), b.z)! - bridgeY(Math.max(b.x0, x - 0.05), b.z)!, 0.1);
      const g = new THREE.BoxGeometry((b.x1 - b.x0) / n + 0.02, 0.1, 2.1);
      g.rotateZ(slope);
      g.translate(x, y - 0.05, b.z);
      planks.push(g);
    }
    // Support beams under the arch
    for (const dz of [-0.9, 0.9]) {
      const pts = Array.from({ length: 20 }, (_, i) => {
        const x = b.x0 + (i / 19) * (b.x1 - b.x0);
        return new THREE.Vector3(x, bridgeY(x, b.z)! - 0.2, b.z + dz);
      });
      planks.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.1, 6, false));
    }
    const railParts: THREE.BufferGeometry[] = [];
    for (const dz of [-1.02, 1.02]) {
      const pts = Array.from({ length: 20 }, (_, i) => {
        const x = b.x0 + 0.1 + (i / 19) * (b.x1 - b.x0 - 0.2);
        return new THREE.Vector3(x, bridgeY(x, b.z)! + 0.85, b.z + dz);
      });
      railParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 6, false));
      for (let i = 0; i <= 8; i++) {
        const x = b.x0 + 0.1 + (i / 8) * (b.x1 - b.x0 - 0.2);
        const y = bridgeY(x, b.z)!;
        railParts.push(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8).translate(x, y + 0.42, b.z + dz));
        if (i === 0 || i === 8) railParts.push(new THREE.SphereGeometry(0.1, 10, 8).translate(x, y + 0.95, b.z + dz));
      }
      // Low mid rail
      const mid = Array.from({ length: 20 }, (_, i) => {
        const x = b.x0 + 0.1 + (i / 19) * (b.x1 - b.x0 - 0.2);
        return new THREE.Vector3(x, bridgeY(x, b.z)! + 0.45, b.z + dz);
      });
      railParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mid), 40, 0.03, 5, false));
    }
    // Legs into the water
    for (let i = 1; i < 8; i++) {
      const x = b.x0 + (i / 8) * (b.x1 - b.x0);
      const y = bridgeY(x, b.z)!;
      const ground = heightAt(x, b.z);
      for (const dz of [-0.9, 0.9]) railParts.push(new THREE.CylinderGeometry(0.08, 0.08, y - ground, 6).translate(x, (y + ground) / 2 - 0.2, b.z + dz));
    }
    return { deck: mergeGeometries(planks)!, rails: mergeGeometries(railParts)! };
  }, []);
  return (
    <>
      <mesh geometry={deck} castShadow receiveShadow>
        <meshStandardMaterial color="#3b2b24" roughness={0.9} />
      </mesh>
      <mesh geometry={rails} castShadow>
        <meshStandardMaterial color={VERMILION} roughness={0.55} emissive="#2a0703" />
      </mesh>
    </>
  );
}

export default function Pond() {
  // Wading and walking near the water sends out rings.
  const last = useRef(0);
  useFrame((st) => {
    const p = live.player;
    if (inPondWater(p.x, p.z) && bridgeY(p.x, p.z) === null && Math.abs(p.speed) > 0.5 && st.clock.elapsedTime - last.current > 0.45) {
      ripples.add(p.x, p.z, 0.25, st.clock.elapsedTime);
      last.current = st.clock.elapsedTime;
    }
  });
  return (
    <>
      <Koi />
      <Water />
      <Surface />
      <Bridge />
    </>
  );
}

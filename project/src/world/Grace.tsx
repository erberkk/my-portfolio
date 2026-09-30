import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { GRACES, heightAt, pathHeight, STAIRS_END, STAIRS_START } from './layout';
import { getUI } from './store';

const beamMat = () => new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uPower: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uTime; uniform float uPower; varying vec2 vUv;
    void main() {
      float edge = pow(sin(vUv.x * 3.14159), 2.0);
      float rise = 0.6 + 0.4 * sin(vUv.y * 12.0 - uTime * 3.0 + vUv.x * 20.0);
      float a = edge * (1.0 - vUv.y) * rise * 0.55 * uPower;
      gl_FragColor = vec4(vec3(1.0, 0.78, 0.38) * 2.0, a);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
});

const glowMat = () => new THREE.ShaderMaterial({
  uniforms: { uPower: { value: 1 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uPower; varying vec2 vUv;
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float a = pow(max(0.0, 1.0 - d), 2.5) * 0.6 * uPower;
      float ring = smoothstep(0.03, 0.0, abs(d - 0.62)) * 0.35 * uPower;
      gl_FragColor = vec4(vec3(1.0, 0.75, 0.35) * 1.6, a + ring);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
});

function groundY(x: number, z: number) {
  return z < STAIRS_START && z > STAIRS_END && Math.abs(x) < 2.3 ? pathHeight(z) : heightAt(x, z);
}

function Site({ x, z, id }: { x: number; z: number; id: string }) {
  const y = groundY(x, z);
  const beam = useMemo(beamMat, []);
  const glow = useMemo(glowMat, []);
  useFrame((st) => {
    const known = getUI().discovered.includes(id as never);
    const pulse = 0.85 + Math.sin(st.clock.elapsedTime * 2.2 + x) * 0.15;
    const power = (known ? 1 : 0.55) * pulse;
    beam.uniforms.uTime.value = st.clock.elapsedTime;
    beam.uniforms.uPower.value = power;
    glow.uniforms.uPower.value = power;
  });
  return (
    <group position={[x, y, z]}>
      {/* A small stone hokora beside the light */}
      <group position={[0.9, 0, 0]}>
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <boxGeometry args={[0.5, 0.5, 0.45]} />
          <meshStandardMaterial color="#6f6a6b" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <coneGeometry args={[0.46, 0.3, 4]} />
          <meshStandardMaterial color="#3b3538" roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 0.28, 0.23]}>
          <planeGeometry args={[0.2, 0.26]} />
          <meshBasicMaterial color={new THREE.Color('#ffcf7a').multiplyScalar(1.6)} toneMapped={false} />
        </mesh>
      </group>
      <mesh material={beam} position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.28, 0.12, 3.2, 20, 1, true]} />
      </mesh>
      <mesh material={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[3, 3]} />
      </mesh>
      <Sparkles count={18} scale={[1.2, 3.2, 1.2]} position={[0, 1.6, 0]} size={3.2} speed={0.45} color="#ffcf7a" opacity={0.9} noise={0.6} />
    </group>
  );
}

export default function Graces() {
  return <>{GRACES.map((g) => <Site key={g.id} id={g.id} x={g.x} z={g.z} />)}</>;
}

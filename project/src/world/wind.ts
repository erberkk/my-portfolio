import * as THREE from 'three';

/** Shared by every swaying material; ticked once per frame by the game. */
export const windUniforms = {
  uTime: { value: 0 },
  uPlayer: { value: new THREE.Vector3(0, -100, 0) },
};

type WindOpts = {
  /** Local-space height of the plant, so the base stays planted. */
  height: number;
  /** Sway amplitude at the tip, in world units. */
  sway: number;
  /** How far the player shoves plants aside, and within what radius. */
  push?: number;
  radius?: number;
};

/**
 * Adds wind sway and "brush past the player" bending to a material used on an
 * InstancedMesh whose instances are placed in world space.
 */
export function addWind<T extends THREE.Material>(mat: T, o: WindOpts): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uPlayer = windUniforms.uPlayer;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform vec3 uPlayer;`)
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
          vec3 iPos = instanceMatrix[3].xyz;
        #else
          vec3 iPos = vec3(0.0);
        #endif
        float hF = clamp(position.y / ${o.height.toFixed(3)}, 0.0, 1.0);
        hF *= hF;
        float gust = sin(uTime * 0.6 + iPos.x * 0.05) * 0.5 + 0.5;
        float w = sin(uTime * 1.9 + iPos.x * 0.35 + iPos.z * 0.27) * 0.6
                + sin(uTime * 3.3 + iPos.z * 0.9) * 0.25;
        mvPosition.x += (w * (0.6 + gust * 0.8) + 0.25) * ${o.sway.toFixed(3)} * hF;
        mvPosition.z += w * 0.5 * ${o.sway.toFixed(3)} * hF;
        ${o.push ? `
        vec2 d = iPos.xz - uPlayer.xz;
        float dist = length(d);
        float p = (1.0 - smoothstep(0.0, ${(o.radius ?? 1.2).toFixed(3)}, dist)) * ${o.push.toFixed(3)};
        mvPosition.xz += (d / max(dist, 0.001)) * p * hF;
        mvPosition.y -= p * 0.35 * hF;` : ''}
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => `wind-${o.height}-${o.sway}-${o.push ?? 0}`;
  return mat;
}

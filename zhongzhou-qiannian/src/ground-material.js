import * as THREE from 'three';

// 地面材质：每个场景一张地面贴图 + 一张 AO/水面遮罩（g 通道为水）
export function makeGroundMaterial(shared, map, ao, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const own = { uMap: { value: map }, uAo: { value: ao }, uShimmer: { value: opts.shimmer ?? 1 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uWaterCol = shared.uWaterCol;
    sh.uniforms.uMap = own.uMap;
    sh.uniforms.uAo = own.uAo;
    sh.uniforms.uShimmer = own.uShimmer;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGuv;\nvarying vec3 vWpos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGuv = uv;\nvWpos = (modelMatrix * vec4(position,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uMap; uniform sampler2D uAo;
uniform float uTime; uniform float uShimmer; uniform vec3 uWaterCol;
varying vec2 vGuv; varying vec3 vWpos;`)
      .replace('#include <map_fragment>', `
vec4 gc = texture2D(uMap, vGuv);
vec4 ga = texture2D(uAo, vGuv);
vec3 col = gc.rgb;
if (ga.g > 0.02) {
  float w = sin(vWpos.x * 0.9 + uTime * 1.3) * sin(vWpos.z * 0.7 - uTime * 1.1);
  float sp = smoothstep(0.82, 1.0, w) * smoothstep(0.6, 1.0, ga.g) * uShimmer;
  col = mix(gc.rgb, uWaterCol, 0.25 * ga.g) + vec3(sp * 0.18);
}
diffuseColor.rgb *= col * ga.r;
`);
  };
  mat.userData.own = own;
  return mat;
}

// Post stack for the game-style spots: MSAA, shallow depth of field, bloom, radial speed blur, chromatic edge, vignette, grain and a per-mood grade.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const Grade = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.045 }, vig: { value: 0.5 }, ca: { value: 0.0016 }, blur: { value: 0 }, fade: { value: 0 }, flash: { value: 0 }, shadowTint: { value: new THREE.Vector3(-0.01, 0.008, 0.03) }, highTint: { value: new THREE.Vector3(0.05, 0.022, -0.02) }, sat: { value: 1.12 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float time, grain, vig, ca, blur, fade, flash, sat; uniform vec3 shadowTint, highTint;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*13.7)*43758.5453); }
    void main(){
      vec2 c = vUv - .5; float d = dot(c,c);
      vec2 o = c * d * ca * 18.;
      vec3 col = vec3(0.);
      // radial speed blur toward the vanishing point, strongest at the edges
      float n = 7.;
      for (float i = 0.; i < 7.; i++) { float k = i / n; vec2 uv = vUv - c * blur * k * (0.4 + d * 2.2); col += vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); }
      col /= n;
      float l = dot(col, vec3(.2126,.7152,.0722));
      col = mix(vec3(l), col, sat);
      col = pow(max(col, 0.), vec3(0.96));
      col += shadowTint * (1. - smoothstep(0., .5, l));
      col += highTint * smoothstep(.45, 1., l);
      col *= 1. - vig * smoothstep(.16, .62, d * 1.4);
      col += (h(vUv * 900.) - .5) * grain;
      col = mix(col, vec3(0.), fade); col += flash;
      gl_FragColor = vec4(col, 1.);
    }`,
};

export function createPost(renderer, scene, camera, W, H) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt); composer.setSize(W, H); composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0002, maxblur: 0.011 }); composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.6, 0.95); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(Grade); composer.addPass(grade);
  return { composer, bokeh, bloom, grade, render(t, o = {}) { const u = grade.uniforms; u.time.value = t % 100; u.fade.value = o.fade ?? 0; u.flash.value = o.flash ?? 0; u.blur.value = o.blur ?? 0; if (o.ca !== undefined) u.ca.value = o.ca; if (o.focus) bokeh.uniforms.focus.value = o.focus; if (o.aperture !== undefined) bokeh.uniforms.aperture.value = o.aperture; composer.render(); } };
}

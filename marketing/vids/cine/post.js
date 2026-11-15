// Post-processing stack for the cinematic look: MSAA, bloom, shallow depth of field, teal-and-orange grade, chromatic edge, vignette, film grain.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.05 }, vig: { value: 0.55 }, ca: { value: 0.0016 }, fade: { value: 0 }, flash: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float time, grain, vig, ca, fade, flash;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*13.7)*43758.5453); }
    void main(){
      vec2 c = vUv - .5; float d = dot(c,c);
      vec2 o = c * d * ca * 18.;
      vec3 col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      // filmic contrast, teal shadows, warm highlights
      float l = dot(col, vec3(.2126,.7152,.0722));
      col = mix(vec3(l), col, 1.12);
      col = pow(max(col, 0.), vec3(0.96));
      col += (vec3(-.012,.008,.03)) * (1. - smoothstep(0., .5, l));
      col += (vec3(.05,.022,-.02)) * smoothstep(.45, 1., l);
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
  const bokeh = new BokehPass(scene, camera, { focus: 4, aperture: 0.00055, maxblur: 0.012 }); composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.7, 0.82); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);
  return { composer, bokeh, bloom, grade, render(t, o = {}) { grade.uniforms.time.value = t % 100; grade.uniforms.fade.value = o.fade ?? 0; grade.uniforms.flash.value = o.flash ?? 0; if (o.focus) { bokeh.uniforms.focus.value = o.focus; } if (o.aperture !== undefined) bokeh.uniforms.aperture.value = o.aperture; composer.render(); } };
}

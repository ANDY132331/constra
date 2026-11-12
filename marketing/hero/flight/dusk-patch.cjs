// One-off patch: adds a golden-hour "dusk" mode to scene.js (sunset sky with clouds, lit windows,
// street lamps, work lights, car lights, bloom). Day mode is unchanged.
const fs = require("fs");
let s = fs.readFileSync("scene.js", "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 80)); s = s.replace(a, b); };

// imports + module state
rep('import { OutputPass } from "three/addons/postprocessing/OutputPass.js";',
  'import { OutputPass } from "three/addons/postprocessing/OutputPass.js";\nimport { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";');
rep('const TAU = Math.PI * 2;', 'const TAU = Math.PI * 2;\nlet DUSK = false;');

// facade windows that glow
rep('  const rg = rc.getContext("2d");\n',
  '  const rg = rc.getContext("2d");\n  const ec = document.createElement("canvas"); ec.width = ec.height = S; // emissive\n  const eg = ec.getContext("2d"); eg.fillStyle = "#000"; eg.fillRect(0, 0, S, S);\n');
rep('    rg.fillStyle = "#1c1c1c"; rg.fillRect(x, y, w, h);\n',
  `    rg.fillStyle = "#1c1c1c"; rg.fillRect(x, y, w, h);
    if (DUSK && r() < 0.42) {
      const warm = ["#ffd08a", "#ffc470", "#ffe2b0", "#ffb866", "#e8f0ff"][Math.floor(r() * 5)];
      g.fillStyle = warm; g.fillRect(x, y, w, h); eg.fillStyle = warm; eg.fillRect(x, y, w, h);
    }
`);
rep('return { map: toTex(c), rough: toTex(rc, { srgb: false }) };', 'return { map: toTex(c), rough: toTex(rc, { srgb: false }), emis: toTex(ec) };');
rep('facades: T.facades.map((f) => std({ map: f.map, roughnessMap: f.rough, roughness: 1, metalness: 0.08, envMapIntensity: 1.3 })),',
  `facades: T.facades.map((f) => std({ map: f.map, roughnessMap: f.rough, roughness: 1, metalness: 0.08, envMapIntensity: 1.3, ...(DUSK ? { emissive: "#ffffff", emissiveMap: f.emis, emissiveIntensity: 2.4 } : {}) })),
    lamp: std({ color: "#fff0d0", emissive: "#ffc878", emissiveIntensity: 8 }),
    bulb: std({ color: "#fff0d0", emissive: "#ffb860", emissiveIntensity: 7 }),
    redlight: std({ color: "#ff3030", emissive: "#ff2020", emissiveIntensity: 9 }),
    flood: std({ color: "#fff6e0", emissive: "#fff1d0", emissiveIntensity: 12 }),`);

// the sky dome as a function (day = the old gradient, dusk = sunset with clouds)
rep('export function createWorld(canvas, width, height, opts = {}) {',
`const DOME_VERT = "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }";
const DAY_FRAG = \`varying vec3 vP; uniform vec3 sunDir;
  void main(){
    float e = max(vP.y, 0.);
    vec3 hor = vec3(.80,.87,.93), mid = vec3(.55,.74,.92), top = vec3(.30,.55,.86);
    vec3 c = mix(hor, mid, smoothstep(0., .16, e));
    c = mix(c, top, smoothstep(.16, .6, e));
    gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.0, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }\`;
const DUSK_FRAG = \`varying vec3 vP; uniform vec3 sunDir;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(h21(i), h21(i+vec2(1.,0.)), f.x), mix(h21(i+vec2(0.,1.)), h21(i+vec2(1.,1.)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 6; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.3, 9.1); a *= .5; } return s; }
  void main(){
    vec3 d = normalize(vP); float e = d.y;
    float sa = max(dot(d, normalize(sunDir)), 0.);
    float h = clamp(e, 0., 1.);
    vec3 hor = vec3(1.0,.50,.24), mid = vec3(.55,.40,.58), top = vec3(.10,.18,.42);
    vec3 col = mix(hor, mid, smoothstep(0., .22, h));
    col = mix(col, top, smoothstep(.18, .75, h));
    col = mix(col, vec3(.98,.42,.20), (1. - smoothstep(0., .14, h)) * pow(sa, 1.2) * .6);
    col += vec3(1.,.55,.2) * pow(sa, 5.) * .8 + vec3(1.,.82,.55) * pow(sa, 90.) * 7.;
    if (e > 0.) {
      vec2 p = d.xz / (e + .10) * 1.2;
      float c1 = fbm(p + vec2(4.2, 1.7));
      float cov = smoothstep(.46, .80, c1) * smoothstep(0., .06, e);
      float thin = smoothstep(.38, .62, fbm(p * 2.4 + vec2(9., 3.))) * .35 * smoothstep(0., .1, e);
      float lit = clamp(.22 + pow(sa, 1.6) * .95, 0., 1.);
      vec3 cc = mix(vec3(.26,.22,.40), vec3(1.0,.60,.32), lit);
      cc += vec3(1.,.62,.3) * pow(sa, 6.) * .9 * (1. - c1 * .3);
      col = mix(col, cc, clamp(cov * .88 + thin, 0., 1.));
    }
    if (e < 0.) col = mix(hor * .8, vec3(.3,.18,.16), clamp(-e * 4., 0., 1.));
    gl_FragColor = vec4(pow(col, vec3(2.2)), 1.);
  }\`;
function skyDome(radius, dusk, sunDir) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sunDir: { value: sunDir.clone() } },
    vertexShader: DOME_VERT, fragmentShader: dusk ? DUSK_FRAG : DAY_FRAG,
  }));
}
const SPH = new THREE.SphereGeometry(1, 10, 6);
function addSphere(key, mat, x, y, z, r) {
  const b = batch(key, SPH, mat, { cast: false, receive: false });
  b.list.push(new THREE.Matrix4().compose(_p.set(x, y, z), new THREE.Quaternion(), _s.set(r, r, r)));
}
// street lamps along the kerbs, work-light poles round the site
function nightLights(M) {
  for (const k of [-3, -2, -1, 0, 1, 2, 3, 4]) {
    const rz = RZ0 + PZ * k, rx = RX0 + PX * k;
    for (let t = -420; t <= 420; t += 30) {
      const nx = Math.abs(((t - RX0) % PX + PX) % PX), nz = Math.abs(((t - RZ0) % PZ + PZ) % PZ);
      for (const side of [-1, 1]) {
        if (nx > 10 && nx < PX - 10) { const zz = rz + side * (ROAD_W / 2 + 0.4); addRod("pole", M.darkSteel, V(t, 0, zz), V(t, 7.5, zz), 0.1, { cast: false }); addSphere("lamp", M.lamp, t, 7.8, zz, 0.6); }
        if (nz > 10 && nz < PZ - 10) { const xx = rx + side * (ROAD_W / 2 + 0.4); addRod("pole", M.darkSteel, V(xx, 0, t), V(xx, 7.5, t), 0.1, { cast: false }); addSphere("lamp", M.lamp, xx, 7.8, t, 0.6); }
      }
    }
  }
  for (const [x, z, ry] of [[-48, -38, 0.8], [72, -38, -0.8], [72, 54, 2.4], [-48, 54, -2.4], [12, -38, 0], [12, 54, Math.PI], [72, 8, -1.57], [-48, 8, 1.57]]) {
    addRod("pole", M.darkSteel, V(x, 0, z), V(x, 15, z), 0.16, { cast: false });
    addBox("flood", M.flood, x, 15.6, z, 3.4, 1.5, 0.3, ry, null, { cast: false });
  }
}

export function createWorld(canvas, width, height, opts = {}) {
  const { dusk = false, path = null } = opts;
  DUSK = dusk;`);
rep('const { sunElev = 42, sunAz = 215, sunColor = "#ffeed6", sunPower = 4.3, geofence = false } = opts;',
  'const { sunElev = 42, sunAz = 215, sunColor = "#ffeed6", sunPower = 4.3, geofence = false } = opts;');
rep('renderer.toneMappingExposure = 0.78;', 'renderer.toneMappingExposure = dusk ? 0.95 : 0.78;');

// remove the inline day dome, add via skyDome()
const a = s.indexOf("  // what the camera sees: a clear-day gradient");
const b = s.indexOf("  su.turbidity.value");
if (a < 0 || b < 0) throw new Error("dome block not found");
s = s.slice(0, a) + s.slice(b);
rep('  su.sunPosition.value.copy(sunDir);\n', '  su.sunPosition.value.copy(sunDir);\n  scene.add(skyDome(3600, dusk, sunDir));\n');
rep('  envScene.add(sky2);', '  envScene.add(dusk ? skyDome(1000, true, sunDir) : sky2);');
rep('scene.environmentIntensity = 0.75;', 'scene.environmentIntensity = dusk ? 0.9 : 0.75;');
rep('scene.fog = new THREE.Fog("#c9d9e6", 260, 2100);', 'scene.fog = dusk ? new THREE.Fog("#b8857f", 200, 1500) : new THREE.Fog("#c9d9e6", 260, 2100);');
rep('  scene.add(new THREE.HemisphereLight("#cfe3f5", "#8a7d68", 0.35));',
`  scene.add(new THREE.HemisphereLight(dusk ? "#8d90c4" : "#cfe3f5", dusk ? "#5c4638" : "#8a7d68", dusk ? 0.6 : 0.35));
  if (dusk) { const fill = new THREE.DirectionalLight("#7f97e0", 0.9); fill.position.set(-300, 200, 400); scene.add(fill); }`);

// lights + bloom
rep('  site(scene, T, M, anim);\n  flushBatches(scene);', '  site(scene, T, M, anim);\n  if (dusk) nightLights(M);\n  flushBatches(scene);');
rep('  composer.addPass(ao);\n  composer.addPass(new OutputPass());',
  '  composer.addPass(ao);\n  if (dusk) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.7, 0.92));\n  composer.addPass(new OutputPass());');

// flight path option
rep('  const FP = [\n', '  const DEFAULT_FP = [\n');
rep('  const fpPos = new THREE.CatmullRomCurve3', '  const FP = (path ?? DEFAULT_FP).map((k) => [Array.isArray(k[0]) ? V(...k[0]) : k[0], Array.isArray(k[1]) ? V(...k[1]) : k[1], k[2]]);\n  const fpPos = new THREE.CatmullRomCurve3');

// bulbs on the tower rails, red lights on the cranes, car lights
rep('for (let p = -len / 2; p <= len / 2; p += 2.4) ax === "x" ? addBlock("post", M.darkSteel, X + p, ry, fixed, 0.06, 1.1, 0.06) : addBlock("post", M.darkSteel, fixed, ry, Z + p, 0.06, 1.1, 0.06);',
`for (let p = -len / 2; p <= len / 2; p += 2.4) {
          ax === "x" ? addBlock("post", M.darkSteel, X + p, ry, fixed, 0.06, 1.1, 0.06) : addBlock("post", M.darkSteel, fixed, ry, Z + p, 0.06, 1.1, 0.06);
          if (DUSK) ax === "x" ? addSphere("bulb", M.bulb, X + p, ry + 1.25, fixed, 0.22) : addSphere("bulb", M.bulb, fixed, ry + 1.25, Z + p, 0.22);
        }`);
rep('  // trolley, hook, load',
`  if (DUSK) for (const [px, py, pz] of [[L, 0.5, 0], [-C, 0.5, 0], [0, 7.4, 0]]) { const m = new THREE.Mesh(SPH, M.redlight); m.scale.setScalar(0.6); m.position.set(px, py, pz); top.add(m); }
  // trolley, hook, load`);
rep('  const im = new THREE.InstancedMesh(CAR, M.car, cars.length);',
`  let lightsIm = null;
  if (DUSK) {
    const mk = (x, z, c) => { const g = new THREE.BoxGeometry(0.12, 0.2, 0.34); g.translate(x, 0.62, z); const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; } g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g; };
    const lm = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); lm.color.setRGB(5, 5, 5);
    lightsIm = new THREE.InstancedMesh(mergeGeometries([mk(2.2, -0.65, [1, 0.93, 0.75]), mk(2.2, 0.65, [1, 0.93, 0.75]), mk(-2.2, -0.65, [1, 0.08, 0.05]), mk(-2.2, 0.65, [1, 0.08, 0.05])]), lm, cars.length);
    lightsIm.frustumCulled = false; scene.add(lightsIm);
  }
  const im = new THREE.InstancedMesh(CAR, M.car, cars.length);`);
rep('      im.setMatrixAt(i, m4);', '      im.setMatrixAt(i, m4); if (lightsIm) lightsIm.setMatrixAt(i, m4);');
rep('    im.instanceMatrix.needsUpdate = true;', '    im.instanceMatrix.needsUpdate = true; if (lightsIm) lightsIm.instanceMatrix.needsUpdate = true;');

fs.writeFileSync("scene.js", s);
console.log("patched");

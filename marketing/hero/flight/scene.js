// An aerial flight around a city construction site, rendered offline for the homepage hero.
// Everything is built here from code: no footage, no people. `renderAt(t)` draws the frame for
// t in [0,1); t=1 is the same frame as t=0, so the video loops without a seam.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
let DUSK = false;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ── deterministic randomness ─────────────────────────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = rng(7);
const rr = (a, b) => a + (b - a) * R();
const pick = (arr) => arr[Math.floor(R() * arr.length)];

function valueNoise(seed) {
  const r = rng(seed), P = new Uint8Array(512), G = new Float32Array(256);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const s = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
    const u = s(xf), v = s(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  // tileable fbm over a period of `p` cells
  return (x, y, oct = 5, p = 8) => {
    let f = 0, amp = 0.5, fr = 1;
    for (let o = 0; o < oct; o++) {
      const per = p * fr;
      const xx = ((x * fr) % per + per) % per, yy = ((y * fr) % per + per) % per;
      // tile by blending wrapped corners
      const wx = xx / per, wy = yy / per;
      const v = n(xx, yy) * (1 - wx) * (1 - wy) + n(xx - per, yy) * wx * (1 - wy) + n(xx, yy - per) * (1 - wx) * wy + n(xx - per, yy - per) * wx * wy;
      f += v * amp; amp *= 0.5; fr *= 2;
    }
    return f;
  };
}

// ── canvas textures ──────────────────────────────────────────────────────────
const hex = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function pixelTex(size, seed, fn, { repeat = 1, srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), img = g.createImageData(size, size), d = img.data, nz = valueNoise(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const col = fn(x / size, y / size, nz), i = (y * size + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return { canvas: c, g };
}
function toTex(canvas, { repeat = 1, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.anisotropy = 16; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildTextures() {
  const T = {};
  // compacted site dirt with tyre tracks
  {
    const A = hex("#c2b294"), B = hex("#a48f70"), C = hex("#d6cbb2");
    const { canvas, g } = pixelTex(1024, 11, (u, v, n) => {
      const f = n(u * 8, v * 8, 6, 8), k = n(u * 32 + 5, v * 32, 3, 32);
      let c = mix(B, A, Math.min(1, Math.max(0, f * 1.6 - 0.3)));
      c = mix(c, C, Math.max(0, k - 0.62) * 2.2);
      const sp = (Math.sin(u * 9000 + v * 7000) * 43758.5453) % 1;
      return mix(c, [60, 50, 40], Math.abs(sp) > 0.985 ? 0.35 : 0);
    });
    g.globalAlpha = 0.09; g.strokeStyle = "#3f3223"; g.lineCap = "round";
    const r = rng(3);
    for (let i = 0; i < 26; i++) {
      const x0 = r() * 1024, y0 = r() * 1024, a = r() * TAU, len = 300 + r() * 600, bend = (r() - 0.5) * 2;
      for (const off of [-11, 11]) {
        g.lineWidth = 7; g.beginPath();
        for (let s = 0; s <= 1.0001; s += 0.05) {
          const aa = a + bend * s, px = x0 + Math.cos(aa) * len * s - Math.sin(aa) * off, py = y0 + Math.sin(aa) * len * s + Math.cos(aa) * off;
          s === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.stroke();
      }
    }
    T.dirt = toTex(canvas, { repeat: 1 });
  }
  // asphalt
  {
    const A = hex("#45474a"), B = hex("#36383b");
    const { canvas } = pixelTex(512, 21, (u, v, n) => {
      const f = n(u * 6, v * 6, 5, 6), sp = n(u * 128, v * 128, 1, 128);
      return mix(mix(B, A, f), [120, 120, 118], sp > 0.8 ? (sp - 0.8) * 1.5 : 0);
    });
    T.asphalt = toTex(canvas);
  }
  // pavement / sidewalk concrete
  {
    const A = hex("#c9c5bc"), B = hex("#b3aea4");
    const { canvas, g } = pixelTex(512, 31, (u, v, n) => mix(B, A, n(u * 6, v * 6, 5, 6)));
    g.strokeStyle = "rgba(90,85,78,.25)"; g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    T.pave = toTex(canvas);
  }
  // grass
  {
    const A = hex("#6f8a45"), B = hex("#4e6b31"), C = hex("#8a9a58");
    const { canvas } = pixelTex(512, 41, (u, v, n) => {
      const f = n(u * 6, v * 6, 6, 6);
      return mix(mix(B, A, f), C, Math.max(0, n(u * 24, v * 24, 2, 24) - 0.6) * 1.8);
    });
    T.grass = toTex(canvas);
  }
  // cast concrete
  {
    const A = hex("#c4c1b9"), B = hex("#a9a59c");
    const { canvas } = pixelTex(512, 51, (u, v, n) => mix(B, A, Math.min(1, n(u * 5, v * 5, 6, 5) * 1.3)));
    T.concrete = toTex(canvas);
  }
  // roof gravel / membrane
  {
    const A = hex("#c9c6be"), B = hex("#aeaaa2");
    const { canvas } = pixelTex(256, 61, (u, v, n) => mix(B, A, n(u * 8, v * 8, 4, 8)));
    T.roof = toTex(canvas);
  }
  // building facades: 8 bays x 8 floors per tile
  T.facades = FACADES.map((f, i) => facadeTex(f, 100 + i));
  return T;
}

// bay 3.2 m, floor 3.4 m, a tile covers 8 x 8 of them
const BAY = 3.2, STOREY = 3.4, TILE_W = BAY * 8, TILE_H = STOREY * 8;
const FACADES = [
  { kind: "glass", wall: "#9fb3bd", glass: ["#4f6c80", "#6d8ba0", "#3d5568", "#86a3b5"], frame: "#d8dcdf" },
  { kind: "punched", wall: "#dcd4c4", glass: ["#3c4a55", "#4c5c68", "#2f3b45"], frame: "#efe9de" },
  { kind: "punched", wall: "#8e5c47", glass: ["#2f3a42", "#3d4a54"], frame: "#d9d2c7" },
  { kind: "ribbon", wall: "#ecebe6", glass: ["#4a6273", "#5a7487", "#3d5262"], frame: "#ecebe6" },
  { kind: "fins", wall: "#5d6166", glass: ["#53687a", "#6a8194", "#465a6b"], frame: "#3f4347" },
  { kind: "punched", wall: "#b9b2a5", glass: ["#344250", "#435361"], frame: "#d0cabe" },
];
function facadeTex(f, seed) {
  const S = 1024, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const rc = document.createElement("canvas"); rc.width = rc.height = S; // roughness
  const rg = rc.getContext("2d");
  const ec = document.createElement("canvas"); ec.width = ec.height = S; // emissive
  const eg = ec.getContext("2d"); eg.fillStyle = "#000"; eg.fillRect(0, 0, S, S);
  const r = rng(seed), bw = S / 8, fh = S / 8;
  g.fillStyle = f.wall; g.fillRect(0, 0, S, S);
  rg.fillStyle = "#d8d8d8"; rg.fillRect(0, 0, S, S);
  const pane = (x, y, w, h) => {
    const gl = f.glass[Math.floor(r() * f.glass.length)];
    const grd = g.createLinearGradient(x, y, x + w * 0.4, y + h);
    const base = new THREE.Color(gl), lit = base.clone().lerp(new THREE.Color("#c9dbe6"), 0.25 + r() * 0.2);
    grd.addColorStop(0, "#" + lit.getHexString()); grd.addColorStop(1, gl);
    g.fillStyle = grd; g.fillRect(x, y, w, h);
    // blinds drawn in some windows
    if (r() < 0.22) { g.fillStyle = r() < 0.5 ? "rgba(225,222,212,.75)" : "rgba(190,186,175,.7)"; g.fillRect(x, y, w, h * (0.25 + r() * 0.6)); }
    rg.fillStyle = "#1c1c1c"; rg.fillRect(x, y, w, h);
    if (DUSK && r() < 0.34) {
      const warm = ["#ffd08a", "#ffc470", "#ffe2b0", "#ffb866", "#e8f0ff"][Math.floor(r() * 5)];
      const ins = Math.max(3, w * 0.07); g.fillStyle = warm; g.fillRect(x + ins, y + ins, w - 2 * ins, h - 2 * ins); eg.fillStyle = warm; eg.fillRect(x + ins, y + ins, w - 2 * ins, h - 2 * ins);
    }
  };
  for (let fl = 0; fl < 8; fl++) for (let b = 0; b < 8; b++) {
    const x = b * bw, y = fl * fh;
    if (f.kind === "glass") {
      pane(x + 3, y + 3, bw - 6, fh - 22);
      g.fillStyle = "#3e4c55"; g.fillRect(x, y + fh - 19, bw, 16); // spandrel
      rg.fillStyle = "#555"; rg.fillRect(x, y + fh - 19, bw, 16);
    } else if (f.kind === "punched") {
      pane(x + bw * 0.22, y + fh * 0.2, bw * 0.56, fh * 0.56);
      g.fillStyle = f.frame; g.fillRect(x + bw * 0.2, y + fh * 0.76, bw * 0.6, 5);
    } else if (f.kind === "ribbon") {
      pane(x, y + fh * 0.3, bw, fh * 0.42);
      g.fillStyle = f.frame; g.fillRect(x, y + fh * 0.3, 4, fh * 0.42);
    } else {
      pane(x + 6, y + 6, bw - 12, fh - 26);
      g.fillStyle = f.frame; g.fillRect(x + bw * 0.46, y, bw * 0.08, fh);
    }
  }
  if (f.kind === "glass") { g.fillStyle = f.frame; for (let b = 0; b <= 8; b++) g.fillRect(b * bw - 2, 0, 4, S); }
  // weathering
  const nz = valueNoise(seed + 9), img = g.getImageData(0, 0, S, S), d = img.data;
  for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) {
    const k = 0.9 + 0.14 * nz(x / S * 4, y / S * 4, 4, 4), i = (y * S + x) * 4;
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  g.putImageData(img, 0, 0);
  return { map: toTex(c), rough: toTex(rc, { srgb: false }), emis: toTex(ec) };
}

// ── geometry batching ────────────────────────────────────────────────────────
const batches = new Map();
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
function batch(key, geo, mat, { cast = true, receive = true } = {}) {
  if (!batches.has(key)) batches.set(key, { geo, mat, list: [], colors: [], cast, receive });
  return batches.get(key);
}
function addBox(key, mat, x, y, z, sx, sy, sz, ry = 0, color, opts) {
  const b = batch(key, unitBox, mat, opts);
  _e.set(0, ry, 0); _q.setFromEuler(_e);
  b.list.push(new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz)));
  if (color) b.colors.push(new THREE.Color(color));
}
// a box standing on y (y is the base)
const addBlock = (key, mat, x, y, z, sx, sy, sz, ry, color, opts) => addBox(key, mat, x, y + sy / 2, z, sx, sy, sz, ry, color, opts);
const _up = V(0, 1, 0);
function addRod(key, mat, a, b, r, opts) {
  const bt = batch(key, unitCyl, mat, opts);
  const d = b.clone().sub(a), len = d.length();
  _q.setFromUnitVectors(_up, d.clone().normalize());
  bt.list.push(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), _q.clone(), _s.set(r, len, r)));
}
function flushBatches(scene) {
  for (const [, b] of batches) {
    if (!b.list.length) continue;
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
    b.list.forEach((m, i) => im.setMatrixAt(i, m));
    if (b.colors.length === b.list.length) b.colors.forEach((c, i) => im.setColorAt(i, c));
    im.castShadow = b.cast; im.receiveShadow = b.receive;
    scene.add(im);
  }
  batches.clear();
}

// ── the world ────────────────────────────────────────────────────────────────
// Site block: x ∈ [-52, 76], z ∈ [-42, 58]. Road centres every 144 m in x, 116 m in z.
const SITE = { x0: -52, x1: 76, z0: -42, z1: 58 };
const ROAD_W = 16, PX = 144, PZ = 116, RX0 = -60, RZ0 = -50;
export const LOOP = { seconds: 24 };

const DOME_VERT = "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }";
const DAY_FRAG = `varying vec3 vP; uniform vec3 sunDir;
  void main(){
    float e = max(vP.y, 0.);
    vec3 hor = vec3(.80,.87,.93), mid = vec3(.55,.74,.92), top = vec3(.30,.55,.86);
    vec3 c = mix(hor, mid, smoothstep(0., .16, e));
    c = mix(c, top, smoothstep(.16, .6, e));
    gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.0, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const DUSK_FRAG = `varying vec3 vP; uniform vec3 sunDir;
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
    col += vec3(1.,.55,.2) * pow(sa, 5.) * .45 + vec3(1.,.82,.55) * pow(sa, 160.) * 2.2;
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
  }`;
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
  DUSK = dusk;
  const { sunElev = 42, sunAz = 215, sunColor = "#ffeed6", sunPower = 4.3, geofence = false } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dusk ? 0.95 : 0.78;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, width / height, 1, 4000);

  // sky and sun
  const sky = new Sky();
  const su = sky.material.uniforms;
  su.turbidity.value = 2.4; su.rayleigh.value = 2.4; su.mieCoefficient.value = 0.003; su.mieDirectionalG.value = 0.78;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - sunElev), THREE.MathUtils.degToRad(sunAz));
  su.sunPosition.value.copy(sunDir);
  scene.add(skyDome(3600, dusk, sunDir));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(1000);
  Object.assign(sky2.material.uniforms, {}); for (const k of Object.keys(su)) sky2.material.uniforms[k].value = su[k].value;
  envScene.add(dusk ? skyDome(1000, true, sunDir) : sky2);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = dusk ? 0.9 : 0.75;
  scene.fog = dusk ? new THREE.Fog("#b8857f", 200, 1500) : new THREE.Fog("#c9d9e6", 260, 2100);

  const sun = new THREE.DirectionalLight(sunColor, sunPower);
  sun.position.copy(sunDir).multiplyScalar(600).add(V(12, 0, 8));
  sun.target.position.set(12, 0, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(8192, 8192);
  const sc = sun.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 50; sc.far = 1400;
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(dusk ? "#9a9dd0" : "#cfe3f5", dusk ? "#8a6a52" : "#8a7d68", dusk ? 1.1 : 0.35));
  if (dusk) { const fill = new THREE.DirectionalLight("#8aa0e8", 1.7); fill.position.set(-300, 220, 400); scene.add(fill); }

  const T = buildTextures();
  const M = materials(T);
  const anim = [];

  ground(scene, T, M);
  city(scene, T, M, anim);
  site(scene, T, M, anim);
  if (dusk) nightLights(M);
  flushBatches(scene);

  // post: ambient occlusion, then tone mapping
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, width, height);
  ao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.4, thickness: 4, scale: 1.1, samples: 16 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  ao.blendIntensity = 0.85;
  composer.addPass(ao);
  if (dusk) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.6, 1.5));
  composer.addPass(new OutputPass());

  // The geofence: a hi-vis ring on the ground and a faint wall rising from it
  if (geofence) {
    const gc = V(12, 0, 8), gr = 96;
    const ring = new THREE.Mesh(new THREE.RingGeometry(gr - 0.9, gr, 160), new THREE.MeshBasicMaterial({ color: "#f5c400", side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(gc.x, 0.5, gc.z); scene.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(gr, 160), new THREE.MeshBasicMaterial({ color: "#f5c400", transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(gc.x, 0.45, gc.z); scene.add(disc);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, 46, 160, 1, true), new THREE.MeshBasicMaterial({ color: "#f5c400", transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    wall.position.set(gc.x, 23, gc.z); scene.add(wall);
  }
  const center = V(14, 12, 6);
  // the fly-in: a smooth path from high over the city, down to the gate, round the tower, and up
  const DEFAULT_FP = [
    [V(340, 270, 390), V(12, 10, 8), 34], [V(200, 140, 262), V(12, 14, 8), 36], [V(84, 74, 178), V(30, 12, 40), 40],
    [V(84, 14, 94), V(24, 12, 36), 44], [V(58, 9, 68), V(10, 14, 12), 48], [V(-13, 9, 70), V(14, 15, 8), 48],
    [V(-64, 34, 54), V(12, 20, 6), 42], [V(-70, 70, -30), V(12, 22, 6), 38], [V(60, 140, -66), V(12, 18, 8), 36], [V(230, 190, 40), V(12, 14, 8), 35],
  ];
  const FP = (path ?? DEFAULT_FP).map((k) => [Array.isArray(k[0]) ? V(...k[0]) : k[0], Array.isArray(k[1]) ? V(...k[1]) : k[1], k[2]]);
  const fpPos = new THREE.CatmullRomCurve3(FP.map((k) => k[0]), true, "centripetal");
  const fpLook = new THREE.CatmullRomCurve3(FP.map((k) => k[1]), true, "centripetal");
  const ease = (x) => x * x * (3 - 2 * x);
  const VFOV = 42, HALF = VFOV / 2;
  camera.fov = VFOV; camera.updateProjectionMatrix();
  function cameraAt(t) {
    const a = TAU * t;
    const th = THREE.MathUtils.degToRad(200) - a; // clockwise
    const rad = 178 + 12 * Math.sin(2 * a + 0.7);
    const alt = 76 + 6 * Math.sin(2 * a + 2.1) + 2.5 * Math.sin(3 * a);
    const pos = V(center.x + Math.cos(th) * rad, alt, center.z + Math.sin(th) * rad);
    const to = center.clone().sub(pos), flatD = Math.hypot(to.x, to.z);
    const elev = Math.atan2(to.y, flatD) * 180 / Math.PI;
    // subject at 62% down and 62% across, which leaves sky up top and room on the left
    const pitch = THREE.MathUtils.degToRad(elev + 0.12 * VFOV + 0.4 * Math.sin(a * 2));
    const yaw = Math.atan2(to.x, to.z) + THREE.MathUtils.degToRad(9.3);
    const dir = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(pos.clone().add(dir));
    camera.rotateZ(THREE.MathUtils.degToRad(-3.5 + 1.0 * Math.sin(a * 2 + 1)));
  }

  return {
    renderAt(t) {
      for (const f of anim) f(t);
      cameraAt(t);
      composer.render();
    },
    flightAt(t) {
      for (const f of anim) f(t);
      const u = ((t % 1) + 1) % 1;
      camera.position.copy(fpPos.getPoint(u)); camera.up.set(0, 1, 0); camera.lookAt(fpLook.getPoint(u));
      const x = u * FP.length, i = Math.floor(x) % FP.length;
      camera.fov = FP[i][2] + (FP[(i + 1) % FP.length][2] - FP[i][2]) * ease(x - Math.floor(x)); camera.updateProjectionMatrix();
      composer.render();
    },
    // a fixed shot (for stills)
    shot(t, pos, look, fov = 38) {
      for (const f of anim) f(t);
      camera.fov = fov; camera.updateProjectionMatrix();
      camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(look);
      composer.render();
    },
    resize(w, h) { renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    renderer,
  };
}

function materials(T) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const concrete = std({ map: T.concrete, color: "#ffffff", roughness: 0.9 });
  T.concrete.repeat.set(1, 1);
  return {
    concrete,
    concreteDark: std({ map: T.concrete, color: "#c9c4ba", roughness: 0.92 }),
    yellow: std({ color: "#f2bd0f", roughness: 0.55, metalness: 0.15 }),
    yellowDark: std({ color: "#c79806", roughness: 0.6, metalness: 0.15 }),
    steel: std({ color: "#7d8389", roughness: 0.5, metalness: 0.6 }),
    darkSteel: std({ color: "#2f3236", roughness: 0.6, metalness: 0.4 }),
    rebar: std({ color: "#6c4a35", roughness: 0.85, metalness: 0.3 }),
    ply: std({ color: "#b98b5c", roughness: 0.8 }),
    plyRed: std({ color: "#a4553c", roughness: 0.75 }),
    white: std({ color: "#eeeeea", roughness: 0.6 }),
    orange: std({ color: "#e0662a", roughness: 0.6 }),
    rail: std({ color: "#e0a400", roughness: 0.55 }),
    black: std({ color: "#1b1c1e", roughness: 0.8 }),
    tyre: std({ color: "#1d1d1f", roughness: 0.95 }),
    glassDark: std({ color: "#25323b", roughness: 0.08, metalness: 0.2 }),
    trunk: std({ color: "#5a4634", roughness: 0.9 }),
    leaves: std({ color: "#ffffff", roughness: 0.9 }),
    car: std({ color: "#ffffff", roughness: 0.32, metalness: 0.45 }),
    roofUnit: std({ color: "#b9bab6", roughness: 0.6, metalness: 0.3 }),
    netting: std({ color: "#c9d6dc", roughness: 0.9, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
    paint: std({ color: "#f3f2ee", roughness: 0.7 }),
    container: std({ color: "#ffffff", roughness: 0.7, metalness: 0.2 }),
    pallet: std({ color: "#a98a62", roughness: 0.9 }),
    block: std({ color: "#b9b4ab", roughness: 0.9 }),
    mud: std({ map: T.dirt, color: "#ffffff", roughness: 1 }),
    pitWall: std({ map: T.dirt, color: "#d8ccb8", roughness: 1 }),
    gravel: std({ map: T.dirt, color: "#d9d2c3", roughness: 1 }),
    roof: std({ map: T.roof, roughness: 0.9 }),
    roofs: ["#ffffff", "#e9e7e2", "#9d9a93", "#c9c3b5"].map((c) => std({ map: T.roof, color: c, roughness: 0.9 })),
    facades: T.facades.map((f) => std({ map: f.map, roughnessMap: f.rough, roughness: 1, metalness: 0.08, envMapIntensity: 1.3, ...(DUSK ? { emissive: "#ffffff", emissiveMap: f.emis, emissiveIntensity: 1.05 } : {}) })),
    lamp: std({ color: "#fff0d0", emissive: "#ffc878", emissiveIntensity: 3.2 }),
    bulb: std({ color: "#fff0d0", emissive: "#ffb860", emissiveIntensity: 2.6 }),
    redlight: std({ color: "#ff3030", emissive: "#ff2020", emissiveIntensity: 4 }),
    flood: std({ color: "#fff6e0", emissive: "#fff1d0", emissiveIntensity: 4.5 }),
  };
}

// a plane in XZ with world-scale UVs (one texture repeat per `tile` metres)
function flat(mat, x0, z0, x1, z1, y, tile, { receive = true } = {}) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + (x0 + x1) / 2) / tile, (pos.getZ(i) + (z0 + z1) / 2) / tile);
  const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = receive;
  return m;
}

function ground(scene, T, M) {
  const asphalt = new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: 0.92 });
  // one big asphalt sheet under everything; blocks sit on top as kerbed slabs
  scene.add(flat(asphalt, -1400, -1400, 1400, SITE.z0, 0, 12), flat(asphalt, -1400, SITE.z1, 1400, 1400, 0, 12),
    flat(asphalt, -1400, SITE.z0, SITE.x0, SITE.z1, 0, 12), flat(asphalt, SITE.x1, SITE.z0, 1400, SITE.z1, 0, 12));
  const pave = new THREE.MeshStandardMaterial({ map: T.pave, roughness: 0.9 });
  const grass = new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 });
  const lineMat = new THREE.MeshStandardMaterial({ color: "#e9e7df", roughness: 0.8 });
  // lane dashes and crossings near the site
  for (let k = -5; k <= 5; k++) {
    const rx = RX0 + PX * k, rz = RZ0 + PZ * k;
    for (let z = -700; z < 700; z += 9) if (Math.abs(((z - RZ0) % PZ + PZ) % PZ - PZ / 2) < PZ / 2 - 12) addBox("dash", lineMat, rx, 0.03, z, 0.18, 0.02, 3.2, 0, null, { cast: false });
    for (let x = -800; x < 800; x += 9) if (Math.abs(((x - RX0) % PX + PX) % PX - PX / 2) < PX / 2 - 12) addBox("dash", lineMat, x, 0.03, rz, 3.2, 0.02, 0.18, 0, null, { cast: false });
  }
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const cx = RX0 + PX * i, cz = RZ0 + PZ * j;
    for (let s = -3; s <= 3; s++) {
      addBox("zebra", lineMat, cx + s * 1.6, 0.03, cz + ROAD_W / 2 + 2, 0.8, 0.02, 3.2, 0, null, { cast: false });
      addBox("zebra", lineMat, cx - ROAD_W / 2 - 2, 0.03, cz + s * 1.6, 3.2, 0.02, 0.8, 0, null, { cast: false });
    }
  }
  scene.userData.pave = pave; scene.userData.grass = grass;
}

function forBlocks(fn, range = 4) {
  for (let i = -range; i <= range; i++) for (let j = -range; j <= range; j++) {
    const x0 = RX0 + PX * i + ROAD_W / 2, x1 = RX0 + PX * (i + 1) - ROAD_W / 2;
    const z0 = RZ0 + PZ * j + ROAD_W / 2, z1 = RZ0 + PZ * (j + 1) - ROAD_W / 2;
    fn({ i, j, x0, x1, z0, z1 });
  }
}

let SHOP = null, PARAPET = null;
function facadeBox(mat, roofMat, x, z, w, h, d, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // faces: +x, -x, +y, -y, +z, -z (4 verts each)
  const span = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const off = R() * 4;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k, [a, b] = span[f];
    if (f === 2 || f === 3) uv.setXY(i, uv.getX(i) * a / 20, uv.getY(i) * b / 20);
    else uv.setXY(i, off + uv.getX(i) * a / TILE_W, uv.getY(i) * b / TILE_H);
  }
  const m = new THREE.Mesh(g, [mat, mat, roofMat, roofMat, mat, mat]);
  m.position.set(x, h / 2, z); m.rotation.y = ry;
  if (SHOP) addBlock("shop", SHOP, x, 0.15, z, w + 0.3, 4.4, d + 0.3);
  if (PARAPET) for (const [px, pz, sx, sz] of [[x, z - d / 2, w, 0.3], [x, z + d / 2, w, 0.3], [x - w / 2, z, 0.3, d], [x + w / 2, z, 0.3, d]]) addBlock("parapet", PARAPET, px, h, pz, sx + 0.3, 0.9, sz + 0.3);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function treeGeo() {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, r = rng(5);
  for (let i = 0; i < p.count; i++) { const k = 0.82 + r() * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.92, p.getZ(i) * k); }
  g.computeVertexNormals();
  return g;
}
const TREE = treeGeo();
function addTree(M, x, z, s = 1) {
  const h = rr(5, 8) * s, cr = rr(2.4, 3.6) * s;
  addRod("trunk", M.trunk, V(x, 0, z), V(x, h * 0.55, z), 0.22 * s);
  const b = batch("leaves", TREE, M.leaves);
  _e.set(rr(0, 1), rr(0, TAU), 0); _q.setFromEuler(_e);
  b.list.push(new THREE.Matrix4().compose(V(x, h * 0.62 + cr * 0.4, z), _q.clone(), V(cr, cr * rr(0.85, 1.1), cr)));
  b.colors.push(new THREE.Color().setHSL(rr(0.2, 0.28), rr(0.35, 0.5), rr(0.1, 0.17)));
}

function carGeo() {
  const body = new THREE.BoxGeometry(4.4, 0.8, 1.8); body.translate(0, 0.55, 0);
  const cab = new THREE.BoxGeometry(2.3, 0.62, 1.62); cab.translate(-0.25, 1.25, 0);
  return mergeGeometries([body, cab]);
}
const CAR = carGeo();
const CAR_COLORS = ["#f2f2f0", "#b9bcc0", "#1d1f22", "#2b3f5c", "#8a1f1f", "#6c7075", "#e9e9e6", "#3d4448"];

function city(scene, T, M, anim) {
  const { pave, grass } = scene.userData;
  SHOP = new THREE.MeshStandardMaterial({ color: "#2c3a44", roughness: 0.12, metalness: 0.3 });
  PARAPET = new THREE.MeshStandardMaterial({ color: "#d9d6cf", roughness: 0.8 });
  forBlocks(({ i, j, x0, x1, z0, z1 }) => {
    const far = Math.max(Math.abs(i), Math.abs(j));
    const isSite = i === 0 && j === 0;
    // kerbed block
    if (!isSite) {
      const k = new THREE.Mesh(unitBox, pave); k.scale.set(x1 - x0, 0.18, z1 - z0); k.position.set((x0 + x1) / 2, 0.09, (z0 + z1) / 2); k.receiveShadow = true;
      scene.add(flat(pave, x0, z0, x1, z1, 0.181, 14));
    }
    if (isSite) return;
    // a park now and then
    if ((i === -1 && j === 1) || (i === 2 && j === -2) || (i === -3 && j === -1)) {
      scene.add(flat(grass, x0 + 4, z0 + 4, x1 - 4, z1 - 4, 0.2, 18));
      for (let n = 0; n < 60; n++) addTree(M, rr(x0 + 8, x1 - 8), rr(z0 + 8, z1 - 8), rr(0.9, 1.4));
      return;
    }
    // lots: split the block into 2–3 x 2 parcels
    const nx = R() < 0.5 ? 2 : 3, nz = 2, inset = 5;
    const lw = (x1 - x0 - inset * 2) / nx, ld = (z1 - z0 - inset * 2) / nz;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const lx0 = x0 + inset + a * lw, lz0 = z0 + inset + b * ld;
      const w = lw - rr(3, 8), d = ld - rr(3, 8);
      const cx = lx0 + lw / 2, cz = lz0 + ld / 2;
      const towerish = far >= 3 && R() < 0.25;
      const h = towerish ? rr(70, 140) : far === 1 ? rr(7, 16) : far === 2 ? rr(12, 40) : rr(14, 56);
      const fm = pick(M.facades).clone(); fm.color.setHSL(0.08, 0.15, rr(0.82, 1));
      if (towerish) {
        const tw = Math.min(w, d) * rr(0.6, 0.85);
        scene.add(facadeBox(fm, M.roof, cx, cz, tw, h, tw));
        scene.add(facadeBox(pick(M.facades), M.roof, cx, cz, w, rr(8, 14), d));
      } else {
        scene.add(facadeBox(fm, pick(M.roofs), cx, cz, w, h, d));
        // a setback storey on some
        if (R() < 0.35) scene.add(Object.assign(facadeBox(fm, M.roof, cx, cz, w * 0.7, h + rr(4, 8), d * 0.7)));
      }
      // rooftop plant
      const top = towerish ? h : h;
      for (let n = 0; n < 3 + Math.floor(R() * 4); n++) addBlock("roofunit", M.roofUnit, cx + rr(-w / 4, w / 4) * (towerish ? 0.4 : 1), top, cz + rr(-d / 4, d / 4) * (towerish ? 0.4 : 1), rr(1.5, 4), rr(1, 2.4), rr(1.5, 4));
    }
    // street trees on the kerb
    for (let x = x0 + 6; x < x1 - 4; x += rr(9, 13)) { addTree(M, x, z0 + 2.2, 0.8); addTree(M, x, z1 - 2.2, 0.8); }
    for (let z = z0 + 6; z < z1 - 4; z += rr(9, 13)) { addTree(M, x0 + 2.2, z, 0.8); addTree(M, x1 - 2.2, z, 0.8); }
  }, 5);

  // traffic: lanes of evenly spaced slots that move exactly four slots per loop, with a fixed
  // 4-slot pattern (colours and gaps), so the last frame matches the first
  const lanes = [];
  for (const k of [-1, 0, 1, 2]) {
    const rx = RX0 + PX * k, rz = RZ0 + PZ * k;
    lanes.push({ ax: "z", c: rx + 3.4, dir: 1 }, { ax: "z", c: rx - 3.4, dir: -1 });
    lanes.push({ ax: "x", c: rz + 3.4, dir: -1 }, { ax: "x", c: rz - 3.4, dir: 1 });
  }
  const SLOT = 21, L = 1400, n = Math.floor(L / SLOT);
  const cars = [];
  lanes.forEach((ln, li) => {
    const r = rng(200 + li), pattern = [0, 1, 2, 3].map(() => (r() < 0.3 ? null : pick(CAR_COLORS)));
    for (let s = 0; s < n; s++) { const col = pattern[s % 4]; if (col) cars.push({ ln, s0: s * SLOT - L / 2, col }); }
  });
  let lightsIm = null;
  if (DUSK) {
    const mk = (x, z, c) => { const g = new THREE.BoxGeometry(0.12, 0.2, 0.34); g.translate(x, 0.62, z); const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; } g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g; };
    const lm = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); lm.color.setRGB(2.2, 2.2, 2.2);
    lightsIm = new THREE.InstancedMesh(mergeGeometries([mk(2.2, -0.65, [1, 0.93, 0.75]), mk(2.2, 0.65, [1, 0.93, 0.75]), mk(-2.2, -0.65, [1, 0.08, 0.05]), mk(-2.2, 0.65, [1, 0.08, 0.05])]), lm, cars.length);
    lightsIm.frustumCulled = false; scene.add(lightsIm);
  }
  const im = new THREE.InstancedMesh(CAR, M.car, cars.length);
  cars.forEach((c, i) => im.setColorAt(i, new THREE.Color(c.col)));
  im.castShadow = true; im.receiveShadow = true;
  scene.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  anim.push((t) => {
    cars.forEach((c, i) => {
      let s = c.s0 + c.ln.dir * t * SLOT * 4;
      s = ((s + L / 2) % L + L) % L - L / 2;
      // stop the queue short of crossings: gentle slow-down near junctions is skipped for clarity
      const along = s, ry = c.ln.ax === "z" ? (c.ln.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (c.ln.dir > 0 ? 0 : Math.PI);
      q.setFromAxisAngle(_up, ry);
      const pos = c.ln.ax === "z" ? V(c.ln.c, 0.02, along) : V(along, 0.02, c.ln.c);
      m4.compose(pos, q, V(1, 1, 1));
      im.setMatrixAt(i, m4); if (lightsIm) lightsIm.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true; if (lightsIm) lightsIm.instanceMatrix.needsUpdate = true;
  });
}

// ── the job site ─────────────────────────────────────────────────────────────
function site(scene, T, M, anim) {
  const PIT = { x0: 26, x1: 64, z0: 2, z1: 42, depth: 6, slope: 4 };
  // ground with a hole for the excavation
  const shape = new THREE.Shape();
  shape.moveTo(SITE.x0, -SITE.z0); shape.lineTo(SITE.x1, -SITE.z0); shape.lineTo(SITE.x1, -SITE.z1); shape.lineTo(SITE.x0, -SITE.z1); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(PIT.x0, -PIT.z0); hole.lineTo(PIT.x0, -PIT.z1); hole.lineTo(PIT.x1, -PIT.z1); hole.lineTo(PIT.x1, -PIT.z0); hole.closePath();
  shape.holes.push(hole);
  const sg = new THREE.ShapeGeometry(shape); sg.rotateX(-Math.PI / 2);
  { const uv = sg.attributes.uv, p = sg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 40, p.getZ(i) / 40); }
  const sm = new THREE.Mesh(sg, M.mud); sm.position.y = 0.06; sm.receiveShadow = true; scene.add(sm);
  // gravel haul road from the gate to the building and pit
  scene.add(flat(M.gravel, -20, 22, -6, 58, 0.09, 30));
  scene.add(flat(M.gravel, -20, 18, 60, 30, 0.08, 30));
  // pit: floor and four sloped walls
  const D = PIT.depth, s = PIT.slope;
  scene.add(flat(M.mud, PIT.x0 + s, PIT.z0 + s, PIT.x1 - s, PIT.z1 - s, -D, 30));
  const quad = (a, b, c, d) => {
    const g = new THREE.BufferGeometry();
    const pts = [a, b, c, a, c, d];
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(pts.flatMap((p) => [(p.x + p.z) / 30, p.y / 30 + p.z / 60]), 2));
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) return quad(a, d, c, b);
    const m = new THREE.Mesh(g, M.pitWall); m.receiveShadow = true; return m;
  };
  const A = V(PIT.x0, 0.06, PIT.z0), B = V(PIT.x1, 0.06, PIT.z0), C = V(PIT.x1, 0.06, PIT.z1), Dd = V(PIT.x0, 0.06, PIT.z1);
  const a = V(PIT.x0 + s, -D, PIT.z0 + s), b = V(PIT.x1 - s, -D, PIT.z0 + s), c = V(PIT.x1 - s, -D, PIT.z1 - s), d = V(PIT.x0 + s, -D, PIT.z1 - s);
  scene.add(quad(A, a, b, B), quad(B, b, c, C), quad(C, c, d, Dd), quad(Dd, d, a, A));
  // shoring piles along the side next to the tower
  for (let z = PIT.z0 + 1; z < PIT.z1; z += 1.2) addBlock("pile", M.darkSteel, PIT.x0 + 0.3, -D + s * 0, z, 0.5, D + 0.6, 0.6);
  // footings poured in the pit bottom
  for (let x = PIT.x0 + 9; x < PIT.x1 - 6; x += 7) for (let z = PIT.z0 + 9; z < PIT.z1 - 8; z += 7.5) {
    addBlock("footing", M.concrete, x, -D, z, 2.2, 0.7, 2.2);
    for (let r = 0; r < 4; r++) addRod("rebar", M.rebar, V(x - 0.5 + (r % 2), -D + 0.7, z - 0.5 + (r >> 1)), V(x - 0.5 + (r % 2), -D + 2.4, z - 0.5 + (r >> 1)), 0.05);
  }
  // spoil heaps
  const heap = (x, z, rx, h, rz) => {
    const g = new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, Math.PI / 2), p = g.attributes.position, r2 = rng(Math.floor(x * 13 + z));
    for (let i = 0; i < p.count; i++) { const k = 1 + (r2() - 0.5) * 0.12; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    g.computeVertexNormals();
    { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * rx / 12, p.getZ(i) * rz / 12); }
    const m = new THREE.Mesh(g, M.mud); m.scale.set(rx, h, rz); m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  };
  heap(66, 49, 6, 4, 5.5); heap(55, 52, 4.5, 2.8, 3.6);

  tower(scene, M, anim);
  crane(scene, M, anim, { x: -26, z: -6, h: 64, jib: 56, counter: 17, base: 0.55, swing: 0.5, phase: 0 });
  crane(scene, M, anim, { x: 48, z: -14, h: 60, jib: 44, counter: 14, base: 2.6, swing: 0.7, phase: 1.7 });
  excavator(scene, M, anim, V(46, -D, 26), 0.6);
  excavator(scene, M, anim, V(38, -D, 12), -2.2, 0.5);
  truck(scene, M, V(66, 0.06, 24), Math.PI / 2, "#f3f2ee", true);
  truck(scene, M, V(10, 0.06, 24), 0, "#e9e7e2", true);
  mixer(scene, M, V(-12, 0.06, 20), Math.PI * 0.5);
  pump(scene, M, V(2, 0.06, 15), 0);
  cabins(scene, M);
  laydown(scene, M);
  hoarding(scene, M);
}

// the concrete-frame tower going up
function tower(scene, M, anim) {
  const W = 36, D = 24, X = 0, Z = 0, FH = 3.8, BUILT = 10;
  const cols = []; for (let i = 0; i <= 5; i++) for (let k = 0; k <= 3; k++) cols.push([X - W / 2 + 1 + i * (W - 2) / 5, Z - D / 2 + 1 + k * (D - 2) / 3]);
  const glassMat = new THREE.MeshStandardMaterial({ map: null, color: "#3c5566", roughness: 0.06, metalness: 0.35, envMapIntensity: 1.4 });
  const curtain = M.facades[0];
  for (let f = 0; f <= BUILT; f++) {
    const y = f * FH;
    // slab
    addBlock("slab", M.concrete, X, y, Z, W + 0.6, 0.32, D + 0.6);
    if (f < BUILT) for (const [cx, cz] of cols) addBlock("col", M.concrete, cx, y + 0.32, cz, 0.62, FH - 0.32, 0.62);
    // stuff on the open floors
    if (f >= 5 && f < BUILT) {
      for (let n = 0; n < 6; n++) addBlock("pallet", pick([M.pallet, M.block]) === M.pallet ? M.pallet : M.pallet, X + rr(-W / 2 + 3, W / 2 - 3), y + 0.32, Z + rr(-D / 2 + 3, D / 2 - 3), rr(1, 1.4), rr(0.4, 1.1), rr(1, 1.4));
      // edge protection: posts and two rails
      const ry = y + 0.32;
      for (const [ax, len, fixed, sgn] of [["x", W, Z - D / 2 - 0.2, 0], ["x", W, Z + D / 2 + 0.2, 0], ["z", D, X - W / 2 - 0.2, 0], ["z", D, X + W / 2 + 0.2, 0]]) {
        for (const hgt of [0.5, 1.05]) ax === "x" ? addBox("rail", M.rail, X, ry + hgt, fixed, len, 0.06, 0.06) : addBox("rail", M.rail, fixed, ry + hgt, Z, 0.06, 0.06, len);
        for (let p = -len / 2; p <= len / 2; p += 2.4) {
          ax === "x" ? addBlock("post", M.darkSteel, X + p, ry, fixed, 0.06, 1.1, 0.06) : addBlock("post", M.darkSteel, fixed, ry, Z + p, 0.06, 1.1, 0.06);
          if (DUSK) ax === "x" ? addSphere("bulb", M.bulb, X + p, ry + 1.25, fixed, 0.22) : addSphere("bulb", M.bulb, fixed, ry + 1.25, Z + p, 0.22);
        }
      }
    }
  }
  // curtain wall on the finished lower floors (with the facade texture, one per side)
  const cw = new THREE.Group();
  const cwH = FH * 5 - 0.1;
  const cwBox = (() => {
    const g = new THREE.BoxGeometry(W - 0.4, cwH, D - 0.4), uv = g.attributes.uv;
    const span = [[D, cwH], [D, cwH], [W, D], [W, D], [W, cwH], [W, cwH]];
    for (let fc = 0; fc < 6; fc++) for (let k = 0; k < 4; k++) { const i = fc * 4 + k; uv.setXY(i, uv.getX(i) * span[fc][0] / TILE_W, uv.getY(i) * span[fc][1] / (STOREY * 8) * (STOREY / FH) * 1.0); }
    const m = new THREE.Mesh(g, [curtain, curtain, M.concrete, M.concrete, curtain, curtain]);
    m.position.set(X, FH * 0 + cwH / 2 + 0.05, Z); m.castShadow = m.receiveShadow = true; return m;
  })();
  cw.add(cwBox); scene.add(cw);
  // glazing has reached floor 6 on the south face only
  { const g = new THREE.PlaneGeometry(W - 0.4, FH * 2 - 0.4); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / TILE_W, uv.getY(i) * FH * 2 / (STOREY * 8) * (STOREY / FH)); const m = new THREE.Mesh(g, curtain); m.position.set(X, FH * 6, Z + D / 2 - 0.2); m.castShadow = true; scene.add(m); }
  // core walls rise two levels above the deck, with climbing formwork on top
  const coreTop = (BUILT + 2) * FH;
  addBlock("core", M.concreteDark, X - 4, 0, Z - 1, 8, coreTop, 7);
  addBlock("jumpform", M.plyRed, X - 4, coreTop - 0.4, Z - 1, 9.2, 3.6, 8.2);
  addBlock("jumpdeck", M.darkSteel, X - 4, coreTop + 3.2, Z - 1, 9.6, 0.25, 8.6);
  // next level: formwork deck on half the plan, columns poured, rebar standing up
  const y = (BUILT) * FH + 0.32;
  addBlock("ply", M.ply, X + W / 4, y + FH - 0.5, Z, W / 2 + 0.6, 0.18, D + 0.6);
  for (let px = X + 0.5; px < X + W / 2; px += 1.6) for (let pz = Z - D / 2 + 0.6; pz < Z + D / 2; pz += 1.6) addRod("prop", M.steel, V(px, y, pz), V(px, y + FH - 0.5, pz), 0.05);
  for (const [cx, cz] of cols) {
    if (cx < X) { // columns poured on the west half; bars waiting on the east
      addBlock("col", M.concrete, cx, y, cz, 0.62, FH - 0.5, 0.62);
    }
    for (let r = 0; r < 4; r++) { const ox = (r % 2 ? 0.22 : -0.22), oz = (r >> 1 ? 0.22 : -0.22); const top = cx < X ? y + FH + 0.8 : y + FH * 0.9; addRod("rebar", M.rebar, V(cx + ox, cx < X ? y + FH - 0.5 : y, cz + oz), V(cx + ox, top, cz + oz), 0.035); }
  }
  // rebar mat laid on the deck
  for (let k = 0; k < 22; k++) { const xx = X + 1 + k * 0.75; addBox("rebar2", M.rebar, xx, y + FH - 0.35, Z, 0.05, 0.05, D - 1); }
  for (let k = 0; k < 30; k++) { const zz = Z - D / 2 + 1 + k * 0.75; addBox("rebar2", M.rebar, X + W / 4 + 0.5, y + FH - 0.3, zz, W / 2 - 1.5, 0.05, 0.05); }
  // scaffold and sheeting on the east face, floors 5–10
  const sx = X + W / 2 + 1.2;
  for (let z = Z - D / 2; z <= Z + D / 2 + 0.01; z += 2.4) for (const off of [0, 1.1]) addRod("scaf", M.steel, V(sx + off, FH * 5, z), V(sx + off, FH * (BUILT + 1) + 1, z), 0.04);
  for (let yy = FH * 5; yy <= FH * (BUILT + 1) + 1; yy += 2) for (const off of [0, 1.1]) addBox("scafH", M.steel, sx + off, yy, Z, 0.07, 0.07, D);
  for (let yy = FH * 5 + 2; yy <= FH * (BUILT + 1); yy += 2) addBox("plank", M.pallet, sx + 0.55, yy, Z, 1.2, 0.06, D);
  { const g = new THREE.PlaneGeometry(D + 0.4, FH * 6 + 1); const m = new THREE.Mesh(g, M.netting); m.rotation.y = Math.PI / 2; m.position.set(sx + 1.25, FH * 5 + (FH * 6 + 1) / 2, Z); scene.add(m); }
  // hoist mast on the north face
  const hx = X + 6, hz = Z - D / 2 - 2.2;
  for (const [ox, oz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) addRod("mast", M.yellow, V(hx + ox, 0, hz + oz), V(hx + ox, FH * (BUILT + 1), hz + oz), 0.06);
  const cage = new THREE.Mesh(unitBox, M.white); cage.scale.set(3, 2.6, 1.6); cage.castShadow = true; scene.add(cage);
  anim.push((t) => { const k = 0.5 - 0.5 * Math.cos(TAU * t); cage.position.set(hx, 1.3 + k * FH * 8, hz - 1.4); });
}

// a hammerhead tower crane built as a lattice
function crane(scene, M, anim, o) {
  const { x, z, h } = o;
  const s = 1.9;
  addBlock("cranebase", M.concreteDark, x, 0, z, 7, 1.2, 7);
  // mast
  const segs = Math.round(h / 2.4);
  const corner = (i) => [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]][i];
  for (let c = 0; c < 4; c++) { const [cx, cz] = corner(c); addRod("chord", M.yellow, V(x + cx, 1.2, z + cz), V(x + cx, h, z + cz), 0.11); }
  for (let k = 0; k < segs; k++) {
    const y0 = 1.2 + k * (h - 1.2) / segs, y1 = 1.2 + (k + 1) * (h - 1.2) / segs;
    for (let c = 0; c < 4; c++) {
      const [ax, az] = corner(c), [bx, bz] = corner((c + 1) % 4);
      const flip = (k + c) % 2;
      addRod("lace", M.yellow, V(x + (flip ? ax : bx), y0, z + (flip ? az : bz)), V(x + (flip ? bx : ax), y1, z + (flip ? bz : az)), 0.05);
      addRod("lace", M.yellow, V(x + ax, y0, z + az), V(x + bx, y0, z + bz), 0.045);
    }
  }
  // slewing part, built at the origin and rotated
  const top = new THREE.Group(); top.position.set(x, h, z); scene.add(top);
  const local = []; // members in local space
  const L = o.jib, C = o.counter, jh = 1.7, jw = 1.5;
  const rod = (a, b, r, mat = M.yellow) => local.push({ a, b, r, mat });
  // jib (triangle section: two bottom chords, one top)
  rod(V(0, 0, -jw / 2), V(L, 0, -jw / 2), 0.09); rod(V(0, 0, jw / 2), V(L, 0, jw / 2), 0.09); rod(V(0, jh, 0), V(L - 2, jh * 0.4, 0), 0.08);
  const jn = Math.round(L / 2.2);
  for (let k = 0; k < jn; k++) {
    const x0 = (k * L) / jn, x1 = ((k + 1) * L) / jn, ty0 = jh * (1 - 0.6 * x0 / (L - 2)), ty1 = jh * (1 - 0.6 * Math.min(x1, L - 2) / (L - 2));
    rod(V(x0, 0, -jw / 2), V(x0, 0, jw / 2), 0.04);
    rod(V(k % 2 ? x0 : x1, 0, -jw / 2), V(k % 2 ? x1 : x0, Math.max(0.2, k % 2 ? ty1 : ty0), 0), 0.04);
    rod(V(k % 2 ? x0 : x1, 0, jw / 2), V(k % 2 ? x1 : x0, Math.max(0.2, k % 2 ? ty1 : ty0), 0), 0.04);
  }
  // counter-jib walkway and weights
  rod(V(0, 0, -1), V(-C, 0, -1), 0.1); rod(V(0, 0, 1), V(-C, 0, 1), 0.1);
  for (let k = 0; k <= C; k += 2) rod(V(-k, 0, -1), V(-k, 0, 1), 0.05);
  // tower head and pendants
  rod(V(-0.8, 0, -0.8), V(0, 7, 0), 0.1); rod(V(0.8, 0, 0.8), V(0, 7, 0), 0.1); rod(V(-0.8, 0, 0.8), V(0, 7, 0), 0.1); rod(V(0.8, 0, -0.8), V(0, 7, 0), 0.1);
  rod(V(0, 7, 0), V(L * 0.55, jh * 0.7, 0), 0.035, M.darkSteel); rod(V(0, 7, 0), V(-C + 1, 0.2, 0), 0.035, M.darkSteel);
  const meshes = [];
  for (const { a, b, r, mat } of local) {
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(unitCyl, mat); m.scale.set(r, len, r); m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(_up, d.normalize()); m.castShadow = true; top.add(m); meshes.push(m);
  }
  const blockMesh = (mat, px, py, pz, sx, sy, sz) => { const m = new THREE.Mesh(unitBox, mat); m.scale.set(sx, sy, sz); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; top.add(m); return m; };
  blockMesh(M.concrete, -C + 2.4, -0.4, 0, 3.6, 2.2, 2.2);
  blockMesh(M.white, -4, 0.7, 0, 3, 1.3, 1.8); // winch house
  blockMesh(M.yellowDark, 0, -0.45, 0, 2.6, 0.9, 2.6); // slewing ring
  const cab = blockMesh(M.white, 1.2, -1.3, 1.9, 1.8, 2.2, 1.5);
  blockMesh(M.glassDark, 2.12, -1.1, 1.9, 0.05, 1.3, 1.3);
  if (DUSK) for (const [px, py, pz] of [[L, 0.5, 0], [-C, 0.5, 0], [0, 7.4, 0]]) { const m = new THREE.Mesh(SPH, M.redlight); m.scale.setScalar(0.6); m.position.set(px, py, pz); top.add(m); }
  // trolley, hook, load
  const trolley = blockMesh(M.yellowDark, 20, -0.25, 0, 1.6, 0.4, 1.4);
  const cable = new THREE.Mesh(unitCyl, M.darkSteel); cable.castShadow = true; top.add(cable);
  const hook = blockMesh(M.yellow, 20, -10, 0, 0.6, 0.9, 0.5);
  const load = new THREE.Group(); top.add(load);
  if (o.phase < 1) { for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(unitBox, M.rebar); m.scale.set(6, 0.08, 0.08); m.position.set(0, -2 - (k % 3) * 0.1, (k - 4) * 0.1); m.castShadow = true; load.add(m); } }
  else { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 1.6, 12), M.steel); m.position.y = -2.2; m.castShadow = true; load.add(m); }
  anim.push((t) => {
    const a = TAU * t + o.phase;
    top.rotation.y = o.base + o.swing * Math.sin(a);
    const tx = L * (0.48 + 0.22 * Math.sin(a + 0.8));
    const drop = h * (0.42 + 0.16 * Math.sin(2 * a));
    trolley.position.x = tx; hook.position.set(tx, -drop, 0); load.position.set(tx, -drop, 0);
    cable.position.set(tx, -drop / 2, 0); cable.scale.set(0.03, drop, 0.03);
  });
}

function excavator(scene, M, anim, at, ry, phase = 0) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = ry; scene.add(g);
  const box = (parent, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(unitBox, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  for (const zz of [-1.25, 1.25]) { box(g, M.black, 0, 0.45, zz, 4.6, 0.9, 0.7); box(g, M.darkSteel, 0, 0.5, zz, 3.6, 0.5, 0.75); }
  const up = new THREE.Group(); up.position.y = 1.0; g.add(up);
  box(up, M.yellow, -0.4, 0.55, 0, 3.4, 1.1, 2.5);
  box(up, M.darkSteel, -1.9, 0.6, 0, 0.6, 1.2, 2.5);
  box(up, M.yellow, 0.75, 1.5, 0.65, 1.15, 1.5, 1.0);
  box(up, M.glassDark, 1.34, 1.6, 0.65, 0.05, 1.0, 0.9);
  const boom = new THREE.Group(); boom.position.set(0.9, 0.9, -0.3); up.add(boom);
  box(boom, M.yellow, 2.8, 0, 0, 5.6, 0.6, 0.5);
  const stick = new THREE.Group(); stick.position.set(5.6, 0, 0); boom.add(stick);
  box(stick, M.yellow, 1.5, 0, 0, 3.0, 0.45, 0.4);
  const bucket = new THREE.Group(); bucket.position.set(3.0, 0, 0); stick.add(bucket);
  box(bucket, M.darkSteel, 0.45, -0.3, 0, 0.9, 0.9, 1.2);
  anim.push((t) => {
    const a = TAU * t * 3 + phase * 4;
    up.rotation.y = 0.5 * Math.sin(a);
    boom.rotation.z = 0.35 + 0.18 * Math.sin(a + 1.4);
    stick.rotation.z = -1.25 + 0.35 * Math.sin(a + 2.2);
    bucket.rotation.z = -0.9 + 0.5 * Math.sin(a + 2.8);
  });
}

function truck(scene, M, at, ry, cabColor, loaded) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = ry; scene.add(g);
  const box = (mat, x, y, z, sx, sy, sz, col) => { const m = new THREE.Mesh(unitBox, col ? mat.clone() : mat); if (col) m.material.color.set(col); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); };
  box(M.white, 3.3, 1.9, 0, 2.0, 2.2, 2.4, cabColor);
  box(M.glassDark, 4.31, 2.3, 0, 0.04, 0.9, 2.1);
  box(M.darkSteel, 0, 0.9, 0, 8, 0.4, 2.2);
  box(M.yellow, -0.9, 2.0, 0, 5.4, 1.7, 2.5);
  if (loaded) box(M.mud, -0.9, 2.95, 0, 5.0, 0.4, 2.2);
  for (const x of [3.2, -0.4, -2.0]) for (const z of [-1.15, 1.15]) { const w = new THREE.Mesh(unitCyl, M.tyre); w.scale.set(0.55, 0.45, 0.55); w.rotation.x = Math.PI / 2; w.position.set(x, 0.55, z); w.castShadow = true; g.add(w); }
}

function mixer(scene, M, at, ry) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = ry; scene.add(g);
  const m = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const k = new THREE.Mesh(geo, mat); k.scale.set(sx, sy, sz); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; g.add(k); return k; };
  m(unitBox, M.white, 3.4, 1.9, 0, 1.9, 2.2, 2.4); m(unitBox, M.glassDark, 4.36, 2.3, 0, 0.04, 0.9, 2.1);
  m(unitBox, M.darkSteel, 0, 0.9, 0, 8.4, 0.4, 2.2);
  const drum = new THREE.LatheGeometry([new THREE.Vector2(0.4, -3.2), new THREE.Vector2(1.3, -1.6), new THREE.Vector2(1.25, 1.0), new THREE.Vector2(0.6, 2.6)], 24);
  const d = m(drum, M.orange, -0.6, 2.5, 0); d.rotation.z = Math.PI / 2 + 0.22;
  for (const x of [3.2, -0.8, -2.4]) for (const z of [-1.15, 1.15]) { const w = m(unitCyl, M.tyre, x, 0.55, z, 0.55, 0.45, 0.55); w.rotation.x = Math.PI / 2; }
}

// concrete pump with its boom folded up toward the top deck
function pump(scene, M, at, ry) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = ry; scene.add(g);
  const bx = (mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(unitBox, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  bx(M.white, 4.6, 1.9, 0, 2.0, 2.2, 2.4); bx(M.darkSteel, 0, 0.9, 0, 11, 0.4, 2.3); bx(M.white, -0.8, 1.8, 0, 7, 1.4, 2.3);
  for (const s of [-1, 1]) { bx(M.white, 1, 0.7, s * 3.2, 0.3, 0.3, 4.4); bx(M.darkSteel, 1, 0.1, s * 5.2, 0.8, 0.2, 0.8); }
  const pts = [V(1, 3, 0), V(-2, 18, -4), V(-5, 33, -9), V(-9, 42, -14), V(-12, 40, -18)];
  const local = new THREE.Group(); g.add(local);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(unitBox, M.white); m.scale.set(0.55, len, 0.55); m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(_up, d.normalize()); m.castShadow = true; local.add(m);
  }
  const hose = new THREE.Mesh(unitCyl, M.black); hose.scale.set(0.12, 4, 0.12); hose.position.copy(pts[4]).add(V(0, -2, 0)); g.add(hose);
}

function cabins(scene, M) {
  // two-high site offices by the gate
  const blue = new THREE.MeshStandardMaterial({ color: "#2a4f7a", roughness: 0.6 });
  for (let k = 0; k < 4; k++) for (let lvl = 0; lvl < 2; lvl++) {
    const x = -46 + k * 3.1, z = 44, y = 0.06 + lvl * 2.7;
    addBlock("cabin", M.white, x, y, z, 3, 2.6, 7.2);
    addBlock("cabinwin", blue, x, y + 1.2, z + 3.62, 2.2, 0.8, 0.04, 0, null, { cast: false });
  }
  addBlock("cabin", M.white, -33, 0.06, 47, 6, 2.6, 2.6);
  // containers in brand-free colours
  const cols = ["#8a3b2a", "#2d5a7b", "#3f6b45", "#7d7f80", "#a5682e"];
  for (let k = 0; k < 5; k++) addBlock("ctr", M.container, -48 + k * 2.7, 0.06, 26 + (k % 2) * 0.4, 2.45, 2.6, 6.1, 0, cols[k]);
  addBlock("ctr", M.container, -45.3, 2.66, 26.2, 2.45, 2.6, 6.1, 0, cols[1]);
}

function laydown(scene, M) {
  // rebar bundles, pallets of block, formwork panels, pipe
  for (let k = 0; k < 7; k++) for (let b = 0; b < 12; b++) addBox("rebarL", M.rebar, -40 + (b % 4) * 0.12 + k * 1.4, 0.2 + Math.floor(b / 4) * 0.1, -30, 0.05, 0.05, 12);
  for (let k = 0; k < 14; k++) addBlock("blockpal", M.block, -30 + (k % 7) * 1.6, 0.06, -20 + Math.floor(k / 7) * 1.6, 1.2, 1.1, 1.2);
  for (let k = 0; k < 8; k++) addBlock("panel", M.plyRed, -44 + k * 0.32, 0.06, -12, 0.12, 2.4, 3.0, 0.02);
  for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 6, 16), M.steel); m.rotation.z = Math.PI / 2; m.position.set(-14, 0.5 + Math.floor(k / 3) * 0.85, -34 + (k % 3) * 0.95 + (Math.floor(k / 3) % 2) * 0.45); m.castShadow = m.receiveShadow = true; scene.add(m); }
  // skip bins
  for (const [x, z] of [[-24, 40], [20, -34]]) addBlock("skip", M.yellowDark, x, 0.06, z, 3.6, 1.6, 2.2);
}

function hoarding(scene, M) {
  const H = 2.6, gate = [-20, -6];
  const edge = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 2.4);
    for (let i = 0; i < n; i++) {
      const tx = x0 + ((i + 0.5) / n) * (x1 - x0), tz = z0 + ((i + 0.5) / n) * (z1 - z0);
      if (z0 === z1 && z0 === SITE.z1 && tx > gate[0] && tx < gate[1]) continue;
      const along = len / n;
      if (z0 === z1) { addBlock("hoard", M.paint, tx, 0, tz, along, H, 0.08); addBox("hoardband", M.rail, tx, H - 0.2, tz, along, 0.4, 0.1, 0, null, { cast: false }); }
      else { addBlock("hoard", M.paint, tx, 0, tz, 0.08, H, along); addBox("hoardband", M.rail, tx, H - 0.2, tz, 0.1, 0.4, along, 0, null, { cast: false }); }
    }
  };
  edge(SITE.x0, SITE.z0, SITE.x1, SITE.z0); edge(SITE.x0, SITE.z1, SITE.x1, SITE.z1);
  edge(SITE.x0, SITE.z0, SITE.x0, SITE.z1); edge(SITE.x1, SITE.z0, SITE.x1, SITE.z1);
}

// Downscale with a light film grade: a touch more contrast, warm highlights and a soft vignette.
export function grade(g, src, sx, sy, sw, sh, W, H) {
  g.save();
  g.filter = "contrast(1.07) saturate(1.1) brightness(1.02)";
  g.drawImage(src, sx, sy, sw, sh, 0, 0, W, H);
  g.restore();
  const v = g.createRadialGradient(W * 0.55, H * 0.5, Math.min(W, H) * 0.35, W * 0.55, H * 0.5, Math.max(W, H) * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(10,16,24,0.22)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "soft-light";
  g.fillStyle = "rgba(255,214,160,0.12)"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";
}

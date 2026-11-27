// "Mission: clock in the crew" v2 - a fast, busy game-style driving spot for Constra. Real-time 3D (three.js) sunset city drive with lane-weaving overtakes,
// near misses, coin trails, crew waving at each checkpoint, a wanted level that drops as people clock in, combo pop-ups, drift smoke, a blimp, confetti,
// beat-synced punch-ins and a cut every ~2s. Everything procedural and deterministic in t. Fictional mission stats only - no claims about real customers.
import * as THREE from "three";
import { createPost } from "/cine/post.js";
import { clamp, ease, easeOut, easeBack, loadImg } from "/engine.js";

const DUR = 30, V0 = 26, L = 260, X0 = 3.5;
const STOP0 = 20.2, STOP1 = 22.0, PASS_T = 22.4, CARD_T = 25.9;
const BPM = 128, BEAT = 60 / BPM;
const CREW = [["MARCO", "6:55 AM"], ["AISHA", "6:58 AM"], ["DEV", "6:59 AM"], ["JUN", "7:00 AM"], ["SOFIA", "6:57 AM"], ["LUIS", "7:01 AM"]];
const CK = [3.6, 6.6, 9.6, 12.6, 15.6, 18.4];
const OVT = [5.1, 8.1, 11.1, 14.1, 17.1]; // pass times of slow cars in our lane (we swerve out and back)
const ONC = [2.4, 12.4, 15.35, 18.7, 19.9]; // extra oncoming cars (left lane), always while we are in the right lane
const NEAR = [...OVT.map((t) => t + 0.85), ...ONC]; // near-miss moments
const dist = (t) => { if (t <= STOP0) return V0 * t; const s = Math.min(t, STOP1) - STOP0, T = STOP1 - STOP0; return V0 * STOP0 + V0 * (s - (s * s) / (2 * T)); };
const speedAt = (t) => (t <= STOP0 ? V0 : t >= STOP1 ? 0 : V0 * (1 - (t - STOP0) / (STOP1 - STOP0)));
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const pulse = (t) => Math.exp(-((t % BEAT) / BEAT) * 4.5);
const cv = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; };
const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
const wrapZ = (z0, d) => (((z0 + d) % L) + L) % L - L * 0.8;
// lateral position of the truck: right lane, a gentle sway, and a quick swerve into the other lane for every overtake
const lane = (t) => { const k = 1 - ease((t - STOP0) / (STOP1 - STOP0)); let s = 0; for (const tp of OVT) s += ease((t - (tp - 1.1)) / 0.5) * (1 - ease((t - (tp + 0.5)) / 0.5)); return X0 + 0.25 * k * Math.sin(t * 0.8) - 7 * s; };
const COINS = []; for (let tau = 0.9; tau < STOP0 - 0.5; tau += 0.38) COINS.push(+tau.toFixed(2));
// every payout: [time, amount]
const CASH = [...CK.map((t) => [t, 250]), ...COINS.map((t) => [t, 10]), ...OVT.map((t) => [t, 100]), ...NEAR.map((t, i) => [t, i < OVT.length ? 150 : 50])];
const SHOTS = [[0, "chaseHigh"], [1.7, "sideLow"], [3.2, "hood"], [4.6, "passby"], [6.1, "frontLow"], [7.5, "drone"], [8.9, "wheel"], [10.3, "passby"], [11.7, "chaseLow"], [13.1, "sideHigh"], [14.5, "frontLow"], [15.9, "hood"], [17.3, "droneSide"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]];
const swerveTimes = OVT.flatMap((tp) => [tp - 0.9, tp + 0.7]);

let R, scene, cam, glc, P, E_, icon;
let truck, wheels = [], beacon, roadTex, headSpot, blimp;
const scroll = [], events = [], rings = [], coins = [], peds = [], puffs = [];

export default {
  duration: DUR, endHold: 0, voices: {}, reverb: 0.08, bedGain: 0.6,
  async init(E) {
    E_ = E; icon = await loadImg("/icon.png").catch(() => null);
    glc = document.createElement("canvas"); glc.width = E.W; glc.height = E.H;
    R = new THREE.WebGLRenderer({ canvas: glc, antialias: false, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(E.W, E.H, false);
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(50, E.W / E.H, 0.1, 900);
    scene.fog = new THREE.FogExp2(new THREE.Color("#b8467f"), 0.0105);
    build(E);
    P = createPost(R, scene, cam, E.W, E.H); P.bloom.strength = 0.32; P.bloom.threshold = 0.95; P.bloom.radius = 0.6;
  },
  draw(t, c, E) {
    update3D(t);
    const shot = camera(t), cutAge = shotAge(t), flash = t > 0.3 ? 0.3 * Math.exp(-cutAge * 16) : 0;
    P.grade.uniforms.ca.value = 0.0016 + 0.0032 * pulse(t) * clamp(speedAt(t) / V0) + 0.006 * Math.exp(-cutAge * 9);
    P.render(t, { focus: shot.focus, aperture: 0.0002, fade: 0, flash }); c.drawImage(glc, 0, 0);
    hud(t, c, E);
  },
  audio(h) { music(h); },
};

// ───────────────────────────── 3D world ─────────────────────────────
function build(E) {
  const rr = rnd(7);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `varying vec3 vP;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec3 d = normalize(vP); float h = clamp(d.y, -0.1, 1.);
        vec3 top = vec3(0.045,0.02,0.16), mid = vec3(0.62,0.12,0.5), low = vec3(1.0,0.36,0.3), hz = vec3(1.0,0.66,0.3);
        vec3 col = mix(hz, low, smoothstep(0., .07, h)); col = mix(col, mid, smoothstep(.06, .3, h)); col = mix(col, top, smoothstep(.26, .9, h));
        vec3 sd = normalize(vec3(0.0, 0.115, -1.0)); float ang = distance(d, sd); float R0 = 0.17;
        float y = (d.y - sd.y) / R0; float disc = 1. - smoothstep(R0 - .004, R0, ang);
        float band = 1.; if (y < 0.2) { float k = fract(y * -7.5); float th = clamp(0.1 + (0.2 - y) * 0.55, 0.1, 0.62); band = step(th, k); }
        vec3 sc = mix(vec3(1.0,0.22,0.5), vec3(1.0,0.86,0.25), smoothstep(-1., .9, y));
        col += vec3(1.0,.42,.4) * pow(max(dot(d, sd), 0.), 40.) * .8;
        col = mix(col, sc * 1.25, disc * band);
        float st = step(.9972, hash(floor(d.xz / (d.y + 1.0) * 260.))) * smoothstep(.45,.9,h); col += vec3(st) * .75;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const skyGeo = new THREE.SphereGeometry(400, 48, 32), sky = new THREE.Mesh(skyGeo, skyMat); sky.frustumCulled = false; scene.add(sky);
  { const es = new THREE.Scene(), em = new THREE.Mesh(skyGeo, skyMat); em.frustumCulled = false; es.add(em); const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(es, 0.02, 0.1, 1000).texture; scene.environmentIntensity = 1.15; pm.dispose(); }
  const skyline = cv(2048, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); let x = 0; const r = rnd(21);
    while (x < w) { const bw = 40 + r() * 90, bh = 40 + r() * 190 * (0.35 + 0.65 * Math.sin((x / w) * Math.PI)); g.fillStyle = "#150a2c"; g.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 8; yy < h - 6; yy += 11) for (let xx = x + 5; xx < x + bw - 6; xx += 9) if (r() > 0.62) { g.fillStyle = r() > 0.5 ? "#ff8fb8" : "#ffd36b"; g.fillRect(xx, yy, 3, 5); }
      if (r() > 0.8) { g.fillStyle = "#150a2c"; g.fillRect(x + bw / 2 - 1.5, h - bh - 26, 3, 26); } x += bw + 2 + r() * 14; }
  });
  const sl = new THREE.Mesh(new THREE.PlaneGeometry(760, 95), new THREE.MeshBasicMaterial({ map: tex(skyline), transparent: true, fog: false, depthWrite: false })); sl.position.set(0, 42, -340); scene.add(sl);
  scene.add(new THREE.HemisphereLight("#ff9bd0", "#2a1250", 1.05));
  const sun = new THREE.DirectionalLight("#ff8f4a", 2.6); sun.position.set(-18, 14, -90); scene.add(sun);
  const fill = new THREE.DirectionalLight("#7d6bff", 0.9); fill.position.set(10, 20, 40); scene.add(fill);
  roadTex = tex(cv(512, 512, (g, w, h) => {
    g.fillStyle = "#1b1b24"; g.fillRect(0, 0, w, h); const r = rnd(3);
    for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
    g.fillStyle = "#e9e6dc"; g.fillRect(w * 0.02, 0, 5, h); g.fillRect(w * 0.98 - 5, 0, 5, h);
    g.fillStyle = "#ffcf3a"; g.fillRect(w / 2 - 9, 60, 5, 300); g.fillRect(w / 2 + 4, 60, 5, 300);
  }), [1, 50]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 600), new THREE.MeshStandardMaterial({ map: roadTex, color: "#c8c2d8", roughness: 0.34, metalness: 0.5, envMapIntensity: 0.85 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -200); scene.add(road);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 600), new THREE.MeshStandardMaterial({ color: "#1a0f2e", roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -200); scene.add(ground);
  for (const sx of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(5, 0.22, 600), new THREE.MeshStandardMaterial({ color: "#3b3248", roughness: 0.9 })); sw.position.set(sx * 9.6, 0.1, -200); scene.add(sw);
    const neon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 600), new THREE.MeshBasicMaterial({ color: new THREE.Color(sx < 0 ? "#00e5ff" : "#ff2d95").multiplyScalar(2.2) })); neon.position.set(sx * 7.1, 0.2, -200); scene.add(neon);
  }
  const trunkM = new THREE.MeshStandardMaterial({ color: "#2b1b33", roughness: 0.9 }), frondM = new THREE.MeshStandardMaterial({ color: "#0d1f2b", roughness: 0.7, emissive: "#3a1048", emissiveIntensity: 0.55, side: THREE.DoubleSide });
  const frondG = new THREE.ConeGeometry(0.42, 3.4, 4); frondG.translate(0, 1.7, 0); frondG.scale(1, 1, 0.16);
  const makePalm = (h) => { const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 7), trunkM); tr.position.y = h / 2; g.add(tr);
    for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(frondG, frondM); f.position.y = h; const a = (i / 8) * Math.PI * 2; f.rotation.set(0, a, 0); f.rotateX(1.18 + (i % 2) * 0.22); g.add(f); } return g; };
  const addScroll = (obj, z0) => { scene.add(obj); scroll.push({ obj, z0 }); };
  for (const sx of [-1, 1]) for (let i = 0; i < 20; i++) { const p = makePalm(6.5 + rr() * 3); p.position.x = sx * (9.2 + rr() * 0.5); p.rotation.z = -sx * 0.06; p.scale.setScalar(0.9 + rr() * 0.35); addScroll(p, i * 13 + (sx > 0 ? 6 : 0)); }
  const winTex = (hue) => cv(256, 512, (g, w, h) => { const r = rnd(hue * 13 + 5); g.fillStyle = "#120a22"; g.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 8; y += 22) for (let x = 10; x < w - 10; x += 20) { const on = r() > 0.42; g.fillStyle = on ? `hsl(${hue + r() * 40},95%,${58 + r() * 14}%)` : "#1c1236"; g.fillRect(x, y, 12, 13); }
    g.fillStyle = `hsl(${hue},90%,60%)`; g.fillRect(0, 0, w, 4); });
  const WT = [330, 190, 28, 285].map((h) => tex(winTex(h)));
  for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) {
    const hgt = 14 + rr() * 38, wd = 9 + rr() * 6, dp = 11 + rr() * 6, tx = WT[Math.floor(rr() * 4)].clone(); tx.needsUpdate = true; tx.repeat.set(Math.max(1, Math.round(wd / 7)), Math.max(1, Math.round(hgt / 14)));
    const m = new THREE.MeshStandardMaterial({ color: "#2a2040", map: tx, emissiveMap: tx, emissive: "#ffffff", emissiveIntensity: 0.95, roughness: 0.6 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(wd, hgt, dp), m); b.position.set(sx * (17.5 + wd / 2 + rr() * 9), hgt / 2, 0); addScroll(b, i * 26 + 3 + (sx > 0 ? 9 : 0));
  }
  const lampM = new THREE.MeshStandardMaterial({ color: "#2a2338", roughness: 0.6 }), lampH = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd79a").multiplyScalar(3.2) });
  for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7.4, 6), lampM); pole.position.y = 3.7; const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), lampM); arm.position.set(-sx * 1.1, 7.35, 0); const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.34), lampH); head.position.set(-sx * 2.1, 7.28, 0); g.add(pole, arm, head); g.position.x = sx * 7.7; addScroll(g, i * 26 + 16 + (sx > 0 ? 13 : 0)); }

  // traffic: slow cars in our lane that we overtake, oncoming cars in the other lane (near misses)
  const carM = (col) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, metalness: 0.5, clearcoat: 0.7 });
  const makeCar = (col, facing) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.3), carM(col)); b.position.y = 0.6; const cb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.1), new THREE.MeshPhysicalMaterial({ color: "#0b1020", roughness: 0.1, metalness: 0.8 })); cb.position.set(0, 1.1, 0.1);
    const lt = new THREE.MeshBasicMaterial({ color: new THREE.Color(facing > 0 ? "#fff3d6" : "#ff1a2a").multiplyScalar(facing > 0 ? 2.4 : 1.5) });
    const front = facing > 0 ? 1 : -1; for (const sx of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), lt); l.position.set(sx, 0.62, front * 2.16); g.add(l); }
    g.add(b, cb); for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12), new THREE.MeshStandardMaterial({ color: "#0c0c10" })); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.95, 0.36, sz); g.add(w); }
    g.rotation.y = facing > 0 ? 0 : Math.PI; return g; };
  const cols = ["#ff2d95", "#19d3ff", "#f4f1ea", "#7a4dff", "#ff8a1f", "#35d07f"];
  const addActor = (obj, tPass, k, x) => { obj.position.x = x; scene.add(obj); events.push({ obj, z0: -k * dist(tPass), k }); }; // z = z0 + k*dist(t); reaches the truck (z=0) at tPass
  OVT.forEach((tp, i) => addActor(makeCar(cols[i % 6], -1), tp, 0.45, X0));
  OVT.forEach((tp, i) => addActor(makeCar(cols[(i + 3) % 6], 1), tp + 0.85, 1.65, -X0));
  ONC.forEach((tn, i) => addActor(makeCar(cols[(i + 1) % 6], 1), tn, 1.7, -X0));

  // truck
  truck = new THREE.Group(); scene.add(truck);
  const body = new THREE.MeshPhysicalMaterial({ color: "#3a3d4a", roughness: 0.28, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.6 });
  const hv = new THREE.MeshStandardMaterial({ color: "#F5C400", roughness: 0.4, emissive: "#F5C400", emissiveIntensity: 0.25 });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#070b18", roughness: 0.05, metalness: 0.9, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: "#0b0b0f", roughness: 0.6 });
  const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); truck.add(m); return m; };
  part(new THREE.BoxGeometry(2.05, 0.7, 5.3), body, 0, 0.78, 0);
  part(new THREE.BoxGeometry(2.08, 0.1, 5.32), hv, 0, 0.52, 0);
  part(new THREE.BoxGeometry(1.92, 0.5, 1.5), body, 0, 1.38, -1.8);
  part(new THREE.BoxGeometry(1.95, 0.95, 1.9), body, 0, 1.78, -0.35);
  part(new THREE.BoxGeometry(1.8, 0.55, 0.06), glass, 0, 1.92, -1.3).rotation.x = -0.42;
  part(new THREE.BoxGeometry(1.98, 0.5, 1.4), glass, 0, 1.92, -0.35);
  part(new THREE.BoxGeometry(1.95, 0.45, 2.1), body, 0, 1.28, 1.6);
  for (const sx of [-1, 1]) part(new THREE.BoxGeometry(0.08, 0.5, 2.2), body, sx * 0.98, 1.58, 1.55);
  part(new THREE.BoxGeometry(1.95, 0.5, 0.08), body, 0, 1.58, 2.62);
  part(new THREE.BoxGeometry(1.9, 0.07, 0.07), dark, 0, 2.55, 0.0);
  part(new THREE.BoxGeometry(1.2, 0.12, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb300").multiplyScalar(2.2) }), 0, 2.38, -0.15);
  beacon = part(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb300").multiplyScalar(4) }), 0, 2.2, 0.5);
  for (const sx of [-0.72, 0.72]) { part(new THREE.BoxGeometry(0.42, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3d6").multiplyScalar(2.2) }), sx, 1.2, -2.58); part(new THREE.BoxGeometry(0.2, 0.34, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff0015").multiplyScalar(1.15) }), sx * 0.9, 1.5, 2.66); }
  part(new THREE.BoxGeometry(1.9, 0.18, 0.2), dark, 0, 0.5, -2.7); part(new THREE.BoxGeometry(1.9, 0.18, 0.2), dark, 0, 0.5, 2.7);
  const decalT = tex(cv(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#F5C400"; g.font = "800 92px 'Barlow Condensed', 'Arial Narrow', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CONSTRA", w / 2, h / 2 + 4); }));
  const decalM = new THREE.MeshBasicMaterial({ map: decalT, transparent: true, toneMapped: false });
  for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), decalM); d.position.set(sx * 1.045, 0.98, 0.1); d.rotation.y = sx * Math.PI / 2; truck.add(d); }
  const dt = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.34), decalM); dt.position.set(0, 1.58, 2.71); truck.add(dt);
  const tire = new THREE.MeshStandardMaterial({ color: "#0b0b0e", roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: "#c9ccd6", metalness: 0.9, roughness: 0.25 });
  for (const sx of [-1, 1]) for (const sz of [-1.65, 1.6]) { const w = new THREE.Group(); const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 20), tire); t1.rotation.z = Math.PI / 2; const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 12), rim); r1.rotation.z = Math.PI / 2; w.add(t1, r1); for (let q = 0; q < 5; q++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.07), dark); sp.position.x = sx * 0.2; sp.rotation.x = (q / 5) * Math.PI; w.add(sp); } w.position.set(sx * 1.0, 0.5, sz); truck.add(w); wheels.push(w); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 6.2), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.55, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; truck.add(shadow);
  headSpot = new THREE.SpotLight("#ffe7bd", 70, 70, 0.5, 0.65, 1.6); headSpot.position.set(0, 1.3, -2.5); headSpot.target.position.set(0, 0, -30); truck.add(headSpot, headSpot.target);

  // checkpoint rings + the crew member waving at each one
  const tagTex = (name) => tex(cv(320, 84, (g, w, h) => { g.fillStyle = "rgba(14,10,28,0.92)"; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 18); g.fill(); g.lineWidth = 4; g.strokeStyle = "#F5C400"; g.stroke(); g.fillStyle = "#fff"; g.font = "800 46px 'Barlow Condensed', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(name, 22, h / 2 + 2); g.fillStyle = "#2eaa62"; g.beginPath(); g.arc(w - 40, h / 2, 20, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(w - 49, h / 2 + 1); g.lineTo(w - 42, h / 2 + 9); g.lineTo(w - 30, h / 2 - 7); g.stroke(); }));
  const skin = ["#e8b98a", "#9c6a46", "#f3c9a5", "#7a4a2e", "#e0a878", "#c68a5e"], vestM = new THREE.MeshStandardMaterial({ color: "#F5C400", roughness: 0.5, emissive: "#F5C400", emissiveIntensity: 0.3 });
  CK.forEach((tc, i) => {
    const g = new THREE.Group(), gold = new THREE.Color("#F5C400").multiplyScalar(2.6);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.14, 10, 56), new THREE.MeshBasicMaterial({ color: gold })));
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 2.4, 40, 1, true), new THREE.MeshBasicMaterial({ color: "#F5C400", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); sleeve.rotation.x = Math.PI / 2; g.add(sleeve);
    g.position.set(X0, 2.1, -999); scene.add(g); rings.push({ g, tc, sleeve });
    const pg = new THREE.Group(), tors = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.36), vestM); tors.position.y = 1.35; const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), new THREE.MeshStandardMaterial({ color: "#2a3350" })); legs.position.y = 0.45;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: skin[i % 6], roughness: 0.7 })); head.position.y = 2.05; const hat = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#F5C400", roughness: 0.4 })); hat.position.y = 2.1;
    const arm = new THREE.Group(); const am = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), vestM); am.position.y = 0.32; arm.add(am); arm.position.set(0.4, 1.7, 0);
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), vestM); arm2.position.set(-0.4, 1.35, 0);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(CREW[i][0]), transparent: true, depthWrite: false, fog: false })); tag.scale.set(3.0, 0.79, 1); tag.position.y = 3.2;
    pg.add(tors, legs, head, hat, arm, arm2, tag); pg.position.set(8.2, 0.2, -999); pg.rotation.y = 0.5; scene.add(pg); peds.push({ g: pg, arm, tag, tc, z0: -dist(tc) });
  });
  // coins along our path (they follow the swerves)
  const coinM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd23a").multiplyScalar(1.7) }), coinG = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 18);
  COINS.forEach((tau) => { const g = new THREE.Group(), m = new THREE.Mesh(coinG, coinM); m.rotation.x = Math.PI / 2; g.add(m); scene.add(g); coins.push({ g, tau, x: lane(tau), z0: -dist(tau) }); });
  // tyre smoke for swerves
  const puffT = tex(cv(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
  swerveTimes.forEach((ts) => { for (let j = 0; j < 6; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, color: "#e9d7ff", transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); puffs.push({ s, ts: ts + j * 0.035, sx: (j % 2 ? 1 : -1) * 0.9, x: lane(ts + j * 0.035) }); } });
  // blimp with a banner drifting across the sky
  blimp = new THREE.Group(); const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: "#e8e2f5", roughness: 0.4, metalness: 0.3 })); hull.scale.set(9, 3.2, 3.2); blimp.add(hull);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 5), new THREE.MeshStandardMaterial({ color: "#F5C400" })); fin.position.set(-8, 0, 0); blimp.add(fin);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.4), new THREE.MeshBasicMaterial({ map: tex(cv(1024, 256, (g, w, h) => { g.fillStyle = "#F5C400"; g.fillRect(0, 0, w, h); g.fillStyle = "#151617"; g.font = "800 190px 'Barlow Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CONSTRA", w / 2, h / 2 + 8); })), fog: false, side: THREE.DoubleSide, toneMapped: false })); ban.position.set(0, -4.4, 0); blimp.add(ban);
  blimp.position.set(-120, 52, -190); scene.add(blimp);
}

function update3D(t) {
  const d = dist(t);
  roadTex.offset.y = d / 12;
  for (const s of scroll) s.obj.position.z = wrapZ(s.z0, d);
  for (const e of events) { const z = e.z0 + e.k * d; e.obj.visible = z > -230 && z < 45; e.obj.position.z = z; }
  const k = 1 - ease((t - STOP0) / (STOP1 - STOP0)), x = lane(t), dx = (lane(t + 0.02) - lane(t - 0.02)) / 0.04;
  truck.position.set(x, 0.012 * Math.sin(t * 13) * k, 0); truck.rotation.y = -clamp(dx / V0 * 1.9, -0.5, 0.5); truck.rotation.z = -dx * 0.022 + 0.004 * Math.sin(t * 9) * k;
  for (const w of wheels) w.rotation.x = -d / 0.5;
  beacon.scale.setScalar(0.55 + 0.75 * (0.5 + 0.5 * Math.sin(t * 11)));
  for (const r of rings) { const ahead = dist(r.tc) - d; const vis = ahead < 215 && t < r.tc + 0.7; r.g.visible = vis; if (vis) { r.g.position.z = -ahead; const pass = clamp((t - r.tc) / 0.7); r.g.scale.setScalar((1 + pass * 0.5) * (1 + 0.04 * pulse(t))); const near = 0.3 + 0.7 * clamp(Math.abs(ahead) / 7); r.sleeve.material.opacity = 0.1 * (1 - pass) * near; r.g.children[0].material.color.set("#F5C400").multiplyScalar(1.5 * (1 - pass) * near + 0.05); } }
  for (const p of peds) { const z = p.z0 + d, vis = z > -215 && z < 40; p.g.visible = vis; if (!vis) continue; p.g.position.z = z; const near = clamp(1 - Math.abs(t - p.tc) / 1.6); p.arm.rotation.z = -2.6 + 0.5 * Math.sin(t * 11 + p.tc) * (0.4 + near); p.g.position.y = 0.2 + near * 0.35 * Math.abs(Math.sin(t * 8)); p.g.rotation.y = 0.5 - near * 0.5; p.tag.visible = t > p.tc - 1.6; p.tag.material.opacity = 1; p.tag.position.y = 3.2 + 0.15 * Math.sin(t * 5); }
  for (const c of coins) { const age = t - c.tau, z = c.z0 + d; if (age > 0.28 || z < -230) { c.g.visible = false; continue; } c.g.visible = true; c.g.position.set(c.x, 1.25 + (age > 0 ? age * 2.2 : 0), z); c.g.rotation.y = t * 7 + c.tau * 3; c.g.scale.setScalar(age > 0 ? 1 + age * 2.6 : 1); }
  for (const p of puffs) { const age = t - p.ts; if (age < 0 || age > 1.0) { p.s.visible = false; continue; } p.s.visible = true; p.s.position.set(p.x + p.sx, 0.35 + age * 0.9, 2.6 + (d - dist(p.ts))); p.s.scale.setScalar(1.0 + age * 4.2); p.s.material.opacity = 0.5 * (1 - age); }
  blimp.position.x = -120 + t * 5; blimp.rotation.y = 0.12;
  headSpot.intensity = 70;
}

// ───────────────────────────── cameras: a cut about every 2 seconds, punched in on the beat ─────────────────────────────
const shotIdx = (t) => { let i = 0; for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k][0]) i = k; return i; };
const shotAge = (t) => t - SHOTS[shotIdx(t)][0];
function camera(t) {
  const V = E_.V, fovK = V ? 1.32 : 1, tx = truck.position.x, i = shotIdx(t), [t0, type] = SHOTS[i], t1 = SHOTS[i + 1]?.[0] ?? DUR, u = clamp((t - t0) / (t1 - t0)), s = i % 2 ? 1 : -1, d = dist(t);
  let p, l, f = 48, focus = 10;
  switch (type) {
    case "chaseHigh": p = [tx * 0.6 - 1.8 + u * 1.2, 3.4, 10.8 - u * 1.2]; l = [tx, 1.2, -9]; f = 48; focus = 11; break;
    case "chaseLow": p = [tx * 0.8 + 1.5 - u * 0.8, 0.95, 8.8 - u * 0.8]; l = [tx, 1.4, -8]; f = 54; focus = 9; break;
    case "sideLow": p = [tx + s * (16 - u * 2), 1.1, 2.8 - u * 2.6]; l = [tx + 0.6, 1.3, -1.4]; f = 30; focus = 16; break;
    case "sideHigh": p = [tx + s * 14.5, 4.4 - u * 1.4, 1.5 - u * 1.6]; l = [tx, 1.0, -1.2]; f = 32; focus = 15; break;
    case "hood": p = [tx, 2.0 - u * 0.15, -2.6]; l = [tx + 0.4 * Math.sin(t * 2), 0.9, -34]; f = 62; focus = 26; break;
    case "frontLow": p = [tx + s * (1.3 - u * 0.8), 0.95, -10.5 + u * 1.8]; l = [tx, 1.3, 0]; f = 36; focus = 10; break;
    case "drone": p = [tx + 0.5, 11 - u * 2.2, 13.5 - u * 2]; l = [tx, 0.8, -4]; f = 40; focus = 18; break;
    case "droneSide": p = [tx + s * 8, 9.2 - u * 1.4, 4.5]; l = [tx, 0.6, -2.5]; f = 40; focus = 12; break;
    case "wheel": p = [tx + 8.5 - u * 1.2, 0.8, 5.2 - u * 0.8]; l = [tx + 1.0, 0.9, 0.6]; f = 32; focus = 9; break;
    case "passby": { const sx = i % 2 ? 9.4 : -9.4, z0 = -36 + (d - dist(t0)); p = [sx, 1.25, z0]; l = [tx, 1.2, 0]; f = 34; focus = Math.hypot(sx - tx, z0) || 8; break; }
    case "chaseBrake": p = [tx + 1.6, 1.9, 9.6 - u * 1.0]; l = [tx, 1.2, -4]; f = 50; focus = 10; break;
    default: { const a = 0.75 + (t - t0) * 0.26, r = 12.5 + (t - t0) * 0.25; p = [tx + Math.sin(a) * r, 2.0, Math.cos(a) * r - 0.6]; l = [tx, 1.3, -0.2]; f = 36; focus = r; }
  }
  const near = NEAR.reduce((m, n) => Math.max(m, Math.exp(-Math.abs(t - n) * 5)), 0);
  cam.position.set(p[0] + (0.014 + 0.05 * near) * Math.sin(t * 7.1) + 0.008 * Math.sin(t * 13), p[1] + (0.014 + 0.05 * near) * Math.sin(t * 8.3), p[2]); cam.lookAt(l[0], l[1], l[2]);
  const cut = Math.exp(-(t - t0) * 6) * (i > 0 ? 1 : 0); cam.rotateZ(0.008 * Math.sin(t * 1.7) + 0.035 * cut * (i % 2 ? 1 : -1) + 0.02 * near * Math.sin(t * 20));
  cam.fov = f * fovK * (1 + cut * 0.07 - 0.04 * pulse(t) * (t < STOP0 ? 1 : 0.3) + 0.05 * near); cam.updateProjectionMatrix();
  return { focus };
}

// ───────────────────────────── HUD ─────────────────────────────
const F = { disp: "'Barlow Condensed','Arial Narrow',sans-serif", mono: "'IBM Plex Mono',monospace", sans: "'IBM Plex Sans',sans-serif" };
function txt(c, s, x, y, size, fill, o = {}) {
  c.font = `${o.w ?? 800} ${size}px ${o.f ?? F.disp}`; c.textAlign = o.a ?? "left"; c.textBaseline = o.b ?? "middle"; c.lineJoin = "round"; c.letterSpacing = (o.ls ?? 0) + "px";
  if (o.sh !== false) { c.lineWidth = size * (o.sw ?? 0.16); c.strokeStyle = o.st ?? "rgba(0,0,0,0.85)"; c.strokeText(s, x, y); }
  c.fillStyle = fill; c.fillText(s, x, y);
}
function star(c, x, y, r, fill, stroke) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = r * 0.14; c.strokeStyle = stroke; c.stroke(); }

function hud(t, c, E) {
  const V = E.V, W = E.W, H = E.H, u = V ? W / 1080 : H / 1080, m = 52 * u, pl = pulse(t);
  const hudA = clamp(t / 0.5) * (1 - ease((t - (PASS_T - 0.25)) / 0.35));
  const sp = speedAt(t) / V0;
  if (sp > 0.05) { c.save(); c.globalAlpha = (0.14 + 0.1 * pl) * sp; c.strokeStyle = "#fff"; c.lineWidth = 2 * u; const r = rnd(5); for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, d0 = (0.36 + r() * 0.5 + ((t * (1.6 + r())) % 1) * 0.35) * Math.min(W, H) * 0.62, d1 = d0 + (50 + r() * 170) * u; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * d0 * 1.1, H / 2 + Math.sin(a) * d0 * 1.5); c.lineTo(W / 2 + Math.cos(a) * d1 * 1.1, H / 2 + Math.sin(a) * d1 * 1.5); c.stroke(); } c.restore(); }
  { const g = c.createLinearGradient(0, 0, 0, H * 0.22); g.addColorStop(0, `rgba(10,4,30,${0.55 * hudA})`); g.addColorStop(1, "rgba(10,4,30,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H * 0.22); }
  c.save(); c.globalAlpha = hudA;
  const topY = V ? 250 * u : m + 20 * u;
  // radio: animated equaliser + track
  txt(c, "♪ NOW PLAYING", m, topY - 6 * u, 24 * u, "#ff7ab8", { f: F.mono, w: 700, ls: 3 * u, sw: 0.2 });
  txt(c, "GOLDEN HOUR FM — \"OVERTIME\"", m, topY + 28 * u, 30 * u, "#ffffff", { w: 700, ls: 1 * u });
  for (let i = 0; i < 9; i++) { const hh = (8 + 26 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)) * (0.5 + 0.5 * pl)) * u; c.fillStyle = i % 2 ? "#00e5ff" : "#ff2d95"; c.fillRect(m + i * 12 * u, topY + 74 * u - hh, 8 * u, hh); }
  // money (pays out with the events), wanted level (drops with each clock-in)
  let cash = 12500; for (const [ti, a] of CASH) { const k = clamp((t - ti) / 0.35); if (k > 0) cash += Math.round(a * ease(k)); }
  const lastPay = CASH.reduce((mx, [ti]) => (t >= ti ? Math.max(mx, ti) : mx), -9), bump = Math.exp(-(t - lastPay) * 8);
  c.save(); c.translate(W - m, topY - 4 * u); c.scale(1 + 0.08 * bump, 1 + 0.08 * bump); txt(c, "$" + String(cash).padStart(8, "0"), 0, 0, 66 * u, bump > 0.35 ? "#d6ffd9" : "#7ae582", { a: "right", w: 800, ls: 2 * u, sw: 0.14 }); c.restore();
  const done = CK.filter((tc) => t >= tc).length, wanted = 5 - Math.min(5, done), flashRed = Math.sin(t * 14) > 0;
  for (let i = 0; i < 5; i++) { const sx = W - m - 18 * u - i * 46 * u, idx = 4 - i; const on = idx < wanted; const gone = !on && idx === wanted && done <= 5 ? clamp((t - CK[done - 1]) / 0.45) : 1; if (on) star(c, sx, topY + 52 * u, 19 * u, flashRed ? "#ff3b3b" : "#3b7bff", "#fff"); else if (gone < 1) { c.save(); c.globalAlpha *= 1 - gone; star(c, sx, topY + 52 * u - gone * 30 * u, 19 * u * (1 + gone), "#ff3b3b", "#fff"); c.restore(); } else star(c, sx, topY + 52 * u, 19 * u, null, "rgba(255,255,255,0.7)"); }
  txt(c, wanted ? `WANTED: PAPERWORK ${wanted}` : "WANTED LEVEL 0", W - m, topY + 92 * u, 20 * u, wanted ? "#ff8a8a" : "rgba(255,255,255,0.75)", { a: "right", f: F.mono, w: 700, ls: 2 * u, sw: 0.2 });
  // objective + counter
  const oy = V ? H - 430 * u : H - m - 40 * u, nIn = Math.min(6, done), lc = done ? Math.exp(-(t - CK[done - 1]) * 6) : 0;
  c.save(); c.globalAlpha *= clamp((t - 0.7) / 0.5); txt(c, "MISSION: CLOCK IN THE CREW", W / 2, oy - 40 * u, 28 * u, "#ffffff", { a: "center", f: F.mono, w: 700, ls: 3 * u, sw: 0.2 });
  c.translate(W / 2, oy + 14 * u); c.scale(1 + 0.35 * lc, 1 + 0.35 * lc); txt(c, `${nIn} / 6`, 0, 0, 84 * u, "#F5C400", { a: "center", w: 800, ls: 3 * u, sw: 0.12 }); c.restore();
  // minimap + speed
  const mmx = m + 128 * u, mmy = V ? H - 600 * u : H - m - 130 * u; minimap(c, t, mmx, mmy, 128 * u, u);
  txt(c, String(Math.round(speedAt(t) * 3.6)).padStart(3, "0"), mmx + 148 * u, mmy - 8 * u, 76 * u, "#ffffff", { w: 800, ls: 1 * u, sw: 0.1 }); txt(c, "KM/H", mmx + 152 * u, mmy + 38 * u, 22 * u, "#F5C400", { f: F.mono, w: 700, ls: 3 * u, sw: 0.2 });
  // new-mission banner
  { const k = t - 0.35; if (k > 0 && k < 2.4) { const inn = easeOut(clamp(k / 0.35)), out = ease((k - 1.9) / 0.4), bw = W * 0.92, bx = -bw * (1 - inn) - out * bw * 1.1 + (W - bw) / 2, by = V ? 560 * u : H * 0.22; c.save(); c.translate(bx, by); c.fillStyle = "#F5C400"; c.fillRect(0, 0, bw, 92 * u); c.fillStyle = "#151617"; c.fillRect(0, 92 * u, bw, 8 * u); txt(c, "NEW MISSION", 30 * u, 36 * u, 28 * u, "#151617", { f: F.mono, w: 700, ls: 4 * u, sh: false }); txt(c, "CLOCK IN THE CREW", 30 * u, 70 * u, 50 * u, "#151617", { ls: 2 * u, sh: false }); c.restore(); } }
  // clock-in pop-ups
  CK.forEach((tc, i) => { const k = t - tc; if (k < -0.1 || k > 2.6) return; const inn = easeBack(clamp(k / 0.4)), out = ease((k - 2.1) / 0.4), bx = m - (1 - inn) * 520 * u - out * 520 * u, by = V ? 420 * u : H * 0.34, bw = (V ? 600 : 560) * u, bh = 122 * u;
    c.save(); c.translate(bx, by); c.fillStyle = "rgba(14,10,28,0.88)"; c.beginPath(); c.roundRect(0, 0, bw, bh, 18 * u); c.fill(); c.lineWidth = 2 * u; c.strokeStyle = "rgba(245,196,0,0.9)"; c.stroke();
    c.fillStyle = "#2eaa62"; c.beginPath(); c.arc(62 * u, bh / 2, 34 * u, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 8 * u; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(46 * u, bh / 2 + 2 * u); c.lineTo(58 * u, bh / 2 + 15 * u); c.lineTo(80 * u, bh / 2 - 13 * u); c.stroke();
    txt(c, CREW[i][0] + " CLOCKED IN", 118 * u, 40 * u, 40 * u, "#ffffff", { sh: false, ls: 1 * u }); txt(c, CREW[i][1] + "  ·  GPS VERIFIED", 118 * u, 86 * u, 22 * u, "#F5C400", { f: F.mono, w: 700, sh: false, ls: 0.5 * u });
    txt(c, "+$250", bw - 22 * u, 40 * u, 34 * u, "#7ae582", { a: "right", sh: false }); c.restore();
    if (k > 0 && k < 1.0) { c.save(); c.globalAlpha *= 1 - clamp(k / 1.0); const sc = 1 + 0.6 * Math.exp(-k * 7); c.translate(W / 2, V ? H * 0.37 : H * 0.28); c.scale(sc, sc); txt(c, "CLOCKED IN!", 0, 0, 120 * u, "#F5C400", { a: "center", ls: 3 * u }); c.restore(); } });
  // combo / near-miss / overtake call-outs
  const callouts = [...OVT.map((tt, i) => [tt - 0.2, "OVERTAKE!", "#7ae582", "+$100"]), ...NEAR.map((tt, i) => [tt, i < OVT.length ? "NEAR MISS!" : "CLOSE CALL!", "#ff7ab8", i < OVT.length ? "+$150" : "+$50"])].sort((a, b) => a[0] - b[0]);
  let combo = 0; callouts.forEach(([tt, label, col, pay], i) => { if (t >= tt) combo++; const k = t - tt; if (k < 0 || k > 1.15) return; const sc = easeBack(clamp(k / 0.25)) * (1 - 0.15 * ease((k - 0.8) / 0.35)), side = i % 2 ? 1 : -1; c.save(); c.globalAlpha *= 1 - ease((k - 0.8) / 0.35); c.translate(W / 2 + side * 120 * u, (V ? H * 0.56 : H * 0.56) - k * 40 * u); c.rotate(side * 0.07); c.scale(sc, sc); txt(c, label, 0, 0, 92 * u, col, { a: "center", ls: 3 * u }); txt(c, pay, 0, 66 * u, 50 * u, "#ffffff", { a: "center" }); c.restore(); });
  if (combo >= 2) { const lastK = Math.min(...callouts.filter(([tt]) => t >= tt).map(([tt]) => t - tt)); c.save(); const sc = 1 + 0.4 * Math.exp(-lastK * 9); c.translate(W - m - 10 * u, topY + 168 * u); c.scale(sc, sc); txt(c, `COMBO x${combo}`, 0, 0, 52 * u, "#F5C400", { a: "right", ls: 2 * u }); c.restore(); }
  c.restore();
  if (t > PASS_T - 0.1) missionPassed(t, c, E, u);
  if (t > PASS_T && t < CARD_T) confetti(t, c, E, u);
  if (t > CARD_T - 0.45) brandCard(t, c, E, u);
  if (t < 0.5) { c.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; c.fillRect(0, 0, W, H); }
}

function confetti(t, c, E, u) {
  const W = E.W, H = E.H, fade = 1 - ease((t - (CARD_T - 0.3)) / 0.3); if (fade <= 0) return; const cols = ["#F5C400", "#ff2d95", "#19d3ff", "#ffffff", "#7ae582", "#ff8a1f"]; const r = rnd(33);
  c.save(); c.globalAlpha = fade; for (let i = 0; i < 190; i++) { const x0 = r() * W, st = PASS_T + r() * 0.6, vy = (160 + r() * 300) * u, sw = 20 + r() * 50, sz = (10 + r() * 16) * u, col = cols[i % 6], rot = r() * 6, rs = 2 + r() * 6, age = t - st; if (age < 0) { continue; } const y = -60 * u + vy * age + 120 * u * age * age, x = x0 + Math.sin(age * 3 + i) * sw * u; if (y > H + 40) continue; c.save(); c.translate(x, y); c.rotate(rot + age * rs); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(age * rs * 1.3))); c.fillStyle = col; c.fillRect(-sz / 2, -sz / 2, sz, sz * 0.6); c.restore(); } c.restore();
}

function minimap(c, t, cx, cy, r, u) {
  const d = dist(t), sc = r / 95;
  c.save(); c.translate(cx, cy); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.save(); c.clip();
  c.fillStyle = "#0b1030"; c.fillRect(-r, -r, 2 * r, 2 * r);
  c.strokeStyle = "rgba(120,110,190,0.35)"; c.lineWidth = 7 * u; for (let k = -4; k < 6; k++) { const y = ((k * 46 + d) % 230) - 115; c.beginPath(); c.moveTo(-r, y * sc * 0.9); c.lineTo(r, y * sc * 0.9); c.stroke(); }
  c.strokeStyle = "rgba(120,110,190,0.28)"; for (const x of [-0.8, 0.85]) { c.beginPath(); c.moveTo(x * r, -r); c.lineTo(x * r, r); c.stroke(); }
  c.strokeStyle = "#3a3f66"; c.lineWidth = 22 * u; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke();
  c.strokeStyle = "#ff2d95"; c.lineWidth = 5 * u; c.setLineDash([16 * u, 12 * u]); c.lineDashOffset = d * sc * 0.5; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.setLineDash([]);
  CK.forEach((tc) => { const ah = dist(tc) - d; if (ah < -6 || t > tc + 0.4) return; const y = -ah * sc * 1.05 + r * 0.28; c.fillStyle = "#F5C400"; c.beginPath(); c.arc(0, Math.max(-r + 8 * u, y), 9 * u, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#000"; c.lineWidth = 2 * u; c.stroke(); });
  // other cars as blips
  [...OVT.map((tp) => dist(tp)), ...ONC.map((tn) => dist(tn) * 0.85)].forEach((dd, i) => { const ah = (i < OVT.length ? (dd - d) * 0.5 : (dd - d) * 0.6); if (ah < -8 || ah > 95) return; c.fillStyle = i < OVT.length ? "#ff6b6b" : "#ffffff"; c.fillRect((i < OVT.length ? 5 : -9) * u, -ah * sc * 1.05 + r * 0.28 - 4 * u, 6 * u, 8 * u); });
  c.restore();
  c.lineWidth = 7 * u; c.strokeStyle = "#0a0a14"; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.lineWidth = 3 * u; c.strokeStyle = "#ff7ab8"; c.beginPath(); c.arc(0, 0, r + 2 * u, 0, Math.PI * 2); c.stroke();
  c.fillStyle = "#fff"; c.strokeStyle = "#000"; c.lineWidth = 3 * u; c.beginPath(); c.moveTo(0, r * 0.1); c.lineTo(11 * u, r * 0.28 + 8 * u); c.lineTo(0, r * 0.28 + 1 * u); c.lineTo(-11 * u, r * 0.28 + 8 * u); c.closePath(); c.fill(); c.stroke();
  c.restore(); txt(c, "N", cx, cy - r - 24 * u, 22 * u, "#fff", { a: "center", f: F.mono, w: 700 });
}

function missionPassed(t, c, E, u) {
  const W = E.W, H = E.H, V = E.V, k = t - PASS_T, a = clamp(k / 0.25) * (1 - ease((t - (CARD_T - 0.2)) / 0.4));
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(10,4,30,0.35)"); g.addColorStop(0.5, "rgba(10,4,30,0.62)"); g.addColorStop(1, "rgba(10,4,30,0.8)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const cy = V ? H * 0.38 : H * 0.34, pop = easeBack(clamp(k / 0.5)), sz = (V ? 190 : 200) * u;
  c.save(); c.translate(W / 2, cy); c.scale(0.7 + pop * 0.3 + 0.025 * pulse(t), 0.7 + pop * 0.3 + 0.025 * pulse(t));
  c.font = `800 ${sz}px ${F.disp}`; c.textAlign = "center"; c.textBaseline = "middle"; c.letterSpacing = 4 * u + "px"; c.lineJoin = "round";
  const lines = V ? ["MISSION", "PASSED"] : ["MISSION PASSED"]; lines.forEach((s, i) => { const y = (i - (lines.length - 1) / 2) * sz * 0.92; c.lineWidth = sz * 0.1; c.strokeStyle = "#000"; c.strokeText(s, 0, y + 6 * u); const gg = c.createLinearGradient(0, y - sz * 0.4, 0, y + sz * 0.4); gg.addColorStop(0, "#ffe27a"); gg.addColorStop(0.55, "#F5C400"); gg.addColorStop(1, "#c98a00"); c.fillStyle = gg; c.fillText(s, 0, y); }); c.restore();
  const ry = cy + (V ? sz * 1.0 : sz * 0.78); txt(c, "RESPECT +", W / 2, ry, 64 * u, "#ffffff", { a: "center", ls: 8 * u });
  const rows = [["CREW CLOCKED IN", "6 / 6"], ["LATE ARRIVALS", "0"], ["TIMESHEET ERRORS", "0"], ["PAPERWORK LEFT", "NONE"]];
  const bw = (V ? 760 : 700) * u, bx = W / 2 - bw / 2; rows.forEach(([a1, b1], i) => { const kk = clamp((k - 0.5 - i * 0.22) / 0.25); if (kk <= 0) return; const y = ry + 100 * u + i * 66 * u; c.save(); c.globalAlpha = a * ease(kk); c.translate((1 - ease(kk)) * 60 * u, 0);
    c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(bx, y - 26 * u, bw, 52 * u); c.fillStyle = "#F5C400"; c.fillRect(bx, y - 26 * u, 6 * u, 52 * u);
    txt(c, a1, bx + 26 * u, y, 30 * u, "#ffffff", { f: F.mono, w: 700, ls: 1 * u, sh: false }); txt(c, b1, bx + bw - 22 * u, y, 40 * u, "#7ae582", { a: "right", sh: false }); c.restore(); });
  const ky = ry + 100 * u + 4 * 66 * u + 16 * u, kk = clamp((k - 1.6) / 0.3); if (kk > 0) { c.globalAlpha = a * kk; txt(c, "WANTED LEVEL", W / 2 - 150 * u, ky + 22 * u, 24 * u, "#fff", { a: "center", f: F.mono, w: 700, ls: 2 * u }); for (let i = 0; i < 5; i++) star(c, W / 2 + (i - 0.2) * 44 * u + 22 * u, ky + 22 * u, 17 * u, null, "rgba(255,255,255,0.85)"); }
  c.restore();
}

function brandCard(t, c, E, u) {
  const W = E.W, H = E.H, V = E.V, a = ease((t - (CARD_T - 0.45)) / 0.45), k = t - CARD_T;
  c.save(); c.globalAlpha = a; c.fillStyle = "#0a0a0a"; c.fillRect(0, 0, W, H);
  const tape = (y) => { c.save(); c.beginPath(); c.rect(0, y, W, 26 * u); c.clip(); c.fillStyle = "#151617"; c.fillRect(0, y, W, 26 * u); c.fillStyle = "#F5C400"; const off = (t * 40 * u) % (52 * u); for (let x = -80 * u + off; x < W + 80 * u; x += 52 * u) { c.beginPath(); c.moveTo(x, y + 26 * u); c.lineTo(x + 26 * u, y + 26 * u); c.lineTo(x + 52 * u, y); c.lineTo(x + 26 * u, y); c.closePath(); c.fill(); } c.restore(); };
  tape(H * 0.2); tape(H * 0.8);
  const cy = H * 0.43, pop = easeBack(clamp(k / 0.6)); const s = icon ? (V ? 230 : 190) * u * pop : 0;
  if (icon) { c.save(); c.shadowColor = "rgba(245,196,0,0.35)"; c.shadowBlur = 60 * u; c.drawImage(icon, W / 2 - s / 2, cy - s / 2 - 70 * u, s, s); c.restore(); }
  txt(c, "CONSTRA", W / 2, cy + (V ? 150 : 120) * u, (V ? 150 : 130) * u, "#F5C400", { a: "center", ls: 6 * u, sh: false });
  const l2 = clamp((k - 0.4) / 0.4); c.globalAlpha = a * ease(l2);
  txt(c, "GPS CLOCK-IN. TIMESHEETS. PAYROLL.", W / 2, cy + (V ? 250 : 215) * u, (V ? 46 : 42) * u, "#ECEAE5", { a: "center", ls: 2 * u, sh: false });
  txt(c, "ONE APP FOR THE WHOLE CREW.", W / 2, cy + (V ? 306 : 265) * u, (V ? 46 : 42) * u, "#9A9C9F", { a: "center", ls: 2 * u, sh: false });
  const l3 = clamp((k - 0.8) / 0.4); c.globalAlpha = a * ease(l3); const pw = (V ? 560 : 520) * u, ph = 92 * u, py = cy + (V ? 400 : 350) * u;
  c.fillStyle = "#F5C400"; c.beginPath(); c.roundRect(W / 2 - pw / 2, py, pw, ph, ph / 2); c.fill(); txt(c, "getconstra.com", W / 2, py + ph / 2 + 3 * u, 52 * u, "#1A1600", { a: "center", f: F.mono, w: 700, sh: false });
  c.restore();
}

// ───────────────────────────── music: 128 bpm synthwave, engine, coin blips, whooshes, fanfare ─────────────────────────────
function music(h) {
  const { A, comp, note, hat, kick, snare, ding, tone, burst } = h, N = Math.floor(DUR / BEAT);
  const root = [55, 43.65, 65.41, 49];
  for (let b = 0; b < N; b++) { const t = b * BEAT, bar = Math.floor(b / 4) % 4, r = root[bar], inRoll = t > STOP0 - 0.9 && t < STOP1;
    if (b >= 2) { kick(t, 0.55); if (b % 2 === 1) snare(t, 0.2); }
    if (b >= 2) { hat(t + BEAT / 2, 0.1); hat(t + BEAT / 4, 0.05); hat(t + BEAT * 0.75, 0.05); }
    if (inRoll) for (let q = 0; q < 4; q++) snare(t + q * BEAT / 4, 0.08 + 0.05 * q);
    for (let e = 0; e < 4; e++) note(r * (e % 2 ? 2 : 1), t + e * BEAT / 4, BEAT * 0.22, "sawtooth", b >= 2 ? 0.17 : 0.07, 560 + (b % 8) * 90);
    if (b >= 4) { const ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]][bar]; if (b % 4 === 0) ch.forEach((f) => note(f, t, BEAT * 3.7, "triangle", 0.07, 1700)); for (let q = 0; q < 2; q++) note(ch[(b + q) % 3] * 2, t + q * BEAT / 2, BEAT * 0.45, "square", 0.04, 2800); }
  }
  const o = A.createOscillator(), o2 = A.createOscillator(), lp = A.createBiquadFilter(), g = A.createGain(); o.type = "sawtooth"; o2.type = "square"; lp.type = "lowpass"; lp.frequency.value = 240; g.gain.value = 0.034;
  o.frequency.setValueAtTime(64, 0); o.frequency.setValueAtTime(64, STOP0); o.frequency.linearRampToValueAtTime(34, STOP1); o2.frequency.setValueAtTime(32, 0); o2.frequency.setValueAtTime(32, STOP0); o2.frequency.linearRampToValueAtTime(17, STOP1);
  g.gain.setValueAtTime(0.034, STOP1 - 0.2); g.gain.linearRampToValueAtTime(0.008, STOP1 + 0.6); o.connect(lp); o2.connect(lp); lp.connect(g).connect(comp); o.start(0); o2.start(0); o.stop(DUR); o2.stop(DUR);
  SHOTS.slice(1).forEach(([s]) => burst(s - 0.1, [500, 5400], 0.9, 0.3, 0.1, "bandpass", comp));
  CK.forEach((tc) => { ding(tc, 988, 0.15); ding(tc + 0.08, 1480, 0.13); ding(tc + 0.16, 1976, 0.1); });
  COINS.forEach((tau) => ding(tau, 1568 + (Math.round(tau * 10) % 3) * 220, 0.05));
  NEAR.forEach((tn) => burst(tn - 0.35, [4200, 380], 1.4, 0.6, 0.12, "bandpass", comp));
  OVT.forEach((tp) => { burst(tp - 0.95, [300, 2600], 1.0, 0.45, 0.07, "bandpass", comp); tone([260, 520], tp - 0.9, 0.35, 0.05, "square", comp); });
  burst(STOP1 - 0.6, [3000, 400], 1.2, 0.9, 0.06, "highpass", comp);
  [[440, 0], [554.4, 0.07], [659.3, 0.14], [880, 0.21]].forEach(([f, d]) => tone(f, PASS_T + d, 2.6, 0.1, "triangle", comp)); tone([110, 220], PASS_T, 1.4, 0.16, "sawtooth", comp); ding(PASS_T + 0.2, 1760, 0.12); burst(PASS_T, [200, 9000], 0.6, 0.9, 0.14, "bandpass", comp);
  ding(CARD_T, 880, 0.1); ding(CARD_T + 0.1, 1320, 0.1); ding(CARD_T + 0.2, 1760, 0.08);
}

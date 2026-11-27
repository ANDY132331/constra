// Shared engine for the "mission" spots: a game-style driving cinematic for Constra. createEpisode(cfg) returns a scene for /engine.js.
// Real-time 3D (three.js): moods (sunset / night+rain / dawn / day), a detailed pickup, wet-road reflections, traffic you overtake, near misses, coin trails,
// crew waving at each checkpoint, a job site at the end, game HUD, combo pop-ups, confetti, beat-synced punch-ins and a cut every ~2s.
// Everything is procedural and deterministic in t. Mission stats are fictional gameplay - never claims about real customers.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createPost } from "/gta/post.js";
import { clamp, ease, easeOut, easeBack, loadImg } from "/engine.js";

const L = 260, X0 = 3.5;
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const cv = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; };
const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
const wrapZ = (z0, d) => (((z0 + d) % L) + L) % L - L * 0.8;
const C3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

const MOODS = {
  sunset: { sky: { top: [.045, .02, .16], mid: [.62, .12, .5], low: [1, .36, .3], hz: [1, .66, .3], sunDir: [0, .115, -1], sunR: .17, sunA: [1, .22, .5], sunB: [1, .86, .25], stripes: 1, stars: .75, clouds: 0, glow: .8 },
    fog: ["#b8467f", .0105], hemi: ["#ff9bd0", "#2a1250", 1.05], sun: ["#ff8f4a", 2.6, [-18, 14, -90]], fill: ["#7d6bff", .9], exposure: 1.05, env: 1.15, wins: [330, 190, 28, 285], winEm: .95, neon: 2.2, lamps: 1, ground: "#1a0f2e", bld: "#2a2040", sil: "#150a2c", silLit: 1, frond: ["#0d1f2b", "#3a1048", .55], trunk: "#2b1b33", rough: .34, metal: .5, envRoad: .85, cone: .03, rain: 0, grade: { sh: [-.01, .008, .03], hi: [.05, .022, -.02], sat: 1.12, vig: .5 }, orbit: .75 },
  night: { sky: { top: [.008, .01, .06], mid: [.05, .04, .2], low: [.17, .07, .34], hz: [.42, .17, .44], sunDir: [.28, .33, -1], sunR: .03, sunA: [.8, .88, 1], sunB: [.9, .95, 1], stripes: 0, stars: 1.7, clouds: 0, glow: .35 },
    fog: ["#160b34", .0125], hemi: ["#6070ff", "#0a0620", .6], sun: ["#6f8cff", .55, [20, 30, -60]], fill: ["#ff2d95", .3], exposure: 1.18, env: .6, wins: [200, 320, 45, 160], winEm: 1.3, neon: 3.2, lamps: 1.5, ground: "#0b0818", bld: "#1a1430", sil: "#06041a", silLit: 1, frond: ["#08161d", "#20104a", .5], trunk: "#1a1226", rough: .2, metal: .55, envRoad: 1.0, cone: .17, rain: 1, grade: { sh: [-.015, .01, .05], hi: [.03, .02, .04], sat: 1.18, vig: .6 }, orbit: .75 },
  dawn: { sky: { top: [.1, .16, .4], mid: [.5, .42, .62], low: [.98, .6, .48], hz: [1, .82, .52], sunDir: [.16, .075, -1], sunR: .085, sunA: [1, .72, .38], sunB: [1, .95, .72], stripes: 0, stars: 0, clouds: .4, glow: .9 },
    fog: ["#d99a86", .0098], hemi: ["#ffd2b0", "#3a2a4a", 1.0], sun: ["#ffb070", 3.0, [10, 8, -90]], fill: ["#8fb0ff", .7], exposure: 1.05, env: 1.1, wins: [30, 45, 200, 15], winEm: .55, neon: 1.3, lamps: .55, ground: "#2a2030", bld: "#4a3f66", sil: "#3a2c4c", silLit: .4, frond: ["#14303a", "#4a2a3a", .35], trunk: "#3a2a34", rough: .32, metal: .5, envRoad: .9, cone: .05, rain: 0, grade: { sh: [-.008, .012, .035], hi: [.05, .03, -.01], sat: 1.1, vig: .45 }, orbit: .75 },
  day: { sky: { top: [.14, .34, .82], mid: [.4, .62, .95], low: [.7, .85, 1], hz: [.93, .96, 1], sunDir: [-.35, .5, -1], sunR: .045, sunA: [1, .98, .86], sunB: [1, .97, .8], stripes: 0, stars: 0, clouds: 1, glow: .5 },
    fog: ["#b9d4ff", .0072], hemi: ["#bcd8ff", "#5b5047", 1.3], sun: ["#fff2d6", 3.8, [-30, 40, -60]], fill: ["#9ec0ff", .7], exposure: 1.0, env: 1.0, wins: [200, 210, 190, 40], winEm: .1, neon: .5, lamps: 0, ground: "#4d4a48", bld: "#9aa3b8", sil: "#7d93b8", silLit: 0, frond: ["#1f5a2a", "#000000", 0], trunk: "#6b4b34", rough: .45, metal: .3, envRoad: .7, cone: 0, rain: 0, grade: { sh: [0, .004, .015], hi: [.03, .02, 0], sat: 1.05, vig: .35 }, orbit: .75 },
};

export function createEpisode(cfg) {
  const M = MOODS[cfg.mood] ?? MOODS.sunset, S = M.sky;
  const DUR = cfg.duration ?? 30, V0 = cfg.speed ?? 26;
  const STOP0 = 20.2, STOP1 = 22.0, PASS_T = 22.4, CARD_T = 25.9;
  const BPM = cfg.music?.bpm ?? 128, BEAT = 60 / BPM;
  const CREW = cfg.items, CK = cfg.ck ?? [3.6, 6.6, 9.6, 12.6, 15.6, 18.4];
  const OVT = cfg.ovt ?? [5.1, 8.1, 11.1, 14.1, 17.1], ONC = cfg.onc ?? [2.4, 12.7, 15.7, 18.7, 19.9];
  const NEAR = [...OVT.map((t) => t + 0.85), ...ONC];
  const dist = (t) => { if (t <= STOP0) return V0 * t; const s = Math.min(t, STOP1) - STOP0, T = STOP1 - STOP0; return V0 * STOP0 + V0 * (s - (s * s) / (2 * T)); };
  const speedAt = (t) => (t <= STOP0 ? V0 : t >= STOP1 ? 0 : V0 * (1 - (t - STOP0) / (STOP1 - STOP0)));
  const pulse = (t) => Math.exp(-((t % BEAT) / BEAT) * 4.5);
  const lane = (t) => { const k = 1 - ease((t - STOP0) / (STOP1 - STOP0)); let s = 0; for (const tp of OVT) s += ease((t - (tp - 1.1)) / 0.5) * (1 - ease((t - (tp + 0.5)) / 0.5)); return X0 + 0.25 * k * Math.sin(t * 0.8) - 7 * s; };
  const COINS = []; for (let tau = 0.9; tau < STOP0 - 0.5; tau += 0.38) COINS.push(+tau.toFixed(2));
  const CASH = [...CK.map((t) => [t, 250]), ...COINS.map((t) => [t, 10]), ...OVT.map((t) => [t, 100]), ...NEAR.map((t, i) => [t, i < OVT.length ? 150 : 50])];
  const SHOTS = cfg.shots ?? [[0, "chaseHigh"], [1.7, "sideLow"], [3.2, "hood"], [4.6, "passby"], [6.1, "frontLow"], [7.5, "drone"], [8.9, "wheel"], [10.3, "passby"], [11.7, "chaseLow"], [13.1, "sideHigh"], [14.5, "frontLow"], [15.9, "hood"], [17.3, "droneSide"], [18.7, "passby"], [20.0, "chaseBrake"], [22.0, "orbit"]];
  const swerveTimes = OVT.flatMap((tp) => [tp - 0.9, tp + 0.7]);
  const BASE = cfg.cash ?? 12500, WANT = cfg.wanted ?? "PAPERWORK";

  let R, scene, cam, glc, P, E_, icon, truck, wheels = [], beacon, roadTex, headSpot, blimp, rain, site;
  const scroll = [], events = [], rings = [], coins = [], peds = [], puffs = [], reflects = [];

  // ───────────────────────────── 3D world ─────────────────────────────
  function build() {
    const rr = rnd(cfg.seed ?? 7);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { cTop: { value: C3(S.top) }, cMid: { value: C3(S.mid) }, cLow: { value: C3(S.low) }, cHz: { value: C3(S.hz) }, sunDir: { value: C3(S.sunDir).normalize() }, sunR: { value: S.sunR }, sunA: { value: C3(S.sunA) }, sunB: { value: C3(S.sunB) }, stripes: { value: S.stripes }, stars: { value: S.stars }, clouds: { value: S.clouds }, glow: { value: S.glow } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
      fragmentShader: `varying vec3 vP; uniform vec3 cTop, cMid, cLow, cHz, sunDir, sunA, sunB; uniform float sunR, stripes, stars, clouds, glow;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
        void main(){
          vec3 d = normalize(vP); float h = clamp(d.y, -0.1, 1.);
          vec3 col = mix(cHz, cLow, smoothstep(0., .07, h)); col = mix(col, cMid, smoothstep(.06, .3, h)); col = mix(col, cTop, smoothstep(.26, .9, h));
          vec3 sd = normalize(sunDir); float ang = distance(d, sd); float disc = 1. - smoothstep(sunR - .004, sunR, ang);
          float y = (d.y - sd.y) / sunR; float band = 1.;
          if (stripes > .5 && y < 0.2) { float k = fract(y * -7.5); float th = clamp(0.1 + (0.2 - y) * 0.55, 0.1, 0.62); band = step(th, k); }
          vec3 sc = mix(sunA, sunB, smoothstep(-1., .9, y));
          col += sunB * pow(max(dot(d, sd), 0.), 40.) * glow;
          if (clouds > 0.) { vec2 uv = d.xz / (d.y + 0.28) * 1.3; float cl = smoothstep(.46, .86, fbm(uv * vec2(1.0, 2.4) + 3.1)); vec3 cc = mix(vec3(1.), cLow * 1.25, .35); col = mix(col, cc, cl * clouds * smoothstep(.02, .22, h) * (1. - smoothstep(.55, .95, h)) * .8); }
          col = mix(col, sc * 1.25, disc * band);
          float st = step(.9972, hash(floor(d.xz / (d.y + 1.0) * 260.))) * smoothstep(.4,.9,h); col += vec3(st) * .75 * stars;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    const skyGeo = new THREE.SphereGeometry(400, 48, 32), sky = new THREE.Mesh(skyGeo, skyMat); sky.frustumCulled = false; scene.add(sky);
    { const es = new THREE.Scene(), em = new THREE.Mesh(skyGeo, skyMat); em.frustumCulled = false; es.add(em); const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(es, 0.02, 0.1, 1000).texture; scene.environmentIntensity = M.env; pm.dispose(); }
    scene.fog = new THREE.FogExp2(new THREE.Color(M.fog[0]), M.fog[1]);
    const skyline = cv(2048, 256, (g, w, h) => { g.clearRect(0, 0, w, h); let x = 0; const r = rnd(21);
      while (x < w) { const bw = 40 + r() * 90, bh = 40 + r() * 190 * (0.35 + 0.65 * Math.sin((x / w) * Math.PI)); g.fillStyle = M.sil; g.fillRect(x, h - bh, bw, bh);
        if (M.silLit) for (let yy = h - bh + 8; yy < h - 6; yy += 11) for (let xx = x + 5; xx < x + bw - 6; xx += 9) if (r() > 0.62) { g.fillStyle = r() > 0.5 ? "#ff8fb8" : "#ffd36b"; g.globalAlpha = M.silLit; g.fillRect(xx, yy, 3, 5); g.globalAlpha = 1; }
        if (r() > 0.8) { g.fillStyle = M.sil; g.fillRect(x + bw / 2 - 1.5, h - bh - 26, 3, 26); } x += bw + 2 + r() * 14; } });
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(760, 95), new THREE.MeshBasicMaterial({ map: tex(skyline), transparent: true, fog: false, depthWrite: false })); sl.position.set(0, 42, -340); scene.add(sl);
    scene.add(new THREE.HemisphereLight(M.hemi[0], M.hemi[1], M.hemi[2]));
    const sun = new THREE.DirectionalLight(M.sun[0], M.sun[1]); sun.position.set(...M.sun[2]); scene.add(sun);
    const fill = new THREE.DirectionalLight(M.fill[0], M.fill[1]); fill.position.set(10, 20, 40); scene.add(fill);
    // road
    roadTex = tex(cv(512, 512, (g, w, h) => { g.fillStyle = "#1b1b24"; g.fillRect(0, 0, w, h); const r = rnd(3);
      for (let i = 0; i < 4200; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
      for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 40, 6 + r() * 12, r(), 0, 7); g.fill(); }
      g.fillStyle = "#e9e6dc"; g.fillRect(w * 0.02, 0, 5, h); g.fillRect(w * 0.98 - 5, 0, 5, h); g.fillStyle = "#ffcf3a"; g.fillRect(w / 2 - 9, 60, 5, 300); g.fillRect(w / 2 + 4, 60, 5, 300); }), [1, 50]);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 600), new THREE.MeshStandardMaterial({ map: roadTex, color: "#c8c2d8", roughness: M.rough, metalness: M.metal, envMapIntensity: M.envRoad })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -200); scene.add(road);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 600), new THREE.MeshStandardMaterial({ color: M.ground, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -200); scene.add(ground);
    for (const sx of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(5, 0.22, 600), new THREE.MeshStandardMaterial({ color: cfg.mood === "day" ? "#a9a6a0" : "#3b3248", roughness: 0.9 })); sw.position.set(sx * 9.6, 0.1, -200); scene.add(sw);
      const neon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 600), new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.mood === "day" ? "#d9d6cf" : sx < 0 ? "#00e5ff" : "#ff2d95").multiplyScalar(M.neon) })); neon.position.set(sx * 7.1, 0.2, -200); scene.add(neon);
    }
    const addScroll = (obj, z0) => { scene.add(obj); scroll.push({ obj, z0 }); };
    // palms
    const trunkM = new THREE.MeshStandardMaterial({ color: M.trunk, roughness: 0.9 }), frondM = new THREE.MeshStandardMaterial({ color: M.frond[0], roughness: 0.7, emissive: M.frond[1], emissiveIntensity: M.frond[2], side: THREE.DoubleSide });
    const frondG = new THREE.ConeGeometry(0.42, 3.4, 4); frondG.translate(0, 1.7, 0); frondG.scale(1, 1, 0.16);
    const makePalm = (h) => { const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 7), trunkM); tr.position.y = h / 2; g.add(tr);
      for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(frondG, frondM); f.position.y = h; f.rotation.set(0, (i / 9) * Math.PI * 2, 0); f.rotateX(1.1 + (i % 3) * 0.16); g.add(f); } return g; };
    for (const sx of [-1, 1]) for (let i = 0; i < 20; i++) { const p = makePalm(6.5 + rr() * 3); p.position.x = sx * (9.2 + rr() * 0.5); p.rotation.z = -sx * 0.06; p.scale.setScalar(0.9 + rr() * 0.35); addScroll(p, i * 13 + (sx > 0 ? 6 : 0)); }
    // buildings with lit windows, setbacks, rooftop kit and neon signs
    const winTex = (hue) => cv(256, 512, (g, w, h) => { const r = rnd(hue * 13 + 5); g.fillStyle = cfg.mood === "day" ? "#2a3350" : "#120a22"; g.fillRect(0, 0, w, h);
      for (let y = 10; y < h - 8; y += 22) for (let x = 10; x < w - 10; x += 20) { const on = r() > 0.42; g.fillStyle = on ? `hsl(${hue + r() * 40},${cfg.mood === "day" ? 40 : 95}%,${cfg.mood === "day" ? 62 + r() * 12 : 58 + r() * 14}%)` : (cfg.mood === "day" ? "#3a4566" : "#1c1236"); g.fillRect(x, y, 12, 13); }
      g.fillStyle = `hsl(${hue},90%,60%)`; g.fillRect(0, 0, w, 4); });
    const WT = M.wins.map((h) => tex(winTex(h)));
    const signTex = (txt, hue) => tex(cv(512, 128, (g, w, h) => { g.fillStyle = "#0a0614"; g.fillRect(0, 0, w, h); g.strokeStyle = `hsl(${hue},100%,62%)`; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = `hsl(${hue},100%,72%)`; g.font = "800 78px 'Barlow Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 4); }));
    const SIGNS = ["HOTEL", "24H DINER", "BAR", "HARDWARE", "MOTEL", "PIZZA", "TOOLS", "CAFE", "GYM", "BANK"];
    for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) {
      const hgt = 14 + rr() * 38, wd = 9 + rr() * 6, dp = 11 + rr() * 6, tx = WT[Math.floor(rr() * WT.length)].clone(); tx.needsUpdate = true; tx.repeat.set(Math.max(1, Math.round(wd / 7)), Math.max(1, Math.round(hgt / 14)));
      const m = new THREE.MeshStandardMaterial({ color: M.bld, map: tx, emissiveMap: tx, emissive: "#ffffff", emissiveIntensity: M.winEm, roughness: 0.6 });
      const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(wd, hgt, dp), m); b.position.y = hgt / 2; g.add(b);
      const top = new THREE.Mesh(new THREE.BoxGeometry(wd * 0.62, 3 + rr() * 6, dp * 0.62), m); top.position.y = hgt + top.geometry.parameters.height / 2; g.add(top);
      for (let k = 0; k < 3; k++) { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.2), new THREE.MeshStandardMaterial({ color: "#555a66", roughness: 0.7 })); ac.position.set((rr() - 0.5) * wd * 0.8, hgt + 0.5, (rr() - 0.5) * dp * 0.8); g.add(ac); }
      if (cfg.mood !== "day" && rr() > 0.35) { const hue = [330, 190, 45, 285][Math.floor(rr() * 4)], sg = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), new THREE.MeshBasicMaterial({ map: signTex(SIGNS[Math.floor(rr() * SIGNS.length)], hue), toneMapped: false })); sg.position.set(-sx * (wd / 2 + 0.05), 4 + rr() * 3, (rr() - 0.5) * 4); sg.rotation.y = -sx * Math.PI / 2; sg.material.color.multiplyScalar(M.neon * 0.55); g.add(sg); }
      g.position.x = sx * (17.5 + wd / 2 + rr() * 9); addScroll(g, i * 26 + 3 + (sx > 0 ? 9 : 0));
    }
    // street lamps (with a wet-road glow streak under each) and parked vehicles
    const lampM = new THREE.MeshStandardMaterial({ color: "#2a2338", roughness: 0.6 }), lampCol = new THREE.Color("#ffd79a").multiplyScalar(3.2 * Math.max(M.lamps, 0.4));
    const streakT = tex(cv(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,225,170,0)"); gr.addColorStop(0.5, "rgba(255,225,170,0.85)"); gr.addColorStop(1, "rgba(255,225,170,0)"); g.fillStyle = gr; g.fillRect(w * 0.3, 0, w * 0.4, h); }));
    for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7.4, 6), lampM); pole.position.y = 3.7; const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), lampM); arm.position.set(-sx * 1.1, 7.35, 0);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.34), new THREE.MeshBasicMaterial({ color: M.lamps ? lampCol : new THREE.Color("#cfd2dc") })); head.position.set(-sx * 2.1, 7.28, 0); g.add(pole, arm, head);
      if (M.lamps) { const st = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 11), new THREE.MeshBasicMaterial({ map: streakT, transparent: true, opacity: 0.45 * Math.min(M.lamps, 1.2), blending: THREE.AdditiveBlending, depthWrite: false })); st.rotation.x = -Math.PI / 2; st.position.set(-sx * 3.3, 0.04, 0); g.add(st); }
      g.position.x = sx * 7.7; addScroll(g, i * 26 + 16 + (sx > 0 ? 13 : 0)); }
    // cars
    const carM = (col) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.28, metalness: 0.55, clearcoat: 0.9 });
    const glassM = new THREE.MeshPhysicalMaterial({ color: "#0b1020", roughness: 0.05, metalness: 0.9, clearcoat: 1 }), tireM = new THREE.MeshStandardMaterial({ color: "#0c0c10", roughness: 0.9 });
    const makeCar = (col, facing) => { const g = new THREE.Group(); const b = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.62, 4.3, 3, 0.14), carM(col)); b.position.y = 0.62; const cb = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.52, 2.2, 3, 0.18), glassM); cb.position.set(0, 1.12, 0.1);
      const lt = new THREE.MeshBasicMaterial({ color: new THREE.Color(facing > 0 ? "#fff3d6" : "#ff1a2a").multiplyScalar(facing > 0 ? 2.4 : 1.5) }), front = facing > 0 ? 1 : -1;
      for (const sx of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), lt); l.position.set(sx, 0.64, front * 2.16); g.add(l); }
      g.add(b, cb); for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14), tireM); w.rotation.z = Math.PI / 2; w.position.set(sx * 0.95, 0.36, sz); g.add(w); }
      if (facing > 0 && M.cone) { const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 12, 14, 1, true), new THREE.MeshBasicMaterial({ color: "#ffe9c0", transparent: true, opacity: M.cone * 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0.7, 2.2 + 6); g.add(cone); }
      g.rotation.y = facing > 0 ? 0 : Math.PI; return g; };
    const cols = ["#ff2d95", "#19d3ff", "#f4f1ea", "#7a4dff", "#ff8a1f", "#35d07f"];
    const addActor = (obj, tPass, k, x) => { obj.position.x = x; scene.add(obj); events.push({ obj, z0: -k * dist(tPass), k }); };
    OVT.forEach((tp, i) => addActor(makeCar(cols[i % 6], -1), tp, 0.45, X0));
    OVT.forEach((tp, i) => addActor(makeCar(cols[(i + 3) % 6], 1), tp + 0.85, 1.65, -X0));
    ONC.forEach((tn, i) => addActor(makeCar(cols[(i + 1) % 6], 1), tn, 1.7, -X0));
    for (let i = 0; i < 6; i++) { const pc = makeCar(cols[(i * 5) % 6], -1); pc.position.x = (i % 2 ? 1 : -1) * 6.15; pc.rotation.y = Math.PI + (rr() - 0.5) * 0.06; addScroll(pc, 20 + i * 41); }

    // ── the truck ──
    truck = new THREE.Group(); scene.add(truck);
    const body = new THREE.MeshPhysicalMaterial({ color: cfg.truck ?? "#3a3d4a", roughness: 0.26, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.7 });
    const hv = new THREE.MeshStandardMaterial({ color: "#F5C400", roughness: 0.4, emissive: "#F5C400", emissiveIntensity: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: "#070b18", roughness: 0.04, metalness: 0.92, clearcoat: 1, envMapIntensity: 1.6 });
    const dark = new THREE.MeshStandardMaterial({ color: "#0b0b0f", roughness: 0.6 }), chrome = new THREE.MeshStandardMaterial({ color: "#cfd3de", metalness: 1, roughness: 0.2, envMapIntensity: 1.5 });
    const part = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); truck.add(m); return m; };
    const RB = (w, h, d, r = 0.12) => new RoundedBoxGeometry(w, h, d, 4, r);
    part(RB(2.05, 0.74, 5.3, 0.14), body, 0, 0.8, 0);
    part(RB(2.08, 0.1, 5.32, 0.04), hv, 0, 0.5, 0);
    part(RB(1.94, 0.46, 1.6, 0.14), body, 0, 1.36, -1.8);
    part(RB(1.96, 1.0, 1.9, 0.24), body, 0, 1.8, -0.3);
    part(RB(1.78, 0.52, 0.08, 0.02), glass, 0, 1.94, -1.28).rotation.x = -0.42;
    part(RB(1.99, 0.46, 1.5, 0.1), glass, 0, 1.96, -0.3);
    part(RB(1.95, 0.46, 2.15, 0.08), body, 0, 1.3, 1.6);
    for (const sx of [-1, 1]) part(RB(0.09, 0.5, 2.3, 0.03), body, sx * 0.97, 1.6, 1.55);
    part(RB(1.95, 0.5, 0.09, 0.03), body, 0, 1.6, 2.62);
    part(RB(1.76, 0.07, 2.0, 0.02), dark, 0, 1.55, 1.55); // bed liner
    part(RB(0.85, 0.34, 0.5, 0.05), hv, -0.45, 1.78, 0.75); // yellow toolbox in the bed
    for (let i = 0; i < 3; i++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 10), new THREE.MeshStandardMaterial({ color: "#ff6a1a", roughness: 0.6 })); cn.position.set(0.55 + i * 0.01, 1.9 + i * 0.0, 1.0 + i * 0.5); truck.add(cn); }
    for (const sx of [-1, 1]) part(RB(0.1, 0.1, 1.9, 0.03), dark, sx * 0.55, 2.52, 0.0); // roof rack rails
    for (let i = 0; i < 3; i++) part(RB(1.15, 0.07, 0.07, 0.02), dark, 0, 2.52, -0.7 + i * 0.7);
    part(RB(0.14, 0.06, 2.2, 0.02), chrome, 0.52, 2.62, 0.1); part(RB(0.14, 0.06, 2.2, 0.02), chrome, -0.52, 2.62, 0.1); // ladder on the rack
    part(RB(1.3, 0.12, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb300").multiplyScalar(2.2) }), 0, 2.4, -0.15); // light bar
    beacon = part(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb300").multiplyScalar(4) }), 0, 2.2, 0.5);
    part(RB(1.5, 0.5, 0.14, 0.05), dark, 0, 1.05, -2.62); part(RB(1.1, 0.26, 0.04, 0.02), chrome, 0, 1.08, -2.7); // grille
    for (const sx of [-1, 1]) { part(RB(0.46, 0.2, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3d6").multiplyScalar(2.4) }), sx * 0.72, 1.18, -2.64); part(RB(0.2, 0.34, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff0015").multiplyScalar(1.2) }), sx * 0.9, 1.5, 2.67);
      part(RB(0.16, 0.2, 0.3, 0.06), body, sx * 1.12, 1.95, -0.95); part(RB(0.12, 0.12, 0.04, 0.02), glass, sx * 1.2, 1.95, -0.95); // mirrors
      part(RB(0.12, 0.1, 1.6, 0.03), chrome, sx * 1.07, 0.62, 0.0); // side steps
      part(RB(0.16, 0.34, 1.3, 0.06), dark, sx * 1.02, 0.93, -1.65); part(RB(0.16, 0.34, 1.3, 0.06), dark, sx * 1.02, 0.93, 1.6); } // wheel arch flares
    part(RB(2.1, 0.2, 0.26, 0.06), chrome, 0, 0.55, -2.72); part(RB(2.1, 0.2, 0.26, 0.06), chrome, 0, 0.55, 2.72); // bumpers
    const decalT = tex(cv(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#F5C400"; g.font = "800 92px 'Barlow Condensed', 'Arial Narrow', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CONSTRA", w / 2, h / 2 + 4); }));
    const decalM = new THREE.MeshBasicMaterial({ map: decalT, transparent: true, toneMapped: false });
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), decalM); d.position.set(sx * 1.055, 1.0, 0.1); d.rotation.y = sx * Math.PI / 2; truck.add(d); }
    const dt = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.34), decalM); dt.position.set(0, 1.6, 2.675); truck.add(dt);
    const rim = new THREE.MeshStandardMaterial({ color: "#c9ccd6", metalness: 0.95, roughness: 0.22, envMapIntensity: 1.5 });
    for (const sx of [-1, 1]) for (const sz of [-1.65, 1.6]) { const w = new THREE.Group(); const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.38, 28), tireM); t1.rotation.z = Math.PI / 2; const sw = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 28), tireM); sw.rotation.y = Math.PI / 2; sw.position.x = sx * 0.17; const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 20), rim); r1.rotation.z = Math.PI / 2; w.add(t1, r1);
      for (let q = 0; q < 6; q++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.07), dark); sp.position.x = sx * 0.2; sp.rotation.x = (q / 6) * Math.PI; w.add(sp); } const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.44, 10), chrome); hub.rotation.z = Math.PI / 2; w.add(hub);
      w.position.set(sx * 1.0, 0.5, sz); truck.add(w); wheels.push(w); }
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 6.2), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.55, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; truck.add(shadow);
    const glowT = tex(cv(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, "rgba(245,196,0,0.9)"); gr.addColorStop(1, "rgba(245,196,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
    const under = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })); under.rotation.x = -Math.PI / 2; under.position.y = 0.05; truck.add(under); // hi-vis underglow on the road
    headSpot = new THREE.SpotLight("#ffe7bd", cfg.mood === "night" ? 120 : 70, 70, 0.5, 0.65, 1.6); headSpot.position.set(0, 1.3, -2.5); headSpot.target.position.set(0, 0, -30); truck.add(headSpot, headSpot.target);
    if (M.cone) for (const sx of [-0.72, 0.72]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(2.0, 15, 16, 1, true), new THREE.MeshBasicMaterial({ color: "#ffe9c0", transparent: true, opacity: M.cone, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cone.rotation.x = -Math.PI / 2; cone.position.set(sx, 1.15, -2.7 - 7.5); truck.add(cone); }

    // ── checkpoint rings + crew waving at each one ──
    const tagTex = (name) => tex(cv(320, 84, (g, w, h) => { g.fillStyle = "rgba(14,10,28,0.92)"; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 18); g.fill(); g.lineWidth = 4; g.strokeStyle = "#F5C400"; g.stroke(); g.fillStyle = "#fff"; g.font = "800 44px 'Barlow Condensed', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(name, 22, h / 2 + 2); g.fillStyle = "#2eaa62"; g.beginPath(); g.arc(w - 40, h / 2, 20, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(w - 49, h / 2 + 1); g.lineTo(w - 42, h / 2 + 9); g.lineTo(w - 30, h / 2 - 7); g.stroke(); }));
    const skin = ["#e8b98a", "#9c6a46", "#f3c9a5", "#7a4a2e", "#e0a878", "#c68a5e"], vestM = new THREE.MeshStandardMaterial({ color: "#F5C400", roughness: 0.5, emissive: "#F5C400", emissiveIntensity: 0.3 }), stripeM = new THREE.MeshStandardMaterial({ color: "#d9dce3", roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.35 });
    CK.forEach((tc, i) => {
      const g = new THREE.Group(), gold = new THREE.Color(cfg.ring ?? "#F5C400").multiplyScalar(2.6);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.14, 10, 56), new THREE.MeshBasicMaterial({ color: gold })));
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 2.4, 40, 1, true), new THREE.MeshBasicMaterial({ color: cfg.ring ?? "#F5C400", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); sleeve.rotation.x = Math.PI / 2; g.add(sleeve);
      g.position.set(X0, 2.1, -999); scene.add(g); rings.push({ g, tc, sleeve });
      const pg = new THREE.Group(), tors = new THREE.Mesh(RB(0.64, 0.95, 0.38, 0.14), vestM); tors.position.y = 1.35; const legs = new THREE.Mesh(RB(0.52, 0.9, 0.32, 0.1), new THREE.MeshStandardMaterial({ color: "#2a3350" })); legs.position.y = 0.45;
      const st1 = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.4), stripeM); st1.position.y = 1.25; const st2 = st1.clone(); st2.position.y = 1.5;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), new THREE.MeshStandardMaterial({ color: skin[i % 6], roughness: 0.7 })); head.position.y = 2.05; const hat = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#F5C400", roughness: 0.4 })); hat.position.y = 2.1; const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), new THREE.MeshStandardMaterial({ color: "#F5C400" })); brim.position.y = 2.1;
      const arm = new THREE.Group(); const am = new THREE.Mesh(RB(0.15, 0.7, 0.15, 0.06), vestM); am.position.y = 0.32; arm.add(am); arm.position.set(0.4, 1.7, 0);
      const arm2 = new THREE.Mesh(RB(0.15, 0.7, 0.15, 0.06), vestM); arm2.position.set(-0.4, 1.35, 0);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(CREW[i].tag), transparent: true, depthWrite: false, fog: false })); tag.scale.set(3.0, 0.79, 1); tag.position.y = 3.2;
      pg.add(tors, legs, st1, st2, head, hat, brim, arm, arm2, tag); pg.position.set(8.2, 0.2, -999); pg.rotation.y = 0.5; scene.add(pg); peds.push({ g: pg, arm, tag, tc, z0: -dist(tc) });
    });
    const coinM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd23a").multiplyScalar(1.7) }), coinG = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 20);
    COINS.forEach((tau) => { const g = new THREE.Group(), m = new THREE.Mesh(coinG, coinM); m.rotation.x = Math.PI / 2; g.add(m); scene.add(g); coins.push({ g, tau, x: lane(tau), z0: -dist(tau) }); });
    const puffT = tex(cv(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
    swerveTimes.forEach((ts) => { for (let j = 0; j < 6; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, color: "#e9d7ff", transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); puffs.push({ s, ts: ts + j * 0.035, sx: (j % 2 ? 1 : -1) * 0.9, x: lane(ts + j * 0.035) }); } });
    // blimp
    blimp = new THREE.Group(); const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: "#e8e2f5", roughness: 0.4, metalness: 0.3 })); hull.scale.set(9, 3.2, 3.2); blimp.add(hull);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 5), new THREE.MeshStandardMaterial({ color: "#F5C400" })); fin.position.set(-8, 0, 0); blimp.add(fin);
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.4), new THREE.MeshBasicMaterial({ map: tex(cv(1024, 256, (g, w, h) => { g.fillStyle = "#F5C400"; g.fillRect(0, 0, w, h); g.fillStyle = "#151617"; g.font = "800 190px 'Barlow Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CONSTRA", w / 2, h / 2 + 8); })), fog: false, side: THREE.DoubleSide, toneMapped: false })); ban.position.set(0, -4.4, 0); blimp.add(ban);
    blimp.position.set(-120, 52, -190); scene.add(blimp);

    // ── job site where the truck stops: fence, barriers, cones, light tower, excavator, container, pipes, sign ──
    site = new THREE.Group(); const sx0 = 13.5, mat = (c, r = 0.6, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const yel = mat("#F5C400", 0.45, 0.2), grey = mat("#555a66", 0.7, 0.3);
    const fenceT = tex(cv(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(190,195,210,0.85)"; g.lineWidth = 3; for (let i = -h; i < w + h; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); } }), [10, 1]);
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(30, 2.2), new THREE.MeshBasicMaterial({ map: fenceT, transparent: true, side: THREE.DoubleSide })); fence.rotation.y = Math.PI / 2; fence.position.set(-1, 1.5, 0); site.add(fence);
    for (let i = -7; i <= 7; i++) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), grey); post.position.set(-1, 1.3, i * 2); site.add(post); }
    const exc = new THREE.Group(); const tracks = [-1.2, 1.2].map((z) => { const t = new THREE.Mesh(RB(1.1, 0.7, 3.8, 0.2), mat("#1b1b20", 0.9)); t.position.set(0, 0.35, z * 0); return t; });
    const trk1 = new THREE.Mesh(RB(0.9, 0.7, 3.6, 0.2), mat("#1b1b20", 0.9)); trk1.position.set(-1.1, 0.35, 0); const trk2 = trk1.clone(); trk2.position.x = 1.1; exc.add(trk1, trk2);
    const cab = new THREE.Mesh(RB(2.3, 1.6, 2.4, 0.18), yel); cab.position.set(0, 1.5, 0); const win = new THREE.Mesh(RB(1.5, 0.9, 0.06, 0.02), glass); win.position.set(0, 1.8, -1.22); exc.add(cab, win);
    const boom = new THREE.Group(); const b1 = new THREE.Mesh(RB(0.38, 0.38, 3.6, 0.1), yel); b1.position.z = -1.8; boom.add(b1); const stick = new THREE.Group(); const b2 = new THREE.Mesh(RB(0.3, 0.3, 2.6, 0.08), yel); b2.position.z = -1.3; stick.add(b2); const bucket = new THREE.Mesh(RB(0.9, 0.6, 0.8, 0.1), mat("#3a3d4a", 0.5, 0.6)); bucket.position.set(0, -0.2, -2.7); stick.add(bucket); stick.position.z = -3.5; boom.add(stick); boom.position.set(0, 1.6, -1.0); exc.add(boom);
    exc.position.set(7, 0, -5); exc.rotation.y = 0.3; site.add(exc); site.userData = { boom, stick };
    const cont = new THREE.Mesh(RB(2.6, 2.6, 6, 0.04), mat("#2c5f9e", 0.55, 0.3)); cont.position.set(8.5, 1.3, 9); site.add(cont);
    for (let i = 0; i < 5; i++) { const cone = new THREE.Group(); const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 12), mat("#ff6a1a", 0.6)); c1.position.y = 0.35; const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 12), mat("#f2f2f2", 0.6)); c2.position.y = 0.4; cone.add(c1, c2); cone.position.set(-0.3 - (i % 2) * 0.5, 0, -6 + i * 3); site.add(cone); }
    for (let i = 0; i < 3; i++) { const bar = new THREE.Mesh(RB(3, 0.3, 0.12, 0.03), mat(i % 2 ? "#f2f2f2" : "#ff6a1a", 0.6)); bar.position.set(-0.6, 0.9 + (i % 2) * 0.35, 7 + i * 0.01); bar.rotation.y = Math.PI / 2; site.add(bar); }
    for (let i = 0; i < 6; i++) { const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4, 12), mat("#e07a1f", 0.5, 0.3)); pipe.rotation.z = Math.PI / 2; pipe.position.set(9.5, 0.25 + (i > 2 ? 0.4 : 0), 0.6 * (i % 3) - 9); site.add(pipe); }
    const tower = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.5, 8), grey); pole.position.y = 3.25; const panel = new THREE.Mesh(RB(1.5, 0.8, 0.14, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.mood === "day" ? "#e8e8e8" : "#fff2d6").multiplyScalar(cfg.mood === "day" ? 1 : 3) })); panel.position.set(0, 6.6, 0); panel.rotation.y = -0.6; tower.add(pole, panel); tower.position.set(4, 0, 5); site.add(tower);
    const dirt = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 10), mat("#5a4636", 1, 0)); dirt.scale.set(1.4, 1, 1); dirt.position.set(10.5, 0.9, -10); site.add(dirt);
    const signM = new THREE.MeshBasicMaterial({ map: tex(cv(512, 256, (g, w, h) => { g.fillStyle = "#F5C400"; g.fillRect(0, 0, w, h); g.fillStyle = "#151617"; g.fillRect(0, h - 70, w, 70); g.fillStyle = "#151617"; g.font = "800 110px 'Barlow Condensed', sans-serif"; g.textAlign = "center"; g.fillText("JOB SITE", w / 2, 120); g.fillStyle = "#F5C400"; g.font = "700 44px 'IBM Plex Mono', monospace"; g.fillText(cfg.siteLine ?? "CONSTRA · CREW ONLY", w / 2, h - 22); })), toneMapped: false });
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), signM); sgn.position.set(-0.9, 2.6, -2.4); sgn.rotation.y = Math.PI / 2; site.add(sgn);
    site.position.set(sx0 - 0.5, 0, -dist(STOP1) - 2); scene.add(site);
    // rain
    if (M.rain) { const N = 900, pos = new Float32Array(N * 6), r = rnd(91); for (let i = 0; i < N; i++) { const x = (r() - 0.5) * 40, y = r() * 24, z = (r() - 0.5) * 46; pos.set([x, y, z, x - 0.08, y + 0.75, z + 0.02], i * 6); } const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#bcd0ff", transparent: true, opacity: 0.32, fog: false, depthWrite: false })); rain.frustumCulled = false; scene.add(rain); }
  }

  function update3D(t) {
    const d = dist(t); roadTex.offset.y = d / 12;
    for (const s of scroll) s.obj.position.z = wrapZ(s.z0, d);
    for (const e of events) { const z = e.z0 + e.k * d; e.obj.visible = z > -230 && z < 45; e.obj.position.z = z; }
    site.position.z = -dist(STOP1) - 2 + d; site.visible = site.position.z > -230; const sd = site.userData; sd.boom.rotation.x = -0.35 + 0.18 * Math.sin(t * 1.3); sd.stick.rotation.x = 0.5 + 0.3 * Math.sin(t * 1.3 + 1);
    const k = 1 - ease((t - STOP0) / (STOP1 - STOP0)), x = lane(t), dx = (lane(t + 0.02) - lane(t - 0.02)) / 0.04;
    truck.position.set(x, 0.012 * Math.sin(t * 13) * k, 0); truck.rotation.y = -clamp(dx / V0 * 1.9, -0.5, 0.5); truck.rotation.z = -dx * 0.022 + 0.004 * Math.sin(t * 9) * k;
    for (const w of wheels) w.rotation.x = -d / 0.5;
    beacon.scale.setScalar(0.55 + 0.75 * (0.5 + 0.5 * Math.sin(t * 11)));
    for (const r of rings) { const ahead = dist(r.tc) - d; const vis = ahead < 215 && t < r.tc + 0.7; r.g.visible = vis; if (vis) { r.g.position.z = -ahead; const pass = clamp((t - r.tc) / 0.7); r.g.scale.setScalar((1 + pass * 0.5) * (1 + 0.04 * pulse(t))); const near = 0.3 + 0.7 * clamp(Math.abs(ahead) / 7); r.sleeve.material.opacity = 0.1 * (1 - pass) * near; r.g.children[0].material.color.set(cfg.ring ?? "#F5C400").multiplyScalar(1.5 * (1 - pass) * near + 0.05); } }
    for (const p of peds) { const z = p.z0 + d, vis = z > -215 && z < 40; p.g.visible = vis; if (!vis) continue; p.g.position.z = z; const near = clamp(1 - Math.abs(t - p.tc) / 1.6); p.arm.rotation.z = -2.6 + 0.5 * Math.sin(t * 11 + p.tc) * (0.4 + near); p.g.position.y = 0.2 + near * 0.35 * Math.abs(Math.sin(t * 8)); p.g.rotation.y = 0.5 - near * 0.5; p.tag.visible = t > p.tc - 1.6; p.tag.position.y = 3.2 + 0.15 * Math.sin(t * 5); }
    for (const c of coins) { const age = t - c.tau, z = c.z0 + d; if (age > 0.28 || z < -230) { c.g.visible = false; continue; } c.g.visible = true; if (age > 0) c.g.position.set(truck.position.x, 1.6 + age * 2.6, -0.4); else c.g.position.set(c.x, 1.25, z); c.g.rotation.y = t * 7 + c.tau * 3; c.g.scale.setScalar(age > 0 ? 1 + age * 2.6 : 1); }
    for (const p of puffs) { const age = t - p.ts; if (age < 0 || age > 1.0) { p.s.visible = false; continue; } p.s.visible = true; p.s.position.set(p.x + p.sx, 0.35 + age * 0.9, 2.6 + (d - dist(p.ts))); p.s.scale.setScalar(1.0 + age * 4.2); p.s.material.opacity = 0.5 * (1 - age); }
    blimp.position.x = -120 + t * 5; blimp.rotation.y = 0.12;
    if (rain) { rain.position.set(cam.position.x, cam.position.y - 6 - ((t * 22) % 24) + 12, cam.position.z - 8); rain.position.y = cam.position.y - 12 + 24 - ((t * 22) % 24); }
    headSpot.intensity = cfg.mood === "night" ? 120 : 70;
  }

  // ───────────────────────────── cameras ─────────────────────────────
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
      default: { const a = M.orbit + (t - t0) * 0.26, r = 12.5 + (t - t0) * 0.25; p = [tx + Math.sin(a) * r, 2.0, Math.cos(a) * r - 0.6]; l = [tx, 1.3, -0.2]; f = 36; focus = r; }
    }
    const near = NEAR.reduce((m, n) => Math.max(m, Math.exp(-Math.abs(t - n) * 5)), 0);
    cam.position.set(p[0] + (0.014 + 0.05 * near) * Math.sin(t * 7.1) + 0.008 * Math.sin(t * 13), p[1] + (0.014 + 0.05 * near) * Math.sin(t * 8.3), p[2]); cam.lookAt(l[0], l[1], l[2]);
    const cut = Math.exp(-(t - t0) * 6) * (i > 0 ? 1 : 0); cam.rotateZ(0.008 * Math.sin(t * 1.7) + 0.035 * cut * (i % 2 ? 1 : -1) + 0.02 * near * Math.sin(t * 20));
    cam.fov = f * fovK * (1 + cut * 0.07 - 0.04 * pulse(t) * (t < STOP0 ? 1 : 0.3) + 0.05 * near); cam.updateProjectionMatrix();
    return { focus };
  }

  // ───────────────────────────── HUD ─────────────────────────────
  const F = { disp: "'Barlow Condensed','Arial Narrow',sans-serif", mono: "'IBM Plex Mono',monospace" };
  function txt(c, s, x, y, size, fill, o = {}) { c.font = `${o.w ?? 800} ${size}px ${o.f ?? F.disp}`; c.textAlign = o.a ?? "left"; c.textBaseline = o.b ?? "middle"; c.lineJoin = "round"; c.letterSpacing = (o.ls ?? 0) + "px"; if (o.sh !== false) { c.lineWidth = size * (o.sw ?? 0.16); c.strokeStyle = o.st ?? "rgba(0,0,0,0.85)"; c.strokeText(s, x, y); } c.fillStyle = fill; c.fillText(s, x, y); }
  function star(c, x, y, r, fill, stroke) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.lineWidth = r * 0.14; c.strokeStyle = stroke; c.stroke(); }

  function hud(t, c, E) {
    const V = E.V, W = E.W, H = E.H, u = V ? W / 1080 : H / 1080, m = 52 * u, pl = pulse(t);
    const hudA = clamp(t / 0.5) * (1 - ease((t - (PASS_T - 0.25)) / 0.35)), sp = speedAt(t) / V0;
    if (sp > 0.05) { c.save(); c.globalAlpha = (0.14 + 0.1 * pl) * sp; c.strokeStyle = "#fff"; c.lineWidth = 2 * u; const r = rnd(5); for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, d0 = (0.36 + r() * 0.5 + ((t * (1.6 + r())) % 1) * 0.35) * Math.min(W, H) * 0.62, d1 = d0 + (50 + r() * 170) * u; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * d0 * 1.1, H / 2 + Math.sin(a) * d0 * 1.5); c.lineTo(W / 2 + Math.cos(a) * d1 * 1.1, H / 2 + Math.sin(a) * d1 * 1.5); c.stroke(); } c.restore(); }
    { const g = c.createLinearGradient(0, 0, 0, H * 0.22); g.addColorStop(0, `rgba(10,4,30,${0.55 * hudA})`); g.addColorStop(1, "rgba(10,4,30,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H * 0.22); }
    c.save(); c.globalAlpha = hudA; const topY = V ? 250 * u : m + 20 * u;
    txt(c, "♪ NOW PLAYING", m, topY - 6 * u, 24 * u, "#ff7ab8", { f: F.mono, w: 700, ls: 3 * u, sw: 0.2 });
    txt(c, cfg.radio ?? "GOLDEN HOUR FM — \"OVERTIME\"", m, topY + 28 * u, 30 * u, "#ffffff", { w: 700, ls: 1 * u });
    for (let i = 0; i < 9; i++) { const hh = (8 + 26 * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)) * (0.5 + 0.5 * pl)) * u; c.fillStyle = i % 2 ? "#00e5ff" : "#ff2d95"; c.fillRect(m + i * 12 * u, topY + 74 * u - hh, 8 * u, hh); }
    let cash = BASE; for (const [ti, a] of CASH) { const k = clamp((t - ti) / 0.35); if (k > 0) cash += Math.round(a * ease(k)); }
    const lastPay = CASH.reduce((mx, [ti]) => (t >= ti ? Math.max(mx, ti) : mx), -9), bump = Math.exp(-(t - lastPay) * 8);
    c.save(); c.translate(W - m, topY - 4 * u); c.scale(1 + 0.08 * bump, 1 + 0.08 * bump); txt(c, "$" + String(cash).padStart(8, "0"), 0, 0, 66 * u, bump > 0.35 ? "#d6ffd9" : "#7ae582", { a: "right", w: 800, ls: 2 * u, sw: 0.14 }); c.restore();
    const done = CK.filter((tc) => t >= tc).length, wanted = 5 - Math.min(5, done), flashRed = Math.sin(t * 14) > 0;
    for (let i = 0; i < 5; i++) { const sx = W - m - 18 * u - i * 46 * u, idx = 4 - i, on = idx < wanted, gone = !on && idx === wanted && done <= 5 ? clamp((t - CK[done - 1]) / 0.45) : 1; if (on) star(c, sx, topY + 52 * u, 19 * u, flashRed ? "#ff3b3b" : "#3b7bff", "#fff"); else if (gone < 1) { c.save(); c.globalAlpha *= 1 - gone; star(c, sx, topY + 52 * u - gone * 30 * u, 19 * u * (1 + gone), "#ff3b3b", "#fff"); c.restore(); } else star(c, sx, topY + 52 * u, 19 * u, null, "rgba(255,255,255,0.7)"); }
    txt(c, wanted ? `WANTED: ${WANT} ${wanted}` : "WANTED LEVEL 0", W - m, topY + 92 * u, 20 * u, wanted ? "#ff8a8a" : "rgba(255,255,255,0.75)", { a: "right", f: F.mono, w: 700, ls: 2 * u, sw: 0.2 });
    const oy = V ? H - 430 * u : H - m - 40 * u, nIn = Math.min(6, done), lc = done ? Math.exp(-(t - CK[done - 1]) * 6) : 0;
    c.save(); c.globalAlpha *= clamp((t - 0.7) / 0.5); txt(c, cfg.objective, W / 2, oy - 40 * u, 28 * u, "#ffffff", { a: "center", f: F.mono, w: 700, ls: 3 * u, sw: 0.2 });
    c.translate(W / 2, oy + 14 * u); c.scale(1 + 0.35 * lc, 1 + 0.35 * lc); txt(c, `${nIn} / 6`, 0, 0, 84 * u, "#F5C400", { a: "center", w: 800, ls: 3 * u, sw: 0.12 }); c.restore();
    const mmx = m + 128 * u, mmy = V ? H - 600 * u : H - m - 130 * u; minimap(c, t, mmx, mmy, 128 * u, u);
    txt(c, String(Math.round(speedAt(t) * 3.6)).padStart(3, "0"), mmx + 148 * u, mmy - 8 * u, 76 * u, "#ffffff", { w: 800, ls: 1 * u, sw: 0.1 }); txt(c, "KM/H", mmx + 152 * u, mmy + 38 * u, 22 * u, "#F5C400", { f: F.mono, w: 700, ls: 3 * u, sw: 0.2 });
    { const k = t - 0.35; if (k > 0 && k < 2.4) { const inn = easeOut(clamp(k / 0.35)), out = ease((k - 1.9) / 0.4), bw = W * 0.92, bx = -bw * (1 - inn) - out * bw * 1.1 + (W - bw) / 2, by = V ? 560 * u : H * 0.22; c.save(); c.translate(bx, by); c.fillStyle = "#F5C400"; c.fillRect(0, 0, bw, 92 * u); c.fillStyle = "#151617"; c.fillRect(0, 92 * u, bw, 8 * u); txt(c, "NEW MISSION", 30 * u, 36 * u, 28 * u, "#151617", { f: F.mono, w: 700, ls: 4 * u, sh: false }); txt(c, cfg.title, 30 * u, 70 * u, 50 * u, "#151617", { ls: 2 * u, sh: false }); c.restore(); } }
    CK.forEach((tc, i) => { const k = t - tc; if (k < -0.1 || k > 2.6) return; const inn = easeBack(clamp(k / 0.4)), out = ease((k - 2.1) / 0.4), bx = m - (1 - inn) * 520 * u - out * 520 * u, by = V ? 420 * u : H * 0.34, bw = (V ? 600 : 560) * u, bh = 122 * u;
      c.save(); c.translate(bx, by); c.fillStyle = "rgba(14,10,28,0.88)"; c.beginPath(); c.roundRect(0, 0, bw, bh, 18 * u); c.fill(); c.lineWidth = 2 * u; c.strokeStyle = "rgba(245,196,0,0.9)"; c.stroke();
      c.fillStyle = "#2eaa62"; c.beginPath(); c.arc(62 * u, bh / 2, 34 * u, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 8 * u; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(46 * u, bh / 2 + 2 * u); c.lineTo(58 * u, bh / 2 + 15 * u); c.lineTo(80 * u, bh / 2 - 13 * u); c.stroke();
      txt(c, CREW[i].title, 118 * u, 40 * u, 40 * u, "#ffffff", { sh: false, ls: 1 * u }); txt(c, CREW[i].sub, 118 * u, 86 * u, 21 * u, "#F5C400", { f: F.mono, w: 700, sh: false, ls: 0.5 * u });
      txt(c, "+$250", bw - 22 * u, 40 * u, 34 * u, "#7ae582", { a: "right", sh: false }); c.restore();
      if (k > 0 && k < 1.0) { c.save(); c.globalAlpha *= 1 - clamp(k / 1.0); const sc = 1 + 0.6 * Math.exp(-k * 7); c.translate(W / 2, V ? H * 0.37 : H * 0.28); c.scale(sc, sc); txt(c, cfg.big, 0, 0, 120 * u, "#F5C400", { a: "center", ls: 3 * u }); c.restore(); } });
    const callouts = [...OVT.map((tt) => [tt - 0.2, "OVERTAKE!", "#7ae582", "+$100"]), ...NEAR.map((tt, i) => [tt, i < OVT.length ? "NEAR MISS!" : "CLOSE CALL!", "#ff7ab8", i < OVT.length ? "+$150" : "+$50"])].sort((a, b) => a[0] - b[0]);
    let combo = 0; callouts.forEach(([tt, label, col, pay], i) => { if (t >= tt) combo++; const k = t - tt; if (k < 0 || k > 0.95) return; const sc = easeBack(clamp(k / 0.25)) * (1 - 0.15 * ease((k - 0.6) / 0.35)), side = i % 2 ? 1 : -1; c.save(); c.globalAlpha *= 1 - ease((k - 0.6) / 0.35); c.translate(W / 2 + side * 120 * u, H * 0.56 - k * 40 * u); c.rotate(side * 0.07); c.scale(sc, sc); txt(c, label, 0, 0, 92 * u, col, { a: "center", ls: 3 * u }); txt(c, pay, 0, 66 * u, 50 * u, "#ffffff", { a: "center" }); c.restore(); });
    if (combo >= 2) { const lastK = Math.min(...callouts.filter(([tt]) => t >= tt).map(([tt]) => t - tt)); c.save(); const sc = 1 + 0.4 * Math.exp(-lastK * 9); c.translate(W - m - 10 * u, topY + 168 * u); c.scale(sc, sc); txt(c, `COMBO x${combo}`, 0, 0, 52 * u, "#F5C400", { a: "right", ls: 2 * u }); c.restore(); }
    c.restore();
    if (t > PASS_T - 0.1) missionPassed(t, c, E, u);
    if (t > PASS_T && t < CARD_T) confetti(t, c, E, u);
    if (t > CARD_T - 0.45) brandCard(t, c, E, u);
    if (t < 0.5) { c.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; c.fillRect(0, 0, W, H); }
  }
  function confetti(t, c, E, u) { const W = E.W, H = E.H, fade = 1 - ease((t - (CARD_T - 0.3)) / 0.3); if (fade <= 0) return; const cols = ["#F5C400", "#ff2d95", "#19d3ff", "#ffffff", "#7ae582", "#ff8a1f"], r = rnd(33);
    c.save(); c.globalAlpha = fade; for (let i = 0; i < 190; i++) { const x0 = r() * W, st = PASS_T + r() * 0.6, vy = (160 + r() * 300) * u, sw = 20 + r() * 50, sz = (10 + r() * 16) * u, col = cols[i % 6], rot = r() * 6, rs = 2 + r() * 6, age = t - st; if (age < 0) continue; const y = -60 * u + vy * age + 120 * u * age * age, x = x0 + Math.sin(age * 3 + i) * sw * u; if (y > H + 40) continue; c.save(); c.translate(x, y); c.rotate(rot + age * rs); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(age * rs * 1.3))); c.fillStyle = col; c.fillRect(-sz / 2, -sz / 2, sz, sz * 0.6); c.restore(); } c.restore(); }
  function minimap(c, t, cx, cy, r, u) {
    const d = dist(t), sc = r / 95; c.save(); c.translate(cx, cy); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.save(); c.clip();
    c.fillStyle = "#0b1030"; c.fillRect(-r, -r, 2 * r, 2 * r); c.strokeStyle = "rgba(120,110,190,0.35)"; c.lineWidth = 7 * u; for (let k = -4; k < 6; k++) { const y = ((k * 46 + d) % 230) - 115; c.beginPath(); c.moveTo(-r, y * sc * 0.9); c.lineTo(r, y * sc * 0.9); c.stroke(); }
    c.strokeStyle = "rgba(120,110,190,0.28)"; for (const x of [-0.8, 0.85]) { c.beginPath(); c.moveTo(x * r, -r); c.lineTo(x * r, r); c.stroke(); }
    c.strokeStyle = "#3a3f66"; c.lineWidth = 22 * u; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.strokeStyle = "#ff2d95"; c.lineWidth = 5 * u; c.setLineDash([16 * u, 12 * u]); c.lineDashOffset = d * sc * 0.5; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.setLineDash([]);
    CK.forEach((tc) => { const ah = dist(tc) - d; if (ah < -6 || t > tc + 0.4) return; const y = -ah * sc * 1.05 + r * 0.28; c.fillStyle = "#F5C400"; c.beginPath(); c.arc(0, Math.max(-r + 8 * u, y), 9 * u, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#000"; c.lineWidth = 2 * u; c.stroke(); });
    [...OVT.map((tp) => dist(tp)), ...ONC.map((tn) => dist(tn) * 0.85)].forEach((dd, i) => { const ah = i < OVT.length ? (dd - d) * 0.5 : (dd - d) * 0.6; if (ah < -8 || ah > 95) return; c.fillStyle = i < OVT.length ? "#ff6b6b" : "#ffffff"; c.fillRect((i < OVT.length ? 5 : -9) * u, -ah * sc * 1.05 + r * 0.28 - 4 * u, 6 * u, 8 * u); });
    c.restore(); c.lineWidth = 7 * u; c.strokeStyle = "#0a0a14"; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.lineWidth = 3 * u; c.strokeStyle = "#ff7ab8"; c.beginPath(); c.arc(0, 0, r + 2 * u, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "#fff"; c.strokeStyle = "#000"; c.lineWidth = 3 * u; c.beginPath(); c.moveTo(0, r * 0.1); c.lineTo(11 * u, r * 0.28 + 8 * u); c.lineTo(0, r * 0.28 + 1 * u); c.lineTo(-11 * u, r * 0.28 + 8 * u); c.closePath(); c.fill(); c.stroke();
    c.restore(); txt(c, "N", cx, cy - r - 24 * u, 22 * u, "#fff", { a: "center", f: F.mono, w: 700 }); }
  function missionPassed(t, c, E, u) {
    const W = E.W, H = E.H, V = E.V, k = t - PASS_T, a = clamp(k / 0.25) * (1 - ease((t - (CARD_T - 0.2)) / 0.4)); if (a <= 0) return;
    c.save(); c.globalAlpha = a; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(10,4,30,0.35)"); g.addColorStop(0.5, "rgba(10,4,30,0.62)"); g.addColorStop(1, "rgba(10,4,30,0.8)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const cy = V ? H * 0.38 : H * 0.34, pop = easeBack(clamp(k / 0.5)), sz = (V ? 190 : 200) * u; c.save(); c.translate(W / 2, cy); c.scale(0.7 + pop * 0.3 + 0.025 * pulse(t), 0.7 + pop * 0.3 + 0.025 * pulse(t));
    c.font = `800 ${sz}px ${F.disp}`; c.textAlign = "center"; c.textBaseline = "middle"; c.letterSpacing = 4 * u + "px"; c.lineJoin = "round";
    const lines = V ? ["MISSION", "PASSED"] : ["MISSION PASSED"]; lines.forEach((s, i) => { const y = (i - (lines.length - 1) / 2) * sz * 0.92; c.lineWidth = sz * 0.1; c.strokeStyle = "#000"; c.strokeText(s, 0, y + 6 * u); const gg = c.createLinearGradient(0, y - sz * 0.4, 0, y + sz * 0.4); gg.addColorStop(0, "#ffe27a"); gg.addColorStop(0.55, "#F5C400"); gg.addColorStop(1, "#c98a00"); c.fillStyle = gg; c.fillText(s, 0, y); }); c.restore();
    const ry = cy + (V ? sz * 1.0 : sz * 0.78); txt(c, "RESPECT +", W / 2, ry, 64 * u, "#ffffff", { a: "center", ls: 8 * u });
    const rows = cfg.stats, bw = (V ? 760 : 700) * u, bx = W / 2 - bw / 2; rows.forEach(([a1, b1], i) => { const kk = clamp((k - 0.5 - i * 0.22) / 0.25); if (kk <= 0) return; const y = ry + 100 * u + i * 66 * u; c.save(); c.globalAlpha = a * ease(kk); c.translate((1 - ease(kk)) * 60 * u, 0);
      c.fillStyle = "rgba(0,0,0,0.5)"; c.fillRect(bx, y - 26 * u, bw, 52 * u); c.fillStyle = "#F5C400"; c.fillRect(bx, y - 26 * u, 6 * u, 52 * u); txt(c, a1, bx + 26 * u, y, 30 * u, "#ffffff", { f: F.mono, w: 700, ls: 1 * u, sh: false }); txt(c, b1, bx + bw - 22 * u, y, 40 * u, "#7ae582", { a: "right", sh: false }); c.restore(); });
    const ky = ry + 100 * u + 4 * 66 * u + 16 * u, kk = clamp((k - 1.6) / 0.3); if (kk > 0) { c.globalAlpha = a * kk; txt(c, "WANTED LEVEL", W / 2 - 150 * u, ky + 22 * u, 24 * u, "#fff", { a: "center", f: F.mono, w: 700, ls: 2 * u }); for (let i = 0; i < 5; i++) star(c, W / 2 + (i - 0.2) * 44 * u + 22 * u, ky + 22 * u, 17 * u, null, "rgba(255,255,255,0.85)"); }
    c.restore();
  }
  function brandCard(t, c, E, u) {
    const W = E.W, H = E.H, V = E.V, a = ease((t - (CARD_T - 0.45)) / 0.45), k = t - CARD_T; c.save(); c.globalAlpha = a; c.fillStyle = "#0a0a0a"; c.fillRect(0, 0, W, H);
    const tape = (y) => { c.save(); c.beginPath(); c.rect(0, y, W, 26 * u); c.clip(); c.fillStyle = "#151617"; c.fillRect(0, y, W, 26 * u); c.fillStyle = "#F5C400"; const off = (t * 40 * u) % (52 * u); for (let x = -80 * u + off; x < W + 80 * u; x += 52 * u) { c.beginPath(); c.moveTo(x, y + 26 * u); c.lineTo(x + 26 * u, y + 26 * u); c.lineTo(x + 52 * u, y); c.lineTo(x + 26 * u, y); c.closePath(); c.fill(); } c.restore(); };
    tape(H * 0.2); tape(H * 0.8); const cy = H * 0.43, pop = easeBack(clamp(k / 0.6)), s = icon ? (V ? 230 : 190) * u * pop : 0;
    if (icon) { c.save(); c.shadowColor = "rgba(245,196,0,0.35)"; c.shadowBlur = 60 * u; c.drawImage(icon, W / 2 - s / 2, cy - s / 2 - 70 * u, s, s); c.restore(); }
    txt(c, "CONSTRA", W / 2, cy + (V ? 150 : 120) * u, (V ? 150 : 130) * u, "#F5C400", { a: "center", ls: 6 * u, sh: false });
    c.globalAlpha = a * ease(clamp((k - 0.4) / 0.4)); txt(c, cfg.brand[0], W / 2, cy + (V ? 250 : 215) * u, (V ? 46 : 42) * u, "#ECEAE5", { a: "center", ls: 2 * u, sh: false }); txt(c, cfg.brand[1], W / 2, cy + (V ? 306 : 265) * u, (V ? 46 : 42) * u, "#9A9C9F", { a: "center", ls: 2 * u, sh: false });
    c.globalAlpha = a * ease(clamp((k - 0.8) / 0.4)); const pw = (V ? 560 : 520) * u, ph = 92 * u, py = cy + (V ? 400 : 350) * u; c.fillStyle = "#F5C400"; c.beginPath(); c.roundRect(W / 2 - pw / 2, py, pw, ph, ph / 2); c.fill(); txt(c, "getconstra.com", W / 2, py + ph / 2 + 3 * u, 52 * u, "#1A1600", { a: "center", f: F.mono, w: 700, sh: false }); c.restore();
  }

  // ───────────────────────────── music ─────────────────────────────
  function music(h) {
    const { A, comp, note, hat, kick, snare, ding, tone, burst } = h, N = Math.floor(DUR / BEAT), root = cfg.music?.roots ?? [55, 43.65, 65.41, 49], chords = cfg.music?.chords ?? [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]], lead = cfg.music?.lead ?? "square";
    for (let b = 0; b < N; b++) { const t = b * BEAT, bar = Math.floor(b / 4) % 4, r = root[bar], inRoll = t > STOP0 - 0.9 && t < STOP1;
      if (b >= 2) { kick(t, 0.55); if (b % 2 === 1) snare(t, 0.2); hat(t + BEAT / 2, 0.1); hat(t + BEAT / 4, 0.05); hat(t + BEAT * 0.75, 0.05); }
      if (inRoll) for (let q = 0; q < 4; q++) snare(t + q * BEAT / 4, 0.08 + 0.05 * q);
      for (let e = 0; e < 4; e++) note(r * (e % 2 ? 2 : 1), t + e * BEAT / 4, BEAT * 0.22, "sawtooth", b >= 2 ? 0.17 : 0.07, 560 + (b % 8) * 90);
      if (b >= 4) { const ch = chords[bar]; if (b % 4 === 0) ch.forEach((f) => note(f, t, BEAT * 3.7, "triangle", 0.07, 1700)); for (let q = 0; q < 2; q++) note(ch[(b + q) % 3] * 2, t + q * BEAT / 2, BEAT * 0.45, lead, 0.04, 2800); } }
    const o = A.createOscillator(), o2 = A.createOscillator(), lp = A.createBiquadFilter(), g = A.createGain(); o.type = "sawtooth"; o2.type = "square"; lp.type = "lowpass"; lp.frequency.value = 240; g.gain.value = 0.034;
    o.frequency.setValueAtTime(64, 0); o.frequency.setValueAtTime(64, STOP0); o.frequency.linearRampToValueAtTime(34, STOP1); o2.frequency.setValueAtTime(32, 0); o2.frequency.setValueAtTime(32, STOP0); o2.frequency.linearRampToValueAtTime(17, STOP1);
    g.gain.setValueAtTime(0.034, STOP1 - 0.2); g.gain.linearRampToValueAtTime(0.008, STOP1 + 0.6); o.connect(lp); o2.connect(lp); lp.connect(g).connect(comp); o.start(0); o2.start(0); o.stop(DUR); o2.stop(DUR);
    SHOTS.slice(1).forEach(([s]) => burst(s - 0.1, [500, 5400], 0.9, 0.3, 0.1, "bandpass", comp));
    CK.forEach((tc) => { ding(tc, 988, 0.15); ding(tc + 0.08, 1480, 0.13); ding(tc + 0.16, 1976, 0.1); });
    COINS.forEach((tau) => ding(tau, 1568 + (Math.round(tau * 10) % 3) * 220, 0.05));
    NEAR.forEach((tn) => burst(tn - 0.35, [4200, 380], 1.4, 0.6, 0.12, "bandpass", comp));
    OVT.forEach((tp) => { burst(tp - 0.95, [300, 2600], 1.0, 0.45, 0.07, "bandpass", comp); tone([260, 520], tp - 0.9, 0.35, 0.05, "square", comp); });
    if (M.rain) burst(0, [4000, 6000], 0.3, DUR, 0.025, "highpass", comp);
    burst(STOP1 - 0.6, [3000, 400], 1.2, 0.9, 0.06, "highpass", comp);
    [[440, 0], [554.4, 0.07], [659.3, 0.14], [880, 0.21]].forEach(([f, d]) => tone(f, PASS_T + d, 2.6, 0.1, "triangle", comp)); tone([110, 220], PASS_T, 1.4, 0.16, "sawtooth", comp); ding(PASS_T + 0.2, 1760, 0.12); burst(PASS_T, [200, 9000], 0.6, 0.9, 0.14, "bandpass", comp);
    ding(CARD_T, 880, 0.1); ding(CARD_T + 0.1, 1320, 0.1); ding(CARD_T + 0.2, 1760, 0.08);
  }

  return {
    duration: DUR, endHold: 0, voices: {}, reverb: 0.08, bedGain: 0.6,
    async init(E) {
      E_ = E; icon = await loadImg("/icon.png").catch(() => null);
      glc = document.createElement("canvas"); glc.width = E.W; glc.height = E.H;
      R = new THREE.WebGLRenderer({ canvas: glc, antialias: false, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(E.W, E.H, false); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = M.exposure;
      scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(50, E.W / E.H, 0.1, 900);
      build(); P = createPost(R, scene, cam, E.W, E.H); P.bloom.strength = cfg.mood === "night" ? 0.42 : 0.32; const gu = P.grade.uniforms, G = M.grade; gu.shadowTint.value.set(...G.sh); gu.highTint.value.set(...G.hi); gu.sat.value = G.sat; gu.vig.value = G.vig;
    },
    draw(t, c, E) {
      update3D(t); const shot = camera(t), cutAge = shotAge(t), flash = t > 0.3 ? 0.3 * Math.exp(-cutAge * 16) : 0;
      P.render(t, { focus: shot.focus, aperture: 0.0002, fade: 0, flash, blur: 0.05 * clamp(speedAt(t) / V0) * (0.6 + 0.8 * pulse(t)), ca: 0.0016 + 0.0032 * pulse(t) * clamp(speedAt(t) / V0) + 0.006 * Math.exp(-cutAge * 9) });
      c.drawImage(glc, 0, 0); hud(t, c, E);
    },
    audio(h) { music(h); },
  };
}

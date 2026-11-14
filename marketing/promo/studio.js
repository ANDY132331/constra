import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createAvatar } from "/world.js";

// A game-show studio: glossy floor, a TV wall, neon sign, LED towers, moving spotlights, a live audience, a pile of paperwork.
const geo = new Map(); const rb = (w, h, d, r = 0.08) => { const k = [w, h, d, r].join(); if (!geo.has(k)) geo.set(k, new RoundedBoxGeometry(w, h, d, 3, r)); return geo.get(k); };
const mats = new Map(); const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o })); return mats.get(k); };
const box = (p, w, h, d, c, x = 0, y = 0, z = 0, o) => { const m = new THREE.Mesh(rb(w, h, d), typeof c === "string" ? mat(c, o) : c); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
const cTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const ease = (t) => (t = Math.min(1, Math.max(0, t)), t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;

export function createStudio(screenCanvas) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#0b0b18"); scene.fog = new THREE.Fog("#0b0b18", 50, 130);
  const hemi = new THREE.HemisphereLight("#9aa8ff", "#201830", 0.8); scene.add(hemi);
  const key = new THREE.DirectionalLight("#fff2e0", 1.6); key.position.set(-8, 26, 22); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -26, right: 26, top: 22, bottom: -14, near: 4, far: 80 }); key.shadow.bias = -0.0005; scene.add(key);
  const front = new THREE.DirectionalLight('#fff4e6', 1.7); front.position.set(2, 12, 34); scene.add(front);
  const fill = new THREE.PointLight("#ff4fa3", 300, 60, 2); fill.position.set(-14, 9, 10); scene.add(fill); const fill2 = new THREE.PointLight("#3da5ff", 300, 60, 2); fill2.position.set(14, 9, 10); scene.add(fill2);

  // floor
  const ft = cTex(512, 512, (g) => { for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) { g.fillStyle = (a + b) % 2 ? "#2a2f6e" : "#3b3f94"; g.fillRect(a * 64, b * 64, 64, 64); } g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(6, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.18, metalness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4); floor.receiveShadow = true; scene.add(floor);
  // backdrop
  const bt = cTex(1024, 512, (g) => { const gr = g.createLinearGradient(0, 0, 1024, 512); gr.addColorStop(0, "#5b2bff"); gr.addColorStop(0.55, "#c12bd9"); gr.addColorStop(1, "#ff5a6e"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); g.fillStyle = "rgba(255,255,255,.08)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(120 + i * 110, 100 + (i % 3) * 150, 60 + (i % 4) * 22, 0, 7); g.fill(); } g.fillStyle = "rgba(255,255,255,.07)"; for (let i = 0; i < 12; i++) g.fillRect(i * 90 - 30, 0, 26, 512); });
  const wallMat = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.6, emissive: "#ffffff", emissiveMap: bt, emissiveIntensity: 0.35 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(64, 28), wallMat); wall.position.set(0, 14, -9.6); scene.add(wall);
  // TV wall
  const tv = new THREE.Group(); tv.position.set(0, 8.2, -9.2); scene.add(tv);
  box(tv, 18.4, 10.6, 0.8, "#0d0f1c", 0, 0, -0.1); const tex = new THREE.CanvasTexture(screenCanvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(17.2, 9.675), new THREE.MeshBasicMaterial({ map: tex })); screen.position.z = 0.31; tv.add(screen);
  const edge = []; for (const [x, y, w, h] of [[0, 5.5, 18.8, 0.3], [0, -5.5, 18.8, 0.3], [-9.55, 0, 0.3, 11.3], [9.55, 0, 0.3, 11.3]]) edge.push(box(tv, w, h, 0.4, "#ffffff", x, y, 0.2, { emissive: "#43d9ff", emissiveIntensity: 1.6 }));
  // neon sign
  const nt = cTex(1024, 220, (g) => { g.textAlign = "center"; g.font = "900 190px Impact, Arial Black"; g.shadowColor = "#ffd400"; g.shadowBlur = 40; g.fillStyle = "#fff3a8"; g.fillText("CONSTRA", 512, 180); g.shadowBlur = 0; g.lineWidth = 6; g.strokeStyle = "#ffb800"; g.strokeText("CONSTRA", 512, 180); });
  const neonMat = new THREE.MeshBasicMaterial({ map: nt, transparent: true, opacity: 0.2, depthWrite: false }); const neon = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.8), neonMat); neon.position.set(0, 15.6, -9.0); scene.add(neon);
  // LED towers
  const leds = []; for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) leds.push({ m: box(scene, 1.0, 0.8, 0.6, "#ffffff", sx * 12.4, 1 + i * 1.0, -8.6, { emissive: ["#ff3d9a", "#43d9ff", "#ffd400"][i % 3], emissiveIntensity: 1 }), i });
  // truss and moving beams
  box(scene, 54, 0.5, 0.5, "#2a2d3a", 0, 21, 4); box(scene, 54, 0.5, 0.5, "#2a2d3a", 0, 21, 12);
  const beams = []; for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 22, 24, 1, true), new THREE.MeshBasicMaterial({ color: ["#ff6ad5", "#6ad4ff", "#ffe36a"][i % 3], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); const g = new THREE.Group(); g.position.set(-20 + i * 8, 21, i % 2 ? 4 : 12); c.position.y = -11; g.add(c); scene.add(g); beams.push({ g, c, ph: i * 1.3 }); }
  // low stage lip
  box(scene, 40, 0.3, 1, "#ffffff", 0, 0.15, 14, { emissive: "#ff3d9a", emissiveIntensity: 1.2 });

  // audience on bleachers, either side
  const audience = [];
  const pal = [["#e74c3c", "#2c3e50"], ["#3498db", "#34495e"], ["#2ecc71", "#2c3e50"], ["#f1c40f", "#5b3a29"], ["#9b59b6", "#2c3e50"], ["#e67e22", "#34495e"], ["#1abc9c", "#3b3b3b"], ["#ecf0f1", "#2c3e50"]];
  const skins = ["#f3c9a5", "#e8b98a", "#c98f63", "#a56f4a", "#8d5a3b", "#efc19a"], hairs = ["#2a1b12", "#6b3b1e", "#d9b25a", "#111", "#8a4b2a"];
  for (const side of [-1, 1]) { for (let r = 0; r < 2; r++) { box(scene, 3.2, 0.9 + r * 0.9, 14, "#2b2f45", side * (14.2 + r * 2.8), (0.9 + r * 0.9) / 2, 4.5);
    for (let c = 0; c < 4; c++) { const [shirt, pants] = pal[(r * 4 + c + (side > 0 ? 3 : 0)) % pal.length]; const a = createAvatar({ name: "", skin: skins[(r + c * 2 + (side > 0 ? 1 : 0)) % skins.length], shirt, vest: shirt, pants, hat: "#fff", noHat: true, hairTop: true, hairColor: hairs[(r * 3 + c) % hairs.length], brows: c % 2 === 0, lashes: (c + r) % 3 === 0 });
      a.root.scale.setScalar(0.9); a.root.position.set(side * (14.2 + r * 2.8), 0.9 + r * 0.9 + 0.5, -0.5 + c * 3.4 + r * 0.8); scene.add(a.root); audience.push({ a, side, r, c, base: [a.root.position.x, a.root.position.y, a.root.position.z] }); } } }

  // paperwork pile
  const PN = 190, papers = new THREE.InstancedMesh(rb(0.95, 0.05, 1.25, 0.02), new THREE.MeshStandardMaterial({ roughness: 0.9 }), PN); const col = new THREE.Color();
  const pd = Array.from({ length: PN }, (_, i) => { const a = rnd() * 6.283, r = 0.5 + rnd() * 2.4, h = Math.max(0.1, 3.6 * (1 - r / 3.1) * (0.5 + rnd() * 0.7)); papers.setColorAt(i, col.set(["#ffffff", "#f3f0e4", "#fff7c2", "#e9f2ff", "#ffe3e3"][i % 5])); return { a, r, h, ry: rnd() * 6, rx: (rnd() - 0.5) * 0.5, delay: rnd() * 0.9, v: [(rnd() - 0.5) * 16, 10 + rnd() * 12, (rnd() - 0.2) * 14], w: [rnd() * 8, rnd() * 8, rnd() * 8] }; });
  papers.frustumCulled = false; papers.castShadow = true; scene.add(papers);
  const PILE = [-8, 5];
  // confetti
  const CN = 420, conf = new THREE.InstancedMesh(rb(0.32, 0.2, 0.48, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.4 }), CN); const cp = ["#F5C400", "#ff5a36", "#3aa6ff", "#46c768", "#ffffff", "#c05bff"].map((c) => new THREE.Color(c));
  const cs = Array.from({ length: CN }, () => ({ v: [(rnd() - 0.5) * 14, 8 + rnd() * 10, (rnd() - 0.1) * 8], r: [rnd() * 6, rnd() * 6, rnd() * 6], w: [(rnd() - 0.5) * 9, (rnd() - 0.5) * 9, (rnd() - 0.5) * 9] })); for (let i = 0; i < CN; i++) conf.setColorAt(i, cp[i % cp.length]); conf.frustumCulled = false; scene.add(conf);
  const bursts = [{ t0: 1e9, o: [0, 6, 7], a: 0, b: 210 }, { t0: 1e9, o: [0, 6, 7], a: 210, b: 420 }];

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();
  const api = {
    scene, tex, audience, pile: PILE, hemi, key,
    burst(i, t0, o) { bursts[i].t0 = t0; bursts[i].o = o; },
    update(t, st) {
      // st: { mood 0..1, fall0, burst0 }
      const mood = st.mood;
      hemi.intensity = lerp(0.8, 1.0, mood); front.intensity = lerp(1.5, 1.8, mood); fill.intensity = lerp(0, 300, mood); fill2.intensity = lerp(0, 300, mood); key.intensity = lerp(1.0, 1.7, mood);
      wallMat.color.setRGB(lerp(0.35, 1, mood), lerp(0.35, 1, mood), lerp(0.33, 1, mood)); wallMat.emissiveIntensity = lerp(0.05, 0.4, mood);
      neonMat.opacity = lerp(0.12, 1, mood) * (mood < 1 ? (0.6 + 0.4 * Math.sin(t * 40)) : 1);
      edge.forEach((m) => { m.material.emissiveIntensity = lerp(0.3, 1.8, mood); });
      leds.forEach(({ m, i }) => { m.material.emissiveIntensity = lerp(0.05, 1.2, mood) * (0.55 + 0.45 * Math.sin(t * 4 + i * 0.6)); });
      beams.forEach(({ g, c, ph }) => { g.rotation.z = Math.sin(t * 0.9 + ph) * 0.55; g.rotation.x = Math.cos(t * 0.7 + ph) * 0.3; c.material.opacity = 0.11 * mood; });
      // audience: slumped and asleep before the reveal, on their feet after
      audience.forEach(({ a, base, side, r, c }, i) => { const cheer = ease((t - (st.burst0 + 0.15 + i * 0.03)) / 0.3) * mood, bob = Math.abs(Math.sin(t * 6 + i)) * 0.55 * cheer;
        const clap = Math.sin(t * 11 + i) * 0.5 * cheer; a.set({ x: base[0], y: base[1] + bob, z: base[2], ry: side > 0 ? -Math.PI / 2 + 0.25 : Math.PI / 2 - 0.25, armL: [-2.6 * cheer + clap * 0.3, -0.5 * cheer], armR: [-2.6 * cheer - clap * 0.3, 0.5 * cheer], hp: (1 - mood) * 0.5, lean: (1 - mood) * 0.12, tag: false }); a.setFace(mood < 0.5 ? "blink" : (i % 3 === 0 ? "talk1" : "cheer")); });
      // paperwork: falls in, sits, then bursts when the product arrives
      for (let i = 0; i < PN; i++) { const d = pd[i], x0 = PILE[0] + Math.cos(d.a) * d.r, z0 = PILE[1] + Math.sin(d.a) * d.r; let y = d.h, x = x0, z = z0, sc = 1; const fk = Math.min(1, Math.max(0, (t - st.fall0 - d.delay) / 0.8));
        if (t < st.fall0) { M.makeScale(0, 0, 0); papers.setMatrixAt(i, M); continue; }
        y = lerp(d.h + 18, d.h, fk * fk);
        const tb = t - st.burst0 - d.delay * 0.2; if (tb > 0) { x += d.v[0] * tb; z += d.v[2] * tb; y = d.h + d.v[1] * tb - 9.8 * tb * tb * 0.5; sc = tb > 1.6 ? Math.max(0, 1 - (tb - 1.6) / 0.5) : 1; if (y < 0.05) y = 0.05; }
        E.set(d.rx + (tb > 0 ? d.w[0] * tb : 0), d.ry + (tb > 0 ? d.w[1] * tb : 0), (tb > 0 ? d.w[2] * tb : 0)); Q.setFromEuler(E); P.set(x, y, z); S.set(sc, sc, sc); M.compose(P, Q, S); papers.setMatrixAt(i, M); }
      papers.instanceMatrix.needsUpdate = true;
      for (const bu of bursts) { const k = t - bu.t0; for (let i = bu.a; i < bu.b; i++) { const s = cs[i]; if (k < 0 || k > 3.6) { M.makeScale(0, 0, 0); conf.setMatrixAt(i, M); continue; } P.set(bu.o[0] + s.v[0] * k, Math.max(0.12, bu.o[1] + s.v[1] * k - 9.8 * k * k * 0.5), bu.o[2] + s.v[2] * k); E.set(s.r[0] + s.w[0] * k, s.r[1] + s.w[1] * k, s.r[2] + s.w[2] * k); Q.setFromEuler(E); const sc = k > 3 ? 1 - (k - 3) / 0.6 : 1; S.set(sc, sc, sc); M.compose(P, Q, S); conf.setMatrixAt(i, M); } }
      conf.instanceMatrix.needsUpdate = true; tex.needsUpdate = true;
    },
  };
  return api;
}

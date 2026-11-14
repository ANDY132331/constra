import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A blocky, studded, Roblox-style job site and three plastic-looking builders. Everything is built from code.
const geoCache = new Map(), matCache = new Map();
const rb = (w, h, d, r) => { r = r ?? Math.min(0.1, w / 3, h / 3, d / 3); const k = [w, h, d, r].join(); if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 3, r)); return geoCache.get(k); };
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0, ...o })); return matCache.get(k); };
function box(parent, w, h, d, c, x = 0, y = 0, z = 0, o) {
  const m = new THREE.Mesh(rb(w, h, d), typeof c === "string" || typeof c === "number" ? mat(c, o) : c);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const studGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.14, 12);
function studs(parent, w, d, y, color, x = 0, z = 0) {
  const nx = Math.max(1, Math.round(w)), nz = Math.max(1, Math.round(d)), im = new THREE.InstancedMesh(studGeo, mat(color), nx * nz), M = new THREE.Matrix4();
  let i = 0; for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { M.setPosition(x - w / 2 + (a + 0.5) * (w / nx), y + 0.07, z - d / 2 + (b + 0.5) * (d / nz)); im.setMatrixAt(i++, M); }
  im.castShadow = true; parent.add(im); return im;
}
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// ── faces: the simple Roblox decal, in a few states ────────────────────────────────────────────
function faceTex(state, o = {}) {
  return canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256); g.fillStyle = "#1b1b1b"; g.strokeStyle = "#1b1b1b"; g.lineCap = "round"; g.lineJoin = "round";
    const eye = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x + rx * 0.3, y - ry * 0.35, rx * 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1b1b1b"; };
    const eyes = (rx = 13, ry = 24) => { eye(88, 104, rx, ry); eye(168, 104, rx, ry); };
    const closed = () => { g.lineWidth = 9; for (const x of [88, 168]) { g.beginPath(); g.moveTo(x - 17, 108); g.quadraticCurveTo(x, 118, x + 17, 108); g.stroke(); } };
    const happyEyes = () => { g.lineWidth = 10; for (const x of [88, 168]) { g.beginPath(); g.moveTo(x - 18, 114); g.quadraticCurveTo(x, 84, x + 18, 114); g.stroke(); } };
    if (state === "blink") closed(); else if (state === "cheer") happyEyes(); else if (state === "oops") eyes(15, 28); else eyes();
    if (o.brows) { g.lineWidth = 9; for (const [x, s] of [[88, 1], [168, -1]]) { g.beginPath(); g.moveTo(x - 20, 68 + (state === "oops" ? -4 : 0)); g.lineTo(x + 20, 62 + (state === "oops" ? -8 : 0) + (s > 0 ? 0 : 0)); g.stroke(); } }
    if (o.glasses) { g.strokeStyle = 'rgba(120,200,255,.95)'; g.lineWidth = 7; for (const x of [88, 168]) { g.beginPath(); g.roundRect(x - 30, 70, 60, 64, 16); g.stroke(); } g.beginPath(); g.moveTo(118, 96); g.lineTo(138, 96); g.stroke(); g.strokeStyle = '#1b1b1b'; }
    if (o.lashes) { g.lineWidth = 6; for (const x of [88, 168]) for (const k of [-1, 1]) { g.beginPath(); g.moveTo(x + k * 14, 86); g.lineTo(x + k * 26, 76); g.stroke(); } }
    const mouthOpen = (rx, ry, tongue = true) => { g.beginPath(); g.ellipse(128, 176, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = "#3a0b10"; g.fill(); if (tongue) { g.save(); g.clip(); g.fillStyle = "#e0707f"; g.beginPath(); g.ellipse(128, 176 + ry * 0.7, rx * 0.7, ry * 0.5, 0, 0, Math.PI * 2); g.fill(); g.restore(); } g.fillStyle = "#1b1b1b"; };
    if (state === "talk1") mouthOpen(34, 20);
    else if (state === "talk2") mouthOpen(22, 30);
    else if (state === "talk3") { g.lineWidth = 9; g.beginPath(); g.moveTo(96, 170); g.quadraticCurveTo(128, 196, 160, 170); g.stroke(); }
    else if (state === "cheer") { g.beginPath(); g.moveTo(84, 160); g.quadraticCurveTo(128, 160, 172, 160); g.quadraticCurveTo(168, 218, 128, 218); g.quadraticCurveTo(88, 218, 84, 160); g.fillStyle = "#3a0b10"; g.fill(); g.save(); g.clip(); g.fillStyle = "#e0707f"; g.beginPath(); g.ellipse(128, 214, 30, 16, 0, 0, Math.PI * 2); g.fill(); g.restore(); g.fillStyle = "#fff"; g.fillRect(90, 160, 76, 12); }
    else if (state === "oops") { g.lineWidth = 8; g.beginPath(); g.moveTo(94, 184); for (let i = 0; i < 4; i++) g.quadraticCurveTo(94 + i * 18 + 9, i % 2 ? 176 : 192, 94 + (i + 1) * 18, 184); g.stroke(); g.fillStyle = "#7cc6ff"; g.beginPath(); g.moveTo(206, 70); g.quadraticCurveTo(222, 100, 206, 112); g.quadraticCurveTo(190, 100, 206, 70); g.fill(); g.fillStyle = "#1b1b1b"; }
    else { g.lineWidth = 10; g.beginPath(); g.moveTo(88, 168); g.quadraticCurveTo(128, 206, 168, 168); g.stroke(); }
    if (o.stache) { g.fillStyle = o.hair || "#3a2519"; g.beginPath(); g.moveTo(128, 152); g.quadraticCurveTo(94, 134, 70, 156); g.quadraticCurveTo(100, 168, 128, 160); g.quadraticCurveTo(156, 168, 186, 156); g.quadraticCurveTo(162, 134, 128, 152); g.fill(); }
  });
}
const torsoTex = (shirt, vest, label) => canvasTex(256, 256, (g) => {
  g.fillStyle = shirt; g.fillRect(0, 0, 256, 256);
  g.fillStyle = vest; g.fillRect(34, 0, 188, 256); g.fillStyle = shirt; g.beginPath(); g.moveTo(98, 0); g.lineTo(128, 52); g.lineTo(158, 0); g.fill();
  g.fillStyle = "#e9ecef"; g.fillRect(52, 0, 26, 256); g.fillRect(178, 0, 26, 256); g.fillRect(34, 176, 188, 20);
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(127, 52, 2, 204);
  g.fillStyle = "#F5C400"; g.fillRect(96, 88, 34, 34); g.fillStyle = "#141414"; g.font = "900 30px Arial"; g.textAlign = "center"; g.fillText("C", 113, 115);
});
const hatSticker = canvasTex(64, 64, (g) => { g.fillStyle = "#141414"; g.beginPath(); g.roundRect(6, 6, 52, 52, 10); g.fill(); g.fillStyle = "#F5C400"; g.font = "900 44px Arial"; g.textAlign = "center"; g.fillText("C", 32, 46); });

const nameTag = (name, color) => { const t = canvasTex(256, 96, (g) => { g.font = "800 54px Arial"; g.textAlign = "center"; const w = g.measureText(name).width + 44; g.fillStyle = "rgba(20,20,24,.72)"; g.beginPath(); g.roundRect(128 - w / 2, 14, w, 68, 20); g.fill(); g.fillStyle = color; g.fillText(name, 128, 66); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(2.6, 0.975, 1); s.renderOrder = 10; return s; };

export function createAvatar(o) {
  const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot);
  const blobTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.06; root.add(blob);
  const skin = o.skin, faces = {};
  const fo = { stache: o.stache, lashes: o.lashes, brows: o.brows, hair: o.hairColor, glasses: o.glasses };
  for (const s of ["smile", "talk1", "talk2", "talk3", "blink", "cheer", "oops"]) faces[s] = faceTex(s, fo);
  // legs
  const mk = (x) => { const g = new THREE.Group(); g.position.set(x, 2, 0); pivot.add(g); box(g, 0.98, 1.6, 0.98, o.pants, 0, -0.8, 0); box(g, 1.02, 0.45, 1.12, "#3b2a20", 0, -1.78, 0.05); return g; };
  const legL = mk(-0.5), legR = mk(0.5);
  // torso
  const tt = torsoTex(o.shirt, o.vest, o.name); const torso = box(pivot, 2, 2, 1, new THREE.MeshStandardMaterial({ map: tt, roughness: 0.55 }), 0, 3, 0);
  // arms: sleeve + hand
  const arm = (x) => { const g = new THREE.Group(); g.position.set(x, 3.9, 0); pivot.add(g); box(g, 0.98, 1.2, 0.98, o.shirt, 0, -0.6, 0); box(g, 0.94, 0.85, 0.94, o.glove || skin, 0, -1.55, 0); return g; };
  const armL = arm(-1.5), armR = arm(1.5);
  // tool belt, pouches and a hammer
  box(pivot, 2.08, 0.34, 1.1, '#5a3b22', 0, 2.12, 0); box(pivot, 0.5, 0.5, 0.28, '#7a5230', 0.55, 1.95, 0.62); box(pivot, 0.5, 0.5, 0.28, '#7a5230', -0.2, 1.95, 0.62); const ham = new THREE.Group(); ham.position.set(-0.95, 1.9, 0.62); pivot.add(ham); box(ham, 0.12, 0.8, 0.12, '#b47a45', 0, -0.2, 0); box(ham, 0.5, 0.2, 0.2, '#8d949b', 0, 0.22, 0);
  // head
  const head = new THREE.Group(); head.position.set(0, 4.05, 0); pivot.add(head);
  box(head, 1.2, 1.2, 1.2, skin, 0, 0.6, 0, { roughness: 0.45 }).geometry = rb(1.2, 1.2, 1.2, 0.34);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.18), new THREE.MeshBasicMaterial({ map: faces.smile, transparent: true, depthWrite: false })); face.position.set(0, 0.6, 0.605); head.add(face);
  // hard hat
  const hat = new THREE.Group(); hat.position.set(0, 1.05, 0); head.add(hat);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.74, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(o.hat, { roughness: 0.35 })); dome.scale.set(1, 0.78, 1.04); dome.castShadow = true; hat.add(dome);
  box(hat, 1.5, 0.1, 1.5, o.hat, 0, 0.02, 0.05, { roughness: 0.35 }).geometry = rb(1.5, 0.1, 1.5, 0.05);
  box(hat, 1.0, 0.12, 0.8, o.hat, 0, 0.0, 0.85, { roughness: 0.35 });
  box(hat, 0.22, 0.14, 1.2, o.hat, 0, 0.56, 0, { roughness: 0.35 });
  const st = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: hatSticker, transparent: true })); st.position.set(0, 0.24, 0.755); st.rotation.x = -0.25; hat.add(st);
  // hair
  if (o.ponytail) { box(head, 0.4, 0.95, 0.42, o.hairColor, 0, 0.5, -0.78); box(head, 0.14, 0.7, 0.9, o.hairColor, 0.64, 0.55, -0.1); box(head, 0.14, 0.7, 0.9, o.hairColor, -0.64, 0.55, -0.1); }
  if (o.beard) box(head, 0.9, 0.3, 0.14, o.hairColor, 0, 0.12, 0.6);
  // phone, held in the right hand when asked
  const phone = new THREE.Group(); phone.visible = false; phone.position.set(0.05, -1.95, 0.3); phone.rotation.x = Math.PI / 2 - 0.1; armR.add(phone);
  box(phone, 0.62, 1.0, 0.09, "#101114", 0, 0, 0, { roughness: 0.3 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.88), new THREE.MeshBasicMaterial({ color: "#F5C400" })); scr.position.z = 0.051; phone.add(scr);
  // snack bag (Dev's lunch run)
  const bag = new THREE.Group(); bag.visible = false; bag.position.set(0, -1.95, 0.4); armL.add(bag); box(bag, 0.7, 0.8, 0.45, "#c9a15e"); box(bag, 0.72, 0.14, 0.47, "#c0392b", 0, 0.42, 0);
  // clipboard in the left hand
  const clip = new THREE.Group(); clip.visible = false; clip.position.set(0.05, -1.95, 0.4); clip.rotation.x = Math.PI / 2 - 0.35; armL.add(clip); box(clip, 0.72, 0.98, 0.06, '#b98a52'); box(clip, 0.6, 0.84, 0.04, '#ffffff', 0, -0.02, 0.05); box(clip, 0.28, 0.12, 0.08, '#8d949b', 0, 0.45, 0.07); for (let i = 0; i < 4; i++) box(clip, 0.46, 0.04, 0.03, '#9aa3ad', 0, 0.22 - i * 0.18, 0.08);
  const tag = nameTag(o.name, o.tagColor || "#fff"); tag.position.set(0, 6.9, 0); root.add(tag);
  const api = {
    root, head, phone, scr, bag, clip, faces, face,
    setFace(s) { if (face.material.map !== faces[s]) { face.material.map = faces[s]; face.material.needsUpdate = true; } },
    set(s) {
      root.position.set(s.x ?? 0, s.y ?? 0, s.z ?? 0); root.rotation.y = s.ry ?? 0;
      const ph = s.ph ?? 0, am = s.amt ?? 0, sw = Math.sin(ph) * 0.95 * am;
      legL.rotation.x = s.sit ? -1.45 : sw; legR.rotation.x = s.sit ? -1.45 : -sw; blob.visible = !s.sit;
      pivot.position.y = Math.abs(Math.cos(ph)) * 0.18 * am + (s.hop ?? 0); pivot.rotation.x = (s.lean ?? 0); pivot.rotation.z = (s.sway ?? 0);
      const gl = s.armL ?? [0, 0], gr = s.armR ?? [0, 0];
      armL.rotation.x = -sw * 0.9 + gl[0]; armL.rotation.z = gl[1] + 0.04; armR.rotation.x = sw * 0.9 + gr[0]; armR.rotation.z = gr[1] - 0.04;
      head.rotation.y = s.hy ?? 0; head.rotation.x = s.hp ?? 0; head.rotation.z = s.hr ?? 0;
      tag.visible = s.tag !== false;
    },
  };
  return api;
}

export function createDog() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const fur = '#b9772f', dark = '#7a4a1c';
  box(body, 0.9, 0.9, 1.9, fur, 0, 1.2, 0); box(body, 0.7, 0.7, 0.8, '#f1dcc0', 0, 1.05, 0.3);
  const head = new THREE.Group(); head.position.set(0, 1.85, 1.0); body.add(head); box(head, 0.85, 0.8, 0.85, fur); box(head, 0.5, 0.35, 0.5, '#f1dcc0', 0, -0.15, 0.55); box(head, 0.2, 0.15, 0.1, '#111', 0, -0.02, 0.82); box(head, 0.2, 0.45, 0.2, dark, 0.5, 0.2, -0.05); box(head, 0.2, 0.45, 0.2, dark, -0.5, 0.2, -0.05);
  for (const x of [-0.2, 0.2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat('#111')); e.position.set(x, 0.12, 0.43); head.add(e); }
  const tail = new THREE.Group(); tail.position.set(0, 1.5, -0.95); body.add(tail); box(tail, 0.2, 0.2, 0.9, fur, 0, 0.1, -0.35).rotation.x = 0.5;
  const legs = [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0.9, z); body.add(g); box(g, 0.3, 0.9, 0.3, dark, 0, -0.45, 0); return g; });
  return { root, set(s) { root.position.set(s.x ?? 0, 0, s.z ?? 0); root.rotation.y = s.ry ?? 0; const ph = s.ph ?? 0, am = s.amt ?? 0;
    legs.forEach((g, i) => { g.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.8 : 0)) * 0.9 * am; });
    body.rotation.x = s.sit ? -0.5 : 0; body.position.y = s.sit ? -0.55 : Math.abs(Math.sin(ph)) * 0.12 * am; head.rotation.x = s.sit ? 0.5 : 0; head.rotation.z = s.sit ? 0.25 * Math.sin(s.t * 2) : 0;
    tail.rotation.y = Math.sin((s.t ?? 0) * 14) * 0.7; } };
}

// ── the world ───────────────────────────────────────────────────────────────────────────────────
const lerp3 = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
export function createWorld(W, H) {
  const scene = new THREE.Scene();
  const sky = canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3d8fe6"); gr.addColorStop(0.55, "#8cc8f5"); gr.addColorStop(0.9, "#dff1fb"); gr.addColorStop(1, "#f6f1dd"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  scene.background = sky; scene.fog = new THREE.Fog("#cfe8f7", 70, 190);
  scene.add(new THREE.HemisphereLight("#d8ecff", "#7a8f55", 1.15));
  const sun = new THREE.DirectionalLight("#fff2d6", 2.6); sun.position.set(-26, 38, 24); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 5, far: 120 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; scene.add(sun);

  // baseplate with studs
  const grass = canvasTex(256, 256, (g) => { g.fillStyle = "#5cab3f"; g.fillRect(0, 0, 256, 256); for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) { const x = a * 64 + 32, y = b * 64 + 32; g.fillStyle = "rgba(0,0,0,.14)"; g.beginPath(); g.arc(x + 3, y + 4, 21, 0, 7); g.fill(); g.fillStyle = "#6dc04c"; g.beginPath(); g.arc(x, y, 21, 0, 7); g.fill(); g.fillStyle = "#7fd05c"; g.beginPath(); g.arc(x - 3, y - 4, 14, 0, 7); g.fill(); } });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(70, 70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.8 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const site = new THREE.Group(); scene.add(site);
  // dirt pad and slab
  const pad = box(site, 46, 0.2, 34, "#b8956a", 3, 0.0, -2); studs(site, 46, 34, 0.1, "#c4a176", 3, -2);
  const slab = box(site, 18, 0.7, 13, "#b9bcc1", 0, 0.2, -10, { roughness: 0.7 }); studs(site, 18, 13, 0.55, "#c7cacf", 0, -10);
  // timber frame
  const wood = "#d9a45f", wood2 = "#c4894a";
  const fx0 = -8, fx1 = 8, fz0 = -15.5, fz1 = -4.5, fh = 8.5;
  for (let x = fx0; x <= fx1 + 0.01; x += 2.67) for (const z of [fz0, fz1]) box(site, 0.55, fh, 0.55, wood, x, 0.55 + fh / 2, z);
  for (let z = fz0 + 3.66; z < fz1 - 0.1; z += 3.66) for (const x of [fx0, fx1]) box(site, 0.55, fh, 0.55, wood, x, 0.55 + fh / 2, z);
  for (const y of [0.6, fh + 0.4]) { for (const z of [fz0, fz1]) box(site, fx1 - fx0 + 0.55, 0.5, 0.55, wood2, 0, y + 0.3, z); for (const x of [fx0, fx1]) box(site, 0.55, 0.5, fz1 - fz0, wood2, x, y + 0.3, (fz0 + fz1) / 2); }
  box(site, fx1 - fx0, 0.5, 0.55, wood2, 0, 4.8, fz1); // mid rail on the front wall
  for (const [x0, x1] of [[fx0, fx0 + 5.34], [fx1 - 5.34, fx1]]) { const L = Math.hypot(x1 - x0, 4.2); const b = box(site, 0.35, L, 0.35, wood2, (x0 + x1) / 2, 2.9, fz1 + 0.02); b.rotation.z = Math.atan2(x1 - x0, 4.2) * (x0 < 0 ? -1 : 1) * -1; }
  // sheathing panels on two sides, and floor joists
  for (let i = 0; i < 3; i++) box(site, 2.5, 4.2, 0.12, "#e8c58c", fx0 + 1.4 + i * 2.67, 3.0, fz0 + 0.06);
  for (let z = fz0 + 0.8; z < fz1; z += 1.3) box(site, fx1 - fx0, 0.3, 0.3, wood2, 0, 0.78, z);
  // roof trusses on the back half
  for (let x = fx0; x <= fx1 + 0.01; x += 2.67) { for (const s of [-1, 1]) { const b = box(site, 0.3, 6.4, 0.3, wood2, x * 1 + 0, fh + 3.1, (fz0 + fz1) / 2 + s * 2.6); b.rotation.x = s * 0.62; } }
  // crane
  const crane = new THREE.Group(); crane.position.set(-16, 0, -12); scene.add(crane);
  box(crane, 4, 1, 4, "#4b4f55", 0, 0.5, 0);
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) box(crane, 0.28, 22, 0.28, "#F5C400", x, 12, z);
  for (let y = 2; y < 22; y += 2.5) { box(crane, 1.9, 0.18, 0.18, "#F5C400", 0, y, -0.8); box(crane, 1.9, 0.18, 0.18, "#F5C400", 0, y, 0.8); box(crane, 0.18, 0.18, 1.9, "#F5C400", -0.8, y, 0); box(crane, 0.18, 0.18, 1.9, "#F5C400", 0.8, y, 0); }
  const jib = new THREE.Group(); jib.position.set(0, 23.2, 0); crane.add(jib);
  box(jib, 26, 0.6, 0.9, "#F5C400", 8, 0, 0); box(jib, 1.8, 1.8, 1.8, "#9aa0a6", -4.3, 0, 0); box(jib, 3, 1.2, 1.8, "#4b4f55", -5.5, -0.3, 0); box(jib, 3, 2.4, 2.4, "#F5C400", -1, -1.4, 0);
  const hook = new THREE.Group(); hook.position.set(14, 0, 0); jib.add(hook); box(hook, 0.12, 8, 0.12, "#2a2d31", 0, -4, 0); box(hook, 5, 0.5, 1.2, "#d9a45f", 0, -8.2, 0); box(hook, 5, 0.5, 1.2, "#c4894a", 0, -8.75, 0);
  // yard: lumber, mixer, dumpster, trailer, cones, barriers, sign
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) box(site, 7, 0.45, 0.9, j % 2 ? wood : wood2, 15, 0.45 + j * 0.5, -3 + i * 1.0 - (j * 0.05));
  box(site, 7.4, 0.2, 5, "#7c6a55", 15, 0.1, -1.4); box(site, 0.3, 1.8, 0.3, "#7c6a55", 11.6, 0.9, -3.4);
  const mixer = new THREE.Group(); mixer.position.set(-19, 0, 4); scene.add(mixer);
  box(mixer, 3.4, 0.5, 2.2, "#4b4f55", 0, 0.5, 0); const drum = new THREE.Group(); drum.position.set(0, 2.1, 0); drum.rotation.z = 0.5; mixer.add(drum); const dm = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.0, 2.2, 24), mat("#F5C400")); dm.castShadow = true; drum.add(dm); for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1 - i * 0.02, 0.07, 6, 24), mat("#2a2d31")); r.rotation.x = Math.PI / 2; r.position.y = -0.7 + i * 0.7; drum.add(r); }
  const dump = new THREE.Group(); dump.position.set(-21, 0, -3); scene.add(dump); box(dump, 6, 2.2, 3, "#2d7d6b", 0, 1.3, 0); box(dump, 5.4, 0.2, 2.4, "#1c4f44", 0, 2.45, 0); for (const x of [-2.2, 2.2]) box(dump, 0.4, 0.4, 3.2, "#1d1f22", x, 0.2, 0);
  const trailer = new THREE.Group(); trailer.position.set(-18, 0, 17); trailer.rotation.y = 0.5; scene.add(trailer); box(trailer, 9, 3.6, 4, "#f2f2f0", 0, 1.9, 0); box(trailer, 9.2, 0.35, 4.2, "#F5C400", 0, 3.7, 0); box(trailer, 1.6, 2.6, 0.2, "#5b6772", 2.4, 1.4, 2.05); box(trailer, 1.8, 1.1, 0.2, "#9cd3ee", -1.4, 2.2, 2.05); box(trailer, 1.8, 1.1, 0.2, "#9cd3ee", -3.4, 2.2, 2.05);
  const sign = new THREE.Group(); sign.position.set(-20, 0, 9); sign.rotation.y = 0.5; scene.add(sign);
  box(sign, 0.3, 4, 0.3, "#555", -2.6, 2, 0); box(sign, 0.3, 4, 0.3, "#555", 2.6, 2, 0);
  const signTex = canvasTex(512, 256, (g) => { g.fillStyle = "#F5C400"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#141414"; for (let i = -2; i < 14; i++) { g.beginPath(); g.moveTo(i * 44, 0); g.lineTo(i * 44 + 22, 0); g.lineTo(i * 44 + 66, 22); g.lineTo(i * 44 + 44, 22); g.fill(); } g.fillRect(0, 22, 512, 6); g.textAlign = "center"; g.font = "900 78px Arial"; g.fillText("CONSTRA", 256, 112); g.font = "800 34px Arial"; g.fillText("FRAMING CREW AT WORK", 256, 168); g.font = "700 30px Arial"; g.fillText("HARD HATS REQUIRED", 256, 220); });
  const board = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.2, 0.2), [mat("#555"), mat("#555"), mat("#555"), mat("#555"), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 }), mat("#555")]); board.position.set(0, 3, 0.1); board.castShadow = true; sign.add(board);
  for (const [x, z] of [[-9, 8], [-7.5, 9], [10, 10], [11.5, 8.5], [4, 14], [-20, 10], [21, -4]]) { const c = new THREE.Group(); c.position.set(x, 0, z); scene.add(c); box(c, 1, 0.2, 1, "#e45a1c", 0, 0.1, 0); box(c, 0.6, 1, 0.6, "#ff7a1c", 0, 0.7, 0); box(c, 0.64, 0.22, 0.64, "#fff", 0, 0.78, 0); }
  for (let i = 0; i < 4; i++) { const b = new THREE.Group(); b.position.set((i < 2 ? -27 + i * 3.4 : 13 + (i - 2) * 3.4), 0, 17); scene.add(b); box(b, 2.8, 0.25, 0.25, "#fff", 0, 1.0, 0); box(b, 2.8, 0.25, 0.25, "#e45a1c", 0, 1.5, 0); box(b, 0.2, 1.8, 0.2, "#555", -1.3, 0.9, 0); box(b, 0.2, 1.8, 0.2, "#555", 1.3, 0.9, 0); }
  // food truck (Dev's lunch run)
  const truck = new THREE.Group(); truck.position.set(25, 0, 9); truck.rotation.y = -0.55; scene.add(truck);
  box(truck, 8, 4.2, 4.2, "#f7f1e1", 0, 2.7, 0); box(truck, 3, 3, 4.1, "#d94a38", 5.2, 1.9, 0); box(truck, 0.5, 1.2, 3.4, "#9cd3ee", 6.5, 2.6, 0); box(truck, 4.4, 1.6, 0.2, "#7a1f1a", -0.4, 3.35, 2.15);
  box(truck, 8.4, 0.3, 1.8, "#d94a38", 0, 4.9, 2.4).rotation.x = 0.35; box(truck, 4.6, 1.5, 0.2, "#9cd3ee", -0.4, 3.3, 2.12);
  for (const x of [-2.4, 2.4, 5.4]) for (const z of [-2.1, 2.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 18), mat("#222")); w.rotation.x = Math.PI / 2; w.position.set(x, 0.85, z); w.castShadow = true; truck.add(w); }
  const tacoTex = canvasTex(512, 128, (g) => { g.fillStyle = "#F5C400"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#7a1f1a"; g.font = "900 82px Arial"; g.textAlign = "center"; g.fillText("TACOS", 256, 98); });
  const tb = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: tacoTex })); tb.position.set(-0.4, 5.4, 2.25); tb.rotation.x = -0.1; truck.add(tb);
  // excavator digging at the back left
  const exc = new THREE.Group(); exc.position.set(-26, 0, -9); exc.rotation.y = 0.9; scene.add(exc);
  box(exc, 1.6, 1.1, 5.4, '#2a2d31', -1.5, 0.55, 0); box(exc, 1.6, 1.1, 5.4, '#2a2d31', 1.5, 0.55, 0);
  const upper = new THREE.Group(); upper.position.set(0, 1.2, 0); exc.add(upper); box(upper, 3.8, 1.5, 4, '#F5C400', 0, 0.75, 0); box(upper, 3, 0.5, 1.6, '#4b4f55', 0, 0.3, -2.2); box(upper, 1.9, 2.0, 1.9, '#9cd3ee', -0.9, 2.2, 0.6, { roughness: 0.15 }); box(upper, 2.1, 0.2, 2.1, '#F5C400', -0.9, 3.3, 0.6);
  const boom = new THREE.Group(); boom.position.set(0.9, 1.0, 1.8); upper.add(boom); const bm = box(boom, 0.7, 0.7, 5.2, '#F5C400', 0, 1.0, 2.2); bm.rotation.x = -0.45;
  const stick = new THREE.Group(); stick.position.set(0, 3.0, 4.5); boom.add(stick); box(stick, 0.55, 0.55, 3.6, '#e0b200', 0, -0.6, 1.5).rotation.x = 0.6;
  const bucket = new THREE.Group(); bucket.position.set(0, -2.1, 3.1); stick.add(bucket); box(bucket, 1.5, 1.0, 1.1, '#4b4f55', 0, -0.3, 0.2);
  for (let i = 0; i < 6; i++) box(scene, 3 - i * 0.35, 0.6, 3 - i * 0.35, i % 2 ? '#8a6a45' : '#7a5a38', -31.5 + Math.sin(i) * 0.4, 0.3 + i * 0.5, -3.5);
  // a road behind the site, with traffic
  box(scene, 300, 0.12, 7.5, '#3a3f46', 0, 0.02, -30, { roughness: 0.9 }); for (let x = -140; x < 140; x += 8) box(scene, 3.4, 0.04, 0.3, '#f4e9a8', x, 0.1, -30, { roughness: 0.9 });
  const mkCar = (col, truck) => { const c = new THREE.Group(); box(c, 4.2, 1.0, 2.0, col, 0, 0.9, 0); box(c, 2.2, 0.9, 1.8, '#9cd3ee', truck ? 1.4 : -0.2, 1.8, 0, { roughness: 0.2 }); if (truck) { box(c, 3.6, 2.2, 2.2, '#f7f7f4', -2.8, 1.8, 0); } for (const x of [-1.4, 1.4]) for (const z of [-0.95, 0.95]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14), mat('#1c1c1e')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); c.add(w); } scene.add(c); return c; };
  const traffic = [[mkCar('#d94a38'), 7, -28, 1, 0], [mkCar('#3a86d9'), 9, -28, 1, 60], [mkCar('#46c768', true), 6, -32, -1, 30], [mkCar('#F5C400'), 8, -32, -1, 95], [mkCar('#8e44ad'), 7.5, -28, 1, 130]];
  // birds
  const birds = Array.from({ length: 6 }, (_, i) => { const b = new THREE.Group(); box(b, 0.5, 0.3, 0.9, '#ffffff'); const wl = new THREE.Group(), wr = new THREE.Group(); b.add(wl, wr); box(wl, 1.1, 0.08, 0.5, '#f1f1f1', -0.55, 0, 0); box(wr, 1.1, 0.08, 0.5, '#f1f1f1', 0.55, 0, 0); scene.add(b); return { b, wl, wr, ph: i * 1.1 }; });
  // smoke puffs over the taco truck
  const puffs = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(rb(1, 1, 1, 0.25), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, roughness: 1 })); scene.add(m); return m; });
  // a work platform across the frame
  box(site, 6.5, 0.3, 1.5, '#d9a45f', 4.8, 4.55, -5.4); box(site, 0.25, 4.4, 0.25, '#8d949b', 1.6, 2.3, -5.4); box(site, 0.25, 4.4, 0.25, '#8d949b', 8, 2.3, -5.4);

  const ticks = [];
  // a real sky: gradient plus a sun with a glow
  { const sd = sun.position.clone().normalize();
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sd: { value: sd } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vP; uniform vec3 sd; void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 top = vec3(0.17,0.43,0.88), mid = vec3(0.47,0.75,0.98), hor = vec3(0.93,0.96,0.97); vec3 c = mix(hor, mid, smoothstep(0.0, 0.25, h)); c = mix(c, top, smoothstep(0.2, 0.85, h)); float s = max(dot(normalize(vP), sd), 0.0); c += vec3(1.0,0.92,0.72) * pow(s, 260.0) * 2.0 + vec3(1.0,0.86,0.6) * pow(s, 10.0) * 0.28; gl_FragColor = vec4(c, 1.0); }' });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(340, 32, 16), skyMat)); scene.background = new THREE.Color('#dcecf7'); }
  // grass tufts, flowers and rocks so the ground isn't bare
  { const out = (x, z) => Math.abs(x) < 31 && z > -27 && z < 24;
    const tuft = new THREE.InstancedMesh(rb(0.35, 0.8, 0.35, 0.06), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 520), fl = new THREE.InstancedMesh(rb(0.35, 0.35, 0.35, 0.08), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 120), rk = new THREE.InstancedMesh(rb(1, 0.7, 1, 0.15), new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 0.9 }), 40);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color(); const greens = ['#3f9a35', '#4dab3f', '#2f8a30', '#5dbb48'], flc = ['#ffd84a', '#ff6b6b', '#ffffff', '#c05bff', '#ff9f40'];
    const place = (im, n, y, sc, cols) => { for (let i = 0; i < n; i++) { let x, z; do { x = (rnd() - 0.5) * 130; z = (rnd() - 0.5) * 120 - 4; } while (out(x, z)); const s = sc * (0.7 + rnd() * 0.8); E.set(0, rnd() * 6, 0); Q.setFromEuler(E); P.set(x, y * s, z); S.set(s, s * (0.8 + rnd() * 0.6), s); M.compose(P, Q, S); im.setMatrixAt(i, M); if (cols) im.setColorAt(i, C.set(cols[i % cols.length])); } im.castShadow = true; scene.add(im); };
    place(tuft, 520, 0.4, 1, greens); place(fl, 120, 0.2, 0.9, flc); place(rk, 40, 0.3, 1.2, null); }
  // a chain-link fence round the back and sides, with a banner
  { const ft = canvasTex(128, 128, (g) => { g.strokeStyle = 'rgba(200,210,220,.95)'; g.lineWidth = 3; for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); } }); ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    const fence = (x0, z0, x1, z1) => { const Ln = Math.hypot(x1 - x0, z1 - z0), t2 = ft.clone(); t2.needsUpdate = true; t2.repeat.set(Ln / 4, 1); const p = new THREE.Mesh(new THREE.PlaneGeometry(Ln, 3.4), new THREE.MeshBasicMaterial({ map: t2, transparent: true, side: THREE.DoubleSide, depthWrite: false })); p.position.set((x0 + x1) / 2, 1.9, (z0 + z1) / 2); p.rotation.y = -Math.atan2(z1 - z0, x1 - x0); scene.add(p);
      for (let k = 0; k <= Ln; k += 4) box(scene, 0.22, 3.9, 0.22, '#8d949b', x0 + (x1 - x0) * k / Ln, 1.95, z0 + (z1 - z0) * k / Ln); box(scene, Ln, 0.16, 0.16, '#8d949b', (x0 + x1) / 2, 3.7, (z0 + z1) / 2).rotation.y = p.rotation.y; };
    fence(-38, -24, 38, -24); fence(-38, -24, -38, 22); fence(38, -24, 38, 22);
    const bt = canvasTex(1024, 256, (g) => { g.fillStyle = '#F5C400'; g.fillRect(0, 0, 1024, 256); g.fillStyle = '#141414'; for (let i = -2; i < 26; i++) { g.beginPath(); g.moveTo(i * 44, 0); g.lineTo(i * 44 + 22, 0); g.lineTo(i * 44 + 66, 26); g.lineTo(i * 44 + 44, 26); g.fill(); g.beginPath(); g.moveTo(i * 44, 256); g.lineTo(i * 44 + 22, 256); g.lineTo(i * 44 + 66, 230); g.lineTo(i * 44 + 44, 230); g.fill(); } g.textAlign = 'center'; g.font = '900 110px Arial'; g.fillText('SAFETY FIRST.', 512, 130); g.font = '900 78px Arial'; g.fillStyle = '#d94a38'; g.fillText('TACOS SECOND.', 512, 218); });
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: bt })); ban.position.set(-2, 2.4, -23.8); scene.add(ban); }
  // blueprint tent with a table of plans
  { const tent = new THREE.Group(); tent.position.set(-13, 0, -5); scene.add(tent);
    const rt = canvasTex(256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#fff' : '#d94a38'; g.fillRect(i * 32, 0, 32, 256); } });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.3, 6), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.8 })); roof.visible = false;
    box(tent, 5, 0.3, 2.4, '#b98a52', 0, 2.2, 0); for (const [x, z] of [[-2.2, -0.9], [2.2, -0.9], [-2.2, 0.9], [2.2, 0.9]]) box(tent, 0.25, 2.1, 0.25, '#8a6a45', x, 1.05, z);
    const bp = canvasTex(256, 128, (g) => { g.fillStyle = '#2f6db5'; g.fillRect(0, 0, 256, 128); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); } for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } g.lineWidth = 4; g.strokeRect(40, 24, 110, 80); g.strokeRect(150, 40, 70, 64); });
    const plan = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 1.8), new THREE.MeshStandardMaterial({ map: bp })); plan.position.set(0, 2.4, 0); tent.add(plan); }
  // sawhorses and a plank
  { const sh = new THREE.Group(); sh.position.set(11.8, 0, 4.6); scene.add(sh); for (const x of [-1.2, 1.2]) { box(sh, 0.3, 0.3, 1.6, '#8a6a45', x, 1.8, 0); for (const z of [-0.7, 0.7]) box(sh, 0.25, 1.9, 0.25, '#8a6a45', x, 0.95, z); } box(sh, 4.2, 0.35, 0.9, '#e8c58c', 0, 2.1, 0); }
  // sawdust
  const dust = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(rb(0.18, 0.18, 0.18, 0.04), new THREE.MeshStandardMaterial({ color: '#e6c98f', transparent: true, roughness: 1 })); scene.add(m); return m; });
  ticks.push((t) => dust.forEach((m, i) => { const k = (t * 1.3 + i / 9) % 1; m.position.set(11.8 + Math.sin(t * 9 + i) * 0.3 + (k - 0.3) * 0.8, 2.3 + k * 1.4, 4.6 + (k - 0.5) * 0.6); m.material.opacity = 0.9 * (1 - k); m.scale.setScalar(0.7 + k); }));
  // forklift on a loop between the lumber and the frame
  const fork = new THREE.Group(); scene.add(fork);
  { box(fork, 2.6, 1.3, 3.6, '#F5C400', 0, 1.2, -0.3); box(fork, 2.6, 1.6, 1.4, '#4b4f55', 0, 1.6, -1.9); box(fork, 2.0, 0.2, 1.7, '#222', 0, 2.0, 0.2);
    for (const [x, z] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.9], [1.1, 0.9]]) box(fork, 0.18, 2.5, 0.18, '#2a2d31', x, 3.2, z); box(fork, 2.6, 0.2, 2.2, '#2a2d31', 0, 4.5, 0.15);
    for (const x of [-0.7, 0.7]) box(fork, 0.28, 5.2, 0.28, '#2a2d31', x, 2.7, 2.2);
    for (const [x, z] of [[-1.35, -1.1], [1.35, -1.1], [-1.35, 1.2], [1.35, 1.2]]) { const wl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.55, 16), mat('#1c1c1e')); wl.rotation.z = Math.PI / 2; wl.position.set(x, 0.7, z); wl.castShadow = true; fork.add(wl); } }
  const load = new THREE.Group(); fork.add(load); box(load, 2.6, 0.25, 2.6, '#c4894a', 0, 0, 3.6); for (let i = 0; i < 4; i++) box(load, 2.4, 0.5, 2.3, i % 2 ? '#eef0f2' : '#e1e4e8', 0, 0.38 + i * 0.52, 3.6); for (const x of [-0.7, 0.7]) box(load, 0.2, 0.18, 2.8, '#2a2d31', x, -0.22, 3.4);
  ticks.push((t) => { const T = 16, s = t % T; let z, ry, h = 0.5; if (s < 5) { z = lerp3(-0.5, -10.5, s / 5); ry = Math.PI; h = 0.5 + s / 5 * 1.4; } else if (s < 6) { z = -10.5; ry = lerp3(Math.PI, 0, s - 5); h = 1.9; } else if (s < 11) { z = lerp3(-10.5, -0.5, (s - 6) / 5); ry = 0; h = 1.9 - (s - 6) / 5 * 1.4; } else { z = -0.5; ry = lerp3(0, Math.PI, s - 11 > 1 ? 1 : s - 11); h = 0.5; }
    fork.position.set(13.2, 0, z); fork.rotation.y = ry; load.position.y = h; });
  // cement truck parked at the back with a turning drum
  { const ct = new THREE.Group(); ct.position.set(26, 0, -13); ct.rotation.y = -0.6; scene.add(ct); box(ct, 3, 3.4, 3.2, '#d94a38', 0, 2.4, 4.2); box(ct, 2.8, 1.4, 0.2, '#9cd3ee', 0, 3.3, 5.85); box(ct, 3.2, 0.9, 9, '#3a3f46', 0, 0.95, -0.3);
    for (const [x, z] of [[-1.5, 5], [1.5, 5], [-1.5, 0], [1.5, 0], [-1.5, -3], [1.5, -3]]) { const wl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 18), mat('#1c1c1e')); wl.rotation.z = Math.PI / 2; wl.position.set(x, 0.95, z); wl.castShadow = true; ct.add(wl); }
    const dt = canvasTex(256, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f2f0' : '#F5C400'; g.fillRect(i * 32, 0, 32, 128); } }); dt.wrapS = THREE.RepeatWrapping;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.3, 6.2, 24), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.5 })); drum.rotation.x = Math.PI / 2 - 0.22; drum.position.set(0, 3.5, -1); drum.castShadow = true; ct.add(drum); ticks.push((t) => { dt.offset.x = t * 0.5; }); }
  // work lights, flags, piles, pipes, rebar, porta-potties, generator
  for (const [x, z] of [[-13, -8], [15, -10], [21, 4], [-22, 9]]) { box(scene, 0.5, 9, 0.5, '#4b5560', x, 4.5, z); box(scene, 1.4, 0.8, 0.6, '#ffffff', x, 9.3, z + 0.3, { emissive: '#fff2b0', emissiveIntensity: 0.9 }).castShadow = false; }
  const flags = []; for (const [x, z, c] of [[20, 14, '#F5C400'], [-24, 14, '#F5C400'], [30, -2, '#d94a38']]) { box(scene, 0.25, 11, 0.25, '#cfd4d9', x, 5.5, z); const f = new THREE.Group(); f.position.set(x + 0.1, 10, z); scene.add(f); box(f, 2.6, 1.5, 0.06, c, 1.3, 0, 0, { roughness: 0.8 }); flags.push(f); }
  ticks.push((t) => flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.2 + i) * 0.35; f.rotation.z = Math.sin(t * 3 + i) * 0.06; }));
  for (let i = 0; i < 7; i++) box(scene, 4 - i * 0.5, 0.7, 4 - i * 0.5, i % 2 ? '#d8c08a' : '#cdb57a', 24.5, 0.35 + i * 0.7, -4, { roughness: 1 });
  for (let i = 0; i < 6; i++) box(scene, 3.2 - i * 0.45, 0.6, 3.2 - i * 0.45, i % 2 ? '#8d949b' : '#7c838a', 22, 0.3 + i * 0.6, -9, { roughness: 1 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5, 14), mat(c % 2 ? '#e8e8e8' : '#e2792b')); p.rotation.z = Math.PI / 2; p.position.set(21, 0.5 + r * 0.8, 3 + c * 0.9 + r * 0.45); p.castShadow = true; scene.add(p); }
  for (let i = 0; i < 9; i++) { const rb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), mat('#9c4a2a')); rb2.rotation.z = Math.PI / 2; rb2.position.set(-14.5, 0.3 + Math.floor(i / 3) * 0.22, 8 + (i % 3) * 0.3); scene.add(rb2); }
  for (let i = 0; i < 3; i++) { box(scene, 2.2, 4.2, 2.2, '#3a86d9', -30 + i * 2.6, 2.1, 15); box(scene, 1.4, 2.6, 0.12, '#2f6db5', -30 + i * 2.6, 1.7, 16.15); }
  box(scene, 3, 2, 2, '#d94a38', -14, 1.2, -6); box(scene, 2.6, 0.2, 1.6, '#2a2d31', -14, 2.3, -6);
  // papers flying when the Friday chaos is described
  const papers = Array.from({ length: 14 }, () => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 1.2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })); p.visible = false; p.castShadow = true; scene.add(p); return p; });
  const paperWin = [1e9, 1e9, -2.2, 3.4, 4.4];
  ticks.push((t) => { const on = t > paperWin[0] && t < paperWin[1]; papers.forEach((p, i) => { p.visible = on; if (!on) return; const k = ((t - paperWin[0]) * 0.5 + i / 14) % 1, a = i * 1.7 + t * 2.2; p.position.set(paperWin[2] + Math.cos(a) * (1.2 + k * 2.2), paperWin[3] + k * 5, paperWin[4] + Math.sin(a) * (1.2 + k * 2.2)); p.rotation.set(Math.sin(t * 5 + i) * 1.2, t * 3 + i, Math.cos(t * 4 + i) * 1.2); }); });
  // trees, distant blocks, clouds
  const trees = [[-30, -20], [-26, 14], [34, -12], [30, 22], [-38, -4], [40, 6], [8, -44], [-18, -44], [26, -44], [-40, 26], [30, -26]];
  for (const [x, z] of trees) { const s = 0.9 + rnd() * 0.7, t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); scene.add(t); box(t, 1.3, 5, 1.3, "#7b5532", 0, 2.5, 0); box(t, 5.2, 3.2, 5.2, "#2f8f3f", 0, 6, 0, { roughness: 0.7 }); box(t, 3.8, 2.6, 3.8, "#3aa84c", 0, 8.4, 0, { roughness: 0.7 }); box(t, 2.2, 1.6, 2.2, "#46bb5a", 0, 10.2, 0, { roughness: 0.7 }); }
  const cols = ["#9db4c9", "#c5b8a6", "#b3c4a5", "#cfa59a", "#a7b0d2"];
  for (let i = 0; i < 18; i++) { const a = -Math.PI * 0.95 + (i / 17) * Math.PI * 0.9, r = 95 + rnd() * 25, w = 8 + rnd() * 10, h = 10 + rnd() * 34; const b = box(scene, w, h, w, cols[i % 5], Math.sin(a) * r, h / 2, -Math.cos(a) * r - 10, { roughness: 0.8 }); for (let k = 0; k < 4; k++) box(scene, w * 0.82, 1.0, 0.3, "#dcecf6", Math.sin(a) * r, h * (0.25 + k * 0.2), -Math.cos(a) * r - 10 + w / 2 + 0.1, { roughness: 0.3 }); }
  const clouds = [];
  for (let i = 0; i < 9; i++) { const c = new THREE.Group(); c.position.set(-90 + i * 24 + rnd() * 10, 38 + rnd() * 22, -70 - rnd() * 50); const n = 3 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) box(c, 7 + rnd() * 6, 2.4 + rnd() * 1.6, 5 + rnd() * 3, "#ffffff", k * 5 - n * 2.4, rnd() * 1.4, rnd() * 3, { roughness: 1, fog: false }); scene.add(c); clouds.push(c); }

  // confetti: little bricks, two bursts
  const CN = 420, conf = new THREE.InstancedMesh(rb(0.32, 0.2, 0.48, 0.05), new THREE.MeshStandardMaterial({ roughness: 0.4 }), CN);
  const palette = ["#F5C400", "#ff5a36", "#3aa6ff", "#46c768", "#ffffff", "#c05bff"].map((c) => new THREE.Color(c));
  const seeds = Array.from({ length: CN }, (_, i) => ({ v: [(rnd() - 0.5) * 9, 7 + rnd() * 8, (rnd() - 0.2) * 6], r: [rnd() * 6, rnd() * 6, rnd() * 6], w: [(rnd() - 0.5) * 9, (rnd() - 0.5) * 9, (rnd() - 0.5) * 9] }));
  for (let i = 0; i < CN; i++) conf.setColorAt(i, palette[i % palette.length]);
  conf.frustumCulled = false; scene.add(conf);
  const bursts = [{ t0: 1e9, o: [0, 5, 4], a: 0, b: 210 }, { t0: 1e9, o: [0, 5, 4], a: 210, b: 420 }];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3();

  // floating "?" marks
  const qTex = canvasTex(128, 128, (g) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.strokeStyle = "#e45a1c"; g.lineWidth = 8; g.stroke(); g.fillStyle = "#e45a1c"; g.font = "900 88px Arial"; g.textAlign = "center"; g.fillText("?", 64, 96); });
  const qs = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, transparent: true, depthTest: false })); s.scale.setScalar(1.3); s.visible = false; s.renderOrder = 12; scene.add(s); return s; });
  const okTex = canvasTex(128, 128, (g) => { g.fillStyle = "#2EAA62"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 14; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(36, 66); g.lineTo(58, 88); g.lineTo(94, 42); g.stroke(); });
  const ok = new THREE.Sprite(new THREE.SpriteMaterial({ map: okTex, transparent: true, depthTest: false })); ok.scale.setScalar(1.5); ok.visible = false; ok.renderOrder = 12; scene.add(ok);
  const exTex = canvasTex(128, 128, (g) => { g.fillStyle = "#e0342a"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "900 92px Arial"; g.textAlign = "center"; g.fillText("!", 64, 98); });
  const ex = new THREE.Sprite(new THREE.SpriteMaterial({ map: exTex, transparent: true, depthTest: false })); ex.scale.setScalar(1.5); ex.visible = false; ex.renderOrder = 12; scene.add(ex);

  return {
    scene, sun, qs, ok, ex, fork, paperWin,
    update(t) {
      for (const f of ticks) f(t);
      upper.rotation.y = Math.sin(t * 0.45) * 0.5; boom.rotation.x = -0.1 + Math.sin(t * 0.9) * 0.28; stick.rotation.x = 0.5 + Math.sin(t * 0.9 + 1.2) * 0.45; bucket.rotation.x = 0.4 + Math.sin(t * 0.9 + 2.4) * 0.5;
      for (const [c, sp, z, dir, off] of traffic) { const x = ((off + t * sp * dir) % 280 + 280) % 280 - 140; c.position.set(x, 0, z); c.rotation.y = dir > 0 ? 0 : Math.PI; }
      birds.forEach(({ b, wl, wr, ph }, i) => { const a = t * 0.35 + i * 1.05; b.position.set(14 + Math.cos(a) * (22 + i * 2), 26 + Math.sin(t * 0.7 + i) * 2 + i, -26 + Math.sin(a) * (14 + i)); b.rotation.y = -a; const f = Math.sin(t * 9 + ph) * 0.7; wl.rotation.z = f; wr.rotation.z = -f; });
      puffs.forEach((m, i) => { const k = ((t * 0.5 + i / 7) % 1); m.position.set(24 + k * 1.5, 6 + k * 6, 8.5 - k * 0.8); const sc = 0.5 + k * 1.8; m.scale.set(sc, sc, sc); m.rotation.y = i + t; m.material.opacity = 0.7 * (1 - k); });
      jib.rotation.y = -0.5 + Math.sin(t * 0.12) * 0.35; hook.position.x = 13 + Math.sin(t * 0.3) * 0.8; drum.rotation.y = t * 1.6;
      clouds.forEach((c, i) => { c.position.x += 0; c.position.x = ((c.position.x + 120 + 0.6 * 0) % 260) - 120; c.userData.b ??= c.position.x; c.position.x = ((c.userData.b + 130 + t * (0.5 + (i % 3) * 0.25)) % 260) - 130; });
      for (const bu of bursts) {
        const dt = t - bu.t0;
        for (let i = bu.a; i < bu.b; i++) {
          const s = seeds[i], k = dt;
          if (k < 0 || k > 3.6) { M.makeScale(0, 0, 0); conf.setMatrixAt(i, M); continue; }
          P.set(bu.o[0] + s.v[0] * k, Math.max(0.12, bu.o[1] + s.v[1] * k - 9.8 * k * k * 0.5), bu.o[2] + s.v[2] * k);
          E.set(s.r[0] + s.w[0] * k, s.r[1] + s.w[1] * k, s.r[2] + s.w[2] * k); Q.setFromEuler(E);
          const sc = k > 3.0 ? 1 - (k - 3.0) / 0.6 : 1; S.set(sc, sc, sc); M.compose(P, Q, S); conf.setMatrixAt(i, M);
        }
      }
      conf.instanceMatrix.needsUpdate = true;
    },
    burst(i, t0, o) { bursts[i].t0 = t0; bursts[i].o = o; },
  };
}

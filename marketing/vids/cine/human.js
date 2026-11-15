// A detailed stylised 3D human for the cinematic spots: shaped torso, jawline, eyes with lids and irises, brows, lips that open, hair, hi-vis vest with reflective bands,
// tool belt, boots, gloves. Proper joints (hips, waist, neck, shoulders, elbows, knees) so it walks, gestures and talks.
import * as THREE from "three";

const cv = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; };
const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };
const noise = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const fabricBump = () => { const c = cv(128, 128, (g, w, h) => { const r = noise(7); g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0,0.06)`; g.fillRect(r() * w, r() * h, 2, 1); } g.strokeStyle = "rgba(0,0,0,0.12)"; for (let x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t; };
let BUMP; const bump = () => (BUMP ||= fabricBump());
const std = (color, o = {}) => { const { noBump, ...r } = o; return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, bumpMap: noBump ? null : bump(), bumpScale: 0.6, ...r }); };

// the head, shaped: narrower jaw, a chin, a flatter face
function headGeo(r = 0.115, sx = 0.9, sy = 1.1, sz = 0.97) {
  const g = new THREE.SphereGeometry(r, 56, 44), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ny = y / r;
    x *= sx; y *= sy; z *= sz;
    if (ny < 0) { const k = 1 - 0.3 * Math.pow(-ny, 1.25); x *= k; z *= 1 - 0.14 * Math.pow(-ny, 1.6); if (ny < -0.55 && z > 0) z += 0.012 * (-ny - 0.55) / 0.45; }
    if (z > 0 && Math.abs(ny) < 0.6) z *= 0.97;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}

export function createHuman(o = {}) {
  const sk = o.skin ?? "#e0ac85", hairC = o.hair ?? "#2a1c14", shirtC = o.shirt ?? "#3b4a63", pantsC = o.pants ?? "#2a3345", bootC = o.boots ?? "#3a2a20", vestC = o.vest, hatC = o.hat, gloveC = o.glove;
  const H = o.height ?? 1, W = o.build ?? 1;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.set(W, H, W);
  const skin = new THREE.MeshPhysicalMaterial({ color: sk, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#ff9a7a"), sheenRoughness: 0.5, clearcoat: 0.04 });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(sk).multiplyScalar(0.72), roughness: 0.6 });
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m; };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  // a limb: capsule hanging down from its pivot
  const limb = (r, len, mat, parent, rb = r) => { const g = new THREE.CapsuleGeometry(r, len, 8, 16); const m = mesh(g, mat, parent, 0, -(len / 2 + r * 0.9), 0); return m; };

  const hips = pivot(body, 0, 0.93, 0), chest = pivot(hips, 0, 0.02, 0);
  // pelvis (pants)
  const pantsM = std(pantsC, { roughness: 0.8 });
  mesh(new THREE.CylinderGeometry(0.165, 0.18, 0.2, 28), pantsM, hips, 0, -0.04, 0).scale.set(1.08, 1, 0.72);
  // torso: lathe profile, broad shoulders, tapered waist
  const torsoProf = [[0.145, 0.0], [0.15, 0.1], [0.152, 0.2], [0.168, 0.32], [0.18, 0.43], [0.172, 0.5], [0.11, 0.56], [0.06, 0.585]].map(([r, y]) => new THREE.Vector2(r, y));
  const shirtM = std(shirtC), torso = mesh(new THREE.LatheGeometry(torsoProf, 40), shirtM, chest, 0, 0, 0); torso.scale.set(1.2, 1, 0.66);
  // hi-vis vest with reflective bands
  if (vestC) {
    const vt = tex(cv(256, 256, (g, w, h) => { g.fillStyle = vestC; g.fillRect(0, 0, w, h); const r = noise(3); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); } for (const y of [0.34, 0.62]) { g.fillStyle = "#cfd8e0"; g.fillRect(0, h * (1 - y) - 14, w, 28); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, h * (1 - y) - 14, w, 6); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, h * (1 - y) + 12, w, 2); g.fillRect(0, h * (1 - y) - 14, w, 2); } }));
    const vestM = new THREE.MeshStandardMaterial({ map: vt, roughness: 0.65, bumpMap: bump(), bumpScale: 0.5, side: THREE.DoubleSide });
    const vp = torsoProf.map((p) => new THREE.Vector2(p.x + 0.012, p.y)); const vest = mesh(new THREE.LatheGeometry(vp, 40, 0.3, Math.PI * 2 - 0.6), vestM, chest, 0, 0, 0); vest.scale.set(1.2, 1, 0.66);
    for (const s of [-1, 1]) { const st = mesh(new THREE.BoxGeometry(0.07, 0.14, 0.2), vestM, chest, s * 0.1, 0.53, 0); st.rotation.z = -s * 0.15; }
  }
  // collar and neck
  mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.09, 20), skin, chest, 0, 0.6, 0);
  const collar = mesh(new THREE.TorusGeometry(0.068, 0.014, 10, 28), shirtM, chest, 0, 0.575, 0); collar.rotation.x = Math.PI / 2; collar.scale.set(1.1, 1.0, 0.9);
  // tool belt
  const beltM = std("#3b2a1e", { roughness: 0.6 }); const belt = mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 36), beltM, hips, 0, 0.0, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1.2, 0.68, 1);
  if (o.belt !== false) { mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), beltM, hips, 0.17, -0.07, 0.07); mesh(new THREE.BoxGeometry(0.07, 0.12, 0.05), beltM, hips, -0.17, -0.08, 0.07); mesh(new THREE.BoxGeometry(0.035, 0.035, 0.012), std("#c8a64a", { metalness: 0.8, roughness: 0.3 }), hips, 0, 0.0, 0.112); }

  // ── legs ──
  const legs = [-1, 1].map((s) => {
    const thigh = pivot(hips, s * 0.093, -0.06, 0), tm = limb(0.082, 0.34, pantsM, thigh), knee = pivot(thigh, 0, -0.45, 0), sm = limb(0.066, 0.34, pantsM, knee), ankle = pivot(knee, 0, -0.43, 0);
    const bm = std(bootC, { roughness: 0.55, bumpScale: 0.3 }), boot = mesh(new THREE.CapsuleGeometry(0.058, 0.13, 8, 14), bm, ankle, 0, -0.02, 0.04); boot.rotation.x = Math.PI / 2; boot.scale.set(1.0, 1.0, 1.15);
    mesh(new THREE.BoxGeometry(0.115, 0.04, 0.27), std("#14110f", { roughness: 0.9 }), ankle, 0, -0.075, 0.04);
    mesh(new THREE.CylinderGeometry(0.07, 0.078, 0.07, 18), bm, ankle, 0, 0.04, 0);
    return { thigh, knee };
  });

  // ── arms ──
  const sleeveM = o.sleeve ? std(o.sleeve) : shirtM;
  const arms = [-1, 1].map((s) => {
    const sh = pivot(chest, s * 0.215, 0.5, 0), cap = mesh(new THREE.SphereGeometry(0.066, 20, 16), sleeveM, sh), up = limb(0.056, 0.22, sleeveM, sh), el = pivot(sh, 0, -0.31, 0), fo = limb(0.046, 0.2, sleeveM.clone ? skin : skin, el), wrist = pivot(el, 0, -0.32, 0);
    // rolled sleeve cuff
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 18), sleeveM, el, 0, -0.04, 0);
    const gm = gloveC ? std(gloveC, { roughness: 0.7 }) : skin, hand = mesh(new THREE.SphereGeometry(0.05, 18, 14), gm, wrist, 0, -0.04, 0); hand.scale.set(0.9, 1.15, 0.7);
    const th = mesh(new THREE.CapsuleGeometry(0.014, 0.04, 4, 8), gm, wrist, s * -0.04, -0.03, 0.03); th.rotation.z = s * 0.5;
    return { sh, el, wrist };
  });

  // ── head ──
  const neck = pivot(chest, 0, 0.62, 0.005), head = pivot(neck, 0, 0.115, 0.01);
  mesh(headGeo(), skin, head, 0, 0, 0);
  // ears
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.03, 16, 12), skin, head, s * 0.104, -0.004, -0.004); e.scale.set(0.4, 1.2, 0.8); }
  // nose
  const nose = mesh(new THREE.SphereGeometry(0.02, 16, 12), skin, head, 0, -0.022, 0.108); nose.scale.set(0.8, 1.2, 1.1); mesh(new THREE.SphereGeometry(0.0135, 14, 10), skin, head, 0, -0.042, 0.112);
  // eyes: sclera, iris, lids
  const irisT = (c1) => tex(cv(128, 128, (g, w, h) => { g.fillStyle = "#f4f1ec"; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(64, 64, 8, 64, 64, 52); gr.addColorStop(0, "#050505"); gr.addColorStop(0.28, "#0a0a0a"); gr.addColorStop(0.32, c1); gr.addColorStop(0.9, c1); gr.addColorStop(1, "rgba(30,20,10,0.9)"); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(88, 40, 9, 0, 7); g.fill(); }));
  const eyes = [-1, 1].map((s) => {
    const g = pivot(head, s * 0.04, 0.022, 0.095); mesh(new THREE.SphereGeometry(0.0225, 24, 18), new THREE.MeshStandardMaterial({ color: "#f3efe8", roughness: 0.25 }), g);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.0125, 28), new THREE.MeshStandardMaterial({ map: irisT(o.eye ?? "#5a3a22"), roughness: 0.15, metalness: 0 })); iris.position.z = 0.0222; g.add(iris);
    const lid = mesh(new THREE.SphereGeometry(0.0245, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), skin, g); lid.rotation.x = -0.15;
    const lower = mesh(new THREE.SphereGeometry(0.0245, 24, 12, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), skin, g);
    return { g, lid, lower };
  });
  // brows
  const browM = std(hairC, { roughness: 0.7, noBump: true }); const brows = [-1, 1].map((s) => { const pts = [[-0.026, -0.002, 0.004], [0, 0.004, 0.0], [0.028, -0.004, -0.005]].map(([x, y, z]) => new THREE.Vector3(x * s * -1, y, z)); const b = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.0075, 8), browM, null); const gp = pivot(head, s * 0.042, 0.062, 0.093); gp.add(b); gp.rotation.y = s * 0.28; return gp; });
  // mouth: inner, teeth, lips (rebuilt for expression)
  const mouthG = pivot(head, 0, -0.062, 0.084), inner = mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: "#3a0c12", roughness: 0.9 }), mouthG, 0, 0, 0); inner.castShadow = false; const teeth = mesh(new THREE.BoxGeometry(0.032, 0.007, 0.006), new THREE.MeshStandardMaterial({ color: "#f4f0e8", roughness: 0.3 }), mouthG, 0, 0.004, 0.006);
  const lipM = new THREE.MeshStandardMaterial({ color: new THREE.Color(sk).lerp(new THREE.Color("#a24b4b"), 0.45), roughness: 0.4 });
  let upLip = null, loLip = null;
  const lips = (open, smile, wide) => {
    if (upLip) { upLip.geometry.dispose(); loLip.geometry.dispose(); mouthG.remove(upLip, loLip); }
    const w = 0.026 * wide, c = smile * 0.011;
    const up = new THREE.CatmullRomCurve3([new THREE.Vector3(-w, c, 0.0), new THREE.Vector3(-w * 0.45, 0.0035 + c * 0.2, 0.004), new THREE.Vector3(0, 0.005, 0.006), new THREE.Vector3(w * 0.45, 0.0035 + c * 0.2, 0.004), new THREE.Vector3(w, c, 0.0)]);
    const dy = -open * 0.03, lo = new THREE.CatmullRomCurve3([new THREE.Vector3(-w, c, 0.0), new THREE.Vector3(-w * 0.5, dy - 0.006 + c * 0.2, 0.004), new THREE.Vector3(0, dy - 0.0085, 0.006), new THREE.Vector3(w * 0.5, dy - 0.006 + c * 0.2, 0.004), new THREE.Vector3(w, c, 0.0)]);
    upLip = new THREE.Mesh(new THREE.TubeGeometry(up, 14, 0.0042, 8), lipM); loLip = new THREE.Mesh(new THREE.TubeGeometry(lo, 14, 0.0052, 8), lipM); upLip.castShadow = loLip.castShadow = false; mouthG.add(upLip, loLip);
    inner.scale.set(w * 0.92, Math.max(0.0005, open * 0.03 * 0.5), 0.004); inner.position.y = dy * 0.5 - 0.001; teeth.visible = open > 0.3; teeth.position.y = -0.002; teeth.scale.set(wide, 1, 1);
  };
  lips(0, 0.3, 1);
  // hair, beard, hat
  const hairM = std(hairC, { roughness: 0.75, bumpScale: 0.9 }); let tail = null;
  const hs = o.hairStyle ?? "short";
  const cap = (r, a, b) => { const m = mesh(new THREE.SphereGeometry(r, 40, 28, 0, Math.PI * 2, a, b), hairM, head, 0, 0.006, -0.004); m.scale.set(0.93, 1.1, 1.0); return m; };
  if (hs === "short") { cap(0.1235, 0, Math.PI * 0.42); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.014, 0.05, 0.05), hairM, head, s * 0.1, 0.018, -0.02); }
  if (hs === "long" || hs === "ponytail") { cap(0.1235, 0, Math.PI * 0.47); const back = mesh(new THREE.SphereGeometry(0.118, 28, 20), hairM, head, 0, 0.002, -0.028); back.scale.set(0.95, 1.1, 0.92); for (const s of [-1, 1]) mesh(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8), hairM, head, s * 0.095, 0.02, 0.03); }
  if (hs === "ponytail") { tail = pivot(head, 0, 0.0, -0.11); const tm = mesh(new THREE.CapsuleGeometry(0.03, 0.2, 6, 12), hairM, tail, 0, -0.12, -0.02); tm.scale.set(1, 1, 0.7); mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 14), std("#c2336b"), tail, 0, -0.02, 0.0).rotation.x = Math.PI / 2; }
  if (hs === "curly") { for (let i = 0; i < 26; i++) { const a = i * 2.4, rr = 0.07 + (i % 5) * 0.012; mesh(new THREE.SphereGeometry(0.03, 12, 10), hairM, head, Math.cos(a) * rr, 0.07 + (i % 4) * 0.014, Math.sin(a) * rr - 0.01); } }
  if (o.beard) { const bg = headGeo(0.119, 0.9, 1.1, 0.97), bm = mesh(bg, hairM, head, 0, -0.012, 0.004); const idx = bg.index; /* clip to the lower face by squashing the upper half inwards */ const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y > -0.01 || z < -0.02) { p.setXYZ(i, p.getX(i) * 0.2, Math.min(y, -0.0) * 0.1 - 0.12, p.getZ(i) * 0.2); } } bg.computeVertexNormals(); bm.scale.set(1.01, 1.0, 1.01); }
  if (o.stache) { for (const s of [-1, 1]) { const m = mesh(new THREE.CapsuleGeometry(0.009, 0.026, 4, 8), hairM, head, s * 0.016, -0.052, 0.098); m.rotation.z = Math.PI / 2 + s * -0.18; } }
  if (o.glasses) { const gm = new THREE.MeshStandardMaterial({ color: "#15151a", roughness: 0.3, metalness: 0.5 }); for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.031, 0.0035, 8, 26), gm, head, s * 0.04, 0.022, 0.1); mesh(new THREE.BoxGeometry(0.016, 0.003, 0.003), gm, head, 0, 0.026, 0.104); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.003, 0.003, 0.1), gm, head, s * 0.075, 0.025, 0.055); }
  if (hatC) {
    const hm = new THREE.MeshPhysicalMaterial({ color: hatC, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const dome = mesh(new THREE.SphereGeometry(0.135, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, head, 0, 0.04, -0.008); dome.scale.set(0.98, 1.0, 1.1);
    const brim = mesh(new THREE.CylinderGeometry(0.14, 0.148, 0.01, 40), hm, head, 0, 0.046, 0.02); brim.scale.set(1.0, 1, 1.18);
    for (const a of [-0.35, 0, 0.35]) { const rib = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.28), hm, head, Math.sin(a) * 0.06, 0.145, -0.005); rib.rotation.set(0, -a * 0.4, 0); rib.scale.set(1, 1, 0.8); }
    
  }

  const out = { root, hips, chest, neck, head, legs, arms, eyes, brows, tail, bodyMat: shirtM, skin };
  let lastLips = "";
  // pose: { x, y, z, ry, ph, amt, lean, twist, armL:{x,z,e}, armR:{x,z,e}, headYaw, headPitch, headRoll, mouth 0..1, mood, blink 0..1, look:[x,y], sway }
  out.set = (p) => {
    root.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0); root.rotation.y = p.ry ?? 0;
    const ph = p.ph ?? 0, a = p.amt ?? 0, s = Math.sin(ph), c2 = Math.cos(ph), br = p.breathe ?? 0;
    hips.position.y = 0.93 - Math.abs(c2) * 0.03 * a + (p.crouch ?? 0) * -0.18 + Math.sin((p.t ?? 0) * 1.6) * 0.004;
    hips.rotation.z = -s * 0.04 * a; hips.rotation.y = s * 0.1 * a; chest.rotation.y = (p.twist ?? 0) - s * 0.14 * a; chest.rotation.x = (p.lean ?? 0) + br * 0.01; chest.rotation.z = s * 0.03 * a;
    legs.forEach((L, i) => { const sd = i === 0 ? 1 : -1, sw = s * sd; L.thigh.rotation.x = -sw * 0.62 * a + (p.crouch ?? 0) * -0.9; L.knee.rotation.x = (Math.max(0, Math.sin(ph * sd + (i ? Math.PI : 0) + 1.3)) * 0.95 * a) + (p.crouch ?? 0) * 1.5; L.thigh.rotation.z = sd * 0.02; });
    const A = [p.armL, p.armR];
    arms.forEach((m, i) => { const sd = i === 0 ? 1 : -1, g = A[i]; if (g) { m.sh.rotation.set(g.x ?? 0, g.y ?? 0, (g.z ?? 0) * (i === 0 ? 1 : -1)); m.el.rotation.set(-(g.e ?? 0.2), 0, 0); } else { const sw = -s * sd * 0.5 * a; m.sh.rotation.set(sw, 0, (i === 0 ? 1 : -1) * 0.08); m.el.rotation.set(-(0.2 + Math.max(0, -sw) * 0.5), 0, 0); } });
    neck.rotation.set((p.headPitch ?? 0) * 0.5, (p.headYaw ?? 0) * 0.5, (p.headRoll ?? 0) * 0.5); head.rotation.set((p.headPitch ?? 0) * 0.5, (p.headYaw ?? 0) * 0.5, (p.headRoll ?? 0) * 0.5);
    if (tail) tail.rotation.set(0.5 + Math.sin((p.t ?? 0) * 3 + 1) * 0.12 + a * s * 0.3, Math.sin((p.t ?? 0) * 2) * 0.1, 0);
    // face
    const mood = p.mood ?? "neutral", bl = p.blink ?? 0, look = p.look ?? [0, 0];
    const browRot = { neutral: [0, 0], happy: [0.1, 0.012], sad: [-0.35, 0.008], angry: [0.4, -0.012], shock: [0, 0.03], smug: [0.2, 0.004] }[mood] ?? [0, 0];
    brows.forEach((b, i) => { const sd = i === 0 ? -1 : 1; b.rotation.z = sd * -browRot[0] * (mood === "smug" && i === 0 ? 0.2 : 1); b.position.y = 0.062 + browRot[1] + (mood === "smug" && i === 1 ? 0.012 : 0); });
    eyes.forEach((e) => { const base = { shock: -0.15, angry: 0.38, sad: 0.28, smug: 0.42, happy: 0.12, neutral: 0.06 }[mood] ?? 0.06; e.lid.rotation.x = Math.min(1.45, base + bl * 1.4); e.lower.rotation.x = 0; e.g.rotation.set(-look[1] * 0.3, look[0] * 0.3, 0); });
    const m = clamp01(p.mouth ?? 0), smile = { happy: 0.9, smug: 0.7, neutral: 0.25, sad: -0.7, angry: -0.2, shock: 0 }[mood] ?? 0.2, wide = 1 + (mood === "shock" ? -0.15 : 0.1 * m) + (m > 0.5 ? 0.1 : 0), op = mood === "shock" ? Math.max(m, 0.7) : m, key = [op.toFixed(2), smile, wide.toFixed(2)].join();
    if (key !== lastLips) { lips(op, smile, wide); lastLips = key; }
  };
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  out.set({});
  return out;
}

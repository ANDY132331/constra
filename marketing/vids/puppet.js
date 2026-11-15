// A small 2D cartoon puppet rig for the story videos: people who walk, talk (lip-sync from word timings), gesture and react.
// Four looks share one rig: "toon" (thick outlines), "paper" (cut-out, stop-motion jitter, cast shadows), "flat" (clean shapes, no outlines), "comic" (heavy ink + halftone).
import { clamp, lerp, ease, easeOut, rnd } from "/engine.js";

export const STYLES = {
  toon: { outline: 7, line: "#1a1a1f", jitter: 0, shadow: false, halftone: false },
  paper: { outline: 0, line: "#3b2a1a", jitter: 12, shadow: true, halftone: false },
  flat: { outline: 0, line: null, jitter: 0, shadow: false, halftone: false },
  comic: { outline: 8, line: "#0b0b0b", jitter: 0, shadow: false, halftone: true },
};

function rr(c, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = clamp(((n >> 16) & 255) * k, 0, 255), g = clamp(((n >> 8) & 255) * k, 0, 255), b = clamp((n & 255) * k, 0, 255); return `rgb(${r | 0},${g | 0},${b | 0})`; };

// ── face, shared by people and talking objects ──────────────────────────
// p: { mouth 0..1, mood, blink 0..1, look [dx,dy] }; spacing and size in local units
export function drawFace(c, p, st, o = {}) {
  const sp = o.spacing ?? 28, ey = o.eyeY ?? 8, my = o.mouthY ?? 40, mood = p.mood || "neutral", O = st.outline, L = st.line || "#222";
  const eyeScale = { shock: 1.3, angry: 0.82, sad: 0.9, happy: 1, smug: 0.8, neutral: 1 }[mood] ?? 1, open = (1 - (p.blink || 0)) * eyeScale;
  const look = p.look || [0, 0];
  for (const s of [-1, 1]) {
    const ex = s * sp;
    if (open < 0.12) { c.strokeStyle = L === "#222" || !st.line ? "#222" : L; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(ex - 13, ey); c.lineTo(ex + 13, ey); c.stroke(); }
    else {
      c.fillStyle = "#fff"; c.beginPath(); c.ellipse(ex, ey, 15, 18 * open, 0, 0, 7); c.fill(); if (O) { c.lineWidth = Math.max(3, O * 0.6); c.strokeStyle = L; c.stroke(); }
      c.fillStyle = "#1b1b1f"; c.beginPath(); c.arc(ex + look[0] * 6, ey + look[1] * 6, 7.5 * (mood === "shock" ? 0.8 : 1), 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(ex + look[0] * 6 + 2.5, ey + look[1] * 6 - 3, 2.4, 0, 7); c.fill();
      if (mood === "smug" || mood === "angry") { c.fillStyle = o.lid || "rgba(0,0,0,0)"; }
    }
    // brows
    const slope = { angry: 8, sad: -8, neutral: 0, happy: -2, shock: -3, smug: s === 1 ? 6 : -4 }[mood] ?? 0, by = (o.browY ?? -19) - (mood === "shock" ? 11 : mood === "happy" ? 3 : 0);
    c.strokeStyle = o.brow || "#2a1b12"; c.lineWidth = 8; c.lineCap = "round"; c.beginPath(); c.moveTo(ex - s * 17, by + slope); c.lineTo(ex + s * 17, by - slope); c.stroke();
  }
  // mouth
  const m = p.mouth || 0; c.save(); c.translate(0, my);
  if (m > 0.1 || mood === "shock") {
    const mm = mood === "shock" ? Math.max(m, 0.7) : m, w = 30 + mm * 12 * (0.6 + 0.4 * Math.sin(m * 40)), h = 6 + mm * 30;
    c.fillStyle = "#5b1220"; c.beginPath(); c.ellipse(0, h * 0.35, w / 2, h / 2, 0, 0, 7); c.fill(); if (O) { c.lineWidth = Math.max(3, O * 0.6); c.strokeStyle = L; c.stroke(); }
    c.save(); c.beginPath(); c.ellipse(0, h * 0.35, w / 2, h / 2, 0, 0, 7); c.clip(); if (mm > 0.4) { c.fillStyle = "#fff"; c.fillRect(-w / 2, -2, w, 9); } c.fillStyle = "#e0566a"; c.beginPath(); c.ellipse(0, h * 0.35 + h * 0.3, w * 0.32, h * 0.28, 0, 0, 7); c.fill(); c.restore();
  } else {
    c.strokeStyle = "#3a1a14"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath();
    if (mood === "sad") { c.moveTo(-17, 8); c.quadraticCurveTo(0, -6, 17, 8); }
    else if (mood === "angry") { c.moveTo(-17, 5); c.lineTo(17, 5); }
    else if (mood === "smug") { c.moveTo(-17, 4); c.quadraticCurveTo(6, 14, 20, -2); }
    else if (mood === "happy") { c.moveTo(-22, 0); c.quadraticCurveTo(0, 22, 22, 0); }
    else { c.moveTo(-16, 3); c.quadraticCurveTo(0, 12, 16, 3); }
    c.stroke();
  }
  c.restore();
}

// ── props held in a hand ────────────────────────────────────────────────
function drawProp(c, kind, st, p) {
  const O = st.outline, L = st.line;
  const so = () => { if (O) { c.lineWidth = O * 0.8; c.strokeStyle = L; c.stroke(); } };
  c.save();
  if (kind === "clipboard") { c.rotate(-0.15); c.fillStyle = "#b07a3c"; rr(c, -40, -84, 80, 104, 8); c.fill(); so(); c.fillStyle = "#fff"; rr(c, -32, -70, 64, 84, 3); c.fill(); c.strokeStyle = "rgba(0,0,0,0.3)"; c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-24, -54 + i * 14); c.lineTo(24 - (i % 2) * 12, -54 + i * 14); c.stroke(); } c.fillStyle = "#777"; rr(c, -14, -92, 28, 16, 4); c.fill(); so(); }
  else if (kind === "phone") { c.rotate(p.propRot ?? -0.1); const w = p.propW ?? 52, h = w * 1.9; c.fillStyle = "#111"; rr(c, -w / 2, -h, w, h, 10); c.fill(); so(); c.save(); rr(c, -w / 2 + 5, -h + 7, w - 10, h - 14, 6); c.clip(); if (p.screen) c.drawImage(p.screen, -w / 2 + 5, -h + 7, w - 10, h - 14); else { c.fillStyle = "#F5C400"; c.fillRect(-w / 2, -h, w, h); } c.restore(); }
  else if (kind === "coffee") { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-26, -58); c.lineTo(26, -58); c.lineTo(20, 0); c.lineTo(-20, 0); c.closePath(); c.fill(); so(); c.fillStyle = "#8a5a2b"; c.fillRect(-23, -58, 46, 14); c.fillStyle = "#c9462c"; c.fillRect(-23, -34, 44, 18); c.strokeStyle = "rgba(255,255,255,0.65)"; c.lineWidth = 4; const t = p.t || 0; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-8 + i * 16, -66); c.bezierCurveTo(-14 + i * 16 + Math.sin(t * 3 + i) * 6, -84, -2 + i * 16, -92, -8 + i * 16 + Math.sin(t * 3) * 6, -108); c.stroke(); } }
  else if (kind === "notebook") { c.rotate(-0.1); c.fillStyle = "#3f7d4e"; rr(c, -34, -88, 68, 92, 6); c.fill(); so(); c.fillStyle = "#e9dcc0"; c.fillRect(-26, -80, 56, 76); c.strokeStyle = "#d9a441"; c.lineWidth = 5; c.beginPath(); c.arc(14, -30, 14, 0, 7); c.stroke(); c.fillStyle = "#222"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-34, -78 + i * 14, 4, 0, 7); c.fill(); } if (p.soggy) { c.fillStyle = p.bgCol || "#cfe6ff"; c.beginPath(); c.arc(34, -88, 17, 0, 7); c.fill(); c.fillStyle = "#7fb8e8"; for (let i = 0; i < 3; i++) { const k = ((p.t || 0) * 1.6 + i * 0.37) % 1; c.beginPath(); c.ellipse(-16 + i * 20, 8 + k * 70, 5, 8, 0, 0, 7); c.globalAlpha = 1 - k; c.fill(); c.globalAlpha = 1; } } }
  else if (kind === "papers") { for (let i = 0; i < 4; i++) { c.save(); c.rotate((i - 1.5) * 0.08); c.fillStyle = "#f6f4ee"; rr(c, -34, -82 + i * -4, 68, 88, 3); c.fill(); so(); c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 2; for (let l = 0; l < 4; l++) { c.beginPath(); c.moveTo(-24, -64 + l * 14); c.lineTo(24, -64 + l * 14); c.stroke(); } c.restore(); } }
  else if (kind === "pen") { c.rotate(0.5); c.fillStyle = "#2a62c9"; rr(c, -6, -70, 12, 80, 5); c.fill(); so(); c.fillStyle = "#222"; c.beginPath(); c.moveTo(-6, 10); c.lineTo(6, 10); c.lineTo(0, 24); c.fill(); }
  else if (kind === "spoon") { c.rotate(0.3); c.fillStyle = "#8a5a2b"; rr(c, -5, -110, 10, 96, 5); c.fill(); so(); c.fillStyle = "#a8703a"; c.beginPath(); c.ellipse(0, -118, 20, 26, 0, 0, 7); c.fill(); so(); }
  c.restore();
}

// ── a person ────────────────────────────────────────────────────────────
// ch: look of the character. p: pose { x, y, scale, flip, walk, walkAmt, mouth, mood, blink, look, armL:[shoulder,elbow], armR:[shoulder,elbow], tilt, bounce, prop, propHand:"L"|"R", screen, sweat, t, jit:[dx,dy,rot] }
export function drawPuppet(c, ch, p, st) {
  const S = p.scale ?? 1, flip = p.flip ?? 1, O = st.outline, L = st.line, bw = ch.w ?? 1;
  const walk = p.walk || 0, amt = p.walkAmt || 0, sw = Math.sin(walk), bob = -Math.abs(sw) * 12 * amt + (p.bounce || 0);
  c.save(); const j = p.jit || [0, 0, 0]; c.translate(p.x + j[0], p.y + j[1]); c.rotate(j[2]); c.scale(S * flip, S * (p.squash ?? 1)); c.lineJoin = "round"; c.lineCap = "round";
  if (!p.noShadow) { c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(0, 4, 78 - Math.abs(bob) * 1.2, 15, 0, 0, 7); c.fill(); }
  if (st.shadow) { c.shadowColor = "rgba(40,20,0,0.42)"; c.shadowOffsetX = 5; c.shadowOffsetY = 7; c.shadowBlur = 0; }
  const fill = (col) => { c.fillStyle = col; c.fill(); if (O) { c.lineWidth = O; c.strokeStyle = L; c.stroke(); } };
  const limb = (x1, y1, x2, y2, w, col) => { if (O) { c.strokeStyle = L; c.lineWidth = w + O * 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  const hipY = -126;
  // back hair (long / ponytail) goes first so everything covers it
  const headY = -322 + bob * 0.7;
  if (ch.hairStyle === "ponytail" || ch.hairStyle === "long") {
    c.save(); c.translate(0, headY); c.rotate(p.tilt || 0);
    if (ch.hairStyle === "ponytail") { const sway = Math.sin((p.t || 0) * 3.4) * 0.12 + (amt ? Math.sin(walk) * 0.3 : 0); c.save(); c.translate(52, -34); c.rotate(0.9 + sway); c.beginPath(); c.ellipse(34, 0, 46, 20, 0, 0, 7); fill(ch.hair); c.restore(); }
    else { rr(c, -76, -56, 152, 128, 54); fill(ch.hair); }
    c.restore();
  }
  // legs
  for (const s of [-1, 1]) {
    const a = sw * s * 0.5 * amt, lift = Math.max(0, Math.sin(walk + (s > 0 ? Math.PI : 0))) * 20 * amt, hx = s * 25 * bw, hy = hipY + bob, fx = hx + Math.sin(a) * 120, fy = hy + Math.cos(a) * 120 - lift;
    limb(hx, hy, fx, fy - 12, 38 * bw, ch.pants);
    c.beginPath(); c.ellipse(fx + s * 7, fy - 8, 34, 18, 0, 0, 7); fill(ch.boots || "#3b2a20");
  }
  // torso
  c.save(); c.translate(0, bob);
  c.beginPath(); rr(c, -62 * bw, -262, 124 * bw, 142, 36); fill(ch.shirt);
  if (ch.apron) { c.beginPath(); rr(c, -50 * bw, -236, 100 * bw, 170, 18); fill(ch.apron); c.fillStyle = "rgba(0,0,0,0.06)"; c.fillRect(-30, -150, 60, 36); }
  if (ch.vest) { c.beginPath(); c.moveTo(-62 * bw, -250); c.lineTo(-20, -262); c.lineTo(0, -214); c.lineTo(20, -262); c.lineTo(62 * bw, -250); c.lineTo(62 * bw, -122); c.lineTo(-62 * bw, -122); c.closePath(); fill(ch.vest); c.fillStyle = "#e9f2ff"; c.fillRect(-62 * bw, -196, 124 * bw, 14); c.fillRect(-62 * bw, -158, 124 * bw, 14); if (O) { c.lineWidth = O * 0.5; c.strokeStyle = L; c.strokeRect(-62 * bw, -196, 124 * bw, 14); c.strokeRect(-62 * bw, -158, 124 * bw, 14); } }
  if (ch.tie) { c.beginPath(); c.moveTo(-12, -258); c.lineTo(12, -258); c.lineTo(16, -190); c.lineTo(0, -166); c.lineTo(-16, -190); c.closePath(); fill(ch.tie); }
  c.fillStyle = "#2a2018"; c.fillRect(-62 * bw, -138, 124 * bw, 14); if (O) { c.lineWidth = O * 0.6; c.strokeStyle = L; c.strokeRect(-62 * bw, -138, 124 * bw, 14); }
  if (ch.logo) { c.fillStyle = ch.logo; c.beginPath(); c.arc(-30 * bw, -226, 10, 0, 7); c.fill(); }
  if (st.halftone) { c.save(); c.beginPath(); rr(c, -62 * bw, -262, 124 * bw, 142, 36); c.clip(); c.fillStyle = "rgba(0,0,0,0.22)"; for (let y = -262; y < -120; y += 11) for (let x = 6 + ((y / 11) & 1) * 5; x < 62; x += 10) { const r = 1.5 + (x / 62) * 3 * ((y + 262) / 142); c.beginPath(); c.arc(x, y, r * 0.9, 0, 7); c.fill(); } c.restore(); }
  c.restore();
  // arms
  const arm = (s, pose, held) => {
    const sx = s * 66 * bw, sy = -244 + bob, a = pose?.[0] ?? (amt ? -sw * s * 0.55 * amt : 0.08), e = pose?.[1] ?? (amt ? 0.25 : 0.12);
    const ex = sx + s * Math.sin(a) * 64, ey = sy + Math.cos(a) * 64, a2 = a + e * (s === 1 ? 1 : 1), hx = ex + s * Math.sin(a2) * 58, hy = ey + Math.cos(a2) * 58;
    limb(sx, sy, ex, ey, 30, ch.sleeve || ch.shirt); limb(ex, ey, hx, hy - 0, 26, ch.skin);
    c.beginPath(); c.arc(hx, hy, 19, 0, 7); fill(ch.glove || ch.skin);
    if (held) { c.save(); c.translate(hx, hy); drawProp(c, p.prop, st, p); c.restore(); }
    return [hx, hy];
  };
  const aL = p.armL, aR = p.armR; const holdL = p.prop && p.propHand === "L", holdR = p.prop && p.propHand !== "L";
  arm(-1, aL, holdL); arm(1, aR, holdR);
  // neck + head
  c.fillStyle = ch.skin; c.beginPath(); rr(c, -16, -276 + bob * 0.8, 32, 28, 6); fill(ch.skin);
  c.save(); c.translate(0, headY); c.rotate(p.tilt || 0);
  c.beginPath(); c.ellipse(-64, 8, 13, 17, 0, 0, 7); fill(ch.skin); c.beginPath(); c.ellipse(64, 8, 13, 17, 0, 0, 7); fill(ch.skin);
  c.beginPath(); c.ellipse(0, 0, 66, 62, 0, 0, 7); fill(ch.skin);
  if (p.flush) { c.fillStyle = `rgba(255,70,50,${p.flush})`; c.beginPath(); c.ellipse(0, 0, 66, 62, 0, 0, 7); c.fill(); }
  c.fillStyle = "rgba(0,0,0,0.1)"; c.beginPath(); c.ellipse(0, 24, 7, 5, 0, 0, 7); c.fill(); // nose
  // beard
  if (ch.beard) { c.beginPath(); c.moveTo(-64, 12); c.quadraticCurveTo(-70, 74, 0, 80); c.quadraticCurveTo(70, 74, 64, 12); c.quadraticCurveTo(40, 30, 0, 28); c.quadraticCurveTo(-40, 30, -64, 12); c.closePath(); fill(ch.beard === true ? ch.hair : ch.beard); }
  drawFace(c, p, st, { brow: ch.brow || (ch.hair === "#f4f4f4" ? "#999" : "#2a1b12") });
  if (ch.stache) { c.beginPath(); c.ellipse(-16, 31, 22, 9, 0.2, 0, 7); fill(ch.hair); c.beginPath(); c.ellipse(16, 31, 22, 9, -0.2, 0, 7); fill(ch.hair); }
  if (ch.glasses) { c.strokeStyle = "#1a1a1f"; c.lineWidth = 5; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 28, 2, 24, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke(); }
  // hair on top
  const hat = ch.hat;
  if (ch.hairStyle && ch.hairStyle !== "bald") {
    if (ch.hairStyle === "ponytail" || ch.hairStyle === "long" || ch.hairStyle === "short") { c.beginPath(); c.ellipse(0, -26, 68, 42, 0, Math.PI, 0); c.lineTo(68, -22); c.quadraticCurveTo(36, -34, 4, -50); c.quadraticCurveTo(-30, -30, -68, -18); c.closePath(); if (!hat) fill(ch.hair); else { c.save(); c.beginPath(); c.rect(-70, -44, 20, 40); c.rect(50, -44, 20, 40); c.fillStyle = ch.hair; c.fill(); c.restore(); } }
    if (ch.hairStyle === "curly") { for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * 21, -50 + Math.abs(i) * 7, 24, 0, 7); fill(ch.hair); } }
  }
  if (hat) {
    const hs = ch.hatStyle || "hard";
    if (hs === "hard") { c.beginPath(); c.ellipse(0, -48, 72, 44, 0, Math.PI, 0); c.closePath(); fill(hat); c.beginPath(); rr(c, -90, -52, 180, 16, 8); fill(shade(hat, 0.88)); c.fillStyle = "rgba(255,255,255,0.28)"; c.beginPath(); c.ellipse(-22, -78, 20, 7, -0.4, 0, 7); c.fill(); c.strokeStyle = shade(hat, 0.82); c.lineWidth = 6; c.beginPath(); c.moveTo(0, -92); c.lineTo(0, -52); c.stroke(); }
    else if (hs === "chef") { c.beginPath(); rr(c, -52, -66, 104, 24, 6); fill("#fff"); for (const [x, y, r] of [[-38, -84, 28], [0, -104, 34], [38, -84, 28]]) { c.beginPath(); c.arc(x, y, r, 0, 7); fill("#fff"); } c.beginPath(); rr(c, -52, -66, 104, 24, 6); fill("#fff"); }
    else if (hs === "beanie") { c.beginPath(); c.ellipse(0, -44, 68, 40, 0, Math.PI, 0); c.closePath(); fill(hat); c.beginPath(); rr(c, -70, -50, 140, 18, 9); fill(shade(hat, 0.85)); }
  }
  c.restore();
  // little effects
  if (p.sweat) { const k = (p.t || 0) * 2 % 1; c.fillStyle = "#7fd0ff"; for (const [x, y] of [[84, -380], [-90, -360]]) { c.beginPath(); c.moveTo(x, y + k * 20 - 18); c.quadraticCurveTo(x + 13, y + k * 20 + 2, x, y + k * 20 + 10); c.quadraticCurveTo(x - 13, y + k * 20 + 2, x, y + k * 20 - 18); c.fill(); } }
  c.restore();
}

// ── talking objects: a notebook and a phone with faces (for the interview sketch) ──
export function drawTalker(c, kind, p, st) {
  const S = p.scale ?? 1, flip = p.flip ?? 1, O = st.outline, L = st.line, walk = p.walk || 0, amt = p.walkAmt || 0, bob = -Math.abs(Math.sin(walk)) * 10 * amt + (p.bounce || 0);
  c.save(); c.translate(p.x, p.y); c.scale(S * flip, S); c.lineJoin = "round"; c.lineCap = "round";
  if (!p.noShadow) { c.fillStyle = "rgba(0,0,0,0.16)"; c.beginPath(); c.ellipse(0, 4, 70, 13, 0, 0, 7); c.fill(); }
  const fill = (col) => { c.fillStyle = col; c.fill(); if (O) { c.lineWidth = O; c.strokeStyle = L; c.stroke(); } };
  const limb = (x1, y1, x2, y2, w, col) => { if (O) { c.strokeStyle = L; c.lineWidth = w + O * 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  const sw = Math.sin(walk);
  for (const s of [-1, 1]) { const a = sw * s * 0.5 * amt, hx = s * 30, hy = -120 + bob, fx = hx + Math.sin(a) * 118, fy = hy + Math.cos(a) * 118; limb(hx, hy, fx, fy - 10, 26, "#444"); c.beginPath(); c.ellipse(fx + s * 8, fy - 6, 32, 16, 0, 0, 7); fill("#262626"); }
  c.save(); c.translate(0, bob);
  const w = kind === "phone" ? 150 : 190, h = kind === "phone" ? 270 : 250;
  const arm = (s, pose) => { const sx = s * (w / 2), sy = -h * 0.55 - 40, a = pose?.[0] ?? 0.2, e = pose?.[1] ?? 0.2, ex = sx + s * Math.sin(a) * 52, ey = sy + Math.cos(a) * 52, hx = ex + s * Math.sin(a + e) * 46, hy = ey + Math.cos(a + e) * 46; limb(sx, sy, ex, ey, 18, "#555"); limb(ex, ey, hx, hy, 16, "#555"); c.beginPath(); c.arc(hx, hy, 15, 0, 7); fill("#f1c9a0"); };
  arm(-1, p.armL); arm(1, p.armR);
  if (kind === "notebook") {
    c.beginPath(); rr(c, -w / 2, -h - 120, w, h, 16); fill("#3f7d4e"); c.fillStyle = "#e9dcc0"; c.fillRect(-w / 2 + 16, -h - 108, w - 30, h - 24); if (O) { c.lineWidth = O * 0.6; c.strokeStyle = L; c.strokeRect(-w / 2 + 16, -h - 108, w - 30, h - 24); }
    c.fillStyle = "#222"; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(-w / 2, -h - 100 + i * 28, 7, 0, 7); c.fill(); }
    // coffee ring and a bite
    c.strokeStyle = "#c98b3a"; c.lineWidth = 7; c.beginPath(); c.arc(40, -h + 90, 30, 0, 7); c.stroke(); c.fillStyle = "#dcdfe3"; c.beginPath(); c.arc(w / 2 - 2, -h - 112, 24, 0, 7); c.fill();
    c.save(); c.translate(6, -h * 0.55 - 120 + 70); drawFace(c, { ...p }, st, { spacing: 30, eyeY: -8, mouthY: 30, browY: -34, brow: "#3a2a1a" }); c.restore();
    if (p.tie) { c.beginPath(); c.moveTo(-10, -90); c.lineTo(10, -90); c.lineTo(14, -40); c.lineTo(0, -22); c.lineTo(-14, -40); c.closePath(); fill(p.tie); }
  } else {
    c.beginPath(); rr(c, -w / 2, -h - 120, w, h, 28); fill("#16171a"); c.save(); rr(c, -w / 2 + 10, -h - 110, w - 20, h - 20, 20); c.clip(); const g = c.createLinearGradient(0, -h - 110, 0, -120); g.addColorStop(0, "#F5C400"); g.addColorStop(1, "#e0a800"); c.fillStyle = g; c.fillRect(-w / 2, -h - 120, w, h); c.restore();
    c.fillStyle = "#16171a"; rr(c, -26, -h - 106, 52, 10, 5); c.fill();
    c.save(); c.translate(0, -h * 0.55 - 120 + 30); drawFace(c, { ...p }, st, { spacing: 30, eyeY: -4, mouthY: 38, browY: -32 }); c.restore();
    // a hard hat on top
    c.beginPath(); c.ellipse(0, -h - 124, 62, 38, 0, Math.PI, 0); c.closePath(); fill("#ffffff"); c.beginPath(); rr(c, -78, -h - 128, 156, 14, 7); fill("#dedede");
  }
  c.restore(); c.restore();
}

// ── movement: keyed tracks. keys = [{ at, x, y, flip, ... }] sorted by time; a character stands at a key, then walks to the next one so it arrives exactly at that key's time ──
export function track(keys, t, speed = 380) {
  let cur = { ...keys[0], moving: false, walkAmt: 0, dist: 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i], dx = b.x - a.x, dy = (b.y ?? 0) - (a.y ?? 0), dist = Math.hypot(dx, dy), travel = Math.min(dist / speed, Math.max(0.01, b.at - a.at)), depart = b.at - travel;
    if (t >= b.at) { cur = { ...b, moving: false }; continue; }
    if (t < depart) { cur = { ...a, ...(b.pose && t >= b.at - 0.001 ? b.pose : {}) , moving: false }; break; }
    const u = ease((t - depart) / Math.max(0.01, travel)); cur = { ...a, x: lerp(a.x, b.x, u), y: lerp(a.y ?? 0, b.y ?? 0, u), moving: u > 0 && u < 1, flip: dx !== 0 ? (dx > 0 ? 1 : -1) : a.flip, dist: (dist * u) };
    cur.next = b; break;
  }
  return cur;
}
export const jitter = (t, id, st) => { if (!st.jitter) return [0, 0, 0]; const f = Math.floor(t * st.jitter); return [(rnd(f * 31 + id * 7 + 1) - 0.5) * 5, (rnd(f * 17 + id * 13 + 3) - 0.5) * 4, (rnd(f * 11 + id * 5 + 9) - 0.5) * 0.022]; };
export const qt = (t, st) => st.jitter ? Math.floor(t * st.jitter) / st.jitter : t;
// the blink schedule and a little idle life, per character seed
export const blinkAt = (t, seed) => { const ph = (t * 0.9 + seed * 1.7) % 3.1; return ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI) : 0; };

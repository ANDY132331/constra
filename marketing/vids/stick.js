// Stick-figure rig for the v2 videos: marker-on-paper people who run, fall, throw, dance and talk. Joint angles are degrees from straight down, positive = forward.
import { clamp, lerp, ease, easeOut, rnd } from "/engine.js";
const R = Math.PI / 180;

export const POSE = {
  idle: (t) => ({ lean: Math.sin(t * 2) * 1.5, aF: [8 + Math.sin(t * 2.1) * 4, 10], aB: [-6, 8], lF: [3, 4], lB: [-3, 4] }),
  walk: (t, a = 1) => { const s = Math.sin(t * 9); return { lean: 4 * a, aF: [-s * 34 * a, 18], aB: [s * 34 * a, 18], lF: [s * 32 * a, Math.max(0, -Math.cos(t * 9)) * 46 * a], lB: [-s * 32 * a, Math.max(0, Math.cos(t * 9)) * 46 * a] }; },
  run: (t) => { const s = Math.sin(t * 15); return { lean: 16, aF: [-s * 55, 80], aB: [s * 55, 80], lF: [s * 58, Math.max(0, -Math.cos(t * 15)) * 100], lB: [-s * 58, Math.max(0, Math.cos(t * 15)) * 100], hop: Math.abs(Math.sin(t * 15)) * 10 }; },
  cheer: (t) => ({ lean: -4, aF: [155 + Math.sin(t * 12) * 18, 10], aB: [-155 - Math.sin(t * 12 + 1) * 18, 10], lF: [14, 8], lB: [-14, 8], hop: Math.abs(Math.sin(t * 6)) * 26 }),
  dance: (t) => ({ lean: Math.sin(t * 8) * 10, aF: [90 + Math.sin(t * 8) * 60, 40], aB: [-90 - Math.sin(t * 8 + 2) * 60, 40], lF: [Math.sin(t * 8) * 26, Math.max(0, Math.sin(t * 8)) * 50], lB: [-Math.sin(t * 8) * 26, Math.max(0, -Math.sin(t * 8)) * 50], hop: Math.abs(Math.sin(t * 8)) * 20 }),
  panic: (t) => ({ lean: Math.sin(t * 20) * 6, aF: [150 + Math.sin(t * 24) * 20, 30], aB: [-150 - Math.sin(t * 22) * 20, 30], lF: [Math.sin(t * 20) * 14, 10], lB: [-Math.sin(t * 20) * 14, 10], hop: Math.abs(Math.sin(t * 10)) * 8 }),
  point: (t) => ({ lean: 3, aF: [92, 2], aB: [-8, 8], lF: [4, 4], lB: [-4, 4] }),
  hold: (t) => ({ lean: 2, aF: [70 + Math.sin(t * 3) * 3, 60], aB: [-6, 8], lF: [3, 4], lB: [-3, 4] }),
  shrug: (t) => ({ lean: 0, aF: [60, 100], aB: [-60, 100], lF: [3, 4], lB: [-3, 4] }),
  slump: (t) => ({ lean: 16, aF: [20, 6], aB: [-6, 6], lF: [2, 4], lB: [-2, 4] }),
  kick: (t) => ({ lean: -80, aF: [100, 20], aB: [-100, 20], lF: [60 + Math.sin(t * 22) * 40, 5], lB: [-40 - Math.sin(t * 22 + 1) * 30, 5] }),
  carry: (t, a = 1) => { const s = Math.sin(t * 9); return { lean: 3, aF: [70, 80], aB: [60, 80], lF: [s * 30 * a, Math.max(0, -Math.cos(t * 9)) * 40 * a], lB: [-s * 30 * a, Math.max(0, Math.cos(t * 9)) * 40 * a] }; },
};

// p: { x, y (feet), s, flip, col, lw, hat, hair, mood, mouth 0..1, pose (joint spec), rot (deg, about the feet), look [dx,dy], prop, boil, t, sweat, seed }
function _drawStick(c, p) {
  const S = p.s ?? 1, col = p.col ?? "#151617", lw = (p.lw ?? 9) * S, J = p.pose || POSE.idle(p.t || 0), lean = (J.lean || 0) * R, hop = (J.hop || 0) + (p.hop || 0);
  const frame = Math.floor((p.t || 0) * 12), b = p.boil ?? 1.6;
  const jx = (k) => (rnd(frame * 53 + (p.seed || 1) * 17 + k * 7 + 1) - 0.5) * b * 2;
  c.save(); c.translate(p.x, p.y - hop * S); c.rotate((p.rot || 0) * R); c.scale(S * (p.flip ?? 1), S * (p.sq ?? 1)); c.lineCap = "round"; c.lineJoin = "round";
  if (!p.noShadow) { c.save(); c.scale(1, 0.2); c.fillStyle = "rgba(0,0,0,0.13)"; c.beginPath(); c.arc(0, 0, 46 + hop * 0.6, 0, 7); c.fill(); c.restore(); }
  c.strokeStyle = col; c.lineWidth = lw / S; c.fillStyle = col;
  const H = [jx(1), -86 + jx(2)], torso = 66, sh = [H[0] + Math.sin(lean) * torso, H[1] - Math.cos(lean) * torso], hd = [sh[0] + Math.sin(lean) * 30, sh[1] - Math.cos(lean) * 30];
  const limb = (x, y, a1, l1, a2, l2, bendBack, k) => { const A1 = a1 * R, A2 = (a1 + (bendBack ? -a2 : a2)) * R; const x1 = x + Math.sin(A1) * l1 + jx(k), y1 = y + Math.cos(A1) * l1 + jx(k + 1), x2 = x1 + Math.sin(A2) * l2 + jx(k + 2), y2 = y1 + Math.cos(A2) * l2 + jx(k + 3); c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y1); c.lineTo(x2, y2); c.stroke(); return [x2, y2, A2]; };
  limb(H[0], H[1], J.lB[0], 40, J.lB[1], 42, true, 10); limb(H[0], H[1], J.lF[0], 40, J.lF[1], 42, true, 20);
  const handB = limb(sh[0], sh[1], J.aB[0], 34, J.aB[1], 32, false, 30);
  c.beginPath(); c.moveTo(H[0], H[1]); c.lineTo(sh[0], sh[1]); c.stroke();
  const handF = limb(sh[0], sh[1], J.aF[0], 34, J.aF[1], 32, false, 40);
  // head: white fill so the neck line hides behind it
  c.fillStyle = "#fffef8"; c.beginPath(); c.arc(hd[0], hd[1], 25, 0, 7); c.fill(); c.stroke();
  if (p.hair === "braids") { c.lineWidth = 5; for (let i = 0; i < 5; i++) { const a = 1.8 + i * 0.34, x0 = hd[0] + Math.cos(a) * 24, y0 = hd[1] + Math.sin(a) * 24; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 - 6 + i, y0 + 22, x0 - 4 + Math.sin((p.t || 0) * 4 + i) * 5, y0 + 44); c.stroke(); } c.lineWidth = lw / S; }
  if (p.hair === "pony") { c.beginPath(); c.moveTo(hd[0] - 22, hd[1] - 8); c.quadraticCurveTo(hd[0] - 52, hd[1] - 4 + Math.sin((p.t || 0) * 6) * 8, hd[0] - 48, hd[1] + 34); c.stroke(); }
  if (p.hat) { c.fillStyle = p.hat; c.beginPath(); c.arc(hd[0], hd[1] - 4, 26, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(hd[0] - 31, hd[1] - 4); c.lineTo(hd[0] + 31, hd[1] - 4); c.stroke(); }
  // face
  const mood = p.mood || "neutral", look = p.look || [0.4, 0], ex = hd[0] + look[0] * 3, ey = hd[1] - 2 + look[1] * 3 + (p.hat ? 3 : 0);
  c.fillStyle = col; const bl = (p.blink ?? ((p.t || 0) * 1.1 % 3.4 < 0.12)) ? 0.15 : 1;
  const eyeR = mood === "shock" ? 4.6 : 3.6;
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(ex + s * 9, ey, eyeR, eyeR * bl, 0, 0, 7); c.fill(); }
  c.lineWidth = 3.4; const by = ey - 9 - (mood === "shock" ? 4 : 0);
  const bs = mood === "angry" ? -4 : mood === "sad" ? 4 : 0; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(ex + s * 9 - 6, by + (s === -1 ? -bs : bs) * 0.5 * -1); c.lineTo(ex + s * 9 + 6, by + (s === -1 ? bs : -bs) * 0.5 * -1); if (mood !== "neutral" && mood !== "happy") c.stroke(); }
  const mo = hd[1] + 11, m = p.mouth || 0;
  if (m > 0.1 || mood === "shock") { const mm = mood === "shock" ? Math.max(m, 0.8) : m; c.fillStyle = "#7a1830"; c.beginPath(); c.ellipse(hd[0] + look[0] * 2, mo, 7 + mm * 3, 3 + mm * 9, 0, 0, 7); c.fill(); c.stroke(); }
  else { c.beginPath(); if (mood === "sad") { c.moveTo(hd[0] - 8, mo + 4); c.quadraticCurveTo(hd[0], mo - 4, hd[0] + 8, mo + 4); } else if (mood === "happy" || mood === "smug") { c.moveTo(hd[0] - 9, mo - 1); c.quadraticCurveTo(hd[0], mo + 9, hd[0] + 9, mo - 1); } else if (mood === "angry") { c.moveTo(hd[0] - 8, mo + 2); c.lineTo(hd[0] + 8, mo + 2); } else { c.moveTo(hd[0] - 7, mo + 1); c.lineTo(hd[0] + 7, mo + 1); } c.stroke(); }
  if (p.sweat) { c.fillStyle = "#58b8ff"; const k = ((p.t || 0) * 2) % 1; for (const sd of [-1, 1]) { const sx = hd[0] + sd * 36, sy = hd[1] - 20 + k * 22; c.beginPath(); c.moveTo(sx, sy - 12); c.quadraticCurveTo(sx + 8, sy + 2, sx, sy + 8); c.quadraticCurveTo(sx - 8, sy + 2, sx, sy - 12); c.fill(); } }
  // what is in the front hand
  if (p.prop) { c.save(); c.translate(handF[0], handF[1]); c.rotate(handF[2] * -1 * 0 + (p.propRot || 0)); drawProp(c, p.prop, p, lw / S); c.restore(); }
  c.restore();
  return { hx: p.x + (hd[0] * Math.cos((p.rot || 0) * R) - hd[1] * Math.sin((p.rot || 0) * R)) * S * (p.flip ?? 1), hy: p.y - hop * S + (hd[0] * Math.sin((p.rot || 0) * R) + hd[1] * Math.cos((p.rot || 0) * R)) * S };
}

function drawProp(c, kind, p, lw) {
  c.lineWidth = 5; c.strokeStyle = "#151617";
  if (kind === "phone") { c.fillStyle = "#151617"; c.beginPath(); c.roundRect(-14, -56, 28, 52, 6); c.fill(); c.fillStyle = p.screen || "#F5C400"; c.beginPath(); c.roundRect(-10, -52, 20, 42, 3); c.fill(); }
  else if (kind === "paper") { c.fillStyle = "#fff"; c.beginPath(); c.rect(-22, -60, 44, 56); c.fill(); c.stroke(); c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-14, -48 + i * 11); c.lineTo(14, -48 + i * 11); c.stroke(); } }
  else if (kind === "stack") { for (let i = 0; i < (p.stackN || 4); i++) { c.fillStyle = "#fff"; c.beginPath(); c.rect(-26 + (i % 2) * 3, -14 - i * 10, 52, 10); c.fill(); c.stroke(); } }
  else if (kind === "coffee") { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-14, -34); c.lineTo(14, -34); c.lineTo(10, 0); c.lineTo(-10, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#c9462c"; c.fillRect(-12, -22, 24, 10); }
  else if (kind === "bag") { c.fillStyle = "#8a5a2b"; c.beginPath(); c.roundRect(-24, -44, 48, 40, 6); c.fill(); c.stroke(); c.beginPath(); c.arc(0, -46, 14, Math.PI, 0); c.stroke(); }
  else if (kind === "hammer") { c.fillStyle = "#8a5a2b"; c.fillRect(-4, -62, 8, 62); c.fillStyle = "#9aa3ad"; c.fillRect(-18, -72, 36, 16); c.strokeRect(-18, -72, 36, 16); }
  else if (kind === "sign") { c.fillStyle = "#fff"; c.beginPath(); c.rect(-44, -110, 88, 56); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.fillRect(-3, -54, 6, 54); c.font = "800 22px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(p.signText || "", 0, -82); }
}

export const paper = (c, x, y, rot, s = 1, col = "#fffef8") => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.fillStyle = col; c.strokeStyle = "#151617"; c.lineWidth = 3.4; c.beginPath(); c.rect(-26, -32, 52, 64); c.fill(); c.stroke(); c.lineWidth = 2; c.strokeStyle = "rgba(21,22,23,0.55)"; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-17, -20 + i * 10); c.lineTo(17 - (i % 2) * 8, -20 + i * 10); c.stroke(); } c.restore(); };

// lined notebook paper background with a red margin and a hand-drawn floor line
export function notebookBg(c, W, H, gy, t, o = {}) {
  c.fillStyle = o.bg || "#f6f1e3"; c.fillRect(-60, -60, W + 120, H + 120); c.strokeStyle = "rgba(70,120,190,0.28)"; c.lineWidth = 2; for (let y = 90; y < H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.strokeStyle = "rgba(220,70,70,0.45)"; c.lineWidth = 3; c.beginPath(); c.moveTo(W * 0.1, 0); c.lineTo(W * 0.1, H); c.stroke();
  c.fillStyle = "rgba(120,100,70,0.2)"; for (let y = 160; y < H - 100; y += 330) { c.beginPath(); c.arc(30, y, 13, 0, 7); c.fill(); }
  const fr = Math.floor(t * 8); c.strokeStyle = "#151617"; c.lineWidth = 8; c.lineCap = "round"; c.beginPath(); c.moveTo(-20, gy); for (let x = 0; x <= W + 20; x += 40) c.lineTo(x, gy + (rnd(fr * 3 + x) - 0.5) * 5); c.stroke();
}

// Character kinds: "skeleton" (bones and a skull) and "robot" (steel body, visor eyes, antenna). Anything else is the plain marker stickman.
export function drawStick(c, p) {
  if (!p.kind) return _drawStick(c, p);
  const S = p.s ?? 1, fl = p.flip ?? 1, t = p.t || 0, sk = p.kind === "skeleton";
  const base = { ...p, kind: null, hat: sk ? p.hat : null, hair: null };
  // pass 1: dark outline, pass 2: the coloured body
  _drawStick(c, { ...base, col: "#151617", lw: (p.lw ?? 9) + 5, noFace: true });
  const pos = _drawStick(c, { ...base, col: sk ? "#f1ecdb" : "#8d98a8", noShadow: true, mood: "neutral", mouth: 0, sweat: false, hat: null });
  const hx = pos.hx, hy = pos.hy, r = 27 * S, m = Math.min(1, p.mouth || 0);
  c.save(); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = "#151617"; c.lineWidth = 6 * S;
  const hipY = p.y - ((p.pose?.hop || 0) + (p.hop || 0)) * S - 86 * S;
  if (sk) {
    // ribs
    c.strokeStyle = "#151617"; c.lineWidth = 7 * S; for (let i = 0; i < 4; i++) { const yy = hipY + (hy - hipY) * (0.28 + i * 0.16), w = (26 - i * 3) * S; c.beginPath(); c.moveTo(hx - w * 0.5 + (hipY - hy) * 0.0, yy); c.lineTo(hx + w * 0.5, yy); c.stroke(); } c.strokeStyle = "#f1ecdb"; c.lineWidth = 3.4 * S; for (let i = 0; i < 4; i++) { const yy = hipY + (hy - hipY) * (0.28 + i * 0.16), w = (26 - i * 3) * S; c.beginPath(); c.moveTo(hx - w * 0.5, yy); c.lineTo(hx + w * 0.5, yy); c.stroke(); }
    // skull
    c.strokeStyle = "#151617"; c.lineWidth = 6 * S; c.fillStyle = "#f1ecdb"; c.beginPath(); c.arc(hx, hy - 2 * S, r * 0.95, 0, 7); c.fill(); c.stroke();
    if (p.hat) { c.fillStyle = p.hat; c.beginPath(); c.arc(hx, hy - 6 * S, r, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(hx - r * 1.2, hy - 6 * S); c.lineTo(hx + r * 1.2, hy - 6 * S); c.stroke(); }
    c.fillStyle = "#151617"; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(hx + sd * 10 * S + fl * 2 * S, hy + 1 * S, 7 * S, (p.mood === "shock" ? 10 : 8) * S, 0, 0, 7); c.fill(); }
    c.beginPath(); c.moveTo(hx + fl * 2 * S, hy + 10 * S); c.lineTo(hx + fl * 2 * S - 3 * S, hy + 17 * S); c.lineTo(hx + fl * 2 * S + 3 * S, hy + 17 * S); c.closePath(); c.fill();
    // jaw with teeth that opens when talking
    const jy = hy + 20 * S + m * 9 * S; c.fillStyle = "#f1ecdb"; c.beginPath(); c.roundRect(hx - 13 * S, jy - 6 * S, 26 * S, 12 * S, 4 * S); c.fill(); c.stroke(); c.lineWidth = 2.4 * S; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(hx + i * 5 * S, jy - 6 * S); c.lineTo(hx + i * 5 * S, jy + 6 * S); c.stroke(); }
  } else {
    // steel chest plate and a yellow light
    c.fillStyle = "#8d98a8"; c.lineWidth = 6 * S; const cy = hipY + (hy - hipY) * 0.52; c.beginPath(); c.roundRect(hx - 24 * S, cy - 30 * S, 48 * S, 60 * S, 8 * S); c.fill(); c.stroke(); c.fillStyle = "#F5C400"; c.beginPath(); c.arc(hx, cy, 8 * S + Math.sin(t * 6) * S, 0, 7); c.fill(); c.stroke();
    // square head with visor
    c.fillStyle = "#c5cdd8"; c.beginPath(); c.roundRect(hx - r, hy - r + 2 * S, r * 2, r * 1.8, 8 * S); c.fill(); c.stroke();
    c.fillStyle = "#151617"; c.beginPath(); c.roundRect(hx - r * 0.82, hy - 8 * S, r * 1.64, 18 * S, 6 * S); c.fill(); c.fillStyle = p.mood === "angry" ? "#ff4a3a" : "#5af0c8"; const bl = (t * 1.2 % 3.6 < 0.12) ? 0.2 : 1; for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(hx + sd * 11 * S, hy + 1 * S, 5 * S, 5 * S * bl, 0, 0, 7); c.fill(); }
    // mouth grille that lights up with speech
    c.strokeStyle = "#151617"; c.lineWidth = 3 * S; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(hx + i * 6 * S, hy + 16 * S); c.lineTo(hx + i * 6 * S, hy + (16 + 5 + m * 7) * S); c.stroke(); }
    // antenna
    c.lineWidth = 5 * S; c.beginPath(); c.moveTo(hx, hy - r + 2 * S); c.lineTo(hx + Math.sin(t * 5) * 3 * S, hy - r - 18 * S); c.stroke(); c.fillStyle = "#e0301e"; c.beginPath(); c.arc(hx + Math.sin(t * 5) * 3 * S, hy - r - 22 * S, 6 * S, 0, 7); c.fill(); c.stroke();
  }
  c.restore(); return pos;
}

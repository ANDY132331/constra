import { clamp, lerp, ease, easeOut, easeBack, loadImg, rnd } from "/engine.js";

// "The Contractor: A Field Guide" - a nature-documentary parody drawn as a living blueprint. Line-work draws itself, a dry British narrator explains.
const INK = "#eaf4ff", DIM = "rgba(234,244,255,0.5)", YEL = "#F5C400", BG1 = "#0c4a8a", BG2 = "#082a55";
let ICON;
const SEG_FIG = ["FIG. 1  THE CONTRACTOR", "FIG. 2  THE CREW, AT DAWN", "FIG. 3  THE QUESTION", "FIG. 4  THE NOTEBOOK", "FIG. 5  FRIDAY EVENING", "FIG. 6  A NEW SPECIES", "FIG. 7  CLOCK-IN, OBSERVED", "FIG. 8  THE HOURS", "FIG. 9  THE TIMESHEET", "FIG. 10  THE TOOLKIT", "FIG. 11  NO SIGNAL", "FIG. 12  HOME FOR DINNER", ""];

function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// stroke a polyline only up to fraction p of its length (the "drawing itself" look)
function trace(c, pts, p, close = false) {
  const P = close ? [...pts, pts[0]] : pts; let total = 0; const seg = []; for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); total += l; }
  let rem = total * clamp(p); if (rem <= 0) return; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) { if (rem >= seg[i - 1]) { c.lineTo(P[i][0], P[i][1]); rem -= seg[i - 1]; } else { const u = rem / seg[i - 1]; c.lineTo(lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)); rem = 0; break; } } c.stroke();
}
const hand = (c, txt, x, y, size, col = INK, rot = 0, a = 1) => { c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a; c.fillStyle = col; c.font = `700 ${size}px Caveat, cursive`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 0); c.restore(); };

export default {
  endHold: 2.6, lead: 0.4, reverb: 0.2, room: 1.1, bedGain: 0.55, duckTo: 0.45,
  voices: { Narrator: { pan: 0, gain: 1.05 } },
  async init() { ICON = await loadImg("/icon.png"); },

  draw(t, c, E) {
    const { W, H, V } = E, N = E.lines.length;
    // ── blueprint paper
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, BG1); g.addColorStop(1, BG2); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.lineWidth = 1; for (let x = 0; x < W; x += 40) { c.strokeStyle = x % 200 === 0 ? "rgba(234,244,255,0.16)" : "rgba(234,244,255,0.065)"; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 40) { c.strokeStyle = y % 200 === 0 ? "rgba(234,244,255,0.16)" : "rgba(234,244,255,0.065)"; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,10,30,0.55)"); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(36, 36, W - 72, H - 72); c.lineWidth = 1; c.strokeRect(48, 48, W - 96, H - 96);

    let k = 0; for (let i = 0; i < N; i++) if (t >= E.L(i) - 0.35) k = i; const t0 = E.L(k) - 0.35, tEnd = k + 1 < N ? E.L(k + 1) - 0.35 : E.DURATION, u = t - t0, len = tEnd - t0, p = clamp(u / Math.max(2, len * 0.8));
    // the stage: a square drawing area, centered high in the vertical format
    const S = V ? 1.12 : 0.86, cx = V ? W / 2 : W * 0.5, cy = V ? H * 0.43 : H * 0.46;
    c.save(); c.lineCap = "round"; c.lineJoin = "round"; c.translate(cx, cy); c.scale(S, S);
    const A = { c, t, u, p, k, E, V, S };
    [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12][k](A);
    c.restore();

    // figure label + title block
    const fig = SEG_FIG[k]; if (fig) { c.globalAlpha = easeOut(u / 0.4); c.fillStyle = YEL; c.font = `700 ${V ? 30 : 24}px 'IBM Plex Mono', monospace`; c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillText(fig, 84, V ? 112 : 100); c.globalAlpha = 1; }
    c.fillStyle = DIM; c.font = `500 ${V ? 22 : 18}px 'IBM Plex Mono', monospace`; c.textAlign = "right"; c.fillText("DRAWN BY: CONSTRA   SCALE: NTS   SHEET A-1", W - 84, H - 72);
    // captions
    E.caption(c, t, { y: V ? H * 0.865 : H * 0.88, size: V ? 56 : 48, hi: YEL, stroke: "rgba(4,22,52,0.9)", maxW: V ? W - 170 : W * 0.7, font: "'Barlow Condensed', sans-serif" });
  },

  audio(h, E) {
    const { note, kick, snare, burst, ding, tone } = h; const D = E.DURATION;
    // documentary bed: slow minor strings (detuned saws through a low-pass), a soft pulse that wakes up at the reveal
    const prog = [[196, 233.1, 293.7], [174.6, 220, 261.6], [155.6, 196, 233.1], [164.8, 207.7, 246.9]]; const BAR = 4.2; const rev = E.L(5) - 0.3;
    for (let b = 0; b * BAR < D; b++) { const t0 = b * BAR, ch = prog[b % 4]; for (const f of ch) { note(f, t0, BAR * 1.05, "sawtooth", 0.028, 700); note(f * 1.004, t0, BAR * 1.05, "sawtooth", 0.022, 700); } note(ch[0] / 2, t0, BAR, "sine", 0.2, 200);
      if (t0 < rev) { for (let q = 0; q < 4; q++) note(ch[q % 3] * 2, t0 + q * BAR / 4 + 0.05, 0.5, "triangle", 0.04, 1800); }
      else { const BEAT = BAR / 8; for (let q = 0; q < 8; q++) { note(ch[[0, 1, 2, 1, 2, 1, 0, 1][q]] * 2, t0 + q * BEAT, 0.22, "triangle", 0.05, 2800); } kick(t0, 0.15); kick(t0 + BAR / 2, 0.13); snare(t0 + BAR / 4, 0.03); snare(t0 + BAR * 0.75, 0.03); } }
    // pencil scratch under each drawing, a thunk for stamps, a sparkle at the reveal
    for (let i = 0; i < E.N; i++) { const a = E.L(i) - 0.3; burst(a + 0.1, [3500, 5200], 1.5, 0.9, 0.025, "bandpass", h.comp); }
    burst(rev, [300, 5000], 0.6, 0.6, 0.12); for (let q = 0; q < 6; q++) ding(rev + 0.2 + q * 0.07, 784 * Math.pow(1.25, q), 0.07);
    const iStamp = E.W_(8, /single/, 0.5); tone([160, 50], iStamp + 0.5, 0.3, 0.45, "sine"); burst(iStamp + 0.5, [800, 200], 0.8, 0.25, 0.2);
    const iHome = E.L(11) + 1.4; ding(iHome, 1175, 0.08); ding(iHome + 0.12, 1568, 0.08);
  },
};

// ── iso helpers ────────────────────────────────────────────────────────
const ISO = (x, y, z = 0, s = 1) => [(x - y) * 0.866 * s, (x + y) * 0.5 * s - z * s];
function box(c, x, y, w, d, hgt, p, s = 1, col = INK) {
  const P = (a, b, z) => ISO(a, b, z, s); c.strokeStyle = col; c.lineWidth = 3;
  const fl = [P(x, y, 0), P(x + w, y, 0), P(x + w, y + d, 0), P(x, y + d, 0)]; trace(c, fl, clamp(p * 3), true);
  for (const [a, b] of [[x, y], [x + w, y], [x + w, y + d], [x, y + d]]) { const [px, py] = P(a, b, 0), [qx, qy] = P(a, b, hgt); trace(c, [[px, py], [qx, qy]], clamp(p * 3 - 1)); }
  const top = [P(x, y, hgt), P(x + w, y, hgt), P(x + w, y + d, hgt), P(x, y + d, hgt)]; trace(c, top, clamp(p * 3 - 2), true);
  if (p > 0.95) { c.lineWidth = 1.5; c.strokeStyle = DIM; for (let z = hgt / 3; z < hgt; z += hgt / 3) { trace(c, [P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], 1); } }
}
const SITES = [{ x: -150, y: -60, name: "DUNDAS ST", h: 120 }, { x: 70, y: -170, name: "QUEEN ST", h: 160 }, { x: 40, y: 80, name: "HARBOURFRONT", h: 90 }];
function ground(c, p, s = 1) { c.strokeStyle = "rgba(234,244,255,0.28)"; c.lineWidth = 1.5; for (let i = -6; i <= 6; i++) { const a = i * 80; trace(c, [ISO(a, -480, 0, s), ISO(a, 480, 0, s)], clamp(p * 2 - Math.abs(i) * 0.05)); trace(c, [ISO(-480, a, 0, s), ISO(480, a, 0, s)], clamp(p * 2 - Math.abs(i) * 0.05)); } }
function crewDot(c, x, y, col, r = 9) { c.fillStyle = col; c.strokeStyle = "#06244c"; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); }
// scene 0: the title, a lone building draws itself
function s0({ c, t, u, p, E }) {
  box(c, -80, -80, 160, 160, 190, easeOut(p * 1.2), 1.3);
  const a = easeOut((u - 0.6) / 0.6); c.globalAlpha = a; c.textAlign = "center"; c.fillStyle = INK; c.font = `800 124px 'Barlow Condensed', sans-serif`; c.fillText("THE CONTRACTOR", 0, -420); c.fillStyle = YEL; c.font = `800 76px 'Barlow Condensed', sans-serif`; c.fillText("A FIELD GUIDE", 0, -340); c.globalAlpha = 1;
  hand(c, "(hard hat, usually worn)", 190, -60, 44, YEL, 0.1, easeOut((u - 3.2) / 0.5)); const ax = easeOut((u - 3.2) / 0.5); if (ax > 0) { c.strokeStyle = YEL; c.lineWidth = 3; trace(c, [[120, -80], [96, -120], [70, -150]], ax); }
}
function sites(A, labels = true, pins = 0, alive = 0) {
  const { c, t, p, u } = A; ground(c, easeOut(p), 1); SITES.forEach((s, i) => { box(c, s.x, s.y, 110, 110, s.h, clamp(p * 1.6 - i * 0.25), 1); if (labels && p > 0.6 + i * 0.1) { const [lx, ly] = ISO(s.x + 55, s.y + 55, s.h + 70, 1); hand(c, s.name, lx, ly, 46, INK, -0.03, easeOut((p - 0.6 - i * 0.1) / 0.2)); } });
}
// scene 1: three sites and six crew dots drifting between them
function s1(A) { const { c, t, u, p } = A; sites(A); if (u > 2.5) { for (let i = 0; i < 6; i++) { const a = SITES[i % 3], b = SITES[(i + 1 + (i > 2 ? 1 : 0)) % 3]; const ph = (t * 0.12 + i * 0.17) % 1, e = ease(Math.abs(ph * 2 - 1)); const [ax, ay] = ISO(a.x + 55, a.y + 55 + 30, 0), [bx, by] = ISO(b.x + 55, b.y + 55 + 30, 0); crewDot(c, lerp(ax, bx, e) + (i - 3) * 3, lerp(ay, by, e) - 6, "#fff"); } hand(c, "6 workers", 280, 330, 48, YEL, 0.06, easeOut((u - 2.5) / 0.4)); } }
// scene 2: "Who is where?" question marks over every building
function s2(A) { const { c, t, u, p } = A; sites(A, true); for (let i = 0; i < 3; i++) { const s = SITES[i], a = easeBack((u - 0.5 - i * 0.35) / 0.4); if (a <= 0) continue; const [qx, qy] = ISO(s.x + 55, s.y + 55, s.h + 150, 1); c.save(); c.translate(qx, qy + Math.sin(t * 3 + i) * 8); c.rotate(Math.sin(t * 2 + i) * 0.12); c.scale(a, a); c.fillStyle = YEL; c.font = `800 190px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("?", 0, 0); c.restore(); } }
// scene 3: the notebook, with a coffee ring and rain damage
function s3({ c, t, u, p }) {
  c.save(); c.rotate(-0.06); c.strokeStyle = INK; c.lineWidth = 3.5; trace(c, [[-230, -330], [230, -330], [230, 330], [-230, 330]], clamp(u / 1.4), true);
  for (let i = 0; i < 9; i++) { const y = -250 + i * 62; c.strokeStyle = "rgba(234,244,255,0.3)"; c.lineWidth = 1.5; trace(c, [[-210, y], [210, y]], clamp((u - 1 - i * 0.1) / 0.5)); }
  c.strokeStyle = INK; c.lineWidth = 2.5; for (let i = 0; i < 9; i++) { const y = -250 + i * 62; const sc = clamp((u - 1.6 - i * 0.18) / 0.6); if (sc > 0) { const pts = []; for (let j = 0; j <= 14; j++) pts.push([-190 + j * 12, y - 12 + Math.sin(j * 1.7 + i) * 8 + (rnd(i * 17 + j) - 0.5) * 6]); trace(c, pts, sc * (0.5 + 0.5 * rnd(i + 3))); } }
  // coffee rings
  const cf = clamp((u - 5) / 0.6); if (cf > 0) { c.strokeStyle = "#d9a441"; c.lineWidth = 6; c.globalAlpha = 0.9 * cf; for (let r = 0; r < 2; r++) { c.beginPath(); for (let a = 0; a <= 6.1 * cf; a += 0.1) { const rad = 95 + r * 6 + Math.sin(a * 5 + r) * 3; const x = 90 + Math.cos(a) * rad, y = 70 + Math.sin(a) * rad; a === 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); } c.globalAlpha = 1; }
  // rain damage: drips
  const rn = clamp((u - 7.5) / 1); if (rn > 0) { c.strokeStyle = "rgba(160,205,255,0.9)"; c.lineWidth = 4; for (let i = 0; i < 6; i++) { const x = -170 + i * 62, l = (50 + rnd(i + 9) * 90) * rn; trace(c, [[x, -330], [x + 6, -330 + l]], 1); c.fillStyle = "rgba(160,205,255,0.9)"; c.beginPath(); c.arc(x + 6, -330 + l + 8, 7, 0, 7); c.fill(); } }
  c.restore();
  hand(c, "coffee", 310, 150, 54, "#d9a441", 0.1, easeOut((u - 5.4) / 0.4)); hand(c, "rain", -290, -250, 54, "#a8d4ff", -0.15, easeOut((u - 8) / 0.4)); hand(c, "who wrote this?", -250, 370, 54, YEL, -0.04, easeOut((u - 10) / 0.4));
}
// scene 4: Friday, the clock runs fast into the evening
function s4({ c, t, u, p }) {
  c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(0, -40, 300, 0, 7 * clamp(u / 1.2)); c.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 - 1.5708; c.lineWidth = i % 3 ? 3 : 6; trace(c, [[Math.cos(a) * 270, -40 + Math.sin(a) * 270], [Math.cos(a) * 292, -40 + Math.sin(a) * 292]], clamp(u - 1)); }
  const sp = 5 + Math.min(u, 12) * 0.6, hr = 16 + u * 0.14, mn = u * 5.2; c.strokeStyle = YEL; c.lineWidth = 11; const hh = (hr / 12) * 6.283 - 1.5708, mm = (mn / 60) * 6.283 - 1.5708; trace(c, [[0, -40], [Math.cos(hh) * 160, -40 + Math.sin(hh) * 160]], 1); c.lineWidth = 7; trace(c, [[0, -40], [Math.cos(mm) * 240, -40 + Math.sin(mm) * 240]], 1); c.fillStyle = YEL; c.beginPath(); c.arc(0, -40, 14, 0, 7); c.fill();
  // moon
  const mo = easeOut((u - 3) / 1); if (mo > 0) { c.save(); c.translate(250, -330); c.globalAlpha = mo; c.fillStyle = INK; c.beginPath(); c.arc(0, 0, 70, 0, 7); c.fill(); c.fillStyle = BG1; c.beginPath(); c.arc(28, -12, 62, 0, 7); c.fill(); c.restore(); }
  // a stack of timesheets grows
  for (let i = 0; i < 6; i++) { const a = easeBack((u - 1.5 - i * 0.6) / 0.35); if (a <= 0) continue; c.save(); c.translate(-30 + (i % 2) * 30, 330 - i * 14); c.rotate((i - 2.5) * 0.04); c.scale(a, a); c.fillStyle = "rgba(234,244,255,0.1)"; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -170, -26, 340, 52, 8); c.fill(); c.stroke(); c.restore(); }
  hand(c, "still going...", 280, 360, 54, YEL, -0.08, easeOut((u - 7) / 0.5));
}
// scene 5: the reveal
function s5({ c, t, u, p, E }) {
  const a = easeOut(u / 1.4); c.strokeStyle = INK; c.lineWidth = 6; rr(c, -190, -380, 380, 760, 60); trace(c, [[-190, -330], [-190, -380], [190, -380], [190, 380], [-190, 380], [-190, -330]], clamp(u / 1.6)); c.save(); c.beginPath(); rr(c, -190, -380, 380, 760, 60); c.restore();
  const ia = easeBack((u - 1.4) / 0.6), sz = 190 * ia; if (ICON && ia > 0) { c.save(); c.shadowColor = "rgba(245,196,0,0.6)"; c.shadowBlur = 60; c.drawImage(ICON, -sz / 2, -190 - sz / 2, sz, sz); c.restore(); }
  const ta = easeBack((u - 2.0) / 0.6); c.save(); c.translate(0, 40); c.scale(clamp(ta, 0, 1.1), clamp(ta, 0, 1.1)); c.fillStyle = INK; c.textAlign = "center"; c.font = `800 120px 'Barlow Condensed', sans-serif`; c.fillText("CONSTRA", 0, 0); c.restore();
  // sparkle rays
  const sp = clamp((u - 1.4) / 1.2); c.strokeStyle = YEL; c.lineWidth = 4; for (let i = 0; i < 14; i++) { const ang = i / 14 * 6.283, r0 = 250 + sp * 30, r1 = r0 + 60 * Math.sin(sp * Math.PI); trace(c, [[Math.cos(ang) * r0 * 1.2, -40 + Math.sin(ang) * r0 * 1.2], [Math.cos(ang) * r1 * 1.3, -40 + Math.sin(ang) * r1 * 1.3]], 1); }
}
// scene 6: the map lights up
function s6(A) { const { c, t, u, p } = A; sites(A, true); SITES.forEach((s, i) => { const at = 1.2 + i * 1.6, a = easeBack((u - at) / 0.4); if (a <= 0) return; const [px, py] = ISO(s.x + 55, s.y + 55, s.h + 40, 1); c.save(); c.translate(px, py - (1 - clamp(a)) * 120); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.fillStyle = YEL; c.beginPath(); c.arc(0, -40, 34, 0, 7); c.fill(); c.beginPath(); c.moveTo(-22, -22); c.lineTo(0, 22); c.lineTo(22, -22); c.fill(); c.fillStyle = "#1a1600"; c.beginPath(); c.arc(0, -40, 13, 0, 7); c.fill(); c.restore();
    const rg = ((u - at - 0.3) % 1.6) / 1.6; if (u > at + 0.3) { const [gx, gy] = ISO(s.x + 55, s.y + 55, 0, 1); c.strokeStyle = `rgba(245,196,0,${1 - rg})`; c.lineWidth = 4; c.beginPath(); c.ellipse(gx, gy, 40 + rg * 120, 20 + rg * 60, 0, 0, 7); c.stroke(); }
    // photo thumbnail
    const ph = easeBack((u - at - 0.5) / 0.4); if (ph > 0) { c.save(); c.translate(px + 70, py - 70); c.rotate(0.1 + i * 0.04); c.scale(clamp(ph, 0, 1.1), clamp(ph, 0, 1.1)); c.fillStyle = "#fff"; c.fillRect(-42, -42, 84, 94); c.fillStyle = "#0c4a8a"; c.fillRect(-36, -36, 72, 66); c.fillStyle = YEL; c.beginPath(); c.arc(0, -12, 12, 0, 7); c.fill(); c.fillRect(-14, 4, 28, 20); c.restore(); } });
  if (u > 5) for (let i = 0; i < 6; i++) { const s = SITES[i % 3], [x, y] = ISO(s.x + 20 + (i >> 1) * 28, s.y + 120, 0, 1); crewDot(c, x, y, YEL); } }
// scene 7: the hours add up, overtime tinted yellow over the 8-hour line
function s7({ c, t, u, p }) {
  const names = ["MAC", "JESS", "DEV", "SAM", "JEN"], hrs = [9.5, 8, 10.2, 7.5, 9], bw = 80, gap = 40, x0 = -((bw + gap) * 5 - gap) / 2, base = 280, sc = 52;
  c.strokeStyle = INK; c.lineWidth = 3; trace(c, [[x0 - 30, base], [-x0 + 30, base]], clamp(u / 0.8)); trace(c, [[x0 - 30, base], [x0 - 30, base - 12 * sc]], clamp(u / 0.8));
  const ln = clamp((u - 0.6) / 0.6); c.strokeStyle = YEL; c.setLineDash([14, 10]); c.lineWidth = 3; trace(c, [[x0 - 30, base - 8 * sc], [-x0 + 30, base - 8 * sc]], ln); c.setLineDash([]); hand(c, "8 hrs", -x0 + 90, base - 8 * sc, 44, YEL, 0, ln);
  names.forEach((n, i) => { const h = hrs[i] * clamp(easeOut((u - 1 - i * 0.35) / 1.1)), x = x0 + i * (bw + gap); c.fillStyle = "rgba(234,244,255,0.85)"; const reg = Math.min(h, 8); c.fillRect(x, base - reg * sc, bw, reg * sc); if (h > 8) { c.fillStyle = YEL; c.fillRect(x, base - h * sc, bw, (h - 8) * sc); } c.fillStyle = INK; c.font = `800 40px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.fillText(n, x + bw / 2, base + 44); if (u > 1.5 + i * 0.35) { c.fillStyle = h > 8 ? YEL : INK; c.fillText(h.toFixed(1) + "h", x + bw / 2, base - h * sc - 14); } });
  hand(c, "overtime, worked out", 40, -330, 60, YEL, -0.03, easeOut((u - 4.5) / 0.5)); hand(c, "(example hours)", 0, 372, 34, DIM, 0, easeOut((u - 3) / 0.5));
}
// scene 8: the timesheet and a DONE stamp
function s8({ c, t, u, p, E }) {
  c.save(); c.translate(0, -10); c.strokeStyle = INK; c.lineWidth = 4; c.fillStyle = "rgba(234,244,255,0.06)"; const dd = clamp(u / 1.2); trace(c, [[-250, -360], [250, -360], [250, 360], [-250, 360]], dd, true); c.font = `800 74px 'Barlow Condensed', sans-serif`; c.fillStyle = INK; c.textAlign = "left"; c.globalAlpha = easeOut((u - 1) / 0.4); c.fillText("TIMESHEET", -220, -290); c.globalAlpha = 1;
  for (let r = 0; r < 8; r++) { const y = -220 + r * 66, a = clamp((u - 1.3 - r * 0.18) / 0.5); c.strokeStyle = "rgba(234,244,255,0.35)"; c.lineWidth = 2; trace(c, [[-220, y + 30], [220, y + 30]], a); c.strokeStyle = INK; c.lineWidth = 3; trace(c, [[-220, y], [-120, y]], a); trace(c, [[60, y], [110, y]], a); trace(c, [[160, y], [220, y]], a); }
  c.restore();
  // the stamp thumps down on "single click"
  const st = E.W_(8, /single/, 0.5) - E.L(8) + 0.2 + 0.2, a = clamp((u - 0.3 - st) / 0.18); if (a > 0) { const sc = lerp(2.6, 1, easeOut(a)); c.save(); c.translate(70, 140); c.rotate(-0.22); c.scale(sc, sc); c.globalAlpha = clamp(a * 1.5); c.strokeStyle = YEL; c.fillStyle = YEL; c.lineWidth = 10; rr(c, -190, -80, 380, 160, 22); c.stroke(); c.font = `800 130px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("DONE", 0, 6); c.restore(); }
  const tg = easeBack((u - 0.3 - st - 0.8) / 0.4); if (tg > 0) { [["PDF", -150], ["EXCEL", 150]].forEach(([n, x], i) => { c.save(); c.translate(x, 440); c.scale(clamp(tg, 0, 1.1), clamp(tg, 0, 1.1)); c.fillStyle = INK; rr(c, -110, -40, 220, 80, 20); c.fill(); c.fillStyle = "#082a55"; c.font = `800 54px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, 0, 3); c.restore(); }); }
}
// scene 9: the toolkit
function s9({ c, t, u, p, E, V }) {
  const tools = ["ESTIMATES", "INVOICES", "R F Is", "CHANGE ORDERS", "DAILY REPORTS", "SCHEDULE", "SAFETY LOG", "PUNCH LIST"], cols = 2, w = 330, h = 96, gx = 24, gy = 24, x0 = -(cols * w + gx) / 2, y0 = -330;
  tools.forEach((n, i) => { const a = easeBack((u - 0.5 - i * 0.55) / 0.4); if (a <= 0) return; const x = x0 + (i % cols) * (w + gx), y = y0 + Math.floor(i / cols) * (h + gy); c.save(); c.translate(x + w / 2, y + h / 2); c.scale(clamp(a, 0, 1.08), clamp(a, 0, 1.08)); c.strokeStyle = INK; c.lineWidth = 3.5; c.fillStyle = "rgba(234,244,255,0.08)"; rr(c, -w / 2, -h / 2, w, h, 16); c.fill(); c.stroke(); c.fillStyle = INK; c.font = `800 46px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(n, 14, 3); c.strokeStyle = YEL; c.lineWidth = 6; trace(c, [[-w / 2 + 26, 2], [-w / 2 + 40, 16], [-w / 2 + 62, -14]], 1); c.restore(); });
  const big = easeBack((u - E.W_(9, /twenty-six|Twenty/, 0.7) + E.L(9) - 0.35 - 0.2) / 0.5); if (big > 0) { c.save(); c.translate(-150, 330); c.scale(clamp(big, 0, 1.1), clamp(big, 0, 1.1)); c.fillStyle = YEL; c.font = `800 250px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.fillText("26", 0, 0); c.fillStyle = INK; c.font = `800 60px 'Barlow Condensed', sans-serif`; c.fillText("TOOLS", 0, 64); c.restore(); }
  const e = easeBack((u - 9.2) / 0.5); if (e > 0) { c.save(); c.translate(190, 330); c.scale(clamp(e, 0, 1.1), clamp(e, 0, 1.1)); c.fillStyle = YEL; c.font = `800 190px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.fillText("+23", 0, -10); c.fillStyle = INK; c.font = `800 52px 'Barlow Condensed', sans-serif`; c.fillText("EXCEL TEMPLATES", 0, 52); c.restore(); }
}
// scene 10: no signal, the work carries on
function s10({ c, t, u, p, E }) {
  // wifi arcs, struck through
  c.save(); c.translate(0, -170); c.strokeStyle = INK; c.lineWidth = 12; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 150, 90 + i * 80, -2.3, -0.84); c.globalAlpha = clamp((u - i * 0.3) / 0.4) * (u > 2 ? 0.35 : 1); c.stroke(); } c.globalAlpha = 1; c.fillStyle = INK; c.beginPath(); c.arc(0, 150, 16, 0, 7); c.fill();
  const sl = clamp((u - 2) / 0.4); c.strokeStyle = "#ff6b5e"; c.lineWidth = 16; trace(c, [[-210, -80], [210, 270]], sl); c.restore();
  hand(c, "no signal", 260, -300, 58, "#ff8f84", 0.08, easeOut((u - 2.2) / 0.4));
  // the phone keeps saving: a queue of little check marks fills, then sync arrows on "back online"
  const q = 6, qa = clamp((u - 2.6) / 6); for (let i = 0; i < q; i++) { const a = easeBack((u - 3 - i * 0.7) / 0.3); if (a <= 0) continue; const x = -250 + i * 100; c.save(); c.translate(x, 190); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.fillStyle = "rgba(234,244,255,0.12)"; c.strokeStyle = INK; c.lineWidth = 3; rr(c, -38, -50, 76, 100, 10); c.fill(); c.stroke(); c.strokeStyle = YEL; c.lineWidth = 6; trace(c, [[-16, 0], [-4, 14], [18, -14]], 1); c.restore(); }
  hand(c, "saved on the phone", 0, 310, 58, YEL, -0.02, easeOut((u - 3) / 0.5));
  const sy = E.W_(10, /syncs|online|nature/, 0.9) - (E.L(10) - 0.35); if (u > sy - 0.2) { const a = easeOut((u - sy + 0.2) / 0.5); c.save(); c.globalAlpha = a; c.translate(0, 410); c.fillStyle = "#22c55e"; c.font = `800 62px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.fillText("SYNCED  ✓", 0, 0); c.restore(); }
}
// scene 11: home for dinner
function s11({ c, t, u, p }) {
  const hs = [[-150, 20], [150, 20], [150, -150], [0, -270], [-150, -150]]; c.strokeStyle = INK; c.lineWidth = 6; trace(c, [[-150, 260], [-150, -150], [0, -280], [150, -150], [150, 260], [-150, 260]], clamp(u / 1.6));
  const wn = clamp((u - 1.6) / 0.8); if (wn > 0) { c.fillStyle = `rgba(245,196,0,${0.9 * wn})`; c.shadowColor = YEL; c.shadowBlur = 60 * wn; c.fillRect(-100, -90, 90, 90); c.fillRect(20, -90, 90, 90); c.shadowBlur = 0; c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(-100, -90, 90, 90); c.strokeRect(20, -90, 90, 90); c.strokeRect(-30, 90, 60, 170); }
  // clock chip and a plate
  const a = easeBack((u - 2.4) / 0.5); if (a > 0) { c.save(); c.translate(-250, -250); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.fillStyle = YEL; rr(c, -120, -48, 240, 96, 48); c.fill(); c.fillStyle = "#1a1600"; c.font = `800 62px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("5:30 PM", 0, 4); c.restore(); }
  const pl = easeBack((u - 3.2) / 0.5); if (pl > 0) { c.save(); c.translate(240, 330); c.scale(clamp(pl, 0, 1.1), clamp(pl, 0, 1.1)); c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 80, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 52, 0, 7); c.stroke(); for (let i = 0; i < 3; i++) trace(c, [[-120 - i * 0, -30 + i * 30], [-120, -30 + i * 30]], 1); c.restore(); hand(c, "dinner", 240, 450, 54, YEL, 0.05, easeOut((u - 3.6) / 0.4)); }
  hand(c, "still warm", -250, 380, 54, YEL, -0.06, easeOut((u - 4) / 0.4));
}
function s12({ c, t, u, p, E, V }) {
  const a = easeOut(u / 0.6), ia = easeBack(u / 0.6), sz = 230 * ia; c.globalAlpha = a; if (ICON) { c.save(); c.shadowColor = "rgba(245,196,0,0.5)"; c.shadowBlur = 70; c.drawImage(ICON, -sz / 2, -300 - sz / 2, sz, sz); c.restore(); }
  c.textAlign = "center"; c.fillStyle = INK; c.font = `800 200px 'Barlow Condensed', sans-serif`; c.fillText("CONSTRA", 0, -60); c.fillStyle = YEL; c.font = `800 72px 'Barlow Condensed', sans-serif`; c.fillText("RUN THE JOB, NOT THE PAPERWORK", 0, 30);
  const pb = easeBack((u - 0.6) / 0.5); c.save(); c.translate(0, 160); c.scale(clamp(pb, 0, 1.1), clamp(pb, 0, 1.1)); c.fillStyle = YEL; rr(c, -330, -56, 660, 112, 56); c.fill(); c.fillStyle = "#1a1600"; c.font = `800 58px 'Barlow Condensed', sans-serif`; c.textBaseline = "middle"; c.fillText("FREE WHILE IT'S LAUNCHING", 0, 3); c.restore();
  c.globalAlpha = clamp((u - 1.2) / 0.5); c.textBaseline = "alphabetic"; c.fillStyle = INK; c.font = `500 46px 'IBM Plex Mono', monospace`; c.fillText("getconstra.com", 0, 290); c.globalAlpha = 1;
}

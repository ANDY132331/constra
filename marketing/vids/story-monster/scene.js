import { STYLES, actor, phoneInset, chip, pop, endCard, bed, sfx, loadShots, loadImg, rr, clamp, lerp, ease, easeOut, easeBack, rnd, qt, blinkAt } from "/stage.js";

// "Dev vs. The Timesheet" - a movie-trailer parody in a cut-paper look (12 fps stop-motion jitter, every piece casts a shadow).
const ST = STYLES.paper;
const CH = {
  Dev: { skin: "#a56f4a", shirt: "#7c8aa6", sleeve: "#7c8aa6", pants: "#5b4a3a", hair: "#1d1410", hairStyle: "short", beard: true, w: 1.1 },
  Jess: { skin: "#f3c9a5", shirt: "#c2336b", pants: "#2b2f3a", vest: "#F5C400", hat: "#F5C400", hair: "#7a3b1d", hairStyle: "ponytail", glove: "#2a2a2d" },
};
let SH, ICON, KEYS, WIN;
const build = (base, steps) => { let s = { ...base }; const out = [{ ...s }]; for (const st of steps) { s = { ...s, ...st }; out.push({ ...s }); } return out; };

export default {
  endHold: 2.8, lead: 0.3, reverb: 0.08, bedGain: 0.5, duckTo: 0.3,
  voices: { Narrator: { pan: 0, gain: 1.05 }, Dev: { pan: -0.3 }, Monster: { pan: 0.3, gain: 1.1 }, Jess: { pan: 0.1 } },
  async init(E) {
    SH = await loadShots(["time-tracking", "timesheets"]); ICON = await loadImg("/icon.png");
    const { W, H, V } = E, T = (i, o = 0) => E.L(i) + o, gy = V ? H * 0.84 : H * 0.87, dx = V ? W * 0.17 : W * 0.17, jx = V ? W * 0.5 : W * 0.46;
    KEYS = {
      Dev: build({ at: 0, x: dx, y: gy, flip: 1, mood: "sad", sweat: true, prop: "pen", propHand: "R", armR: [0.9, 0.4] }, [
        { at: T(2) - 0.1, mood: "shock" }, { at: T(3) - 0.1, mood: "angry", sweat: false }, { at: T(5) - 0.1, mood: "sad", sweat: true }, { at: T(6) + 1.0, mood: "shock", armL: [2.2, 0.3] },
        { at: T(7) - 0.1, mood: "shock", armL: [2.4, 0.2], armR: [2.4, 0.2], bounce: -10 }, { at: T(8) + 0.2, mood: "sad", armL: undefined, armR: [0.9, 0.4], bounce: 0, look: [1, 0] },
        { at: T(10) - 0.1, mood: "shock", armR: [2.0, 0.3] }, { at: T(11), mood: "neutral", armR: [0.9, 0.4] }, { at: T(13) + 0.3, mood: "happy" },
        { at: T(15) + 0.5, mood: "happy", prop: undefined, armR: undefined }, { at: T(16) - 0.1, mood: "neutral", sweat: false }, { at: T(18) - 0.2, mood: "happy", look: [0, 0] },
        { at: E.LE(18) + 0.3, mood: "happy" }, { at: E.LE(18) + 2.2, x: -260, flip: -1 },
      ]),
      Jess: build({ at: 0, x: W + 260, y: gy, flip: -1, mood: "neutral" }, [
        { at: T(8) + 1.5, x: W + 260 }, { at: T(9) + 0.8, x: jx, mood: "angry", prop: "phone", propHand: "L", armL: [1.4, 0.6], screen: SH["time-tracking"] },
        { at: T(11) - 0.1, mood: "smug" }, { at: T(13) - 0.1, mood: "happy" }, { at: T(17) - 0.1, mood: "smug" }, { at: T(19) - 0.3, mood: "happy" },
      ]),
    };
    // Jess faces the monster (to the left of her): flip -1 means facing left, as set above
    WIN = [
      { a: T(13) - 0.1, b: E.LE(14) + 0.2, img: SH["time-tracking"], line: 13, chips: [[/photo/, "PHOTO + GPS", -150, -260], [/hours/, "HOURS ADD UP", 130, 300], [/Overtime/, "OVERTIME ✓", -120, 330]] },
      { a: T(15) - 0.1, b: E.LE(15) + 1.0, img: SH.timesheets, line: 15, chips: [[/P/, "PDF", -150, -250], [/Excel/, "EXCEL", 140, -200]] },
    ];
  },

  draw(t, c, E) {
    const { W, H, V } = E, gy = V ? H * 0.84 : H * 0.87, sc = V ? 1.45 : 1.25, T = (i, o = 0) => E.L(i) + o, tq = qt(t, ST);
    let shake = 0; for (const [i, o] of [[2, 0.1], [6, 1.6], [4, 0.1]]) { const d = t - (T(i) + o); if (d >= 0 && d < 0.4) shake = (1 - d / 0.4) * 14; }
    c.save(); c.translate((rnd(Math.floor(t * 50) + 1) - 0.5) * shake, (rnd(Math.floor(t * 50) + 9) - 0.5) * shake);
    office(c, E, tq, gy);
    // monster (right side) shrinks into a neat PDF
    const shrinkA = T(13) + 1.2, shrinkB = T(15) + 0.2, mx = V ? W * 0.8 : W * 0.8, ms = (V ? 1.2 : 1.0) * lerp(1, 0.2, ease((t - shrinkA) / (shrinkB - shrinkA))), alive = t < shrinkB + 0.5;
    const mood = t < T(12) ? "angry" : t < T(14) ? "puzzled" : "scared";
    if (alive) monster(c, E, tq, mx, gy, ms, mood, t);
    else { const a = easeBack((t - shrinkB - 0.5) / 0.4); neatSheet(c, mx - 10, gy - 90 * (V ? 1.2 : 1), (V ? 1.2 : 1.0), a, tq); }
    const r = {};
    r.Dev = actor(c, E, t, "Dev", CH.Dev, ST, KEYS.Dev, { scale: sc, seed: 3, bgCol: "#35476b" });
    if (t > T(8) + 1.0) r.Jess = actor(c, E, t, "Jess", CH.Jess, ST, KEYS.Jess, { scale: sc, seed: 2 });
    // the monster eats the overtime
    const eat = E.W_(6, /eat/, 0.8) + 0.0, ea = clamp((t - (eat - 0.7)) / 0.7);
    if (ea > 0 && ea < 1) { const sx = r.Dev.p.x + 120, sy = gy - 520 * sc * 0.9, tx = mx - 10, ty = gy - 300 * ms; const x = lerp(sx, tx, easeOut(ea)), y = lerp(sy, ty, ea) - Math.sin(ea * Math.PI) * 120; chip(c, "OVERTIME", x, y, 1, V ? 44 : 38, (ea - 0.5) * 0.8); }
    if (t > eat + 0.55 && t < eat + 1.1) pop(c, "CHOMP!", mx - 40, gy - 520 * ms, easeBack((t - eat - 0.55) / 0.2) * (1 - ease((t - eat - 0.9) / 0.2)), V ? 120 : 100, "#e0301e", 0.08, "#2a1a10");
    // trailer title cards: THIS FRIDAY / ONE MAN / ONE PEN
    if (t < E.LE(0) + 0.6) { [[/Friday/, "THIS FRIDAY"], [/man/, "ONE MAN"], [/pen/, "ONE PEN"]].forEach(([re, label], i) => { const at = E.W_(0, re, 0.3); const nxt = i < 2 ? E.W_(0, [/man/, /pen/][i], 0.6) - 0.1 : E.LE(0) + 0.5; const a = t >= at && t < nxt ? easeOut((t - at) / 0.1) : 0; if (a > 0) { c.save(); c.translate(W / 2, V ? H * 0.2 : H * 0.18); c.scale(lerp(1.8, 1, a), lerp(1.8, 1, a)); c.globalAlpha = a; c.font = `800 ${V ? 190 : 150}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.lineWidth = 22; c.strokeStyle = "#1a1208"; c.strokeText(label, 4, 6); c.fillStyle = "#f4ead0"; c.fillText(label, 0, 0); c.restore(); } }); }
    // ominous dim until the hero arrives, then warm light floods in
    const dim = 0.4 * (1 - ease((t - (T(9) + 0.3)) / 1.2)); if (dim > 0.01) { c.fillStyle = `rgba(8,12,32,${dim})`; c.fillRect(-40, -40, W + 80, H + 80); }
    // light from the doorway on the right for the entrance
    const dl = ease((t - (T(8) + 0.6)) / 0.9) * (1 - ease((t - (T(9) + 1.4)) / 1.0)); if (dl > 0.01) { const g = c.createLinearGradient(W, gy, W * 0.45, gy); g.addColorStop(0, `rgba(255,236,170,${0.75 * dl})`); g.addColorStop(1, "rgba(255,236,170,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(W + 40, gy - H * 0.42); c.lineTo(W * 0.42, gy + 40); c.lineTo(W + 40, gy + 40); c.closePath(); c.fill(); }
    // "CONSTRA" pops as Jess says it
    const cs = E.W_(11, /Constra|Konstra/i, 0.7) + 0; const ca = easeBack((t - cs) / 0.3) * (1 - ease((t - cs - 1.6) / 0.3)); if (ca > 0 && ICON) { const s = (V ? 300 : 230) * ca; c.save(); c.shadowColor = "rgba(245,196,0,0.7)"; c.shadowBlur = 60; c.drawImage(ICON, W / 2 - s / 2, (V ? H * 0.3 : H * 0.34) - s / 2, s, s); c.restore(); }
    // app screens
    const w = WIN.find((x) => t >= x.a && t <= x.b);
    if (w) { const a = easeBack((t - w.a) / 0.4) * (1 - ease((t - (w.b - 0.25)) / 0.25)), ix = V ? W * 0.5 : W * 0.6, iy = V ? H * 0.27 : H * 0.36, iw = V ? 330 : 260; phoneInset(c, w.img, ix, iy, iw, -0.05, a, t); w.chips.forEach(([re, label, dx, dy], i) => { const at = E.W_(w.line, re, 0.4), ca2 = easeBack((t - at) / 0.3) * (1 - ease((t - (w.b - 0.25)) / 0.25)); chip(c, label, ix + dx * (V ? 1 : 0.75), iy + dy * (V ? 1 : 0.75), ca2, V ? 44 : 36, i % 2 ? 0.05 : -0.05); }); }
    c.restore();
    // paper grain over everything
    c.fillStyle = "rgba(255,255,255,0.045)"; for (let i = 0; i < 900; i++) c.fillRect(rnd(i * 7 + 1) * W, rnd(i * 13 + 5) * H, 2, 2); c.fillStyle = "rgba(0,0,0,0.04)"; for (let i = 0; i < 700; i++) c.fillRect(rnd(i * 11 + 3) * W, rnd(i * 17 + 9) * H, 2, 2);
    E.caption(c, t, { y: V ? H * 0.94 : H * 0.95, size: V ? 56 : 46, hi: "#F5C400", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 150 : W * 0.7 });
    const eIn = E.LE(19) - 0.25; if (t >= eIn) endCard(c, E, t, t - eIn, { icon: ICON });
  },

  audio(h, E) {
    const T = (i, o = 0) => E.L(i) + o, D = E.DURATION, up = T(11) - 0.1;
    // ominous first half: a low drone and a heartbeat; upbeat once the hero arrives
    const { A, comp, note, kick } = h; for (const f of [55, 55.8, 82.4]) note(f, 0, up, "sawtooth", 0.045, 260, comp);
    for (let b = 0; b * 1.1 < up; b++) { kick(b * 1.1, 0.22, comp); kick(b * 1.1 + 0.28, 0.14, comp); }
    const sh = h.A.createGain(); bedAfter(h, E, up);
    sfx.thump(h, E.W_(0, /Friday/, 0.3)); sfx.thump(h, E.W_(0, /man/, 0.3)); sfx.thump(h, E.W_(0, /pen/, 0.3));
    sfx.thump(h, T(2) + 0.1); sfx.thump(h, T(6) + 1.6); sfx.splat(h, E.W_(6, /eat/, 0.8) + 0.6); sfx.thump(h, T(4) + 0.1);
    sfx.whoosh(h, T(8) + 1.4, 0.8); sfx.sparkle(h, E.W_(11, /Constra|Konstra/i, 0.7)); for (const w of WIN) { sfx.whoosh(h, w.a); w.chips.forEach(([re]) => sfx.pop(h, E.W_(w.line, re, 0.4))); }
    sfx.boing(h, T(14) + 0.2); sfx.boing(h, T(14) + 1.0); sfx.sparkle(h, T(15) + 1.3); sfx.rim(h, E.LE(16) + 0.1); sfx.trombone(h, E.LE(5) + 0.1);
    const iE = E.LE(19) - 0.25; sfx.whoosh(h, iE - 0.1, 0.4); sfx.sparkle(h, iE + 0.3); sfx.applause(h, E.L(19) + 2.4, 2.5);
  },
};
function bedAfter(h, E, from) { const { note, kick, snare, hat } = h, D = E.DURATION, BEAT = 60 / 112, BAR = BEAT * 4, prog = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]], roots = [65.4, 55, 43.65, 49]; for (let b = 0; from + b * BAR < D - 0.5; b++) { const t0 = from + b * BAR, ch = prog[b % 4]; for (let q = 0; q < 4; q++) { note(roots[b % 4] * (q % 2 ? 2 : 1), t0 + q * BEAT, BEAT * 0.55, "triangle", 0.2, 600); hat(t0 + q * BEAT + BEAT / 2, 0.025); } for (let q = 0; q < 8; q++) if ([0, 3, 4, 6, 7].includes(q)) note(ch[q % 3] * 2, t0 + q * BEAT / 2, 0.13, "square", 0.02, 1900); kick(t0, 0.1); kick(t0 + BEAT * 2.5, 0.08); snare(t0 + BEAT, 0.03); snare(t0 + BEAT * 3, 0.03); } }

// ── the paper monster: a stack of timesheets with a stapler jaw ──
function monster(c, E, t, x, gy, s, mood, tt) {
  const m = E.mouth("Monster", tt), sad = mood === "scared"; const bob = Math.sin(t * 5) * 6, j = ST.jitter ? (rnd(Math.floor(t * 12) + 3) - 0.5) * 4 : 0;
  c.save(); c.translate(x + j, gy + bob * 0.3); c.scale(-s, s); c.lineJoin = "round"; c.lineCap = "round"; c.shadowColor = "rgba(30,15,0,0.45)"; c.shadowOffsetX = 6; c.shadowOffsetY = 9;
  // legs: two rolled-up papers
  for (const sd of [-1, 1]) { c.fillStyle = "#e8e2cf"; rr(c, sd * 70 - 22, -90, 44, 90, 14); c.fill(); c.fillStyle = "#3b2a1a"; c.beginPath(); c.ellipse(sd * 70 + sd * 8, -4, 38, 18, 0, 0, 7); c.fill(); }
  // the stack
  for (let i = 0; i < 7; i++) { c.save(); c.translate(0, -100 - i * 62); c.rotate(Math.sin(i * 1.9) * 0.05); c.fillStyle = i % 2 ? "#f6f2e4" : "#efe9d6"; rr(c, -150, -34, 300, 70, 10); c.fill(); c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-130, 2); c.lineTo(100, 2); c.stroke(); c.restore(); }
  c.shadowColor = "transparent";
  // face on the middle sheets
  const fy = -330; const eyeR = sad ? 30 : 26;
  for (const sd of [-1, 1]) { c.fillStyle = "#fff"; c.beginPath(); c.arc(sd * 62, fy, eyeR + 10, 0, 7); c.fill(); c.strokeStyle = "#7a2a1a"; c.lineWidth = 3; c.stroke(); c.fillStyle = "#1a1208"; c.beginPath(); c.arc(sd * 62 - (E ? 8 : 0), fy + 4, sad ? 8 : 13, 0, 7); c.fill();
    c.strokeStyle = "#1a1208"; c.lineWidth = 14; c.beginPath(); const inner = mood === "angry" ? 18 : mood === "puzzled" ? -14 : -22; c.moveTo(sd * 62 + sd * 40, fy - 50 - (mood === "angry" ? 14 : 0) + (mood === "angry" ? 0 : -6)); c.lineTo(sd * 62 - sd * 36, fy - 50 + inner); c.stroke(); }
  // stapler-jaw mouth: a red upper jaw, a black lower jaw, paper teeth
  const open = Math.max(m, mood === "scared" ? 0.35 : 0) * 80 + 6, my = -220;
  c.fillStyle = "#2a1a10"; rr(c, -110, my - 14, 220, open + 34, 18); c.fill(); c.fillStyle = "#7a1f2a"; c.beginPath(); c.ellipse(0, my + open * 0.55 + 10, 56, 20 + open * 0.2, 0, 0, 7); c.fill();
  c.fillStyle = "#fff"; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-100 + i * 36, my - 14); c.lineTo(-82 + i * 36, my + 24); c.lineTo(-64 + i * 36, my - 14); c.fill(); c.beginPath(); c.moveTo(-100 + i * 36, my + open + 20); c.lineTo(-82 + i * 36, my + open - 16); c.lineTo(-64 + i * 36, my + open + 20); c.fill(); }
  c.fillStyle = "#c92b2b"; rr(c, -120, my - 38, 240, 26, 10); c.fill(); c.fillStyle = "#ddd"; c.fillRect(-18, my - 38, 36, 26);
  // pencil arms with eraser hands, flailing when angry
  const fl = mood === "angry" ? Math.sin(t * 7) * 0.5 : mood === "scared" ? Math.sin(t * 14) * 0.25 : 0.1;
  for (const sd of [-1, 1]) { c.save(); c.translate(sd * 150, -250); c.rotate(-sd * (0.85 + Math.abs(fl))); c.fillStyle = "#f5c400"; rr(c, -14, 0, 28, 150, 8); c.fill(); c.fillStyle = "#e58a98"; rr(c, -14, 140, 28, 28, 10); c.fill(); c.restore(); }
  if (sad) { c.fillStyle = "#7fd0ff"; const k = (t * 2) % 1; for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * 130, fy - 60 + k * 30, 11, 0, 7); c.fill(); } }
  c.restore();
}
function neatSheet(c, x, y, s, a, t) {
  if (a <= 0) return; c.save(); c.translate(x, y); c.scale(clamp(a, 0, 1.1) * s, clamp(a, 0, 1.1) * s); c.rotate(Math.sin(t * 2) * 0.03); c.shadowColor = "rgba(30,15,0,0.4)"; c.shadowOffsetX = 5; c.shadowOffsetY = 8;
  c.fillStyle = "#f6f2e4"; rr(c, -80, -150, 160, 200, 8); c.fill(); c.shadowColor = "transparent"; c.fillStyle = "#c2352b"; rr(c, -62, -134, 70, 34, 6); c.fill(); c.fillStyle = "#fff"; c.font = "800 28px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PDF", -27, -116);
  c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 4; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-62, -66 + i * 22); c.lineTo(62 - (i % 2) * 24, -66 + i * 22); c.stroke(); } c.strokeStyle = "#22a85a"; c.lineWidth = 10; c.beginPath(); c.moveTo(14, 20); c.lineTo(34, 40); c.lineTo(66, -2); c.stroke(); c.restore();
}

// ── the set: a night office in layered paper ──
function office(c, E, t, gy) {
  const { W, H, V } = E; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1c2a4a"); g.addColorStop(1, "#35476b"); c.fillStyle = g; c.fillRect(-40, -40, W + 80, H + 80);
  c.shadowColor = "rgba(0,0,10,0.4)"; c.shadowOffsetX = 5; c.shadowOffsetY = 8;
  // window with the moon and a paper skyline
  const wx = V ? W * 0.5 : W * 0.5, wy = V ? H * 0.14 : H * 0.1, ww = V ? 620 : 560, wh = V ? 420 : 330; c.fillStyle = "#0f1a35"; rr(c, wx - ww / 2, wy, ww, wh, 16); c.fill(); c.shadowColor = "transparent";
  c.save(); rr(c, wx - ww / 2, wy, ww, wh, 16); c.clip(); c.fillStyle = "#f3e8b8"; c.beginPath(); c.arc(wx + ww * 0.22, wy + wh * 0.3, 70, 0, 7); c.fill(); c.fillStyle = "#0b1630"; for (let i = 0; i < 9; i++) { const bh = 90 + ((i * 53) % 130); c.fillRect(wx - ww / 2 + i * (ww / 8.5), wy + wh - bh, ww / 9.5, bh); } c.fillStyle = "rgba(255,225,120,0.8)"; for (let i = 0; i < 24; i++) c.fillRect(wx - ww / 2 + 14 + (i * 43) % (ww - 30), wy + wh - 30 - ((i * 37) % 120), 7, 9); for (let i = 0; i < 16; i++) { c.fillStyle = "rgba(255,255,255,0.75)"; c.fillRect(wx - ww / 2 + (i * 71) % ww, wy + 12 + (i * 29) % 140, 3, 3); } c.restore();
  c.strokeStyle = "#e8d9b0"; c.lineWidth = 12; rr(c, wx - ww / 2, wy, ww, wh, 16); c.stroke(); c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx, wy + wh); c.moveTo(wx - ww / 2, wy + wh * 0.5); c.lineTo(wx + ww / 2, wy + wh * 0.5); c.stroke();
  // wall clock showing nine
  const cx = V ? W * 0.14 : W * 0.12, cy = V ? H * 0.3 : H * 0.22; c.shadowColor = "rgba(0,0,10,0.4)"; c.shadowOffsetX = 4; c.shadowOffsetY = 6; c.fillStyle = "#f4ead0"; c.beginPath(); c.arc(cx, cy, 70, 0, 7); c.fill(); c.shadowColor = "transparent"; c.strokeStyle = "#3b2a1a"; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - 44, cy); c.moveTo(cx, cy); c.lineTo(cx, cy - 56); c.stroke(); c.fillStyle = "#3b2a1a"; c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.fill();
  // floor: layered cardboard
  c.shadowColor = "rgba(0,0,10,0.4)"; c.shadowOffsetY = -6; c.fillStyle = "#6b4a2e"; c.fillRect(-40, gy - 10, W + 80, H); c.shadowColor = "transparent"; c.fillStyle = "#8a6240"; c.fillRect(-40, gy + 40, W + 80, H);
  // desk on the left with a lamp and paper piles
  const dx = V ? W * 0.02 : W * 0.02, dw = V ? 420 : 380; c.shadowColor = "rgba(0,0,10,0.45)"; c.shadowOffsetX = 6; c.shadowOffsetY = 8; c.fillStyle = "#b8864f"; c.fillRect(dx, gy - 150, dw, 28); c.fillStyle = "#9a6d3b"; c.fillRect(dx + 20, gy - 122, dw - 40, 130); c.shadowColor = "transparent";
  for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? "#f6f2e4" : "#efe9d6"; c.save(); c.translate(dx + 80 + i * 55, gy - 158 - i * 4); c.rotate((i - 2) * 0.05); c.fillRect(-34, -14, 68, 14); c.restore(); }
  c.strokeStyle = "#2a2a2a"; c.lineWidth = 8; c.beginPath(); c.moveTo(dx + dw - 70, gy - 150); c.lineTo(dx + dw - 70, gy - 230); c.lineTo(dx + dw - 20, gy - 270); c.stroke(); c.fillStyle = "#F5C400"; c.beginPath(); c.moveTo(dx + dw - 50, gy - 290); c.lineTo(dx + dw + 20, gy - 250); c.lineTo(dx + dw - 6, gy - 220); c.lineTo(dx + dw - 76, gy - 262); c.closePath(); c.fill();
  const lg = c.createRadialGradient(dx + dw - 10, gy - 220, 10, dx + dw - 10, gy - 160, 280); lg.addColorStop(0, "rgba(255,232,150,0.5)"); lg.addColorStop(1, "rgba(255,232,150,0)"); c.fillStyle = lg; c.fillRect(dx - 100, gy - 460, dw + 500, 620);
}

import { STYLES, actor, phoneInset, chip, pop, endCard, bed, sfx, loadShots, loadImg, rr, clamp, lerp, ease, easeOut, easeBack, rnd } from "/stage.js";

// "Cooking with Constra" - a TV cooking-show parody in a clean flat look. Mac is the chef, Jess is the sceptical assistant, the pot cooks a stress-free Friday.
const ST = STYLES.flat;
const CH = {
  Mac: { skin: "#e8b98a", shirt: "#ffffff", sleeve: "#ffffff", apron: "#fdfdfd", pants: "#2a2f45", hat: "#ffffff", hatStyle: "chef", hair: "#3a2519", hairStyle: "short", stache: true },
  Jess: { skin: "#f3c9a5", shirt: "#2d7fb8", sleeve: "#2d7fb8", apron: "#f3d36b", pants: "#2b2f3a", hair: "#7a3b1d", hairStyle: "ponytail" },
};
let SH, ICON, KEYS, WIN;
const build = (base, steps) => { let s = { ...base }; const out = [{ ...s }]; for (const st of steps) { s = { ...s, ...st }; out.push({ ...s }); } return out; };
const INK = "#1d2430";

export default {
  endHold: 2.8, lead: 0.3, reverb: 0.07, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: 0.25 }, Jess: { pan: -0.25 } },
  async init(E) {
    SH = await loadShots(["time-tracking", "timesheets", "crew-plan", "invoices"]); ICON = await loadImg("/icon.png");
    const { W, H, V } = E, T = (i, o = 0) => E.L(i) + o, gy = V ? H * 0.74 : H * 0.88, jx = V ? W * 0.19 : W * 0.2, mx = V ? W * 0.81 : W * 0.78;
    KEYS = {
      Mac: build({ at: 0, x: mx, y: gy, flip: -1, mood: "happy" }, [
        { at: T(1), mood: "neutral" }, { at: T(2) - 0.1, mood: "smug" }, { at: T(4) - 0.1, mood: "happy" }, { at: T(7) - 0.1, mood: "neutral" }, { at: T(11) - 0.1, mood: "happy" }, { at: T(14), mood: "smug" }, { at: T(16) - 0.1, mood: "happy" }, { at: T(18) - 0.2, mood: "happy", tilt: 0.05 },
      ]),
      Jess: build({ at: 0, x: jx, y: gy, flip: 1, mood: "happy" }, [
        { at: T(1) - 0.1, mood: "smug" }, { at: T(2) + 0.5, mood: "neutral" }, { at: T(5) - 0.1, mood: "shock" }, { at: T(8) - 0.1, mood: "neutral" }, { at: T(12) - 0.1, mood: "shock" }, { at: T(12) + 1.4, mood: "happy" }, { at: T(14) - 0.1, mood: "smug" }, { at: T(17) - 0.1, mood: "sad", sweat: true },
      ]),
    };
    WIN = [
      { a: T(4) - 0.1, b: E.LE(6) + 0.3, img: SH["time-tracking"], line: 4, chips: [[/photo/, "PHOTO", -140, -230], [/G/, "GPS", 130, 250]] },
      { a: T(11) - 0.1, b: E.LE(11) + 0.8, img: SH.timesheets, line: 11, chips: [[/P/, "PDF", -140, -230], [/Excel/, "EXCEL", 140, 250]] },
      { a: T(13) - 0.1, b: E.LE(13) + 0.5, img: SH["crew-plan"], line: 13, chips: [[/schedule/, "SCHEDULE", -130, -240], [/invoices/, "INVOICES", 140, 270], [/templates/, "23 EXCEL TEMPLATES", -60, 330]] },
    ];
  },

  draw(t, c, E) {
    const { W, H, V } = E, gy = V ? H * 0.74 : H * 0.88, sc = V ? 1.7 : 1.2, T = (i, o = 0) => E.L(i) + o;
    kitchen(c, E, t, gy);
    const potX = W * 0.5, topY = gy - 175 * sc * (V ? 1 : 1.02); // counter top
    // characters stand behind the counter
    const r = {};
    r.Jess = actor(c, E, t, "Jess", CH.Jess, ST, KEYS.Jess, { scale: sc, seed: 2, noShadow: true });
    // Mac stirs with a spoon while the hours simmer, pinches for "just a pinch"
    r.Mac = actor(c, E, t, "Mac", CH.Mac, ST, KEYS.Mac, { scale: sc, seed: 1, noShadow: true, over: (p, k, tt) => {
      if (tt >= T(7) - 0.2 && tt < T(11) - 0.2) { p.prop = "spoon"; p.propHand = "R"; p.armR = [0.8 + 0.22 * Math.sin(tt * 6), 0.9]; p.armL = [0.5, 0.5]; }
      const pn = E.W_(4, /pinch/, 0.9); if (tt > pn - 0.3 && tt < pn + 0.9) { p.armR = [1.3 + 0.25 * Math.sin((tt - pn) * 9), 0.6]; }
      return {}; } });
    // the pot
    const sim = t >= T(7) - 0.2 && t < T(11) - 0.2; pot(c, E, t, potX, topY, V ? 1.15 : 0.95, sim);
    // ingredients dropping into the pot at the right words
    const drop = (at, draw) => { const d = t - at; if (d < 0 || d > 0.9) return; const u = d / 0.9, y = lerp(topY - 460, topY - 60, easeOut(u)), a = 1 - ease((u - 0.7) / 0.3); c.save(); c.globalAlpha = a; draw(potX + Math.sin(u * 4) * 20, y); c.restore(); };
    // six workers appear on the board
    const sx = E.W_(3, /Six/i, 0.5); [0, 1, 2, 3, 4, 5].forEach((i) => { const a = easeBack((t - sx - i * 0.12) / 0.3) * (t < T(4) + 1.0 ? 1 : 1 - ease((t - T(4) - 1.0) / 0.3)); if (a <= 0.01) return; const x = potX - 175 + i * 70, y = topY - 14; c.save(); c.translate(x, y); c.scale(a, a); c.fillStyle = "#f1c9a0"; c.beginPath(); c.arc(0, -36, 18, 0, 7); c.fill(); c.fillStyle = ["#F5C400", "#ff7a1c", "#fff", "#F5C400", "#ff7a1c", "#fff"][i]; c.beginPath(); c.arc(0, -42, 19, Math.PI, 0); c.fill(); c.fillRect(-24, -44, 48, 7); c.fillStyle = "#3b4a63"; rr(c, -17, -18, 34, 40, 10); c.fill(); c.restore(); });
    drop(E.W_(4, /pinch/, 0.9), (x, y) => { c.fillStyle = "#fff"; c.fillRect(x - 40, y - 30, 80, 70); c.fillStyle = "#cfe1f3"; c.fillRect(x - 34, y - 24, 68, 48); c.fillStyle = "#F5C400"; c.beginPath(); c.arc(x, y - 4, 10, 0, 7); c.fill(); c.fillStyle = "#e0301e"; c.beginPath(); c.moveTo(x + 58, y - 42); c.arc(x + 58, y - 52, 14, 0, 7); c.fill(); c.beginPath(); c.moveTo(x + 46, y - 46); c.lineTo(x + 58, y - 22); c.lineTo(x + 70, y - 46); c.fill(); });
    const pin = E.W_(6, /Location/i, 0.5); { const u = clamp((t - pin) / 1.2); if (u > 0 && u < 1) { const y = lerp(topY - 40, topY - 330, easeOut(u)); c.save(); c.globalAlpha = 1 - ease((u - 0.75) / 0.25); c.translate(potX, y); c.fillStyle = "#e0301e"; c.beginPath(); c.arc(0, -30, 30, 0, 7); c.fill(); c.beginPath(); c.moveTo(-22, -14); c.lineTo(0, 30); c.lineTo(22, -14); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -30, 11, 0, 7); c.fill(); c.fillStyle = "#6bbf59"; c.beginPath(); c.ellipse(34, -58, 26, 12, -0.6, 0, 7); c.fill(); c.restore(); } }
    // hours bubbling up out of the pot while it simmers
    if (sim) for (let i = 0; i < 6; i++) { const ph = ((t - T(7)) * 0.5 + i * 0.17) % 1, x = potX + Math.sin(i * 2.3 + t) * 70, y = topY - 90 - ph * 330, a = Math.sin(ph * Math.PI); c.save(); c.globalAlpha = a; c.fillStyle = i === 3 ? "#F5C400" : "#ffffff"; c.beginPath(); c.arc(x, y, 34 + (i % 3) * 6, 0, 7); c.fill(); c.fillStyle = INK; c.font = "800 34px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(["8h", "9h", "10h", "OT", "8h", "7h"][i], x, y + 2); c.restore(); }
    // overtime "seasoning"
    const se = E.W_(9, /seasoned/, 0.9); { const u = clamp((t - se + 0.7) / 1.4); if (u > 0 && u < 1) { c.save(); c.translate(potX + 150, topY - 340 + Math.sin(u * 20) * 6); c.rotate(2.2); c.fillStyle = "#e8edf3"; rr(c, -22, -50, 44, 80, 10); c.fill(); c.fillStyle = "#F5C400"; c.fillRect(-22, -50, 44, 18); c.restore(); for (let i = 0; i < 10; i++) { const k = (u * 2 + i * 0.1) % 1; c.fillStyle = "#F5C400"; c.beginPath(); c.arc(potX + 120 - k * 90 + Math.sin(i) * 10, topY - 330 + k * 250, 5, 0, 7); c.fill(); } } }
    // DING: the oven timer
    const dg = E.W_(11, /Ding/i, 0.3); pop(c, "DING!", potX, topY - 520, easeBack((t - dg) / 0.2) * (1 - ease((t - dg - 1.0) / 0.2)), V ? 150 : 120, "#F5C400", -0.1, INK);
    // no oven, no signal
    const no = E.W_(15, /Nope/i, 0.2); { const u = easeBack((t - no) / 0.3) * (1 - ease((t - T(15) - 6) / 0.4)); if (u > 0) { c.save(); c.translate(V ? W * 0.5 : W * 0.5, V ? H * 0.2 : H * 0.18); c.scale(clamp(u, 0, 1.1), clamp(u, 0, 1.1)); c.fillStyle = "#fff"; rr(c, -230, -80, 460, 160, 30); c.fill(); c.strokeStyle = "#e0301e"; c.lineWidth = 12; c.beginPath(); c.moveTo(-120, -50); c.lineTo(-30, 50); c.moveTo(-30, -50); c.lineTo(-120, 50); c.stroke(); c.fillStyle = INK; c.font = "800 70px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("OVEN", -10, -20); c.fillStyle = "#22a85a"; c.fillText("NO SIGNAL ✓", -10, 40); c.restore(); } }
    // Jess burns dinner: a smoke cloud rising over her head
    const sm = E.L(17); if (t > sm - 0.2) { const a = clamp((t - sm + 0.2) / 0.6); for (let i = 0; i < 5; i++) { const k = ((t - sm) * 0.45 + i * 0.2) % 1; c.fillStyle = `rgba(70,70,80,${0.5 * a * (1 - k)})`; c.beginPath(); c.arc(r.Jess.p.x + Math.sin(k * 6 + i) * 30, r.Jess.p.y - 520 * sc * 0.85 - k * 220, 26 + k * 40, 0, 7); c.fill(); } }
    // app screens
    const w = WIN.find((x) => t >= x.a && t <= x.b);
    if (w) { const a = easeBack((t - w.a) / 0.4) * (1 - ease((t - (w.b - 0.25)) / 0.25)), ix = V ? W * 0.5 : W * 0.5, iy = V ? H * 0.235 : H * 0.34, iw = V ? 290 : 250; phoneInset(c, w.img, ix, iy, iw, -0.04, a, t); w.chips.forEach(([re, label, dx, dy], i) => { const at = E.W_(w.line, re, 0.4), ca = easeBack((t - at) / 0.3) * (1 - ease((t - (w.b - 0.25)) / 0.25)); chip(c, label, ix + dx * (V ? 1 : 0.75), iy + dy * (V ? 1 : 0.75), ca, V ? 44 : 36, i % 2 ? 0.05 : -0.05); }); }
    // the counter hides the legs; drawn last
    counter(c, E, topY, gy);
    E.caption(c, t, { y: V ? H * 0.94 : H * 0.95, size: V ? 56 : 46, hi: "#F5C400", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 150 : W * 0.7 });
    const eIn = E.LE(18) - 0.25; if (t >= eIn) endCard(c, E, t, t - eIn, { icon: ICON });
  },

  audio(h, E) {
    const T = (i, o = 0) => E.L(i) + o; bed(h, E, { bpm: 118, vol: 0.9, prog: [[261.6, 329.6, 392], [293.7, 349.2, 440], [246.9, 293.7, 392], [220, 261.6, 329.6]], roots: [65.4, 73.4, 61.7, 55] });
    // sizzle while the hours simmer
    h.burst(T(7) - 0.2, [6000, 5000], 0.4, E.LE(10) - T(7) + 0.4, 0.05, "highpass");
    sfx.sparkle(h, E.W_(4, /pinch/, 0.9)); sfx.sparkle(h, E.W_(6, /Location/i, 0.5)); sfx.sparkle(h, E.W_(9, /seasoned/, 0.9));
    const dg = E.W_(11, /Ding/i, 0.3); h.ding(dg, 1568, 0.18); h.ding(dg + 0.01, 2349, 0.1); sfx.whoosh(h, dg - 0.1, 0.2);
    for (const w of WIN) { sfx.whoosh(h, w.a); w.chips.forEach(([re]) => sfx.pop(h, E.W_(w.line, re, 0.4))); }
    sfx.rim(h, E.LE(1) + 0.1); sfx.boing(h, T(5) + 0.05); sfx.trombone(h, E.LE(17) + 0.15); sfx.applause(h, E.W_(15, /Nope/i, 0.2) + 2.5, 2); sfx.applause(h, T(16) + 2.0, 2);
    const iE = E.LE(18) - 0.25; sfx.whoosh(h, iE - 0.1, 0.4); sfx.sparkle(h, iE + 0.3);
  },
};

function pot(c, E, t, x, y, s, sim) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = "#4a5568"; rr(c, -160, -150, 320, 150, 26); c.fill(); c.fillStyle = "#2f3745"; c.fillRect(-160, -150, 320, 22); c.fillStyle = "#4a5568"; rr(c, -208, -110, 52, 22, 10); c.fill(); rr(c, 156, -110, 52, 22, 10); c.fill();
  c.fillStyle = sim ? "#ffcc33" : "#c9d3de"; c.beginPath(); c.ellipse(0, -150, 140, 20, 0, 0, 7); c.fill();
  if (sim) { c.fillStyle = "rgba(255,255,255,0.8)"; for (let i = 0; i < 6; i++) { const k = (t * 1.2 + i * 0.3) % 1; c.beginPath(); c.arc(-90 + i * 36, -150 - k * 18, 7 + (i % 2) * 3, 0, 7); c.fill(); } }
  c.restore();
}
function counter(c, E, topY, gy) { const { W, H } = E; c.fillStyle = "#c98f5a"; c.fillRect(-20, topY, W + 40, 26); c.fillStyle = "#e9a867"; c.fillRect(-20, topY + 26, W + 40, H); c.fillStyle = "rgba(0,0,0,0.06)"; for (let x = 0; x < W; x += 180) c.fillRect(x, topY + 40, 3, H); c.fillStyle = "#f4efe6"; c.fillRect(-20, topY - 8, W + 40, 10); }
function kitchen(c, E, t, gy) {
  const { W, H, V } = E; c.fillStyle = "#e9f4f6"; c.fillRect(-20, -20, W + 40, H + 40);
  // teal and white checker backsplash
  const ts = V ? 120 : 100, by = V ? H * 0.34 : H * 0.28; for (let y = by; y < gy; y += ts) for (let x = 0; x < W; x += ts) { c.fillStyle = (((x / ts) | 0) + ((y / ts) | 0)) % 2 ? "#bfe3e8" : "#e9f6f8"; c.fillRect(x, y, ts, ts); }
  // top wall + neon sign
  c.fillStyle = "#2a8f9c"; c.fillRect(-20, -20, W + 40, by + 20); const sw = V ? 840 : 760, sh = V ? 150 : 120, sx = W / 2 - sw / 2, sy = V ? H * 0.05 : H * 0.045; c.fillStyle = "#17353c"; rr(c, sx, sy, sw, sh, 24); c.fill(); const glow = 0.8 + 0.2 * Math.sin(t * 3); c.shadowColor = "#F5C400"; c.shadowBlur = 30 * glow; c.fillStyle = "#F5C400"; c.font = `800 ${V ? 88 : 72}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("COOKING WITH CONSTRA", W / 2, sy + sh / 2 + 4); c.shadowBlur = 0;
  // hanging pans and a shelf of jars
  c.strokeStyle = "#17353c"; c.lineWidth = 6; for (let i = 0; i < 4; i++) { const px = (V ? 120 : 160) + i * (V ? 250 : 190) + (i > 1 ? (V ? 220 : 560) : 0), py = by + 40; c.beginPath(); c.moveTo(px, by - 6); c.lineTo(px, py); c.stroke(); c.fillStyle = ["#4a5568", "#c95c3b", "#4a5568", "#e0a02b"][i]; c.beginPath(); c.arc(px, py + 52, 46, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.18)"; c.beginPath(); c.arc(px - 14, py + 40, 16, 0, 7); c.fill(); }
  c.fillStyle = "#c98f5a"; c.fillRect(W * 0.04, by + 210, W * 0.28, 14); for (let i = 0; i < 4; i++) { c.fillStyle = ["#e0301e", "#F5C400", "#6bbf59", "#ffffff"][i]; rr(c, W * 0.06 + i * 62, by + 150, 46, 60, 8); c.fill(); }
  // studio floor
  c.fillStyle = "#cdd8dd"; c.fillRect(-20, gy - 6, W + 40, H);
}

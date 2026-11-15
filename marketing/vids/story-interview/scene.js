import { STYLES, actor, phoneInset, chip, pop, endCard, bed, sfx, loadShots, loadImg, rr, clamp, lerp, ease, easeOut, easeBack, rnd } from "/stage.js";

// "The Interview" - a job interview in a pop-art comic look. HR (Jess) interviews two candidates for site timekeeper: a Notebook and Constra.
const ST = STYLES.comic, INK = "#0b0b0b";
const JESS = { skin: "#f3c9a5", shirt: "#7a3fb0", sleeve: "#7a3fb0", pants: "#2b2f3a", hair: "#7a3b1d", hairStyle: "long", glasses: true, tie: undefined };
let SH, ICON, KEYS, WIN;
const build = (base, steps) => { let s = { ...base }; const out = [{ ...s }]; for (const st of steps) { s = { ...s, ...st }; out.push({ ...s }); } return out; };

export default {
  endHold: 2.8, lead: 0.3, reverb: 0.07, bedGain: 0.45, duckTo: 0.3,
  voices: { Jess: { pan: -0.3 }, Notebook: { pan: 0.1 }, Constra: { pan: 0.3 } },
  async init(E) {
    SH = await loadShots(["time-tracking", "timesheets", "crew-plan", "invoices"]); ICON = await loadImg("/icon.png");
    const { W, H, V } = E, T = (i, o = 0) => E.L(i) + o, gy = V ? H * 0.8 : H * 0.88, jx = V ? W * 0.17 : W * 0.2, nx = V ? W * 0.54 : W * 0.55, cx = V ? W * 0.85 : W * 0.78;
    KEYS = {
      Jess: build({ at: 0, x: jx, y: gy, flip: 1, mood: "happy", prop: "clipboard", propHand: "R", armR: [1.0, 0.5] }, [
        { at: T(2), mood: "neutral" }, { at: T(4) - 0.1, mood: "neutral" }, { at: T(5) + 0.3, mood: "shock" }, { at: T(6) - 0.1, mood: "happy" }, { at: T(8), mood: "neutral" }, { at: T(10) - 0.2, mood: "happy" }, { at: T(12), mood: "neutral" }, { at: T(13) + 0.5, mood: "happy" }, { at: T(15) - 0.1, mood: "neutral" }, { at: T(18) - 0.1, mood: "happy" }, { at: T(21) - 0.1, mood: "happy" },
      ]),
      Notebook: build({ at: 0, x: W + 300, y: gy, flip: -1, mood: "happy" }, [
        { at: E.W_(0, /Notebook/, 0.8) + 0.5, x: nx }, { at: T(3) - 0.1, mood: "sad" }, { at: T(5) - 0.1, mood: "smug" }, { at: T(6) - 0.1, mood: "neutral" }, { at: T(10) - 0.2, mood: "sad" }, { at: T(14) - 0.1, mood: "happy" }, { at: T(17) - 0.1, mood: "smug" }, { at: T(20) - 0.1, mood: "sad" }, { at: E.LE(20) + 0.4, x: W + 300, mood: "sad" },
      ]),
      Constra: build({ at: 0, x: W + 300, y: gy, flip: -1, mood: "happy" }, [
        { at: T(6) + 0.2, x: W + 300 }, { at: T(7) - 0.15, x: cx, mood: "happy" }, { at: T(13) - 0.1, mood: "smug" }, { at: T(19) - 0.1, mood: "happy", bounce: -8 }, { at: T(19) + 1.5, mood: "happy", bounce: 0 },
      ]),
    };
    WIN = [
      { a: T(7) - 0.1, b: E.LE(8) + 0.3, img: SH["time-tracking"], line: 7, chips: [[/photo/, "PHOTO + GPS", -140, -230], [/crew/, "WHOLE CREW", 140, 270]] },
      { a: T(9) - 0.1, b: E.LE(9) + 1.0, img: SH.timesheets, line: 9, chips: [[/build/, "AUTO TIMESHEETS", -120, -240], [/Excel/, "PDF + EXCEL", 140, 260], [/overtime/, "OVERTIME ✓", -100, 330]] },
      { a: T(11) - 0.1, b: E.LE(11) + 0.6, img: SH["crew-plan"], line: 11, chips: [[/schedules/, "SCHEDULES", -130, -240], [/invoices/, "INVOICES", 140, 260], [/Twenty-six/, "26 TOOLS", -90, 330], [/templates/, "+23 EXCEL TEMPLATES", 60, 390]] },
      { a: T(15) - 0.1, b: E.LE(15) + 0.6, img: SH["time-tracking"], line: 15, chips: [[/keep/, "WORKS OFFLINE", -120, -240], [/sync/, "SYNCS ONLINE ✓", 120, 280]] },
    ];
  },

  draw(t, c, E) {
    const { W, H, V } = E, gy = V ? H * 0.8 : H * 0.88, sc = V ? 1.6 : 1.15, T = (i, o = 0) => E.L(i) + o;
    office(c, E, t, gy);
    const jess = actor(c, E, t, "Jess", JESS, ST, KEYS.Jess, { scale: sc, seed: 2, noShadow: false });
    const nb = actor(c, E, t, "Notebook", null, ST, KEYS.Notebook, { scale: sc * 1.05, seed: 4, kind: "notebook", tie: "#c2336b" });
    const co = actor(c, E, t, "Constra", null, ST, KEYS.Constra, { scale: sc * 1.05, seed: 5, kind: "phone" });
    const deskTop = gy - 150 * sc; desk(c, E, V ? W * 0.38 : W * 0.42, deskTop, gy);
    // gags around the Notebook's answers
    const nx = nb.p.x, ny = gy - 500 * sc;
    const icon = (re, line, dur, fn) => { const at = E.W_(line, re, 0.3), d = t - at; if (d < -0.05 || d > dur) return; const a = easeBack(d / 0.25) * (1 - ease((d - dur + 0.25) / 0.25)); c.save(); c.translate(nx - 30, ny); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); fn(d); c.restore(); };
    icon(/Rain/, 3, 1.4, (d) => { c.fillStyle = "#9db6cf"; for (const [x, y, r] of [[-30, 0, 34], [10, -14, 40], [50, 0, 32]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); c.strokeStyle = "#3a8fe0"; c.lineWidth = 6; for (let i = 0; i < 4; i++) { const k = (d * 2 + i * 0.25) % 1; c.beginPath(); c.moveTo(-30 + i * 28, 40 + k * 60); c.lineTo(-34 + i * 28, 60 + k * 60); c.stroke(); } });
    icon(/Coffee/, 3, 1.1, (d) => { c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-34, -30); c.lineTo(34, -30); c.lineTo(26, 40); c.lineTo(-26, 40); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); c.fillStyle = "#8a5a2b"; c.fillRect(-30, -26, 60, 16); c.strokeStyle = INK; c.beginPath(); c.arc(40, 4, 16, -1.2, 1.2); c.stroke(); });
    icon(/Dogs/, 3, 1.0, () => { pop(c, "WOOF!", 0, 0, 1, 90, "#F5C400", -0.12, INK); });
    icon(/truck/, 3, 1.6, (d) => { c.fillStyle = "#e0301e"; rr(c, -60, -20, 90, 44, 8); c.fill(); c.fillStyle = "#c92b2b"; rr(c, 30, -4, 46, 28, 6); c.fill(); c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(-60, -20, 90, 44); c.fillStyle = INK; for (const x of [-34, 52]) { c.beginPath(); c.arc(x, 28, 13, 0, 7); c.fill(); } c.fillStyle = INK; c.font = "800 44px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.fillText("?", -10, -36); });
    icon(/vibes/, 5, 1.8, (d) => { pop(c, "VIBES?", 0, 0, 1, 100, "#d6a8ff", 0.08, INK); });
    // paper "I'm paper" gag
    // HIRED stamp
    const hr = E.W_(19, /Right/, 0.2) + 0.2, ha = clamp((t - hr) / 0.18); if (ha > 0 && t < E.LE(19) + 2.4) { const s = lerp(2.6, 1, easeOut(ha)); c.save(); c.translate(co.p.x - 30, gy - 330 * sc); c.rotate(-0.2); c.scale(s, s); c.globalAlpha = clamp(ha * 1.5); c.strokeStyle = "#22a85a"; c.fillStyle = "#22a85a"; c.lineWidth = 14; rr(c, -190, -80, 380, 160, 24); c.stroke(); c.font = "800 150px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("HIRED", 0, 6); c.restore(); if (t > hr + 0.2) for (let i = 0; i < 26; i++) { const k = (t - hr - 0.2) * 0.7 + rnd(i + 3) * 0.2, x = co.p.x + (rnd(i * 5 + 1) - 0.5) * 520, y = gy - 800 * sc * 0.5 + k * 700; c.fillStyle = ["#F5C400", "#e0301e", "#3a8fe0", "#22a85a", "#c25bd6"][i % 5]; c.save(); c.translate(x, y); c.rotate(k * 9 + i); c.fillRect(-9, -5, 18, 10); c.restore(); } }
    // app screens
    const w = WIN.find((x) => t >= x.a && t <= x.b);
    if (w) { const a = easeBack((t - w.a) / 0.4) * (1 - ease((t - (w.b - 0.25)) / 0.25)), ix = V ? W * 0.5 : W * 0.5, iy = V ? H * 0.255 : H * 0.34, iw = V ? 320 : 250; phoneInset(c, w.img, ix, iy, iw, -0.04, a, t); w.chips.forEach(([re, label, dx, dy], i) => { const at = E.W_(w.line, re, 0.4), ca = easeBack((t - at) / 0.3) * (1 - ease((t - (w.b - 0.25)) / 0.25)); chip(c, label, ix + dx * (V ? 1 : 0.75), iy + dy * (V ? 1 : 0.75), ca, V ? 44 : 36, i % 2 ? 0.05 : -0.05); }); }
    E.caption(c, t, { y: V ? H * 0.94 : H * 0.95, size: V ? 56 : 46, hi: "#F5C400", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 150 : W * 0.7 });
    const eIn = E.LE(21) - 0.25; if (t >= eIn) endCard(c, E, t, t - eIn, { icon: ICON });
  },

  audio(h, E) {
    const T = (i, o = 0) => E.L(i) + o; bed(h, E, { bpm: 112, vol: 0.85, prog: [[261.6, 329.6, 392], [220, 261.6, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6]], roots: [65.4, 55, 49, 43.65] });
    sfx.trombone(h, E.LE(5) + 0.2); sfx.rim(h, E.LE(5) + 0.05); sfx.boing(h, E.W_(3, /Dogs/, 0.3)); sfx.rim(h, E.LE(13) + 0.1); sfx.rim(h, E.LE(17) + 0.1); sfx.trombone(h, E.LE(20) + 0.2);
    for (const w of WIN) { sfx.whoosh(h, w.a); w.chips.forEach(([re]) => sfx.pop(h, E.W_(w.line, re, 0.4))); }
    const hr = E.W_(19, /Right/, 0.2) + 0.2; sfx.thump(h, hr + 0.18); sfx.applause(h, hr + 0.3, 2.4); sfx.sparkle(h, hr + 0.3);
    sfx.sparkle(h, E.W_(6, /Constra|Konstra/i, 0.8)); const iE = E.LE(21) - 0.25; sfx.whoosh(h, iE - 0.1, 0.4); sfx.sparkle(h, iE + 0.3);
  },
};

function desk(c, E, w, top, gy) { c.fillStyle = "#8f5a2c"; c.fillRect(-20, top, w + 20, gy - top + 80); c.strokeStyle = INK; c.lineWidth = 8; c.strokeRect(-20, top, w + 20, gy - top + 80); c.fillStyle = "#c98f5a"; c.fillRect(-20, top - 20, w + 40, 24); c.strokeRect(-20, top - 20, w + 40, 24); c.fillStyle = "#F5C400"; rr(c, w * 0.34, top + 26, w * 0.42, 54, 8); c.fill(); c.stroke(); c.fillStyle = INK; c.font = "800 36px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("HIRING", w * 0.55, top + 54); c.fillStyle = "#fff"; rr(c, w * 0.74, top - 82, 48, 62, 8); c.fill(); c.stroke(); }
function office(c, E, t, gy) {
  const { W, H, V } = E; c.fillStyle = "#ffe4ef"; c.fillRect(-20, -20, W + 40, H + 40);
  // halftone dots, pop-art style
  c.fillStyle = "rgba(255,90,150,0.22)"; for (let y = 0; y < gy; y += 38) for (let x = ((y / 38) % 2) * 19; x < W; x += 38) { const r = 3 + 8 * (1 - y / gy); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  // sign and frames
  const sw = V ? 860 : 760, sh = V ? 230 : 190, sx = W / 2 - sw / 2, sy = V ? H * 0.045 : H * 0.05; c.fillStyle = "#F5C400"; rr(c, sx, sy, sw, sh, 22); c.fill(); c.strokeStyle = INK; c.lineWidth = 9; c.stroke(); c.fillStyle = INK; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `800 ${V ? 112 : 92}px 'Barlow Condensed', sans-serif`; c.fillText("NOW HIRING", W / 2, sy + sh * 0.36); c.font = `800 ${V ? 64 : 52}px 'Barlow Condensed', sans-serif`; c.fillText("SITE TIMEKEEPER", W / 2, sy + sh * 0.74);
  const fy = V ? H * 0.3 : H * 0.34; for (const [fx, col] of [[W * 0.09, "#6fb7ff"], [W * 0.91, "#8fe3a0"]]) { c.fillStyle = col; rr(c, fx - 70, fy, 140, 180, 8); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(fx - 46, fy + 24, 92, 12); c.fillRect(fx - 46, fy + 52, 70, 12); c.fillRect(fx - 46, fy + 80, 82, 12); }
  // plant
  c.fillStyle = "#c25b3b"; c.beginPath(); c.moveTo(W * 0.93 - 36, gy - 90); c.lineTo(W * 0.93 + 36, gy - 90); c.lineTo(W * 0.93 + 26, gy); c.lineTo(W * 0.93 - 26, gy); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#3fa24a"; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(W * 0.93 + (i - 2) * 20, gy - 150 - Math.abs(i - 2) * -14, 20, 62, (i - 2) * 0.35, 0, 7); c.fill(); c.stroke(); }
  c.fillStyle = "#a8c6e6"; c.fillRect(-20, gy - 6, W + 40, H); c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(-20, gy - 6); c.lineTo(W + 20, gy - 6); c.stroke();
}

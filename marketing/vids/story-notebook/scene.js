import { STYLES, actor, phoneInset, chip, pop, clouds, endCard, bed, sfx, loadShots, loadImg, rr, clamp, lerp, ease, easeOut, easeBack, rnd } from "/stage.js";

// "The Notebook" - a three-person sketch on a job site, thick-outline cartoon look. Payroll day, a very chewed notebook, and a phone that settles it.
const ST = STYLES.toon, INK = "#1a1a1f";
const CH = {
  Mac: { skin: "#e8b98a", shirt: "#f4f4f4", sleeve: "#f4f4f4", pants: "#1f2a44", hat: "#ffffff", hair: "#3a2519", hairStyle: "short", stache: true, logo: "#F5C400" },
  Jess: { skin: "#f3c9a5", shirt: "#c2336b", pants: "#2b2f3a", vest: "#F5C400", hat: "#F5C400", hair: "#7a3b1d", hairStyle: "ponytail", glove: "#2a2a2d" },
  Dev: { skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", hair: "#1d1410", hairStyle: "short", beard: true, w: 1.12 },
};
let SH, ICON, KEYS, WIN;
// build a full key list from a base state and a list of partial steps (every key carries the whole state)
const build = (base, steps) => { let s = { ...base }; const out = [{ ...s }]; for (const st of steps) { s = { ...s, ...st }; out.push({ ...s }); } return out; };

export default {
  endHold: 2.8, lead: 0.3, reverb: 0.06, bedGain: 0.45, duckTo: 0.28,
  voices: { Mac: { pan: -0.25 }, Jess: { pan: 0.05 }, Dev: { pan: 0.3 } },
  async init(E) {
    SH = await loadShots(["time-tracking", "timesheets"]); ICON = await loadImg("/icon.png");
    const { W, H, V } = E, T = (i, o = 0) => E.L(i) + o, gy = V ? H * 0.845 : H * 0.86, mx = V ? W * 0.18 : W * 0.17, jx = V ? W * 0.5 : W * 0.37, dx = V ? W * 0.83 : W * 0.83;
    KEYS = {
      Mac: build({ at: 0, x: mx, y: gy, flip: 1, mood: "neutral", prop: "clipboard", propHand: "R", armR: [1.0, 0.55] }, [
        { at: T(6) - 0.1, mood: "neutral" }, { at: T(7) - 0.05, mood: "shock" }, { at: T(8) + 0.3, mood: "neutral" },
        { at: T(9) - 0.15, mood: "angry", flush: 0.45 }, { at: E.LE(9) + 0.5, mood: "sad", flush: 0 },
        { at: T(10) + 1.0, mood: "neutral" }, { at: T(11) - 0.1, mood: "shock" }, { at: T(12) + 0.2, mood: "happy" },
        { at: T(17) - 0.1, mood: "neutral" }, { at: T(19) - 0.1, mood: "happy" }, { at: T(22) - 0.1, mood: "neutral" },
        { at: T(23) - 0.3, mood: "happy", prop: undefined, armR: [2.5, 0.2] },
      ]),
      Jess: build({ at: 0, x: jx, y: gy, flip: -1, mood: "neutral" }, [
        { at: T(1) - 0.1, mood: "happy" }, { at: T(3), mood: "smug" }, { at: T(5), mood: "neutral" },
        { at: T(10) - 0.7, x: jx - (V ? 20 : 60), mood: "happy", prop: "phone", propHand: "R", screen: undefined, armR: [1.45, 0.65] },
        { at: T(12) - 0.1, mood: "happy" }, { at: T(14) - 0.1, mood: "smug" }, { at: T(20), mood: "neutral" }, { at: T(23) - 0.3, mood: "happy" },
      ]),
      Dev: build({ at: 0, x: dx, y: gy, flip: -1, mood: "happy" }, [
        { at: T(3) - 0.1, mood: "happy" }, { at: T(4) - 0.1, mood: "smug" }, { at: T(5) - 0.1, mood: "neutral" },
        { at: T(6) - 0.5, mood: "sad", sweat: true, prop: "notebook", soggy: true, propHand: "R", armR: [1.15, 0.9] },
        { at: T(8) - 0.1, mood: "smug", sweat: false }, { at: T(9) + 0.2, mood: "sad", sweat: true },
        { at: T(13) - 0.1, mood: "sad", sweat: false }, { at: T(14) - 0.1, mood: "shock" },
        { at: T(15) + 0.2, mood: "angry" }, { at: T(15) + 0.95, mood: "happy" }, { at: T(15) + 1.6, mood: "angry" }, { at: T(16) + 0.2, mood: "neutral" },
        { at: T(20) - 0.1, mood: "happy" }, { at: T(21) - 0.1, mood: "sad" }, { at: T(22) - 0.1, mood: "sad", tilt: -0.12 }, { at: T(23) - 0.3, mood: "happy", tilt: 0 },
      ]),
    };
    // Jess's phone screen changes with the story
    KEYS.Jess.forEach((k) => { if (k.prop === "phone") k.screen = SH["time-tracking"]; });
    WIN = [
      { a: T(10) - 0.2, b: E.LE(11) + 0.3, img: SH["time-tracking"], chips: [[/photo/, "PHOTO", -130, -250], [/G/, "GPS LOCATION", 120, 280]] },
      { a: T(12) - 0.1, b: E.LE(14) + 0.3, img: SH.timesheets, chips: [[/themselves/, "TIMESHEETS BUILD THEMSELVES", 0, 320]] },
      { a: T(16) - 0.1, b: E.LE(16) + 0.5, img: SH.timesheets, chips: [[/Overtime/, "OVERTIME WORKED OUT", -90, -250], [/P/, "PDF", 150, 260], [/Excel/, "EXCEL", -150, 330]] },
      { a: T(18) - 0.1, b: E.LE(18) + 0.5, img: SH["time-tracking"], chips: [[/saves/, "NO SIGNAL? SAVED", -60, -250], [/syncs/, "SYNCS ONLINE", 100, 300]] },
    ];
  },

  draw(t, c, E) {
    const { W, H, V } = E, gy = V ? H * 0.845 : H * 0.86, sc = V ? 1.32 : 1.28;
    // camera shake on the big moments
    let shake = 0; for (const [i, k] of [[7, 0.2], [9, 0.0], [12, 0]]) { const d = t - (E.L(i) + k); if (d >= 0 && d < 0.4 && i !== 12) shake = (1 - d / 0.4) * 14; } const eIn = E.LE(23) - 0.25;
    c.save(); c.translate((rnd(Math.floor(t * 50) + 1) - 0.5) * shake, (rnd(Math.floor(t * 50) + 7) - 0.5) * shake);
    site(c, E, t, gy);
    // people (back to front by x doesn't matter here: they stand apart)
    const bg = "#cfe6ff";
    const r = {};
    for (const [n, seed] of [["Mac", 1], ["Dev", 3], ["Jess", 2]]) r[n] = actor(c, E, t, n, CH[n], ST, KEYS[n], { scale: sc, seed, bgCol: bg });
    // Mac's "payroll rage": red anger marks by his head
    const m = r.Mac.p, hx = m.x + 70 * sc, hy = m.y - 400 * sc, rage = E.speaking("Mac", t) === 9 ? 1 : 0;
    if (rage) { c.strokeStyle = "#e0301e"; c.lineWidth = 9; c.lineCap = "round"; const w = Math.sin(t * 22) * 4; for (const [dx, dy, a] of [[0, 0, 0.3], [26, -20, -0.2]]) { c.save(); c.translate(hx + dx + w, hy + dy); c.rotate(a); c.beginPath(); c.moveTo(-16, -16); c.quadraticCurveTo(0, -4, -16, 16); c.moveTo(16, -16); c.quadraticCurveTo(0, -4, 16, 16); c.stroke(); c.restore(); } }
    pop(c, "BITE?!", r.Mac.p.x + 150, r.Mac.p.y - 470 * sc, easeBack((t - E.L(7)) / 0.25) * (1 - ease((t - E.LE(7) - 0.5) / 0.2)), 110, "#F5C400", -0.12);
    // app-screen windows
    const w = WIN.find((x) => t >= x.a && t <= x.b);
    if (w) {
      const a = easeBack((t - w.a) / 0.4) * (1 - ease((t - (w.b - 0.25)) / 0.25)), ix = V ? W * 0.5 : W * 0.64, iy = V ? H * 0.255 : H * 0.4, iw = V ? 330 : 270;
      phoneInset(c, w.img, ix, iy, iw, V ? -0.05 : -0.04, a, t);
      w.chips.forEach(([re, label, dx, dy], i) => { const at = E.W_(WIN === null ? 0 : lineOf(E, w), re, 0.4); const ca = easeBack((t - at) / 0.3) * (1 - ease((t - (w.b - 0.25)) / 0.25)); chip(c, label, ix + dx * (V ? 1 : 0.75), iy + dy * (V ? 1 : 0.75), ca, V ? 44 : 36, i % 2 ? 0.05 : -0.05); });
    }
    // clouds ride above the set but under the chips
    c.restore();
    E.caption(c, t, { y: V ? H * 0.93 : H * 0.945, size: V ? 56 : 46, hi: "#F5C400", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 150 : W * 0.7 });
    if (t >= eIn) endCard(c, E, t, t - eIn, { icon: ICON });
  },

  audio(h, E) {
    const T = (i, o = 0) => E.L(i) + o; bed(h, E, { bpm: 104, vol: 0.85 });
    sfx.boing(h, T(7) - 0.05); sfx.thump(h, T(9)); sfx.trombone(h, E.LE(6) + 0.25); sfx.rim(h, E.LE(15) + 0.1); sfx.trombone(h, E.LE(22) + 0.2);
    for (const w of WIN) { sfx.whoosh(h, w.a); w.chips.forEach(([re], i) => { const at = E.W_(lineOf(E, w), re, 0.4); sfx.pop(h, at); }); }
    const iE = E.LE(23) - 0.25; sfx.whoosh(h, iE - 0.1, 0.4); sfx.sparkle(h, iE + 0.3); sfx.applause(h, E.L(23) + 2.4, 2.5);
  },
};

// which line a window belongs to (for chip word timings)
function lineOf(E, w) { for (let i = 0; i < E.N; i++) if (E.L(i) >= w.a - 0.3) return i; return 0; }

// ── the set: a framed house on a sunny build site ──
function site(c, E, t, gy) {
  const { W, H, V } = E; const g = c.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, "#74c8ff"); g.addColorStop(1, "#e4f6ff"); c.fillStyle = g; c.fillRect(-40, -40, W + 80, H + 80);
  // sun
  c.fillStyle = "#ffe27a"; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.arc(W * 0.84, V ? H * 0.12 : H * 0.17, V ? 80 : 64, 0, 7); c.fill(); c.stroke();
  clouds(c, W, H, t, V ? H * 0.2 : H * 0.12);
  // far skyline
  c.fillStyle = "#a9c4e0"; for (let i = 0; i < 9; i++) { const bx = i * (W / 8) - 30, bh = 160 + ((i * 97) % 140); c.fillRect(bx, gy - bh - 20, W / 8 - 12, bh + 20); }
  // crane
  const cx = V ? W * 0.9 : W * 0.93; c.strokeStyle = INK; c.lineWidth = 7; c.fillStyle = "#ffb000"; c.fillRect(cx - 16, gy - (V ? 640 : 560), 32, (V ? 640 : 560)); c.strokeRect(cx - 16, gy - (V ? 640 : 560), 32, (V ? 640 : 560)); const ty = gy - (V ? 640 : 560); c.fillRect(cx - 330, ty, 400, 26); c.strokeRect(cx - 330, ty, 400, 26); const sw = Math.sin(t * 0.8) * 14; c.beginPath(); c.moveTo(cx - 280, ty + 26); c.lineTo(cx - 280 + sw, ty + 170); c.stroke(); c.fillStyle = "#ddd"; c.fillRect(cx - 300 + sw, ty + 170, 40, 26); c.strokeRect(cx - 300 + sw, ty + 170, 40, 26);
  // house frame
  const hx = V ? W * 0.5 : W * 0.5, hw = V ? 620 : 640, hh = V ? 360 : 380, base = gy - 6; c.strokeStyle = INK; c.lineWidth = 7; c.fillStyle = "#e2b678";
  c.fillRect(hx - hw / 2, base - hh, hw, 26); c.strokeRect(hx - hw / 2, base - hh, hw, 26);
  for (let i = 0; i <= 10; i++) { const x = hx - hw / 2 + i * (hw / 10); c.fillRect(x - 11, base - hh + 26, 22, hh - 26); c.strokeRect(x - 11, base - hh + 26, 22, hh - 26); }
  c.beginPath(); c.moveTo(hx - hw / 2 - 20, base - hh); c.lineTo(hx, base - hh - 170); c.lineTo(hx + hw / 2 + 20, base - hh); c.stroke(); c.beginPath(); c.moveTo(hx, base - hh - 170); c.lineTo(hx, base - hh); c.moveTo(hx - hw / 4, base - hh - 85); c.lineTo(hx - hw / 4, base - hh); c.moveTo(hx + hw / 4, base - hh - 85); c.lineTo(hx + hw / 4, base - hh); c.stroke();
  // ground
  c.fillStyle = "#6bbf59"; c.fillRect(-40, gy - 8, W + 80, 40); c.strokeRect(-40, gy - 8, W + 80, 40); c.fillStyle = "#c89a5e"; c.fillRect(-40, gy + 32, W + 80, H); c.fillStyle = "rgba(90,50,10,0.18)"; for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse((i * 211) % W, gy + 60 + ((i * 131) % (H - gy - 80)), 22, 8, 0, 0, 7); c.fill(); }
  // cones and lumber in the foreground
  const cone = (x, y, s) => { c.fillStyle = "#ff7a1c"; c.beginPath(); c.moveTo(x - 30 * s, y); c.lineTo(x + 30 * s, y); c.lineTo(x + 9 * s, y - 80 * s); c.lineTo(x - 9 * s, y - 80 * s); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(x - 20 * s, y - 52 * s, 40 * s, 13 * s); c.strokeRect(x - 20 * s, y - 52 * s, 40 * s, 13 * s); c.fillStyle = "#e8620f"; c.fillRect(x - 38 * s, y, 76 * s, 12 * s); c.strokeRect(x - 38 * s, y, 76 * s, 12 * s); };
  cone(W * 0.04, gy + 100, 1.1); cone(W * 0.97, gy + 120, 1); c.fillStyle = "#d9a86a"; for (let i = 0; i < 4; i++) { c.fillRect(W * 0.62, gy + 70 + i * 22, 190, 20); c.strokeRect(W * 0.62, gy + 70 + i * 22, 190, 20); }
}

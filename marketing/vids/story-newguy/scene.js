import { STYLES, actor, phoneInset, chip, pop, loadShots, loadImg, rr, clamp, lerp, ease, easeOut, easeBack, rnd, bed, sfx } from "/stage.js";

// "New on the Block" - an illustrated, loading-screen style sketch: sunset over a neighbourhood, a guy with braids walks into a construction site and meets the crew.
// Characters are hand-inked (12 fps line boil), the street is a parallax painting that the camera tracks through. Original art and an original synthwave track.
const ST = { ...STYLES.comic, jitter: 12 };
const INK = "#1a1020", VO = new Set([0, 1, 11, 12, 13, 14]);
const CH = {
  Kai: { skin: "#7b4a2f", shirt: "#2f4a3a", sleeve: "#2f4a3a", pants: "#3a3f4a", boots: "#2a1f18", hair: "#14100d", hairStyle: "braids", bead: "#e0b43a", chain: true, brow: "#14100d", w: 1.04 },
  Mac: { skin: "#e8b98a", shirt: "#f4f4f4", sleeve: "#f4f4f4", pants: "#1f2a44", hat: "#ffffff", hair: "#3a2519", hairStyle: "short", stache: true, logo: "#F5C400" },
  Jess: { skin: "#f3c9a5", shirt: "#c2336b", pants: "#2b2f3a", vest: "#F5C400", hat: "#F5C400", hair: "#7a3b1d", hairStyle: "ponytail", glove: "#2a2a2d" },
  Dev: { skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", hair: "#1d1410", hairStyle: "short", beard: true, w: 1.1 },
};
const X = { gate: 2330, inside: 2490, mac: 2650, jess: 2880, dev: 3100, lotL: 2060, lotR: 3800 };
let SH, ICON, KEYS, CAM, WIN, TAGS;
const build = (base, steps) => { let s = { ...base }; const out = [{ ...s }]; for (const st of steps) { s = { ...s, ...st }; out.push({ ...s }); } return out; };
const mix = (a, b, k) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, "0")).join(""); };
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export default {
  endHold: 3.2, lead: 0.5, reverb: 0.05, bedGain: 0.62, duckTo: 0.3,
  voices: { Kai: { pan: 0, gain: 1.05 }, Mac: { pan: 0.2 }, Jess: { pan: -0.2 }, Dev: { pan: 0.3 } },
  async init(E) {
    SH = await loadShots(["time-tracking", "timesheets", "crew-plan", "invoices", "daily-reports"]); ICON = await loadImg("/icon.png");
    const { W, H, V } = E, T = (i, o = 0) => E.L(i) + o, gy = V ? H * 0.8 : H * 0.86;
    const arrive = T(2) - 0.25;
    KEYS = {
      Kai: build({ at: 0, x: -300, y: gy, flip: 1, mood: "neutral" }, [
        { at: arrive, x: X.gate }, { at: T(3), mood: "smug" }, { at: T(5) + 0.6, x: X.gate, mood: "happy" }, { at: T(5) + 1.5, x: X.inside, mood: "neutral" },
        { at: T(7) - 0.4, mood: "neutral", prop: "phone", propHand: "R", armR: [1.5, 0.7] }, { at: T(7) + 0.2, mood: "smug" }, { at: T(9) - 0.1, mood: "shock" }, { at: T(10) - 0.1, mood: "happy", prop: undefined, armR: undefined },
        { at: T(11) + 0.4, x: X.inside + 60 }, { at: E.LE(13) + 0.2, x: X.inside + 60 }, { at: E.LE(13) + 3.4, x: 3350, flip: 1, mood: "happy" },
      ]),
      Mac: build({ at: 0, x: X.mac, y: gy, flip: -1, mood: "neutral", prop: "clipboard", propHand: "R", armR: [1.0, 0.5] }, [
        { at: T(4) - 0.5, x: X.mac }, { at: T(4) + 0.3, x: 2440, mood: "happy", prop: undefined, armR: [1.35, 0.5] }, { at: T(5) + 0.3, x: X.mac, mood: "neutral", armR: undefined }, { at: T(10) - 0.1, mood: "smug" },
      ]),
      Jess: build({ at: 0, x: X.jess, y: gy, flip: -1, mood: "neutral" }, [
        { at: T(6) - 0.3, mood: "happy", prop: "phone", propHand: "R", armR: [1.35, 0.6] }, { at: T(8) - 0.1, mood: "smug" }, { at: T(10), mood: "neutral" },
      ]),
      Dev: build({ at: 0, x: X.dev, y: gy, flip: -1, mood: "neutral" }, [{ at: T(5) - 0.1, mood: "sad", sweat: true }, { at: T(6), mood: "neutral", sweat: false }]),
    };
    // camera: key list of focus x + zoom; the first segment follows Kai down the street
    CAM = [
      { at: 0, fx: null, z: 1.0 }, { at: T(2) - 0.3, fx: 2420, z: 1.12 }, { at: T(2) + 0.3, fx: 2500, z: 1.10 }, { at: T(3) - 0.1, fx: 2360, z: 1.36 }, { at: T(4) - 0.1, fx: 2520, z: 1.14 },
      { at: T(5) - 0.15, fx: 2860, z: 1.06 }, { at: T(6) - 0.1, fx: 2850, z: 1.41 }, { at: T(7) - 0.1, fx: 2490, z: 1.32 }, { at: T(8) - 0.1, fx: 2860, z: 1.28 }, { at: T(9) - 0.1, fx: 2500, z: 1.54 }, { at: T(10) - 0.1, fx: 2650, z: 1.32 },
      { at: T(11) - 0.4, fx: 2700, z: 1.0 }, { at: E.LE(13) + 0.4, fx: 3200, z: 1.0 }, { at: T(14) - 0.2, fx: 3000, z: 0.88 },
    ];
    WIN = [
      { a: T(7) - 0.1, b: E.LE(7) + 0.4, img: SH["time-tracking"], line: 7, chips: [[/Photo/i, "PHOTO", -150, -250], [/G/, "GPS", 140, 250]] },
      { a: T(8) - 0.1, b: E.LE(8) + 0.6, img: SH.timesheets, line: 8, chips: [[/build/, "AUTO TIMESHEETS", -120, -250], [/Overtime/i, "OVERTIME ✓", 150, 260], [/Excel/, "PDF + EXCEL", -100, 340]] },
      { a: T(11) + 1.2, b: E.LE(11) + 0.4, img: SH["time-tracking"], line: 11, chips: [[/signal/, "WORKS OFFLINE", -120, -250]] },
      { a: T(12) - 0.1, b: E.LE(12) + 0.5, img: SH["crew-plan"], line: 12, chips: [[/Schedules/, "SCHEDULES", -130, -250], [/Invoices/, "INVOICES", 150, 250], [/Daily/, "DAILY REPORTS", -110, 340], [/templates/, "+23 EXCEL TEMPLATES", 40, 420]] },
    ];
    TAGS = [[3, "Kai", "KAI", "ELECTRICIAN"], [2, "Mac", "MAC", "FOREMAN"], [5, "Dev", "DEV", "LABOURER"], [6, "Jess", "JESS", "CREW LEAD"]];
  },

  draw(t, c, E) {
    const { W, H, V } = E, T = (i, o = 0) => E.L(i) + o, gy = V ? H * 0.8 : H * 0.86, sc = V ? 1.3 : 1.12;
    // time of day: golden morning, then a time-lapse to dusk during the work montage
    const tod = 0.1 + 0.9 * ss(T(11) - 0.2, E.LE(13) + 0.3, t), lamp = ss(0.55, 0.9, tod);
    // ── camera
    const kai = trackX(KEYS.Kai, t); let cz, fx;
    { let k = 0; for (let i = 0; i < CAM.length; i++) if (t >= CAM[i].at) k = i; const a = CAM[k], b = CAM[Math.max(0, k - 1)], u = ease((t - a.at) / 0.5); const fa = a.fx ?? kai + W * 0.18, fb = b.fx ?? kai + W * 0.18; fx = lerp(k === 0 ? fa : fb, fa, k === 0 ? 1 : u); cz = lerp(k === 0 ? a.z : b.z, a.z, k === 0 ? 1 : u); if (t > T(11) - 0.4 && t < E.LE(13) + 0.4) { const w = (t - (T(11) - 0.4)) / (E.LE(13) + 0.8 - T(11)); fx = lerp(2700, 3200, ease(w)); } }
    // slow handheld drift
    const hx = Math.sin(t * 0.9) * 5 + Math.sin(t * 2.3) * 2, hy = Math.cos(t * 1.1) * 4 + Math.sin(t * 2.9) * 2;
    const camX = fx - W / 2;
    c.save(); c.translate(W / 2 + hx, gy + hy); c.scale(cz, cz); c.translate(-W / 2, -gy);
    // widen to cover the area the zoom reveals
    const vx0 = fx - W / (2 * cz) - 80, vx1 = fx + W / (2 * cz) + 80;
    sky(c, E, t, tod, gy, camX, cz);
    skyline(c, E, t, tod, gy, camX, lamp); farPalms(c, E, gy, camX, tod); midBlocks(c, E, gy, camX, tod, lamp);
    // ── main street layer (world coordinates)
    c.save(); c.translate(-camX, 0);
    ground(c, E, gy, vx0, vx1, tod, lamp);
    rowHouses(c, gy, vx0, vx1, tod, lamp); market(c, gy, vx0, vx1, t, tod, lamp); mural(c, gy, vx0, vx1, tod); car(c, gy, vx0, vx1, tod, lamp); corner(c, gy, vx0, vx1, t, tod, lamp);
    lot(c, E, gy, vx0, vx1, t, tod, lamp);
    // crew inside the lot, then the fence, then Kai (or Kai first once he is inside)
    const crew = {}; const hatOn = t > E.W_(4, /Hard|hat/i, 0.5) + 0.7, KC = { ...CH.Kai, hat: hatOn ? "#ffffff" : undefined, vest: hatOn ? "#ff7a1c" : undefined };
    const draw = (n, ch, o = {}) => actor(c, E, t, n, ch, ST, KEYS[n], { scale: sc, seed: o.seed, noShadow: false, over: (p, k, tt) => { const i = E.lineAt(tt); const out = {}; if (VO.has(i)) out.mouth = 0; Object.assign(out, o.work ? o.work(p, k, tt) : {}); return out; } });
    const montage = (a, b, fn) => (p, k, tt) => (tt > a && tt < b ? fn(p, k, tt) : {});
    const mA = T(11) - 0.2, mB = E.LE(13) + 3.2;
    crew.Dev = draw("Dev", CH.Dev, { seed: 3, work: montage(mA, mB, (p, k, tt) => ({ prop: "hammer", propHand: "R", armR: [1.55 + Math.sin(tt * 7.5) * 0.65, 0.9], mood: "happy", propRot: 0.2 })) });
    crew.Jess = draw("Jess", CH.Jess, { seed: 2, work: montage(mA, mB, (p, k, tt) => ({ prop: "phone", propHand: "R", screen: SH["crew-plan"], armR: [1.35, 0.6], mood: "happy" })) });
    crew.Mac = draw("Mac", CH.Mac, { seed: 1, work: montage(mA, mB, (p, k, tt) => ({ prop: "clipboard", propHand: "R", armR: [1.0 + Math.sin(tt * 2) * 0.1, 0.55], mood: "neutral" })) });
    const kaiInside = kai > 2440;
    if (kaiInside) crew.Kai = draw("Kai", KC, { seed: 5, work: montage(mA, mB, (p, k, tt) => ({ prop: "hammer", propHand: "R", armR: [1.55 + Math.sin(tt * 6.5 + 1) * 0.65, 0.9], mood: "happy", propRot: 0.2 })) });
    fence(c, gy, vx0, vx1, t, tod, lamp, E);
    if (!kaiInside) crew.Kai = draw("Kai", KC, { seed: 5 });
    // name tags (a nod to loading-screen character intros)
    for (const [i, who, name, role] of TAGS) { const a = easeBack((t - (E.L(i) + 0.05)) / 0.3) * (1 - ease((t - (E.L(i) + 2.2)) / 0.3)); const p = crew[who].p; if (a > 0.02) nameTag(c, p.x, p.y - 470 * sc, name, role, a); }
    c.restore();
    foreground(c, E, gy, camX, vx0, vx1, t, tod, lamp);
    c.restore();
    // ── screen-space effects
    sunGlow(c, E, tod, gy, camX); dustAndShafts(c, E, t, tod);
    // app screens + chips
    const w = WIN.find((x) => t >= x.a && t <= x.b);
    if (w) { const a = easeBack((t - w.a) / 0.4) * (1 - ease((t - (w.b - 0.25)) / 0.25)), ix = V ? W * 0.5 : W * 0.5, iy = V ? H * 0.255 : H * 0.34, iw = V ? 300 : 230; phoneInset(c, w.img, ix, iy, iw, -0.05, a, t); w.chips.forEach(([re, label, dx, dy], i) => { const at = E.W_(w.line, re, 0.4), ca = easeBack((t - at) / 0.3) * (1 - ease((t - (w.b - 0.25)) / 0.25)); chip(c, label, ix + dx * (V ? 1 : 0.75), iy + dy * (V ? 1 : 0.75), ca, V ? 42 : 34, i % 2 ? 0.05 : -0.05); }); }
    // loading-screen style location caption
    { const a = ease((t - 0.5) / 0.5) * (1 - ease((t - (T(1) + 1.2)) / 0.4)); if (a > 0.01) { c.save(); c.globalAlpha = a; c.textAlign = "left"; c.textBaseline = "alphabetic"; const x = V ? 70 : 100, y = V ? H * 0.12 : H * 0.14; c.font = `800 ${V ? 150 : 120}px 'Barlow Condensed', sans-serif`; c.lineJoin = "round"; c.lineWidth = 16; c.strokeStyle = INK; c.strokeText("THE BLOCK", x, y); c.fillStyle = "#fff"; c.fillText("THE BLOCK", x, y); c.font = `700 ${V ? 54 : 44}px 'IBM Plex Mono', monospace`; c.lineWidth = 10; c.strokeText("7:02 AM  ·  FRIDAY", x + 4, y + (V ? 70 : 58)); c.fillStyle = "#ffcf5a"; c.fillText("7:02 AM  ·  FRIDAY", x + 4, y + (V ? 70 : 58)); c.restore(); } }
    // captions
    E.caption(c, t, { y: V ? H * 0.94 : H * 0.95, size: V ? 56 : 46, hi: "#ffcf5a", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    // end title
    const eIn = E.L(14) + 0.1; if (t >= eIn) endTitle(c, E, t, t - eIn);
    // film: vignette + grain
    { const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85); g.addColorStop(0, "rgba(10,0,20,0)"); g.addColorStop(1, "rgba(10,0,24,0.55)"); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 260; i++) c.fillRect(rnd(Math.floor(t * 24) * 131 + i * 7 + 1) * W, rnd(Math.floor(t * 24) * 71 + i * 13 + 5) * H, 2, 2); }
    // fade in at the very start
    if (t < 0.8) { c.fillStyle = `rgba(8,0,18,${1 - ease(t / 0.8)})`; c.fillRect(0, 0, W, H); }
  },

  audio(h, E) {
    const T = (i, o = 0) => E.L(i) + o, D = E.DURATION, { A, comp, note, kick, snare, hat, burst, tone, ding } = h;
    // ── an original synthwave drive: A minor, 102 bpm, pad + pumping bass + arps + gated snare
    const BPM = 102, BEAT = 60 / BPM, BAR = BEAT * 4, t00 = 0.9;
    const ch = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [261.6, 329.6, 392, 493.9], [196, 246.9, 293.7, 349.2]], roots = [55, 43.65, 65.4, 49];
    const lead = [659.3, 784, 880, 784, 659.3, 587.3, 659.3, 523.3];
    for (let b = 0; t00 + b * BAR < D - 0.3; b++) {
      const t0 = t00 + b * BAR, c4 = ch[b % 4], r = roots[b % 4], intro = b < 2, drop = t0 > T(11) - 0.5;
      for (const f of c4) { note(f, t0, BAR * 1.02, "sawtooth", 0.026, 1500); note(f * 1.006, t0, BAR * 1.02, "sawtooth", 0.02, 1500); note(f * 0.994, t0, BAR * 1.02, "sawtooth", 0.02, 1500); }
      for (let q = 0; q < 8; q++) note(r * ([0, 0, 1, 0, 0, 1, 0, 1.5][q] ? [1, 1, 2, 1, 1, 2, 1, 1.5][q] : 1), t0 + q * BEAT / 2, BEAT * 0.42, "sawtooth", 0.15, 360);
      if (!intro) for (let q = 0; q < 16; q++) { const idx = [0, 1, 2, 3, 2, 1, 0, 1][q % 8]; note(c4[idx] * 2, t0 + q * BEAT / 4, BEAT * 0.22, "square", 0.017, 2600); }
      for (let q = 0; q < 4; q++) { kick(t0 + q * BEAT, 0.26); if (q % 2) { snare(t0 + q * BEAT, 0.055); burst(t0 + q * BEAT, [2600, 700], 0.5, 0.42, 0.06, "bandpass", h.duck); } hat(t0 + q * BEAT + BEAT / 2, 0.028); }
      if (b % 2) burst(t0 + BEAT * 3.5, [9000, 7000], 0.4, 0.22, 0.04, "highpass", h.duck);
      if (drop) for (let q = 0; q < 8; q++) if ([0, 3, 4, 6].includes(q)) note(lead[(b * 3 + q) % 8], t0 + q * BEAT / 2, BEAT * 0.42, "sawtooth", 0.034, 3200);
    }
    // tuning in a car radio at the start: static and a sweep
    burst(0.05, [800, 6000], 0.6, 0.9, 0.12, "bandpass", comp); burst(0.0, [1800, 1800], 0.4, 0.8, 0.06, "highpass", comp);
    // footsteps while Kai walks to the gate
    for (let s = 0.7; s < T(2) - 0.4; s += 0.36) burst(s, [380, 140], 1.2, 0.07, 0.05);
    sfx.whoosh(h, T(2) - 0.35, 0.3); for (const w of WIN) { sfx.whoosh(h, w.a); w.chips.forEach(([re]) => sfx.pop(h, E.W_(w.line, re, 0.4))); }
    // hammer hits during the montage
    for (let s = T(11) + 0.3; s < E.LE(13) + 3; s += 0.42) { burst(s, [3000, 900], 1, 0.06, 0.07); tone([900, 400], s, 0.06, 0.05, "square"); }
    const eIn = T(14) + 0.1; tone([150, 38], eIn, 0.7, 0.5, "sine"); burst(eIn - 0.5, [300, 6000], 0.6, 0.55, 0.1); for (let q = 0; q < 6; q++) ding(eIn + 0.15 + q * 0.07, 784 * Math.pow(1.25, q), 0.06);
  },
};

const trackX = (keys, t) => { let x = keys[0].x; for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t >= b.at) x = b.x; else { const dist = Math.abs(b.x - a.x), dur = Math.min(dist / 290, b.at - a.at), dep = b.at - dur; if (t >= dep) x = lerp(a.x, b.x, ease((t - dep) / Math.max(0.01, dur))); else x = a.x; break; } } return x; };

function nameTag(c, x, y, name, role, a) {
  c.save(); c.globalAlpha = clamp(a); c.translate(x, y - (1 - clamp(a)) * 16); c.strokeStyle = "#ffcf5a"; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, 54); c.stroke();
  c.textAlign = "left"; c.lineJoin = "round"; c.font = "800 62px 'Barlow Condensed', sans-serif"; c.lineWidth = 12; c.strokeStyle = INK; c.strokeText(name, 14, -4); c.fillStyle = "#fff"; c.fillText(name, 14, -4); c.font = "700 28px 'IBM Plex Mono', monospace"; c.lineWidth = 8; c.strokeText(role, 16, 30); c.fillStyle = "#ffcf5a"; c.fillText(role, 16, 30); c.restore();
}

// ── sky, sun, skyline ──────────────────────────────────────────────
function sky(c, E, t, tod, gy, camX, z) {
  const { W, H } = E, g = c.createLinearGradient(0, -400, 0, gy);
  g.addColorStop(0, mix("#3b2a86", "#0b0a2c", tod)); g.addColorStop(0.45, mix("#d6488a", "#52287a", tod)); g.addColorStop(0.8, mix("#ff8f42", "#c43d72", tod)); g.addColorStop(1, mix("#ffc15a", "#ff6a60", tod));
  c.fillStyle = g; c.fillRect(-W, -H, W * 3, H * 3);
  // streaky clouds lit from below
  for (let i = 0; i < 9; i++) { const x = ((i * 410 + t * (8 + i) - camX * 0.04) % (W * 1.6)) - W * 0.3, y = gy - 760 + (i % 4) * 130, w = 380 + (i % 3) * 120; const cg = c.createLinearGradient(0, y - 20, 0, y + 24); cg.addColorStop(0, mix("#5a2a7a", "#1a1040", tod)); cg.addColorStop(1, mix("#ff9a6a", "#d84a7a", tod)); c.fillStyle = cg; c.beginPath(); c.ellipse(x, y, w, 20, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + w * 0.2, y - 14, w * 0.6, 14, 0, 0, 7); c.fill(); }
  // stars at dusk
  if (tod > 0.5) { c.fillStyle = `rgba(255,255,255,${(tod - 0.5) * 1.6})`; for (let i = 0; i < 60; i++) c.fillRect(rnd(i * 5 + 1) * W * 1.4 - W * 0.2, gy - 1400 + rnd(i * 9 + 3) * 900, 3, 3); }
}
function sunGlow(c, E, tod, gy, camX) {
  const { W, H } = E, sx = W * 0.72 - camX * 0.01, sy = gy - 380 + tod * 330, a = 1 - ss(0.8, 1, tod);
  c.save(); c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55); g.addColorStop(0, `rgba(255,200,120,${0.55 * a})`); g.addColorStop(0.2, `rgba(255,120,80,${0.22 * a})`); g.addColorStop(1, "rgba(255,80,120,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
}
function dustAndShafts(c, E, t, tod) {
  const { W, H } = E; c.save(); c.globalCompositeOperation = "lighter"; const a = (1 - ss(0.7, 1, tod)) * 0.1; for (let i = 0; i < 4; i++) { const x = W * (0.2 + i * 0.22) + Math.sin(t * 0.3 + i) * 30; const g = c.createLinearGradient(x, 0, x - W * 0.35, H); g.addColorStop(0, `rgba(255,190,120,${a})`); g.addColorStop(1, "rgba(255,190,120,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 90, 0); c.lineTo(x - W * 0.3 + 90, H); c.lineTo(x - W * 0.3, H); c.closePath(); c.fill(); }
  c.fillStyle = "rgba(255,225,170,0.5)"; for (let i = 0; i < 40; i++) { const x = (rnd(i * 3 + 1) * W + t * (10 + i % 7)) % W, y = (rnd(i * 5 + 2) * H + Math.sin(t * 0.6 + i) * 20) % H; c.beginPath(); c.arc(x, y, 1.5 + (i % 3), 0, 7); c.fill(); } c.restore();
}
function skyline(c, E, t, tod, gy, camX, lamp) {
  const par = 0.08, off = camX * par; c.save(); c.translate(-off, 0);
  const x0 = Math.floor((off - 200) / 150) * 150, x1 = off + E.W + 400;
  for (let x = x0; x < x1; x += 150) { const i = Math.round(x / 150), r = (k) => rnd(Math.abs(i) * 17 + k * 31 + 5), w = 100 + r(1) * 90, h = 340 + r(2) * 520 * (i % 5 === 0 ? 1.5 : 1); c.fillStyle = mix("#6a3a8a", "#1b1138", tod); c.fillRect(x, gy - h, w, h + 80);
    c.fillStyle = mix("#ffcf8a", "#ffd27a", tod); for (let yy = gy - h + 20; yy < gy - 30; yy += 26) for (let xx = x + 10; xx < x + w - 14; xx += 20) if (rnd(i * 91 + yy * 3 + xx) > 0.78 - tod * 0.2) { c.globalAlpha = 0.5 + tod * 0.4; c.fillRect(xx, yy, 8, 11); c.globalAlpha = 1; }
    if (i % 5 === 0) { c.fillStyle = mix("#6a3a8a", "#1b1138", tod); c.fillRect(x + w / 2 - 3, gy - h - 80, 6, 80); if (Math.sin(t * 3 + i) > 0) { c.fillStyle = "#ff3a3a"; c.beginPath(); c.arc(x + w / 2, gy - h - 82, 6, 0, 7); c.fill(); } } }
  c.restore();
}
function farPalms(c, E, gy, camX, tod) {
  const par = 0.22, off = camX * par; c.save(); c.translate(-off, 0); const col = mix("#5a2a7a", "#150d30", tod); c.fillStyle = col; c.strokeStyle = col;
  for (let x = Math.floor((off - 100) / 330) * 330; x < off + E.W + 200; x += 330) { const i = Math.round(x / 330), h = 360 + rnd(Math.abs(i) * 7 + 3) * 140, lean = (rnd(Math.abs(i) * 5 + 1) - 0.5) * 70; c.lineWidth = 16; c.beginPath(); c.moveTo(x, gy + 30); c.quadraticCurveTo(x + lean * 0.4, gy - h * 0.5, x + lean, gy - h); c.stroke();
    for (let f = 0; f < 8; f++) { const a = -Math.PI + (f / 7) * Math.PI, len = 110 + (f % 2) * 30; c.lineWidth = 8; c.beginPath(); c.moveTo(x + lean, gy - h); c.quadraticCurveTo(x + lean + Math.cos(a) * len * 0.6, gy - h + Math.sin(a) * len * 0.5 - 20, x + lean + Math.cos(a) * len, gy - h + Math.sin(a) * len * 0.3 + 40); c.stroke(); } }
  c.restore();
}
function midBlocks(c, E, gy, camX, tod, lamp) {
  const par = 0.5, off = camX * par; c.save(); c.translate(-off, 0);
  for (let x = Math.floor((off - 300) / 300) * 300; x < off + E.W + 400; x += 300) { const i = Math.round(x / 300), r = (k) => rnd(Math.abs(i) * 13 + k * 29 + 7), w = 240 + r(1) * 60, h = 260 + r(2) * 170; c.fillStyle = mix("#7a4a8a", "#241545", tod); c.fillRect(x, gy - h, w, h + 40); c.fillStyle = mix("#5a3470", "#1a0f38", tod); c.fillRect(x - 6, gy - h - 14, w + 12, 16);
    for (let yy = gy - h + 30; yy < gy - 30; yy += 54) for (let xx = x + 24; xx < x + w - 30; xx += 52) { const lit = rnd(i * 77 + yy + xx) > 0.55 - tod * 0.15; c.fillStyle = lit ? mix("#ffd27a", "#ffc860", tod) : mix("#503a70", "#150e30", tod); c.fillRect(xx, yy, 24, 32); }
    if (i % 4 === 0) { c.fillStyle = mix("#5a3470", "#1a0f38", tod); c.fillRect(x + w * 0.6, gy - h - 74, 50, 50); c.fillRect(x + w * 0.6 + 8, gy - h - 24, 6, 24); c.fillRect(x + w * 0.6 + 36, gy - h - 24, 6, 24); } }
  c.restore();
}

// ── ground, houses, market, mural, car, corner ─────────────────────────
function ground(c, E, gy, x0, x1, tod, lamp) {
  const H = E.H, L = x1 - x0; c.fillStyle = mix("#c9b9c8", "#6a5f78", tod); c.fillRect(x0, gy, L, 34); c.fillStyle = mix("#9a8a98", "#4a4058", tod); c.fillRect(x0, gy + 34, L, 16);
  const ag = c.createLinearGradient(0, gy + 50, 0, H + 60); ag.addColorStop(0, mix("#5d5666", "#2a2438", tod)); ag.addColorStop(1, mix("#3a3444", "#171226", tod)); c.fillStyle = ag; c.fillRect(x0, gy + 50, L, H);
  c.fillStyle = mix("#e8c53a", "#e0b83a", tod); for (let x = Math.floor(x0 / 220) * 220; x < x1; x += 220) c.fillRect(x, gy + 150, 110, 10);
  // the lot is dirt past the gate
  const dx = Math.max(x0, X.gate + 100); if (dx < x1) { c.fillStyle = mix("#b68a5e", "#5a4234", tod); c.fillRect(dx, gy, x1 - dx, 34); c.fillStyle = "rgba(60,30,10,0.25)"; for (let x = Math.floor(dx / 90) * 90; x < x1; x += 90) c.fillRect(x + (x % 7) * 3, gy + 8, 30, 6); }
  // crosswalk on the corner
  c.fillStyle = "rgba(240,240,245,0.55)"; for (let k = 0; k < 6; k++) c.fillRect(1930 + k * 18, gy + 54, 10, 120);
}
const PAL = ["#e8766a", "#3fb8b0", "#f2c14e", "#8478e0", "#6cc08a", "#e88fb5"];
function house(c, x, w, h, col, seed, tod, lamp, V) {
  const o = 7, r = (k) => rnd(seed * 13 + k * 7 + 1), body = mix(col, "#2a1a4a", tod * 0.62);
  c.lineJoin = "round"; c.lineWidth = o; c.strokeStyle = INK; c.fillStyle = body; c.fillRect(x, -h, w, h); c.strokeRect(x, -h, w, h);
  c.fillStyle = mix(col, "#1a1030", 0.35 + tod * 0.4); c.fillRect(x - 12, -h - 30, w + 24, 34); c.strokeRect(x - 12, -h - 30, w + 24, 34); c.fillStyle = "rgba(0,0,0,0.12)"; for (let k = 0; k < 4; k++) c.fillRect(x + 6 + k * (w / 4), -h - 24, w / 8, 22);
  const floors = 3, fh = (h - 120) / floors;
  for (let f = 0; f < floors; f++) for (let k = 0; k < 2; k++) { const wx = x + 38 + k * (w - 160), wy = -h + 34 + f * fh, lit = r(f * 3 + k) > 0.45 - tod * 0.3;
    c.fillStyle = lit ? mix("#ffd98a", "#ffc860", tod) : mix("#27345a", "#0f1630", tod); c.fillRect(wx, wy, 84, fh - 44); c.strokeRect(wx, wy, 84, fh - 44);
    if (lit) { const g = c.createRadialGradient(wx + 42, wy + 40, 5, wx + 42, wy + 40, 120); g.addColorStop(0, `rgba(255,200,110,${0.1 + tod * 0.25})`); g.addColorStop(1, "rgba(255,200,110,0)"); c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.fillRect(wx - 60, wy - 60, 210, 220); c.restore(); } else { c.fillStyle = "rgba(255,255,255,0.14)"; c.beginPath(); c.moveTo(wx + 8, wy + 6); c.lineTo(wx + 34, wy + 6); c.lineTo(wx + 8, wy + 60); c.fill(); }
    c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(wx - 6, wy + fh - 44, 96, 9); if (r(f + k * 9) > 0.72) { c.fillStyle = "#b8bec8"; c.fillRect(wx + 8, wy + fh - 38, 66, 34); c.strokeRect(wx + 8, wy + fh - 38, 66, 34); }
    if (r(f * 5 + k + 2) > 0.7) { c.fillStyle = "#3fa24a"; c.beginPath(); c.arc(wx + 24, wy + fh - 52, 16, 0, 7); c.fill(); c.beginPath(); c.arc(wx + 52, wy + fh - 54, 14, 0, 7); c.fill(); } }
  // door, steps and railing
  const dx = x + w / 2 - 34; c.fillStyle = mix(PAL[(seed + 2) % 6], "#241040", tod * 0.5); c.fillRect(dx, -118, 68, 118); c.strokeRect(dx, -118, 68, 118); c.fillStyle = "#ffd27a"; c.beginPath(); c.arc(dx + 54, -58, 5, 0, 7); c.fill();
  c.fillStyle = mix("#bdb3b8", "#5a4f66", tod); c.fillRect(dx - 24, -16, 116, 16); c.strokeRect(dx - 24, -16, 116, 16); c.fillRect(dx - 12, -32, 92, 16); c.strokeRect(dx - 12, -32, 92, 16);
  if (seed % 3 === 0) { c.lineWidth = 5; c.beginPath(); for (let f = 0; f < 3; f++) { c.moveTo(x + w - 70, -h + 150 + f * fh); c.lineTo(x + w - 10, -h + 150 + f * fh); c.moveTo(x + w - 70, -h + 150 + f * fh); c.lineTo(x + w - 70, -h + 150 + f * fh + 20); } c.stroke(); c.lineWidth = o; }
  if (seed % 4 === 1) { c.lineWidth = 4; c.beginPath(); c.moveTo(x + w - 60, -h - 30); c.lineTo(x + w - 60, -h - 80); c.stroke(); c.fillStyle = "#c9ccd2"; c.beginPath(); c.ellipse(x + w - 60, -h - 86, 24, 14, -0.4, 0, 7); c.fill(); c.stroke(); c.lineWidth = o; }
}
function rowHouses(c, gy, x0, x1, tod, lamp) {
  c.save(); c.translate(0, gy); let x = -820; for (let i = 0; x < 1060; i++) { const w = 330 + (i % 3) * 30, h = 650 + (i % 4) * 36; if (x + w > x0 && x < x1) house(c, x, w, h, PAL[i % 6], i + 1, tod, lamp); x += w + 14; } c.restore();
}
function market(c, gy, x0, x1, t, tod, lamp) {
  const x = 1080, w = 470; if (x + w < x0 || x > x1) return; c.save(); c.translate(0, gy); c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = INK;
  c.fillStyle = mix("#d8a24a", "#4a3050", tod * 0.6); c.fillRect(x, -460, w, 460); c.strokeRect(x, -460, w, 460);
  c.fillStyle = mix("#2a3a6a", "#101830", tod); c.fillRect(x + 30, -300, w - 60, 220); c.strokeRect(x + 30, -300, w - 60, 220); c.fillStyle = `rgba(255,210,130,${0.25 + lamp * 0.5})`; c.fillRect(x + 36, -294, w - 72, 208);
  c.fillStyle = "#e8d8b0"; for (let k = 0; k < 3; k++) { c.fillRect(x + 44, -250 + k * 62, w - 88, 7); for (let j = 0; j < 7; j++) { c.fillStyle = PAL[(j + k) % 6]; c.fillRect(x + 56 + j * 56, -290 + k * 62, 34, 38); c.fillStyle = "#e8d8b0"; } }
  for (let k = 0; k < 10; k++) { c.fillStyle = k % 2 ? "#e0301e" : "#f4f4f4"; c.beginPath(); c.moveTo(x - 12 + k * 49, -330); c.lineTo(x + 37 + k * 49, -330); c.lineTo(x + 49 + k * 49, -270); c.lineTo(x + k * 49, -270); c.closePath(); c.fill(); } c.strokeRect(x - 12, -330, w + 24, 60);
  c.fillStyle = "#17122a"; rr(c, x + 70, -430, w - 140, 78, 10); c.fill(); c.stroke(); c.font = "800 62px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.save(); c.shadowColor = "#ffb000"; c.shadowBlur = 20 * (0.5 + lamp); c.fillStyle = "#ffd23a"; c.fillText("CORNER MARKET", x + w / 2, -388); c.restore();
  const flick = Math.sin(t * 9) > -0.9 ? 1 : 0.4; c.fillStyle = `rgba(255,60,150,${0.7 + 0.3 * lamp})`; rr(c, x + w - 140, -240, 100, 46, 10); c.fill(); c.save(); c.shadowColor = "#ff3c96"; c.shadowBlur = 24 * flick * (0.4 + lamp); c.fillStyle = "#fff"; c.font = "800 34px 'Barlow Condensed', sans-serif"; c.fillText("OPEN", x + w - 90, -217); c.restore();
  c.fillStyle = "#c98f5a"; for (let k = 0; k < 3; k++) { c.fillRect(x + 20 + k * 64, -64, 56, 50); c.strokeRect(x + 20 + k * 64, -64, 56, 50); c.fillStyle = ["#e0301e", "#f5c400", "#6bbf59"][k]; c.beginPath(); c.arc(x + 48 + k * 64, -70, 18, 0, 7); c.fill(); c.fillStyle = "#c98f5a"; }
  c.fillStyle = "#e8eef5"; c.fillRect(x + w - 130, -90, 90, 90); c.strokeRect(x + w - 130, -90, 90, 90); c.fillStyle = "#3a8fe0"; c.fillRect(x + w - 124, -84, 78, 14);
  c.restore();
}
function mural(c, gy, x0, x1, tod) {
  const x = 1560, w = 440, h = 400; if (x + w < x0 || x > x1) return; c.save(); c.translate(0, gy); c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = INK;
  c.fillStyle = mix("#3a3550", "#1c1a30", tod); c.fillRect(x, -h, w, h); c.strokeRect(x, -h, w, h); c.save(); c.beginPath(); c.rect(x + 6, -h + 6, w - 12, h - 12); c.clip();
  const sg = c.createLinearGradient(0, -h, 0, 0); sg.addColorStop(0, "#ff5a8a"); sg.addColorStop(0.5, "#ffb04a"); sg.addColorStop(1, "#6a3aa8"); c.fillStyle = sg; c.fillRect(x, -h, w, h);
  c.fillStyle = "#ffe27a"; c.beginPath(); c.arc(x + w * 0.5, -h * 0.42, 100, 0, 7); c.fill(); c.strokeStyle = "#ffe27a"; c.lineWidth = 9; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; c.beginPath(); c.moveTo(x + w * 0.5 + Math.cos(a) * 118, -h * 0.42 + Math.sin(a) * 118); c.lineTo(x + w * 0.5 + Math.cos(a) * 160, -h * 0.42 + Math.sin(a) * 160); c.stroke(); }
  c.fillStyle = "#1f1038"; c.beginPath(); c.moveTo(x, -90); c.lineTo(x + 90, -190); c.lineTo(x + 170, -110); c.lineTo(x + 250, -220); c.lineTo(x + 340, -120); c.lineTo(x + 440, -200); c.lineTo(x + 440, 0); c.lineTo(x, 0); c.closePath(); c.fill();
  for (let k = 0; k < 5; k++) { c.fillStyle = ["#3fe0d0", "#ff3c96", "#f5c400", "#8478e0", "#6cc08a"][k]; c.beginPath(); c.arc(x + 50 + k * 86, -300 + (k % 2) * 40, 22, 0, 7); c.fill(); c.fillRect(x + 44 + k * 86, -280 + (k % 2) * 40, 12, 50 + k * 8); }
  c.restore(); c.strokeStyle = INK; c.lineWidth = 7; c.strokeRect(x, -h, w, h);
  c.fillStyle = "#6a4a2c"; c.fillRect(x + 60, -62, 180, 14); c.fillRect(x + 76, -48, 12, 48); c.fillRect(x + 212, -48, 12, 48); c.restore();
}
function car(c, gy, x0, x1, tod, lamp) {
  const x = 1620; if (x + 360 < x0 || x - 120 > x1) return; c.save(); c.translate(x, gy + 14); c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = INK;
  c.fillStyle = mix("#d83a5a", "#6a1a3a", tod * 0.6); c.beginPath(); c.moveTo(0, -30); c.lineTo(10, -62); c.lineTo(80, -70); c.lineTo(122, -128); c.lineTo(240, -128); c.lineTo(290, -72); c.lineTo(352, -62); c.lineTo(366, -30); c.lineTo(366, -8); c.lineTo(0, -8); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = mix("#2a3a5a", "#0f1630", tod); c.beginPath(); c.moveTo(132, -118); c.lineTo(180, -118); c.lineTo(180, -74); c.lineTo(110, -74); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(192, -118); c.lineTo(234, -118); c.lineTo(270, -74); c.lineTo(192, -74); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,255,255,0.35)"; c.beginPath(); c.moveTo(120, -100); c.lineTo(168, -104); c.lineTo(160, -96); c.fill(); for (const wx of [78, 292]) { c.fillStyle = "#17141c"; c.beginPath(); c.arc(wx, -8, 38, 0, 7); c.fill(); c.stroke(); c.fillStyle = "#c9ccd2"; c.beginPath(); c.arc(wx, -8, 17, 0, 7); c.fill(); }
  c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = `rgba(255,50,50,${0.3 + lamp * 0.6})`; c.beginPath(); c.arc(-4, -44, 20 + lamp * 14, 0, 7); c.fill(); c.restore(); c.fillStyle = "#ff4a3a"; c.fillRect(-4, -54, 12, 18); c.restore();
}
function corner(c, gy, x0, x1, t, tod, lamp) {
  const x = 2000; if (x + 80 < x0 || x - 80 > x1) return; c.save(); c.translate(x, gy); c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = INK;
  c.fillStyle = "#2a2a34"; c.fillRect(-9, -640, 18, 640); c.strokeRect(-9, -640, 18, 640); c.fillRect(-9, -640, 130, 14); c.strokeRect(-9, -640, 130, 14); c.fillStyle = "#fff2c8"; rr(c, 90, -634, 56, 18, 6); c.fill(); c.stroke();
  c.save(); c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(118, -620, 5, 118, -560, 320); g.addColorStop(0, `rgba(255,214,140,${0.25 + lamp * 0.55})`); g.addColorStop(1, "rgba(255,214,140,0)"); c.fillStyle = g; c.fillRect(-250, -700, 740, 800); c.restore();
  c.fillStyle = "#e0301e"; rr(c, 100, -78, 44, 78, 14); c.fill(); c.stroke(); c.fillRect(92, -52, 60, 14); c.restore();
}

// ── the construction lot ───────────────────────────────────────────
function lot(c, E, gy, x0, x1, t, tod, lamp) {
  if (x1 < X.lotL - 100) return; c.save(); c.translate(0, gy); c.lineJoin = "round"; c.lineWidth = 7; c.strokeStyle = INK;
  // framed house
  const hx = 2700, wood = mix("#e6b873", "#5a3a2a", tod * 0.7), ply = mix("#d3a76a", "#4a3226", tod * 0.7);
  c.fillStyle = mix("#b9b4ac", "#4f4860", tod); c.fillRect(hx - 20, -22, 640, 22); c.strokeRect(hx - 20, -22, 640, 22);
  c.fillStyle = wood; for (let i = 0; i <= 13; i++) { const x = hx + i * 46; c.fillRect(x, -300, 16, 278); c.strokeRect(x, -300, 16, 278); } c.fillRect(hx - 8, -318, 620, 20); c.strokeRect(hx - 8, -318, 620, 20);
  c.fillStyle = ply; c.fillRect(hx, -300, 150, 278); c.strokeRect(hx, -300, 150, 278); c.fillRect(hx + 460, -300, 150, 278); c.strokeRect(hx + 460, -300, 150, 278);
  c.fillStyle = wood; c.beginPath(); c.moveTo(hx - 24, -318); c.lineTo(hx + 300, -520); c.lineTo(hx + 624, -318); c.stroke(); for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(hx + i * 100 + 0, -318); c.lineTo(hx + 300, -520 + Math.abs(3 - i) * 14); c.stroke(); }
  // scaffolding
  const sx = 2500; c.strokeStyle = INK; c.lineWidth = 6; c.fillStyle = mix("#9aa3ad", "#3a3a50", tod); for (let lvl = 0; lvl < 3; lvl++) { for (const px of [0, 150]) { c.fillRect(sx + px - 6, -150 * (lvl + 1), 12, 150); c.strokeRect(sx + px - 6, -150 * (lvl + 1), 12, 150); } c.fillRect(sx - 20, -150 * (lvl + 1) - 8, 190, 14); c.strokeRect(sx - 20, -150 * (lvl + 1) - 8, 190, 14); c.beginPath(); c.moveTo(sx, -150 * lvl); c.lineTo(sx + 150, -150 * (lvl + 1)); c.moveTo(sx + 150, -150 * lvl); c.lineTo(sx, -150 * (lvl + 1)); c.stroke(); }
  // crane
  const cx = 3520; c.fillStyle = mix("#f0a62a", "#6a4a3a", tod * 0.6); c.fillRect(cx - 24, -1500, 48, 1500); c.strokeRect(cx - 24, -1500, 48, 1500); for (let y = -60; y > -1500; y -= 60) { c.beginPath(); c.moveTo(cx - 24, y); c.lineTo(cx + 24, y - 60); c.stroke(); }
  c.fillRect(cx - 560, -1500, 700, 36); c.strokeRect(cx - 560, -1500, 700, 36); c.fillStyle = "#555"; c.fillRect(cx + 90, -1470, 90, 70); c.strokeRect(cx + 90, -1470, 90, 70); const sw = Math.sin(t * 0.7) * 10; c.beginPath(); c.moveTo(cx - 440, -1464); c.lineTo(cx - 440 + sw, -1000); c.stroke(); c.fillStyle = "#aaa"; c.fillRect(cx - 462 + sw, -1000, 44, 30); c.strokeRect(cx - 462 + sw, -1000, 44, 30); if (Math.sin(t * 3) > -0.2) { c.fillStyle = "#ff3030"; c.beginPath(); c.arc(cx, -1520, 10, 0, 7); c.fill(); }
  // dumpster, porta-potty, bricks, cones
  c.fillStyle = mix("#2f6fc0", "#17305a", tod); c.beginPath(); c.moveTo(3180, -170); c.lineTo(3440, -170); c.lineTo(3410, -10); c.lineTo(3210, -10); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#c9b898"; for (let k = 0; k < 6; k++) c.fillRect(3200 + k * 38, -188 - (k % 3) * 10, 30, 22);
  c.fillStyle = mix("#3a9ad8", "#1a3a6a", tod); c.fillRect(3590, -250, 110, 250); c.strokeRect(3590, -250, 110, 250); c.fillStyle = "#e8eef5"; c.fillRect(3604, -230, 54, 200); c.strokeRect(3604, -230, 54, 200);
  c.fillStyle = "#c2573a"; for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) { c.fillRect(2160 + k * 44 + r * 22, -26 - r * 22, 40, 20); c.strokeRect(2160 + k * 44 + r * 22, -26 - r * 22, 40, 20); }
  for (const cx2 of [2280, 2450, 2300 + 20, 3000]) { c.fillStyle = "#ff6a1a"; c.beginPath(); c.moveTo(cx2 - 20, 0); c.lineTo(cx2 + 20, 0); c.lineTo(cx2 + 7, -66); c.lineTo(cx2 - 7, -66); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(cx2 - 13, -40, 26, 10); }
  c.restore();
  // floodlights that come on at dusk
  if (lamp > 0.01) { c.save(); c.translate(0, gy); c.globalCompositeOperation = "lighter"; for (const fx of [2640, 3260]) { const g = c.createRadialGradient(fx, -610, 4, fx, -300, 520); g.addColorStop(0, `rgba(255,236,190,${0.55 * lamp})`); g.addColorStop(1, "rgba(255,236,190,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(fx - 18, -620); c.lineTo(fx + 18, -620); c.lineTo(fx + 360, 0); c.lineTo(fx - 360, 0); c.closePath(); c.fill(); } c.restore(); }
  c.save(); c.translate(0, gy); c.fillStyle = "#2a2a34"; for (const fx of [2640, 3260]) { c.fillRect(fx - 7, -620, 14, 620); c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(fx - 7, -620, 14, 620); c.fillStyle = "#fff6d0"; c.fillRect(fx - 30, -650, 60, 26); c.strokeRect(fx - 30, -650, 60, 26); c.fillStyle = "#2a2a34"; }
  // banners hanging on the back of the fence line
  { const L = X.lotL, R = X.lotR, h = 250;   const banner = (x, w, bg, fg, txt, sub) => { if (x + w < L || x > R) return; c.fillStyle = bg; c.fillRect(x, -h + 40, w, 150); c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(x, -h + 40, w, 150); c.fillStyle = fg; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 54px 'Barlow Condensed', sans-serif"; c.fillText(txt, x + w / 2, -h + 95); c.font = "700 28px 'Barlow Condensed', sans-serif"; c.fillText(sub, x + w / 2, -h + 150); };
  banner(2090, 130, "#F5C400", INK, "SITE 7", "KEEP OUT"); banner(2470, 190, "#fff", "#e0301e", "HARD HATS", "REQUIRED"); banner(2720, 190, "#F5C400", INK, "NOW BUILDING", "THE BLOCK");
 }
  // the neon billboard
  const bx = 2860; c.fillStyle = "#17122a"; rr(c, bx - 180, -860, 360, 170, 14); c.fill(); c.strokeStyle = INK; c.lineWidth = 7; c.stroke(); c.fillRect(bx - 8, -690, 16, 100); c.save(); c.shadowColor = "#ff3c96"; c.shadowBlur = 26 * (0.5 + lamp); c.strokeStyle = "#ff3c96"; c.lineWidth = 6; c.strokeRect(bx - 168, -848, 336, 146); c.fillStyle = "#ffd23a"; c.shadowColor = "#ffb000"; c.font = "800 96px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("CONSTRA", bx, -795); c.fillStyle = "#6cf3ff"; c.shadowColor = "#00e0ff"; c.font = "700 30px 'Barlow Condensed', sans-serif"; c.fillText("NOW BUILDING", bx, -730); c.restore(); c.restore();
}
function fence(c, gy, x0, x1, t, tod, lamp, E) {
  const L = Math.max(x0, X.lotL), R = Math.min(x1, X.lotR); c.save(); c.translate(0, gy);
  const gateA = 2250, gateB = 2420, h = 250; c.lineJoin = "round";
  const seg = (a, b) => { if (b <= L || a >= R) return; const A = Math.max(a, L), B = Math.min(b, R); c.save(); c.beginPath(); c.rect(A, -h, B - A, h); c.clip(); c.strokeStyle = mix("rgba(190,200,215,0.55)", "rgba(120,120,160,0.45)", tod); c.lineWidth = 2; for (let x = A - h; x < B + h; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, -h); c.moveTo(x + h, 0); c.lineTo(x, -h); c.stroke(); } c.restore(); c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.moveTo(A, -h); c.lineTo(B, -h); c.stroke(); };
  seg(X.lotL, gateA); seg(gateB, X.lotR);
  c.fillStyle = "#6a707c"; for (let x = X.lotL; x <= X.lotR; x += 130) { if (x > gateA - 20 && x < gateB + 20 && x !== gateA && x !== gateB) continue; if (x < L - 10 || x > R + 10) continue; c.fillRect(x - 7, -h - 10, 14, h + 10); c.strokeStyle = INK; c.lineWidth = 5; c.strokeRect(x - 7, -h - 10, 14, h + 10); }
  const open = 0.35; c.save(); c.translate(gateB, 0); c.strokeStyle = INK; c.lineWidth = 6; c.fillStyle = "rgba(190,200,215,0.25)"; c.beginPath(); c.moveTo(0, -h); c.lineTo(80, -h + 24); c.lineTo(80, 0); c.lineTo(0, 0); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.restore();
}
function foreground(c, E, gy, camX, x0, x1, t, tod, lamp) {
  const { W, H } = E;
  // power lines swag between poles (world layer, slightly in front)
  c.save(); c.translate(-camX * 1.0, 0); c.strokeStyle = mix("#2a1a3a", "#0a0618", tod); c.lineWidth = 3; for (let px = Math.floor(x0 / 700) * 700; px < x1 + 700; px += 700) { for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(px, gy - 860 + k * 22); c.quadraticCurveTo(px + 350, gy - 760 + k * 22, px + 700, gy - 860 + k * 22); c.stroke(); } }
  c.restore();
  // big foreground palm fronds drifting at the top corners (parallax 1.4)
  c.save(); c.translate(-camX * 1.4 % 3000, 0); const col = mix("#2a1745", "#0c0620", tod); c.fillStyle = col; c.strokeStyle = col;
  for (let k = 0; k < 3; k++) { const px = (k * 1500 + 200) - ((camX * 0.4) % 1500) * 0, sw = Math.sin(t * 0.8 + k) * 0.03; c.save(); c.translate(px + camX * 1.4 % 3000 * 0, -40); c.rotate(sw); for (let f = 0; f < 7; f++) { const a = 0.25 + f * 0.28; c.lineWidth = 14; c.beginPath(); c.moveTo(px, 0); c.quadraticCurveTo(px + Math.cos(a) * 200, Math.sin(a) * 120, px + Math.cos(a) * 340, Math.sin(a) * 300 + 40); c.stroke(); } c.restore(); }
  c.restore();
}
function endTitle(c, E, t, u) {
  const { W, H, V } = E, a = ease(u / 0.5); c.save(); c.fillStyle = `rgba(14,4,34,${0.55 * a})`; c.fillRect(0, 0, W, H);
  const cy = V ? H * 0.38 : H * 0.42, s = lerp(1.6, 1, easeOut(u / 0.35)); c.translate(W / 2, cy); c.scale(s, s); c.globalAlpha = clamp(u / 0.15); c.textAlign = "center"; c.textBaseline = "middle"; c.font = `800 ${V ? 250 : 220}px 'Barlow Condensed', sans-serif`; c.lineJoin = "round"; c.lineWidth = 26; c.strokeStyle = INK; c.strokeText("CONSTRA", 0, 0);
  const g = c.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, "#fff2a8"); g.addColorStop(0.45, "#ffb347"); g.addColorStop(0.55, "#ff5a8a"); g.addColorStop(1, "#c43bd6"); c.fillStyle = g; c.fillText("CONSTRA", 0, 0); c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-300, 4); c.lineTo(300, 4); c.stroke(); c.restore();
  c.save(); c.textAlign = "center"; c.globalAlpha = ease((u - 0.5) / 0.4); c.font = `800 ${V ? 72 : 60}px 'Barlow Condensed', sans-serif`; c.lineJoin = "round"; c.lineWidth = 12; c.strokeStyle = INK; c.strokeText("RUN THE JOB, NOT THE PAPERWORK", W / 2, cy + (V ? 190 : 170)); c.fillStyle = "#fff"; c.fillText("RUN THE JOB, NOT THE PAPERWORK", W / 2, cy + (V ? 190 : 170)); c.restore();
  const p = easeBack((u - 1.0) / 0.5); c.save(); c.translate(W / 2, cy + (V ? 340 : 300)); c.scale(clamp(p, 0, 1.1), clamp(p, 0, 1.1)); c.fillStyle = "#F5C400"; rr(c, -340, -58, 680, 116, 58); c.fill(); c.strokeStyle = INK; c.lineWidth = 7; c.stroke(); c.fillStyle = "#1a1600"; c.font = `800 ${V ? 58 : 50}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("FREE WHILE IT'S LAUNCHING", 0, 3); c.restore();
  c.save(); c.globalAlpha = ease((u - 1.5) / 0.4); c.textAlign = "center"; c.fillStyle = "#e8e0f8"; c.font = `500 ${V ? 46 : 40}px 'IBM Plex Mono', monospace`; c.fillText("getconstra.com", W / 2, cy + (V ? 470 : 420)); c.restore();
}

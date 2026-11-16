import { STYLES, actor, phoneInset, chip, pop, endCard, bed, sfx, loadShots, loadImg, clamp, lerp, ease, easeOut, easeBack, rnd } from "/stage.js";
import { BG } from "/lib/backgrounds.js";

// One engine for the whole shorts batch. A scenario (scenario.json) picks a look (bg), a cast, the jokes, and where the app appears.
// Format: text hook in the first two seconds, quick cuts between speakers, big captions, a sound effect on the punchline, a branded end card.
const LOOK = { site: STYLES.toon, office: STYLES.comic, kitchen: STYLES.flat, night: { ...STYLES.paper } };
const GROUND = { site: 0.8, office: 0.8, kitchen: 0.74, night: 0.8 };
const CH = {
  Mac: { skin: "#e8b98a", shirt: "#f4f4f4", sleeve: "#f4f4f4", pants: "#1f2a44", hat: "#ffffff", hair: "#3a2519", hairStyle: "short", stache: true, logo: "#F5C400" },
  Jess: { skin: "#f3c9a5", shirt: "#c2336b", pants: "#2b2f3a", vest: "#F5C400", hat: "#F5C400", hair: "#7a3b1d", hairStyle: "ponytail", glove: "#2a2a2d" },
  Dev: { skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", hair: "#1d1410", hairStyle: "short", beard: true, w: 1.1 },
  Kai: { skin: "#7b4a2f", shirt: "#2f4a3a", sleeve: "#2f4a3a", pants: "#3a3f4a", boots: "#2a1f18", hair: "#14100d", hairStyle: "braids", bead: "#e0b43a", chain: true, brow: "#14100d", w: 1.04 },
  Priya: { skin: "#c68b59", shirt: "#2a5db0", sleeve: "#2a5db0", pants: "#2b2f3a", hair: "#15100e", hairStyle: "long", glasses: true, hat: "#f4f4f4" },
  Tony: { skin: "#d9a47a", shirt: "#8a4a2a", sleeve: "#8a4a2a", pants: "#3a3a44", hair: "#cfcfcf", hairStyle: "short", stache: true, w: 1.12, brow: "#999" },
  Bea: { skin: "#8a5a3a", shirt: "#5a3a7a", sleeve: "#5a3a7a", pants: "#2b2f3a", hair: "#2a1a12", hairStyle: "curly", glasses: true },
};
const IMGS = ["time-tracking", "timesheets", "invoices", "daily-reports", "templates", "projects", "tasks", "reports", "safety", "dashboard"];
let SC, SH, ICON, KEYS, CAMK, STYLE, SPEAK;

export default {
  endHold: 1.6, lead: 0.45, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.2 }, Jess: { pan: 0.2 }, Dev: { pan: 0.25 }, Kai: { pan: -0.1 }, Priya: { pan: 0.15 }, Tony: { pan: -0.25 }, Bea: { pan: 0.25 }, Voice: { pan: 0 } },
  async init(E) {
    SC = await (await fetch("/scenario.json")).json(); STYLE = LOOK[SC.bg] || LOOK.site; window.__sign = SC.sign;
    SH = await loadShots(IMGS); ICON = await loadImg("/icon.png");
    const { W, H, V } = E, gy = H * (V ? GROUND[SC.bg] : GROUND[SC.bg] + 0.06), cast = SC.cast, n = cast.length;
    const xs = n === 1 ? [0.5] : n === 2 ? [0.27, 0.73] : [0.2, 0.5, 0.8];
    SPEAK = E.lines.map((l) => l.who);
    const slot = Object.fromEntries(cast.map((w, i) => [w, xs[i] * W]));
    KEYS = {};
    for (const who of cast) {
      const keys = [{ at: 0, x: slot[who], y: gy, flip: slot[who] < W * 0.45 ? 1 : slot[who] > W * 0.55 ? -1 : 1, mood: "neutral" }];
      E.lines.forEach((l, i) => {
        const at = E.L(i) - 0.05, sp = l.who === who, spec = SC.lines[i] || [];
        const mood = sp ? (spec[2] || "neutral") : (spec[3] || (/[!]/.test(l.text) ? "shock" : /\?/.test(l.text) ? "neutral" : "smug"));
        const last = keys[keys.length - 1], target = SC.lines[i] && l.who !== "Voice" ? slot[l.who] : null;
        const flip = (!sp && target != null) ? (target > slot[who] ? 1 : -1) : last.flip;
        keys.push({ ...last, at, mood, flip, bounce: sp ? -6 : 0, prop: SC.props?.[who], propHand: "R", armR: SC.props?.[who] ? [1.0, 0.5] : undefined });
      });
      KEYS[who] = keys;
    }
    CAMK = E.lines.map((l, i) => { const w = l.who; const wide = i % 3 === 0 || w === "Voice"; return { at: E.L(i) - 0.15, fx: w === "Voice" ? W / 2 : (slot[w] ?? W / 2), z: wide ? 1.0 : 1.38 }; });
    SC.__slot = slot; SC.__gy = gy;
  },

  draw(t, c, E) {
    const { W, H, V } = E, gy = SC.__gy, sc = V ? 1.35 : 1.1, cast = SC.cast;
    // camera: ease between per-line shots
    let k = 0; for (let i = 0; i < CAMK.length; i++) if (t >= CAMK[i].at) k = i; const a = CAMK[k], b = CAMK[Math.max(0, k - 1)], u = ease((t - a.at) / 0.32);
    let z = k === 0 && t < CAMK[0].at ? 1 : lerp(b.z, a.z, u), fx = lerp(b.fx, a.fx, u);
    const end = E.L(E.N - 1) - 0.3; if (t > end - 0.4) { z = lerp(z, 1.0, ease((t - (end - 0.4)) / 0.4)); fx = lerp(fx, W / 2, ease((t - (end - 0.4)) / 0.4)); }
    const half = W / (2 * z); fx = clamp(fx, half, W - half);
    // a little shake on the punchline
    let shake = 0; const pl = E.N - 2; if (pl >= 0) { const d = t - (E.L(pl) + E.W_(pl, /./, 0.8) - E.L(pl) + 0.1); if (d >= 0 && d < 0.35) shake = (1 - d / 0.35) * 9; }
    c.save(); c.translate(W / 2 + (rnd(Math.floor(t * 50) + 3) - 0.5) * shake, gy * 0.98 + (rnd(Math.floor(t * 50) + 9) - 0.5) * shake); c.scale(z, z); c.translate(-fx, -gy * 0.98);
    // draw the world a little wider than the screen so zoom-outs are covered
    c.save(); c.translate(-W * 0.25, 0); c.scale(1.5, 1); const bw = { ...E, W: W * 1.5 }; c.restore();
    BG[SC.bg](c, E, STYLE.jitter ? Math.floor(t * 12) / 12 : t, gy);
    const rest = {};
    for (const who of cast) rest[who] = actor(c, E, t, who, charFor(who), STYLE, KEYS[who], { scale: sc, seed: 1 + cast.indexOf(who) * 2, over: (p) => (E.speaking("Voice", t) >= 0 ? { mouth: 0 } : {}) });
    // reactions
    SC.lines.forEach((spec, i) => { const fx2 = spec[4]; if (!fx2) return; const who = E.lines[i].who, p = rest[who]?.p; if (!p) return; const d = t - E.W_(i, /./, 0.85); const aa = easeBack(d / 0.22) * (1 - ease((d - 0.8) / 0.25)); if (d >= 0 && d < 1.1) pop(c, fx2, p.x + (p.flip < 0 ? -40 : 40), p.y - 480 * sc, aa, V ? 110 : 90, "#F5C400", -0.1); });
    c.restore();

    // the app screen when the script calls for it
    const fi = SC.featureAt, img = SC.feature && SH[SC.feature];
    if (img && fi != null) {
      const a0 = E.L(fi) - 0.1, b0 = E.LE(fi) + 0.9, aa = easeBack((t - a0) / 0.35) * (1 - ease((t - (b0 - 0.25)) / 0.25));
      if (aa > 0.01) { const ix = V ? W * 0.5 : W * 0.5, iy = V ? H * 0.27 : H * 0.36, iw = V ? 300 : 230; phoneInset(c, img, ix, iy, iw, -0.05, aa, t); (SC.chips || []).forEach((label, j) => { const ca = easeBack((t - (E.W_(fi, /./, 0.2 + j * 0.3) + 0.1)) / 0.3) * (1 - ease((t - (b0 - 0.25)) / 0.25)); chip(c, label, ix + (j % 2 ? 1 : -1) * (V ? 150 : 120), iy + (V ? -230 : -180) + j * (V ? 330 : 270), ca, V ? 40 : 32, j % 2 ? 0.05 : -0.05); }); }
    }
    // text hook, first two seconds
    { const d = t - 0.1, ah = easeBack(d / 0.25) * (1 - ease((d - 1.7) / 0.3)); if (ah > 0.01 && SC.hook) { c.save(); c.translate(W / 2, V ? H * 0.235 : H * 0.24); c.scale(clamp(ah, 0, 1.1), clamp(ah, 0, 1.1)); c.rotate(-0.03); c.globalAlpha = clamp(ah * 1.4); c.font = `800 ${V ? 150 : 110}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; const lines = wrap(c, SC.hook.toUpperCase(), W * 0.86); const lh = (V ? 150 : 110) * 0.95; lines.forEach((ln, i) => { const y = (i - (lines.length - 1) / 2) * lh; c.lineWidth = 26; c.strokeStyle = "#1a1a1f"; c.strokeText(ln, 0, y); c.fillStyle = i === lines.length - 1 ? "#F5C400" : "#fff"; c.fillText(ln, 0, y); }); c.restore(); } }
    E.caption(c, t, { y: V ? H * 0.9 : H * 0.93, size: V ? 56 : 46, hi: "#F5C400", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 130 : W * 0.7 });
    if (t >= end) endCard(c, E, t, t - end, { icon: ICON });
  },

  audio(h, E) {
    bed(h, E, { bpm: SC.bpm || 108, vol: 0.8, ...(SC.music === "tense" ? { prog: [[220, 261.6, 329.6], [207.7, 246.9, 311.1], [196, 233.1, 293.7], [207.7, 246.9, 311.1]], roots: [55, 51.9, 49, 51.9] } : {}) });
    SC.lines.forEach((spec, i) => { const sfxName = spec[5]; if (sfxName && sfx[sfxName]) sfx[sfxName](h, E.LE(i) + 0.05); });
    const fi = SC.featureAt; if (fi != null && SC.feature) { sfx.whoosh(h, E.L(fi) - 0.1); (SC.chips || []).forEach((_, j) => sfx.pop(h, E.W_(fi, /./, 0.2 + j * 0.3) + 0.1)); }
    const end = E.L(E.N - 1) - 0.3; sfx.whoosh(h, end - 0.05, 0.35); sfx.sparkle(h, end + 0.25);
    if (SC.hook) { sfx.thump(h, 0.12); }
  },
};

function charFor(who) { const c = { ...CH[who] }; if (SC.bg !== "site") { delete c.hat; delete c.vest; } return c; }
function wrap(c, text, maxW) { const out = []; let line = ""; for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); return out; }

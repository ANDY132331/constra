import { clamp, lerp, ease, easeOut, easeBack, loadImg, rnd } from "/engine.js";

// "Stop doing paperwork": loud, fast kinetic type on hard colour blocks. Words slam in on the beat, real app screens swing in on the "Done" lines.
const INK = "#151617", YEL = "#F5C400", RED = "#e0301e", WHITE = "#ffffff";
const IMG = {}; let ICON;
// words: [text, spoken-word regex, colour, size (1 = base), y fraction of the height]. phone: which real screen swings in, and at which spoken word.
const SL = [
  { bg: INK, extra: "stop", words: [["STOP.", /Stop/, WHITE, 2.1, 0.27], ["DOING", /doing/, YEL, 1.5, 0.58], ["PAPERWORK", /paperwork/, WHITE, 1.2, 0.69]], strike: [2, /paperwork/] },
  { bg: YEL, extra: "dots", words: [["FRIDAY", /Friday/, INK, 1.5, 0.27], ["9 PM?", /night/, INK, 2.3, 0.42], ["STOP.", /Stop/, RED, 2.6, 0.68]] },
  { bg: WHITE, extra: "sheets", words: [["CHASING", /Chasing/, INK, 1.7, 0.28], ["INVOICES?", /invoices/, INK, 1.4, 0.41], ["STOP.", /Stop/, RED, 2.9, 0.68]] },
  { bg: INK, extra: "q", words: [["GUESSING", /Guessing/, WHITE, 1.5, 0.22], ["WHO WAS", /who/, YEL, 1.0, 0.35], ["ON SITE?", /site/, YEL, 1.3, 0.45], ["DEFINITELY", /Definitely/, WHITE, 1.1, 0.6], ["STOP.", /stop/, RED, 2.6, 0.74]] },
  { bg: YEL, extra: "dots", phone: ["time-tracking", /Clock/, -0.1], words: [["CONSTRA", /K?C?onstra/i, INK, 1.45, 0.14], ["CLOCK IN", /Clock/, WHITE, 1.15, 0.255]] },
  { bg: INK, extra: "grid", phone: ["timesheets", /Timesheets/, 0.09], words: [["TIMESHEETS.", /Timesheets/, WHITE, 1.15, 0.13], ["DONE.", /Done/, YEL, 2.2, 0.26]] },
  { bg: WHITE, extra: "dots", phone: ["crew-plan", /Schedules/, -0.08], words: [["SCHEDULES.", /Schedules/, INK, 1.2, 0.13], ["PLANNED.", /Planned/, RED, 1.6, 0.26]] },
  { bg: YEL, extra: "dots", phone: ["invoices", /Invoices/, 0.08], words: [["INVOICES.", /Invoices/, INK, 1.3, 0.13], ["SENT.", /Sent/, RED, 2.3, 0.26]] },
  { bg: INK, extra: "grid", phone: ["daily-reports", /Reports/, -0.09], words: [["REPORTS.", /Reports/, WHITE, 1.4, 0.13], ["FILED.", /Filed/, YEL, 2.2, 0.26]] },
  { bg: YEL, extra: "dots", words: [["26", /six/, INK, 4.2, 0.2], ["TOOLS", /tools/, WHITE, 1.4, 0.35], ["+23", /three/, INK, 3.2, 0.5], ["EXCEL TEMPLATES", /templates/, WHITE, 0.95, 0.62], ["1 APP", /app/, INK, 2.3, 0.78]] },
  { bg: INK, extra: "bands", words: [["OFFLINE", /offline/, INK, 1.9, 0.2], ["ANY PHONE", /phone/, INK, 1.9, 0.43], ["ANY TRADE", /trade/, WHITE, 1.9, 0.66]] },
  { bg: YEL, extra: "burst", words: [["FREE", /free/, INK, 4.6, 0.43], ["WHILE IT'S LAUNCHING", /launching/, INK, 0.8, 0.66]] },
  { bg: INK, extra: "end", words: [] },
];

function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

export default {
  endHold: 2.2, lead: 0.2, reverb: 0.04, bedGain: 0.6, duckTo: 0.4,
  voices: { Voice: { pan: 0, gain: 1.0 } },
  async init() { for (const n of ["time-tracking", "timesheets", "crew-plan", "invoices", "daily-reports"]) IMG[n] = await loadImg(`/assets/app-${n}.png`); ICON = await loadImg("/icon.png"); },

  draw(t, c, E) {
    const { W, H, V } = E, N = SL.length; let k = 0; for (let i = 0; i < N; i++) if (t >= E.L(i) - 0.28) k = i;
    const sl = SL[k], t0 = E.L(k) - 0.28, u = t - t0;
    // shake: every slammed word kicks the whole frame
    let shake = 0; for (const [, re] of sl.words.map((w) => [w[0], w[1]])) { const at = E.W_(k, re, 0.3) - 0.05, d = t - at; if (d >= 0 && d < 0.3) shake = Math.max(shake, (1 - d / 0.3) * (V ? 16 : 11)); }
    c.save(); c.translate((rnd(Math.floor(t * 60) * 7 + 1) - 0.5) * shake, (rnd(Math.floor(t * 60) * 13 + 5) - 0.5) * shake);
    c.fillStyle = sl.bg; c.fillRect(-40, -40, W + 80, H + 80);
    const ink = sl.bg === INK;
    // backgrounds
    if (sl.extra === "dots") { c.fillStyle = sl.bg === WHITE ? "rgba(21,22,23,0.07)" : "rgba(21,22,23,0.1)"; for (let y = 0; y < H + 60; y += 44) for (let x = ((y / 44) % 2) * 22; x < W + 40; x += 44) { const r = 5 + 4 * Math.sin(x * 0.01 + y * 0.008 + t * 1.5); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
    if (sl.extra === "grid") { c.strokeStyle = "rgba(245,196,0,0.12)"; c.lineWidth = 2; for (let x = (t * 40) % 80; x < W; x += 80) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 80) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
    if (sl.extra === "sheets") for (let i = 0; i < 9; i++) { const sx = ((i * 211 + t * (60 + i * 9)) % (W + 400)) - 200, sy = (i * 197) % H + Math.sin(t * 1.4 + i) * 40; c.save(); c.translate(sx, sy); c.rotate(Math.sin(t + i) * 0.4); c.fillStyle = "#f2f2ee"; c.strokeStyle = "rgba(21,22,23,0.25)"; c.lineWidth = 3; rr(c, -80, -105, 160, 210, 8); c.fill(); c.stroke(); c.strokeStyle = "rgba(21,22,23,0.2)"; for (let l = 0; l < 6; l++) { c.beginPath(); c.moveTo(-58, -70 + l * 26); c.lineTo(58 - (l % 2) * 30, -70 + l * 26); c.stroke(); } c.restore(); }
    if (sl.extra === "q") for (let i = 0; i < 12; i++) { c.save(); c.translate((i * 173) % W, ((i * 331 + t * 70) % (H + 200)) - 100); c.rotate(Math.sin(t * 1.3 + i) * 0.4); c.fillStyle = "rgba(245,196,0,0.18)"; c.font = `800 ${150 + (i % 3) * 60}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.fillText("?", 0, 0); c.restore(); }
    if (sl.extra === "stop") { const a = easeBack(u / 0.3), r = (V ? 400 : 330); c.save(); c.translate(W / 2, H * 0.27); c.scale(clamp(a, 0, 1.08), clamp(a, 0, 1.08)); c.rotate(Math.sin(t * 3) * 0.02); c.fillStyle = RED; c.strokeStyle = WHITE; c.lineWidth = 16; c.beginPath(); for (let i = 0; i < 8; i++) { const an = Math.PI / 8 + i * Math.PI / 4; const x = Math.cos(an) * r, y = Math.sin(an) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fill(); c.stroke(); c.restore(); }
    if (sl.extra === "bands") { const cols = [YEL, WHITE, "#2a2b2e"]; [0.2, 0.43, 0.66].forEach((f, i) => { const at = E.W_(k, sl.words[i][1], 0.3) - 0.12, a = easeOut((t - at) / 0.18); c.fillStyle = [YEL, WHITE, RED][i]; c.fillRect(0, H * f - H * 0.1, W * a, H * 0.2); }); }
    if (sl.extra === "burst") { c.save(); c.translate(W / 2, H * 0.43); c.fillStyle = "rgba(21,22,23,0.1)"; for (let i = 0; i < 24; i++) { c.rotate(Math.PI / 12 + 0.0); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.max(W, H), -50); c.lineTo(Math.max(W, H), 50); c.fill(); } c.rotate(t * 0.15); c.restore(); }
    if (sl.extra === "end") return endCard(c, E, t, u, k);

    // real app screen swinging in
    if (sl.phone) {
      const [name, re, rot] = sl.phone, at = E.W_(k, re, 0.3) - 0.1, a = easeBack((t - at) / 0.35); if (a > 0) {
        const pw = V ? 520 : 330, ph = pw * (IMG[name].height / IMG[name].width), cx = V ? W / 2 : W * 0.76, cy = V ? H * 0.665 : H * 0.5;
        c.save(); c.translate(cx, cy + (1 - clamp(a)) * 700); c.rotate(rot + Math.sin(t * 1.2) * 0.012); c.scale(clamp(a, 0, 1.05), clamp(a, 0, 1.05));
        c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowBlur = 60; c.shadowOffsetY = 30; c.fillStyle = "#101113"; rr(c, -pw / 2 - 14, -ph / 2 - 14, pw + 28, ph + 28, 62); c.fill(); c.shadowColor = "transparent"; c.save(); rr(c, -pw / 2, -ph / 2, pw, ph, 50); c.clip(); c.drawImage(IMG[name], -pw / 2, -ph / 2, pw, ph); c.restore(); c.restore();
      }
    }
    // the words
    const U = V ? 150 : 128, cxT = sl.phone && !V ? W * 0.3 : W / 2;
    sl.words.forEach(([txt, re, col, sc, yf], wi) => {
      const at = E.W_(k, re, 0.3) - 0.06, d = t - at; if (d < 0) return; const e = easeOut(d / 0.12), s = lerp(2.2, 1, e);
      c.font = `800 ${U * sc}px 'Barlow Condensed', sans-serif`; let size = U * sc; const maxW = (sl.phone && !V ? W * 0.5 : W) * 0.92; const mw = c.measureText(txt).width; if (mw > maxW) size *= maxW / mw;
      c.save(); c.translate(cxT, H * yf); c.rotate((1 - e) * (wi % 2 ? 0.08 : -0.08)); c.scale(s, s); c.globalAlpha = clamp(d / 0.06);
      c.font = `800 ${size}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
      // a hard offset shadow gives the poster look
      if (col !== INK && sl.bg !== INK || col === WHITE && sl.bg === YEL) { c.fillStyle = "rgba(0,0,0,0.9)"; c.fillText(txt, size * 0.045, size * 0.045); }
      if (col === YEL && sl.bg === INK) { c.fillStyle = "rgba(245,196,0,0.25)"; c.fillText(txt, size * 0.04, size * 0.04); }
      c.fillStyle = col; c.fillText(txt, 0, 0);
      if (sl.strike && sl.strike[0] === wi) { const sa = clamp((t - (E.W_(k, sl.strike[1], 0.3) + 0.35)) / 0.18); if (sa > 0) { const w = c.measureText(txt).width; c.strokeStyle = RED; c.lineWidth = size * 0.11; c.beginPath(); c.moveTo(-w / 2 - 20, 0); c.lineTo(-w / 2 - 20 + (w + 40) * sa, 0); c.stroke(); } }
      c.restore();
    });
    // hazard-tape wipe on every cut
    const wp = clamp(u / 0.34); if (u < 0.34 && k > 0) { const x = lerp(-W * 0.4, W * 1.4, wp); c.save(); c.translate(x, H / 2); c.rotate(-0.12); c.fillStyle = YEL; c.fillRect(-W * 0.2, -H, W * 0.4, H * 2); c.save(); c.beginPath(); c.rect(-W * 0.2, -H, W * 0.4, H * 2); c.clip(); c.fillStyle = INK; for (let y = -H * 1.2; y < H * 1.2; y += 110) { c.beginPath(); c.moveTo(-W * 0.2, y + 80); c.lineTo(W * 0.2, y - 120); c.lineTo(W * 0.2, y - 60); c.lineTo(-W * 0.2, y + 140); c.closePath(); c.fill(); } c.restore(); c.restore(); }
    c.restore();
  },

  audio(h, E) {
    const { note, kick, snare, hat, burst, ding, tone } = h; const D = E.DURATION, BPM = 124, BEAT = 60 / BPM, BAR = BEAT * 4;
    const roots = [55, 55, 65.4, 49], stabs = [[220, 261.6, 329.6], [220, 261.6, 329.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
    for (let b = 0; b * BAR < D; b++) { const t0 = b * BAR; for (let q = 0; q < 4; q++) { kick(t0 + q * BEAT, 0.34); hat(t0 + q * BEAT + BEAT / 2, 0.06); if (q % 2) snare(t0 + q * BEAT, 0.09); }
      for (let q = 0; q < 8; q++) { note(roots[b % 4] * (q % 4 === 3 ? 2 : 1), t0 + q * BEAT / 2, BEAT * 0.4, "sawtooth", 0.1, 380); }
      if (b % 2) for (const f of stabs[b % 4]) { note(f * 2, t0 + BEAT * 1.5, 0.16, "square", 0.02, 2600); note(f * 2, t0 + BEAT * 3.5, 0.16, "square", 0.02, 2600); } }
    // every slam: a low thump + a click; every cut: a riser whoosh
    SL.forEach((s, i) => { burst(E.L(i) - 0.32, [300, 5000], 0.7, 0.3, 0.09); s.words.forEach(([, re]) => { const at = E.W_(i, re, 0.3) - 0.06; tone([150, 48], at, 0.22, 0.32, "sine"); burst(at, [2400, 800], 0.8, 0.1, 0.1); }); });
    // the end: a big hit and a sparkle
    const iE = SL.length - 1; tone([130, 40], E.L(iE) - 0.28, 0.6, 0.45, "sine"); for (let q = 0; q < 6; q++) ding(E.L(iE) + 0.1 + q * 0.07, 784 * Math.pow(1.25, q), 0.07);
  },
};

function endCard(c, E, t, u, k) {
  const { W, H, V } = E; c.fillStyle = INK; c.fillRect(0, 0, W, H);
  const hz = (y, hh) => { c.save(); c.beginPath(); c.rect(0, y, W, hh); c.clip(); c.fillStyle = YEL; c.fillRect(0, y, W, hh); c.fillStyle = INK; for (let x = -hh * 2 + ((t * 70) % (hh * 2)); x < W + hh; x += hh * 2) { c.beginPath(); c.moveTo(x, y + hh); c.lineTo(x + hh, y + hh); c.lineTo(x + hh * 2, y); c.lineTo(x + hh, y); c.closePath(); c.fill(); } c.restore(); }; hz(0, V ? 44 : 30); hz(H - (V ? 44 : 30), V ? 44 : 30);
  const cy = H * 0.4, ip = easeBack(u / 0.5), sz = (V ? 250 : 200) * ip; c.save(); c.shadowColor = "rgba(245,196,0,0.5)"; c.shadowBlur = 90; c.drawImage(ICON, W / 2 - sz / 2, cy - (V ? 330 : 270) - sz / 2 + 100, sz, sz); c.restore();
  c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillStyle = WHITE; c.font = `800 ${V ? 210 : 175}px 'Barlow Condensed', sans-serif`; c.save(); c.translate(W / 2, cy + 100); const s = lerp(1.6, 1, easeOut((u - 0.15) / 0.2)); c.scale(s, s); c.globalAlpha = clamp((u - 0.15) / 0.08); c.fillText("CONSTRA", 0, 0); c.restore();
  const w = easeOut((u - 0.9) / 0.3); c.globalAlpha = w; c.fillStyle = YEL; c.font = `800 ${V ? 84 : 70}px 'Barlow Condensed', sans-serif`; c.fillText("RUN THE JOB.", W / 2, cy + (V ? 220 : 190)); c.fillStyle = WHITE; c.fillText("NOT THE PAPERWORK.", W / 2, cy + (V ? 320 : 270)); c.globalAlpha = 1;
  const p = easeBack((u - 1.6) / 0.5); c.save(); c.translate(W / 2, cy + (V ? 480 : 400)); c.scale(clamp(p, 0, 1.1), clamp(p, 0, 1.1)); c.fillStyle = YEL; rr(c, -340, -60, 680, 120, 60); c.fill(); c.fillStyle = "#1a1600"; c.font = `800 ${V ? 60 : 52}px 'Barlow Condensed', sans-serif`; c.textBaseline = "middle"; c.fillText("FREE WHILE IT'S LAUNCHING", 0, 3); c.restore();
  c.globalAlpha = clamp((u - 2.0) / 0.4); c.textBaseline = "alphabetic"; c.fillStyle = "#cfd0d2"; c.font = `500 ${V ? 48 : 40}px 'IBM Plex Mono', monospace`; c.fillText("getconstra.com", W / 2, cy + (V ? 640 : 530)); c.globalAlpha = 1;
}

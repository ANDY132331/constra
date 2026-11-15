import { clamp, lerp, ease, easeOut, easeBack, loadImg } from "/engine.js";

// "Watch it work" - a calm, polished walkthrough of the real app on a phone. Real screens captured from the app (demo data), tap ripples, callout chips.
const SCREENS = ["dashboard", "time-tracking", "timesheets", "crew-plan", "invoices", "projects", "daily-reports", "templates"];
const img = {};
// one segment per voice line: which screen, a title, taps (fractions of the screen) at a word, callout chips at a word, a slow zoom focus
const SEG = [
  { s: "dashboard", t1: "MEET", t2: "CONSTRA", zoom: [0.5, 0.3], taps: [], chips: [] },
  { s: "dashboard", t1: "YOUR DAY,", t2: "AT A GLANCE", zoom: [0.5, 0.22], taps: [[/who's|Who's/, 0.2, 0.2]], chips: [[/hours/, "HOURS THIS WEEK", 0.18, 0.37, "L"], [/attention/, "NEEDS ATTENTION", 0.5, 0.3, "R"]] },
  { s: "time-tracking", t1: "ONE-TAP", t2: "CLOCK IN", zoom: [0.5, 0.3], taps: [[/tap/, 0.5, 0.93]], chips: [[/photo/, "PHOTO", 0.2, 0.2, "L"], [/G/, "GPS LOCATION", 0.75, 0.2, "R"]] },
  { s: "timesheets", t1: "TIMESHEETS", t2: "ALREADY DONE", zoom: [0.5, 0.45], taps: [[/Pick/, 0.2, 0.2], [/download|P/, 0.51, 0.39]], chips: [[/P/, "PDF", 0.2, 0.4, "L"], [/Excel/, "EXCEL", 0.8, 0.45, "R"], [/overtime/, "OVERTIME WORKED OUT", 0.5, 0.55, "L"]] },
  { s: "crew-plan", t1: "PLAN THE", t2: "CREW'S WEEK", zoom: [0.5, 0.4], taps: [[/Put/, 0.3, 0.56], [/send/, 0.3, 0.385]], chips: [[/address/, "JOB, TIME, ADDRESS", 0.5, 0.25, "R"]] },
  { s: "invoices", t1: "GET PAID", t2: "FASTER", zoom: [0.5, 0.3], taps: [[/Send/, 0.5, 0.47]], chips: [[/paid/, "PAID", 0.82, 0.38, "R"], [/overdue/, "OVERDUE", 0.15, 0.62, "L"]] },
  { s: "projects", t1: "EVERY JOB,", t2: "TRACKED", zoom: [0.5, 0.35], taps: [[/progress/, 0.45, 0.46]], chips: [[/budget/, "BUDGET", 0.82, 0.4, "R"], [/tasks/, "TASKS", 0.2, 0.55, "L"]] },
  { s: "daily-reports", t1: "REPORTS IN", t2: "SECONDS", zoom: [0.5, 0.4], taps: [[/Daily/, 0.5, 0.62]], chips: [[/safety/, "SAFETY LOG", 0.5, 0.25, "R"]] },
  { s: "templates", t1: "23 EXCEL", t2: "TEMPLATES", zoom: [0.5, 0.6], taps: [[/twenty/, 0.51, 0.75]], chips: [[/logo/, "YOUR LOGO ON TOP", 0.5, 0.2, "R"]] },
  { s: "ai", t1: "ASK ANYTHING.", t2: "GET AN ANSWER", zoom: [0.5, 0.5], taps: [], chips: [] },
  { s: "time-tracking", t1: "WORKS WHEN", t2: "THE SIGNAL DROPS", zoom: [0.5, 0.3], taps: [], chips: [], offline: true },
  { s: "end", t1: "", t2: "", zoom: [0.5, 0.5], taps: [], chips: [] },
];

let ICON;
export default {
  endHold: 2.6, lead: 0.3, reverb: 0.07, bedGain: 0.5, duckTo: 0.3,
  voices: { Ava: { pan: 0, gain: 1.0 } },
  async init() { for (const s of SCREENS) img[s] = await loadImg(`/assets/app-${s}.png`); ICON = await loadImg("/icon.png"); },

  draw(t, c, E) {
    const { W, H, V } = E;
    // ── background: deep charcoal, two slow yellow glows, a faint grid
    c.fillStyle = "#0b0c0e"; c.fillRect(0, 0, W, H);
    const gl = (x, y, r, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(245,196,0,${a})`); g.addColorStop(1, "rgba(245,196,0,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); };
    gl(W * (0.2 + 0.08 * Math.sin(t * 0.3)), H * (0.25 + 0.05 * Math.cos(t * 0.23)), H * 0.55, 0.16); gl(W * (0.85 + 0.06 * Math.cos(t * 0.27)), H * (0.8 + 0.05 * Math.sin(t * 0.31)), H * 0.5, 0.11);
    c.strokeStyle = "rgba(255,255,255,0.035)"; c.lineWidth = 1; const gs = 90; for (let x = (-t * 8) % gs; x < W; x += gs) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += gs) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // hazard tape strip top and bottom
    const tape = (y, h) => { c.save(); c.beginPath(); c.rect(0, y, W, h); c.clip(); c.fillStyle = "#F5C400"; c.fillRect(0, y, W, h); c.fillStyle = "#151617"; for (let x = -h * 2 + ((t * 40) % (h * 2)); x < W + h; x += h * 2) { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + h, y + h); c.lineTo(x + h * 2, y); c.lineTo(x + h, y); c.closePath(); c.fill(); } c.restore(); };
    tape(0, V ? 26 : 18); tape(H - (V ? 26 : 18), V ? 26 : 18);

    // ── which segment are we in
    let k = 0; for (let i = 0; i < SEG.length; i++) if (t >= E.L(i) - 0.45) k = i;
    const seg = SEG[k], t0 = E.L(k) - 0.45, tin = t - t0, enter = easeOut(tin / 0.6);
    const tEnd = k + 1 < SEG.length ? E.L(k + 1) - 0.45 : E.DURATION, segT = t - t0, segLen = tEnd - t0;

    // ── phone layout
    const PW = V ? 570 : 400, SB = V ? 54 : 38, PH = PW * 844 / 390 + SB, pad = V ? 16 : 12;
    const cx = V ? W / 2 : W * 0.7, cy = V ? H * 0.535 : H / 2;
    const bob = Math.sin(t * 0.9) * 6, wob = Math.sin(t * 0.55) * 0.012;
    const pop = 1 + 0.05 * (1 - easeOut(tin / 0.5)) * (k > 0 ? 1 : 0);
    // title
    const tx = V ? W / 2 : W * 0.06, tAlign = V ? "center" : "left", ty = V ? 215 : H * 0.36;
    if (seg.s !== "end") {
      const a = easeOut(tin / 0.45), sl = (1 - a) * 60;
      c.textAlign = tAlign; c.textBaseline = "alphabetic"; c.globalAlpha = a;
      c.font = `800 ${V ? 116 : 118}px 'Barlow Condensed', sans-serif`; c.fillStyle = "#fff"; c.fillText(seg.t1, tx, ty + sl);
      c.fillStyle = "#F5C400"; c.fillText(seg.t2, tx, ty + (V ? 108 : 118) + sl);
      c.globalAlpha = 1;
    }

    // ── the phone
    const drawPhone = (alpha) => {
      c.save(); c.globalAlpha = alpha; c.translate(cx, cy + bob); c.rotate(wob); c.scale(pop, pop);
      const bw = PW + pad * 2, bh = PH + pad * 2, r = V ? 86 : 60;
      c.shadowColor = "rgba(0,0,0,0.65)"; c.shadowBlur = 80; c.shadowOffsetY = 40;
      c.fillStyle = "#1a1b1e"; rr(c, -bw / 2, -bh / 2, bw, bh, r); c.fill(); c.shadowColor = "transparent";
      c.strokeStyle = "#3a3c40"; c.lineWidth = 3; rr(c, -bw / 2, -bh / 2, bw, bh, r); c.stroke();
      // screen
      c.save(); rr(c, -PW / 2, -PH / 2, PW, PH, r - pad); c.clip();
      c.fillStyle = "#0a0a0a"; c.fillRect(-PW / 2, -PH / 2, PW, PH);
      statusBar(c, PW, PH, SB, t); drawScreen(c, seg, k, E, t, segT, segLen, PW, PH, SB);
      // glass sheen
      const sh = c.createLinearGradient(-PW / 2, -PH / 2, PW / 2, PH / 2); sh.addColorStop(0, "rgba(255,255,255,0.07)"); sh.addColorStop(0.35, "rgba(255,255,255,0)"); c.fillStyle = sh; c.fillRect(-PW / 2, -PH / 2, PW, PH);
      c.restore();
      // camera pill
      c.fillStyle = "#050505"; rr(c, -PW * 0.13, -PH / 2 + 10, PW * 0.26, SB * 0.62, SB * 0.31); c.fill();
      c.restore();
    };
    if (seg.s === "end") endCard(c, E, t, k, tin); else drawPhone(1);

    // ── tap ripples + chips live in screen space, so transform them the same way
    if (seg.s !== "end") {
      const toScreen = (fx, fy) => { const [zx, zy] = seg.zoom, z = zoomAt(segT, segLen); const px = (fx - zx) * z + zx, py = (fy - zy) * z + zy; return [cx + (px - 0.5) * PW, cy + bob + SB / 2 + (py - 0.5) * (PH - SB)]; };
      for (const [re, fx, fy] of seg.taps) {
        const tt = E.W_(k, re, 0.4) + 0.05, dt = t - tt; if (dt < -0.35 || dt > 0.9) continue;
        const [x, y] = toScreen(fx, fy);
        // finger glides in, presses, ripples out
        const fin = ease((dt + 0.35) / 0.35), press = dt > 0 ? 1 : 0; const fxp = x + (1 - fin) * 90, fyp = y + (1 - fin) * 130;
        if (dt > 0) { const u = clamp(dt / 0.7); c.strokeStyle = `rgba(245,196,0,${1 - u})`; c.lineWidth = 8 * (1 - u) + 2; c.beginPath(); c.arc(x, y, 18 + u * 90, 0, 7); c.stroke(); c.fillStyle = `rgba(245,196,0,${0.35 * (1 - u)})`; c.beginPath(); c.arc(x, y, 18 + u * 60, 0, 7); c.fill(); }
        const fa = dt < 0 ? fin : 1 - clamp((dt - 0.35) / 0.4); c.globalAlpha = clamp(fa); c.fillStyle = "rgba(255,255,255,0.92)"; c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowBlur = 20; c.beginPath(); c.arc(fxp, fyp, 24 - press * 4, 0, 7); c.fill(); c.shadowColor = "transparent"; c.globalAlpha = 1;
      }
      seg.chips.forEach(([re, label, fx, fy, side], ci) => {
        const tt = E.W_(k, re, 0.5), dt = t - tt; if (dt < 0) return; const a = easeBack(dt / 0.35); const out = clamp((t - (tEnd - 0.1)) / 0.2);
        const [x, y] = toScreen(fx, fy); const off = (V ? 210 : 170) * (side === "L" ? -1 : 1); let px = cx + (side === "L" ? -PW * 0.5 : PW * 0.5), py = y;
        c.save(); c.translate(px, py + Math.sin(t * 2 + ci) * 4); c.rotate((side === "L" ? -1 : 1) * 0.06); c.scale(a, a); c.globalAlpha = clamp(a) * (1 - out);
        c.font = `800 ${V ? 44 : 34}px 'Barlow Condensed', sans-serif`; const tw = c.measureText(label).width, bh = V ? 70 : 54, bw = tw + 52;
        c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowBlur = 24; c.shadowOffsetY = 10; px = clamp(px, bw / 2 + 24, W - bw / 2 - 24); c.setTransform(1, 0, 0, 1, 0, 0); c.translate(px, py + Math.sin(t * 2 + ci) * 4); c.rotate((side === "L" ? -1 : 1) * 0.06); c.scale(a, a); c.fillStyle = "#F5C400"; rr(c, -bw / 2, -bh / 2, bw, bh, 14); c.fill(); c.shadowColor = "transparent";
        c.fillStyle = "#1a1600"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 0, 3); c.restore();
      });
    }
    // captions
    if (seg.s !== "end") E.caption(c, t, { cx: V ? undefined : W * 0.3, y: V ? H * 0.93 : H * 0.88, size: V ? (E.lines[Math.max(0, E.lineAt(t))].text.length > 100 ? 44 : 52) : 44, maxW: V ? W - 140 : W * 0.5, hi: "#F5C400" });
  },

  audio(h, E) {
    const { note, kick, hat, burst, ding, tone, snare } = h; const D = E.DURATION;
    // a warm, slow bed: pad chords + soft plucks, then a gentle beat from the second line
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 207.7, 246.9]]; const BEAT = 0.5, BAR = BEAT * 4;
    for (let b = 0; b * BAR < D; b++) { const t0 = b * BAR, ch = chords[b % 4]; for (const f of ch) note(f, t0, BAR * 0.98, "triangle", 0.045, 900); note(ch[0] / 2, t0, BAR * 0.9, "sine", 0.18, 300);
      if (t0 > E.L(1) - 0.5 && t0 < D - 4) { for (let k = 0; k < 8; k++) note(ch[[0, 2, 1, 2, 0, 2, 1, 2][k]] * 2, t0 + k * BEAT / 2, 0.3, "triangle", 0.05, 2600); kick(t0, 0.18); kick(t0 + BEAT * 2, 0.15); hat(t0 + BEAT, 0.035); hat(t0 + BEAT * 3, 0.035); snare(t0 + BEAT, 0.03); snare(t0 + BEAT * 3, 0.03); } }
    // a whoosh at every screen change, a tick under every tap, a pop under every chip
    SEG.forEach((s, i) => { if (i > 0) burst(E.L(i) - 0.45, [500, 3200], 0.7, 0.3, 0.06); s.taps.forEach(([re]) => { const tt = E.W_(i, re, 0.4) + 0.05; tone([1400, 700], tt, 0.09, 0.09, "triangle"); }); s.chips.forEach(([re]) => { const tt = E.W_(i, re, 0.5); ding(tt, 1500 + (tt * 37 % 3) * 200, 0.07); }); });
    // the end: a rising sparkle + a final chord
    const e = E.L(SEG.length - 1) - 0.45; for (let k = 0; k < 5; k++) ding(e + 0.1 + k * 0.08, 880 * Math.pow(1.26, k), 0.08);
  },
};

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
const zoomAt = (segT, segLen) => 1 + 0.1 * ease(segT / Math.max(1, segLen));

function statusBar(c, PW, PH, SB, t) { c.fillStyle = "#0a0a0a"; c.fillRect(-PW / 2, -PH / 2, PW, SB); c.fillStyle = "#fff"; c.font = `600 ${SB * 0.4}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("4:10", -PW / 2 + PW * 0.08, -PH / 2 + SB * 0.6); c.textAlign = "right"; c.fillText("5G  100%", PW / 2 - PW * 0.07, -PH / 2 + SB * 0.6); }
function drawScreen(c, seg, k, E, t, segT, segLen, PW0, PH0, SB) { const PW = PW0, PH = PH0 - SB; c.save(); c.translate(0, SB / 2); c.beginPath(); c.rect(-PW / 2, -PH / 2, PW, PH); c.clip();
  const [zx, zy] = seg.zoom, z = zoomAt(segT, segLen);
  c.save();
  // a new screen slides up into place
  const enter = easeOut((t - (E.L(k) - 0.45)) / 0.55); c.translate(0, (1 - enter) * PH * 0.25); c.globalAlpha = 0.25 + 0.75 * enter;
  c.translate((zx - 0.5) * PW * 0 , 0);
  c.translate(-PW / 2 + zx * PW, -PH / 2 + zy * PH); c.scale(z, z); c.translate(-zx * PW, -zy * PH);
  if (seg.s === "ai") aiScreen(c, E, t, k, PW, PH);
  else { c.drawImage(img[seg.s], 0, 0, PW, PH); }
  c.restore();
  if (seg.offline) offlineOverlay(c, E, t, k, PW, PH);
  c.restore();
}
// the real app's "Ask Constra" prompts, drawn to match the app's dark and yellow style
function aiScreen(c, E, t, k, PW, PH) {
  c.save(); c.fillStyle = "#0a0a0a"; c.fillRect(0, 0, PW, PH);
  const s = PW / 390; const T = t - (E.L(k) - 0.4);
  c.fillStyle = "#111"; rr(c, 14 * s, 80 * s, 362 * s, 560 * s, 16 * s); c.fill(); c.strokeStyle = "rgba(255,255,255,0.08)"; c.lineWidth = 1.5; rr(c, 14 * s, 80 * s, 362 * s, 560 * s, 16 * s); c.stroke();
  c.fillStyle = "#2a2410"; rr(c, 28 * s, 96 * s, 34 * s, 34 * s, 10 * s); c.fill(); c.fillStyle = "#F5C400"; c.beginPath(); c.arc(45 * s, 113 * s, 7 * s, 0, 7); c.fill();
  c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillStyle = "#fff"; c.font = `700 ${15 * s}px 'IBM Plex Sans', sans-serif`; c.fillText("Ask Constra", 72 * s, 110 * s); c.fillStyle = "#8a8c8f"; c.font = `400 ${11 * s}px 'IBM Plex Sans', sans-serif`; c.fillText("Your company's data, answered instantly", 72 * s, 126 * s);
  c.fillStyle = "#8a8c8f"; c.font = `600 ${10 * s}px 'IBM Plex Mono', monospace`; c.fillText("TRY ASKING", 28 * s, 170 * s);
  const chips = ["Which jobs are losing money?", "What invoices haven't been paid?", "How much did we bill this month?", "Which projects are over budget?", "What's our current gross profit?"];
  let y = 190 * s; chips.forEach((q, i) => { const at = E.L(k) + 0.3 + i * 0.55; const a = easeBack((t - at) / 0.35); c.font = `500 ${12.5 * s}px 'IBM Plex Sans', sans-serif`; const w = c.measureText(q).width + 28 * s, h = 34 * s; if (a > 0.01) { c.save(); c.translate(28 * s, y + h / 2); c.scale(a, a); c.globalAlpha = clamp(a); c.fillStyle = "rgba(245,196,0,0.1)"; rr(c, 0, -h / 2, w, h, 17 * s); c.fill(); c.strokeStyle = "rgba(245,196,0,0.5)"; c.lineWidth = 1.5; rr(c, 0, -h / 2, w, h, 17 * s); c.stroke(); c.fillStyle = "#F5C400"; c.textBaseline = "middle"; c.fillText(q, 14 * s, 1); c.restore(); } y += 46 * s; });
  // the input, with a typing caret
  const q = "How much did we bill this month?"; const n = Math.floor(clamp((t - (E.L(k) + 3.2)) / 1.8) * q.length);
  c.fillStyle = "#171717"; rr(c, 28 * s, 540 * s, 334 * s, 44 * s, 12 * s); c.fill(); c.strokeStyle = "rgba(255,255,255,0.08)"; rr(c, 28 * s, 540 * s, 334 * s, 44 * s, 12 * s); c.stroke();
  c.fillStyle = n ? "#fff" : "#6a6c6f"; c.font = `400 ${13 * s}px 'IBM Plex Sans', sans-serif`; c.textBaseline = "middle"; c.fillText(n ? q.slice(0, n) + (Math.floor(t * 2.5) % 2 ? "|" : "") : "Ask a question...", 40 * s, 563 * s);
  c.fillStyle = "#F5C400"; rr(c, 322 * s, 546 * s, 34 * s, 32 * s, 9 * s); c.fill();
  c.restore();
}
function offlineOverlay(c, E, t, k, PW, PH) {
  c.save(); c.translate(-PW / 2, -PH / 2); const s = PW / 390, T = t - E.L(k);
  const a = easeBack((T - 0.2) / 0.4);
  // banner
  c.save(); c.translate(PW / 2, 118 * s); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.fillStyle = "#2a1210"; rr(c, -160 * s, -22 * s, 320 * s, 44 * s, 22 * s); c.fill(); c.strokeStyle = "#ef4444"; c.lineWidth = 2; rr(c, -160 * s, -22 * s, 320 * s, 44 * s, 22 * s); c.stroke();
  c.fillStyle = "#ef4444"; c.beginPath(); c.arc(-136 * s, 0, 6 * s, 0, 7); c.fill(); c.fillStyle = "#fff"; c.font = `700 ${14 * s}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("No signal. Saved on this phone", -122 * s, 1); c.restore();
  // after a few seconds: it syncs
  const st = E.W_(k, /syncs/, 0.6); const u = ease((t - st) / 0.5);
  if (u > 0) { c.save(); c.translate(PW / 2, 118 * s); c.globalAlpha = u; c.fillStyle = "#0e2a18"; rr(c, -160 * s, -22 * s, 320 * s, 44 * s, 22 * s); c.fill(); c.strokeStyle = "#22c55e"; c.lineWidth = 2; rr(c, -160 * s, -22 * s, 320 * s, 44 * s, 22 * s); c.stroke(); c.fillStyle = "#22c55e"; c.beginPath(); c.arc(-136 * s, 0, 6 * s, 0, 7); c.fill(); c.fillStyle = "#fff"; c.font = `700 ${14 * s}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.fillText("Back online. Synced", -122 * s, 1); c.restore(); }
  c.restore();
}
function endCard(c, E, t, k, tin) {
  const { W, H, V } = E; const a = easeOut(tin / 0.6); c.globalAlpha = a; c.textAlign = "center"; c.textBaseline = "alphabetic";
  const s = V ? 1 : 0.95, cy = H * 0.42;
  const ip = easeBack(tin / 0.6), sz = (V ? 230 : 200) * ip; c.save(); c.shadowColor = "rgba(245,196,0,0.4)"; c.shadowBlur = 80; if (ICON) c.drawImage(ICON, W / 2 - sz / 2, cy - (V ? 330 : 300) - sz / 2 + 150, sz, sz); c.restore();
  c.font = `800 ${V ? 190 : 170}px 'Barlow Condensed', sans-serif`; c.fillStyle = "#fff"; c.fillText("CONSTRA", W / 2, cy + 90);
  c.font = `800 ${V ? 70 : 62}px 'Barlow Condensed', sans-serif`; c.fillStyle = "#F5C400"; c.fillText("RUN THE JOB, NOT THE PAPERWORK", W / 2, cy + 190);
  const p = easeBack((tin - 0.5) / 0.5); c.save(); c.translate(W / 2, cy + (V ? 340 : 320)); c.scale(clamp(p, 0, 1.2), clamp(p, 0, 1.2)); c.fillStyle = "#F5C400"; rr(c, -330, -58, 660, 116, 58); c.fill(); c.fillStyle = "#1a1600"; c.font = `800 ${V ? 58 : 52}px 'Barlow Condensed', sans-serif`; c.textBaseline = "middle"; c.fillText("FREE WHILE IT'S LAUNCHING", 0, 3); c.restore();
  c.globalAlpha = clamp((tin - 1.0) / 0.5); c.textBaseline = "alphabetic"; c.fillStyle = "#cfd0d2"; c.font = `500 ${V ? 46 : 40}px 'IBM Plex Mono', monospace`; c.fillText("getconstra.com", W / 2, cy + (V ? 500 : 470)); c.globalAlpha = 1;
  E.caption(c, t, { y: H * 0.9, size: V ? 54 : 46 });
}

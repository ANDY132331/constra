import { createMac } from "/char.js";

// ── format ──────────────────────────────────────────────────────────────────────────────
const MODE = new URLSearchParams(location.search).get("mode") === "h" ? "h" : "v";
const W = MODE === "v" ? 1080 : 1920, H = MODE === "v" ? 1920 : 1080;
const FPS = 30;
const LAYOUT = MODE === "v"
  ? { head: [0.5, 0.47], visibleHeight: 7.6 }
  : { head: [0.3, 0.46], visibleHeight: 6.6 };

const SCRIPT = [
  "Hey, I'm Mac. I run a framing crew.",
  "Fridays used to mean chasing hours. Who worked Tuesday? Was Jess on Queen Street, or the other job?",
  "Then I put my crew on Constra.",
  "Everyone clocks in on their own phone, with a photo and their location. So I know who's really on site.",
  "And if someone walks off the job on the clock? My phone tells me. The exact time. How far they went.",
  "Come Friday, the timesheets are just there. My logo on top. PDF or Excel, overtime worked out.",
  "Estimates, invoices, RFIs, change orders. One app, and it works when the signal drops.",
  "It's free while it's launching. Get your crew on it before Monday.",
  "Constra. Run the job, not the paperwork.",
];
const GAP_BEFORE = [0.6, 0.3, 0.4, 0.25, 0.25, 0.25, 0.25, 0.3, 0.35];
const END_HOLD = 3.6;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t = clamp(t), t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t) => { t = clamp(t); const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const smoothstep = (a, b, v) => ease((v - a) / (b - a));

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + src)); i.src = src; });

// ── the voice: decode, trim, and turn it into mouth shapes ──────────────────────────────
function analyse(buf) {
  const sr = buf.sampleRate, x = buf.getChannelData(0), hop = Math.round(sr * 0.01), win = Math.round(sr * 0.028);
  const n = Math.floor((x.length - win) / hop);
  // low-passed copy (~800 Hz) to tell round vowels (oo, oh) from bright ones (ee, s)
  const lp = new Float32Array(x.length); const a = Math.exp(-2 * Math.PI * 800 / sr); let y = 0;
  for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; lp[i] = y; }
  const rms = new Float32Array(n), zcr = new Float32Array(n), low = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0, sl = 0, z = 0; const o = f * hop;
    for (let i = 0; i < win; i++) { const v = x[o + i]; s += v * v; sl += lp[o + i] * lp[o + i]; if (i && (v >= 0) !== (x[o + i - 1] >= 0)) z++; }
    rms[f] = Math.sqrt(s / win); zcr[f] = z / win * sr / 4000; low[f] = sl / (s + 1e-9);
  }
  const sorted = [...rms].filter((v) => v > 0.006).sort((p, q) => p - q);
  const ref = sorted[Math.floor(sorted.length * 0.92)] || 0.1;
  let first = 0, last = n - 1; while (first < n && rms[first] < 0.008) first++; while (last > 0 && rms[last] < 0.008) last--;
  return { n, hop: hop / sr, rms, zcr, low, ref, start: first * hop / sr, end: (last + 1) * hop / sr, dur: buf.duration };
}

// ── set-up ─────────────────────────────────────────────────────────────────────────────
const out = document.getElementById("out"); out.width = W; out.height = H;
const ctx = out.getContext("2d");
const glCanvas = document.getElementById("gl"); glCanvas.width = W; glCanvas.height = H;
let mac, bg, shots = {}, doc, icon, voiceBufs = [], A = [], VO_AT = [], DURATION = 0, END_AT = 0, mouthTrack, emph = [], phrases = [];

window.prepare = async () => {
  mac = createMac(glCanvas, W, H, LAYOUT);
  [bg, doc, icon] = await Promise.all([loadImg("/bg.webp"), loadImg("/shots/timesheet-pdf.png"), loadImg("/icon.png")]);
  for (const k of ["dash", "templates", "invoices"]) shots[k] = await loadImg(`/shots/${k}.png`);
  const dec = new OfflineAudioContext(1, 48000, 48000);
  for (let i = 0; i < SCRIPT.length; i++) voiceBufs.push(await dec.decodeAudioData(await (await fetch(`/vo/vo-${String(i + 1).padStart(2, "0")}.wav`)).arrayBuffer()));
  A = voiceBufs.map(analyse);
  let t = 0;
  for (let i = 0; i < SCRIPT.length; i++) { t += GAP_BEFORE[i]; VO_AT.push(t - A[i].start * 0 ); t += voiceBufs[i].duration; }
  END_AT = t; DURATION = t + END_HOLD;

  // phrases for captions, timed across each line's spoken part
  phrases = [];
  SCRIPT.forEach((line, i) => {
    const parts = [];
    for (const s of line.match(/[^.?!]+[.?!]?/g) ?? [line]) {
      const sent = s.trim(); if (!sent) continue;
      if (sent.length > 34 && sent.includes(",")) { const [a, ...rest] = sent.split(/,\s*/); parts.push(a + ",", rest.join(", ")); } else parts.push(sent);
    }
    const w = parts.map((p) => p.length + 8), tot = w.reduce((a, b) => a + b, 0);
    let c = VO_AT[i] + A[i].start; const span = A[i].end - A[i].start;
    parts.forEach((p, k) => { const d = span * w[k] / tot; phrases.push({ text: p, a: c, b: c + d, line: i }); c += d; });
  });

  // mouth track at 100 Hz over the whole video
  const nF = Math.ceil(DURATION * 100) + 5;
  const open = new Float32Array(nF), round = new Float32Array(nF), wide = new Float32Array(nF);
  for (let i = 0; i < SCRIPT.length; i++) {
    const an = A[i], f0 = Math.round(VO_AT[i] * 100);
    for (let f = 0; f < an.n; f++) {
      const idx = f0 + f; if (idx >= nF) break;
      const v = clamp(an.rms[f] / an.ref);
      open[idx] = an.rms[f] < 0.008 ? 0 : clamp(Math.pow(v, 0.62) * 1.05);
      round[idx] = clamp((an.low[f] - 0.5) / 0.4);
      wide[idx] = clamp((an.zcr[f] - 0.45) / 0.5);
    }
  }
  const smooth = (arr, up, down) => { const o = new Float32Array(arr.length); let y = 0; for (let i = 0; i < arr.length; i++) { const k = arr[i] > y ? up : down; y += (arr[i] - y) * k; o[i] = y; } return o; };
  mouthTrack = { open: smooth(open, 0.55, 0.3), round: smooth(round, 0.35, 0.2), wide: smooth(wide, 0.3, 0.2) };

  // emphasis beats: peaks of a slow envelope, spaced out
  const slow = smooth(open, 0.06, 0.04);
  for (let i = 5; i < nF - 5; i++) {
    if (slow[i] > 0.42 && slow[i] >= slow[i - 3] && slow[i] > slow[i + 3] && (!emph.length || i / 100 - emph[emph.length - 1].t > 0.5)) emph.push({ t: i / 100, k: emph.length });
  }
  return { duration: DURATION, lines: VO_AT.map((a, i) => [+a.toFixed(2), +voiceBufs[i].duration.toFixed(2)]), beats: emph.length, W, H };
};

// ── timeline helpers ────────────────────────────────────────────────────────────────────
const lineStart = (i) => VO_AT[i], lineEnd = (i) => VO_AT[i] + voiceBufs[i].duration;
// who is on screen with Mac
function cutaway(t) {
  // returns {kind, a, b} for the active cutaway, if any
  const spans = [
    { kind: "dash", a: lineStart(3) - 0.5, b: lineEnd(4) + 0.3 },
    { kind: "doc", a: lineStart(5) - 0.4, b: lineEnd(5) + 0.35 },
    { kind: "templates", a: lineStart(6) - 0.4, b: lineEnd(6) + 0.4 },
  ];
  return spans.find((s) => t >= s.a && t <= s.b) ?? null;
}
const cutawayAmount = (t) => { // 0 = Mac fills the frame, 1 = Mac steps aside
  const a = lineStart(3) - 0.5, b = lineEnd(6) + 0.4;
  return ease((t - a) / 0.6) * (1 - ease((t - (b - 0.5)) / 0.6));
};
const bannerAt = () => lineStart(4) + A[4].start + 3.0; // "My phone tells me."

// ── drawing ────────────────────────────────────────────────────────────────────────────
function drawBackground(t) {
  const zoom = 1.06 + 0.05 * (t / DURATION);
  const s = Math.max(W / bg.width, H / bg.height) * zoom;
  const w = bg.width * s, h = bg.height * s;
  const px = (MODE === "v" ? 0.62 : 0.5), py = 0.5;
  const dx = (W - w) * px - 14 * Math.sin(t * 0.21), dy = (H - h) * py + 8 * Math.cos(t * 0.17);
  ctx.save();
  ctx.filter = `blur(${MODE === "v" ? 7 : 4}px) saturate(1.1)`;
  ctx.drawImage(bg, dx, dy, w, h);
  ctx.restore();
  // warm glow where the sun sits, then a vignette so the character and text pop
  const g = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, Math.max(W, H) * 0.7);
  g.addColorStop(0, "rgba(255,170,90,.28)"); g.addColorStop(1, "rgba(255,170,90,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.78);
  v.addColorStop(0, "rgba(10,8,20,0)"); v.addColorStop(1, "rgba(10,8,20,.62)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // floating lights (bokeh), slowly rising
  for (let i = 0; i < 14; i++) {
    const sp = 0.015 + (i % 5) * 0.006, ph = i * 0.37;
    const x = ((i * 0.173 + 0.05) % 1) * W + Math.sin(t * 0.3 + i) * 18;
    const y = H - (((t * sp + ph) % 1.1) * H * 1.05);
    const r = (MODE === "v" ? 14 : 12) + (i % 4) * 8;
    ctx.fillStyle = `rgba(255,${190 + (i % 3) * 20},${110 + (i % 4) * 25},${0.08 + (i % 3) * 0.03})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

function drawPhone(img, cx, cy, pw, a, tilt, extra) {
  const ph = pw * 2.06, x = cx - pw / 2, y = cy - ph / 2;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(a, a); ctx.globalAlpha = clamp(a * 1.3); ctx.translate(-cx, -cy);
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26;
  ctx.fillStyle = "#0e0f12"; rr(x, y, pw, ph, pw * 0.14); ctx.fill();
  ctx.shadowColor = "transparent";
  const bz = pw * 0.032; ctx.save(); rr(x + bz, y + bz, pw - bz * 2, ph - bz * 2, pw * 0.115); ctx.clip();
  const sw = pw - bz * 2, sh = ph - bz * 2, sc = sw / img.width;
  const off = extra?.scrollY ?? 0;
  ctx.drawImage(img, x + bz, y + bz - off * sc, sw, img.height * sc);
  if (extra?.draw) extra.draw({ x: x + bz, y: y + bz, w: sw, h: sh });
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 3; rr(x, y, pw, ph, pw * 0.14); ctx.stroke();
  ctx.fillStyle = "#000"; rr(cx - pw * 0.15, y + pw * 0.045, pw * 0.3, pw * 0.07, pw * 0.04); ctx.fill();
  ctx.restore();
}

function drawBanner(rect, k, t) {
  // a lock-screen style alert dropping in over the phone's screen
  const w = rect.w * 0.92, h = rect.w * 0.3, x = rect.x + (rect.w - w) / 2, y = rect.y + rect.h * 0.05 + (1 - easeBack(k)) * -h * 1.3;
  ctx.save(); ctx.globalAlpha = clamp(k * 3);
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(246,246,248,.97)"; rr(x, y, w, h, h * 0.22); ctx.fill(); ctx.shadowColor = "transparent";
  const is = h * 0.5; ctx.save(); rr(x + h * 0.16, y + (h - is) / 2, is, is, is * 0.24); ctx.clip(); ctx.drawImage(icon, x + h * 0.16, y + (h - is) / 2, is, is); ctx.restore();
  const tx = x + h * 0.16 + is + h * 0.14;
  ctx.fillStyle = "#151617"; ctx.font = `700 ${h * 0.185}px "Segoe UI", Arial`; ctx.textBaseline = "alphabetic";
  ctx.fillText("Constra", tx, y + h * 0.36);
  ctx.font = `600 ${h * 0.175}px "Segoe UI", Arial`; ctx.fillText("Dev Lal left Dundas St Reno", tx, y + h * 0.62);
  ctx.fillStyle = "#6a6d72"; ctx.font = `500 ${h * 0.15}px "Segoe UI", Arial`; ctx.fillText("11:42 AM  ·  1.8 km from the site", tx, y + h * 0.84);
  ctx.fillStyle = "#6a6d72"; ctx.font = `500 ${h * 0.13}px "Segoe UI", Arial`; ctx.textAlign = "right"; ctx.fillText("now", x + w - h * 0.16, y + h * 0.3); ctx.textAlign = "left";
  ctx.restore();
}

function chip(text, x, y, fg, bg, size) {
  ctx.font = `800 ${size}px "Segoe UI", Arial`;
  const w = ctx.measureText(text).width + size * 1.5, h = size * 1.9;
  ctx.fillStyle = bg; rr(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = "middle"; ctx.fillText(text, x + size * 0.75, y + h / 2 + 1); ctx.textBaseline = "alphabetic";
  return w;
}

function drawCutaway(t) {
  const c = cutaway(t); if (!c) return;
  const k = easeOut((t - c.a) / 0.45) * (1 - ease((t - (c.b - 0.3)) / 0.3));
  const slide = (1 - easeOut((t - c.a) / 0.5));
  const cx = MODE === "v" ? W * 0.62 : W * 0.72, cy = MODE === "v" ? H * 0.35 : H * 0.5;
  const pw = MODE === "v" ? 470 : 400;
  if (c.kind === "dash") {
    const after = t > bannerAt();
    const bk = clamp((t - bannerAt()) / 0.5);
    const shake = after && t < bannerAt() + 0.5 ? Math.sin((t - bannerAt()) * 70) * 0.012 * (1 - bk) : 0;
    drawPhone(shots.dash, cx + slide * 260, cy, pw, k, -0.05 + shake, {
      scrollY: 0,
      draw: (r) => { if (after) { drawBanner(r, bk, t); const pulse = 0.5 + 0.5 * Math.sin((t - bannerAt()) * 7); ctx.strokeStyle = `rgba(245,196,0,${0.55 + pulse * 0.4})`; ctx.lineWidth = 5; rr(r.x + r.w * 0.03, r.y + r.h * 0.385, r.w * 0.94, r.h * 0.155, r.w * 0.04); ctx.stroke(); } },
    });
    if (!after) chip("GPS + PHOTO ON EVERY PUNCH", cx - pw * 0.55 + slide * 260, cy + pw * 1.08, "#1a1600", "#F5C400", MODE === "v" ? 24 : 20);
    else chip("SITE ALERT, WITH THE EXACT TIME", cx - pw * 0.5, cy + pw * 1.08, "#1a1600", "#F5C400", MODE === "v" ? 24 : 20);
  } else if (c.kind === "doc") {
    const dw = MODE === "v" ? 500 : 440, dh = dw * doc.height / doc.width;
    ctx.save(); ctx.translate(cx + slide * 300, cy); ctx.rotate(0.04 - slide * 0.1); ctx.scale(k, k); ctx.globalAlpha = clamp(k * 1.4);
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 46; ctx.shadowOffsetY = 24;
    ctx.fillStyle = "#fff"; rr(-dw / 2, -dh / 2, dw, dh, 10); ctx.fill(); ctx.shadowColor = "transparent";
    ctx.drawImage(doc, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    const bx = cx - dw * 0.5 + slide * 300, by = cy + dh / 2 + 26;
    const w1 = chip("PDF", bx, by, "#fff", "#c0392b", MODE === "v" ? 26 : 22);
    chip("EXCEL", bx + w1 + 14, by, "#fff", "#1e7a45", MODE === "v" ? 26 : 22);
  } else {
    drawPhone(shots.templates, cx + slide * 260, cy, pw, k, 0.05, null);
    const by = cy + pw * 1.08;
    const w1 = chip("23 EXCEL TEMPLATES", cx - pw * 0.55 + slide * 260, by, "#1a1600", "#F5C400", MODE === "v" ? 24 : 20);
    const off = t > lineStart(6) + A[6].start + 2.4;
    if (off) { const ok = easeBack((t - (lineStart(6) + A[6].start + 2.4)) / 0.4); ctx.save(); ctx.globalAlpha = clamp(ok * 2); chip("WORKS OFFLINE", cx - pw * 0.55 + slide * 260 + w1 + 12, by, "#fff", "#2a2d33", MODE === "v" ? 24 : 20); ctx.restore(); }
  }
}

function drawCaption(t) {
  const ph = phrases.find((p) => t >= p.a - 0.05 && t <= p.b + 0.35);
  if (!ph || t > END_AT || ph.line === 8) return;
  const k = easeOut((t - (ph.a - 0.05)) / 0.18);
  const size = MODE === "v" ? 58 : 50;
  ctx.font = `800 ${size}px "Segoe UI", Arial`;
  const maxW = W * (MODE === "v" ? 0.84 : 0.5);
  const words = ph.text.split(" "), lines = []; let cur = "";
  for (const w of words) { const tryL = cur ? cur + " " + w : w; if (ctx.measureText(tryL).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryL; }
  lines.push(cur);
  const lh = size * 1.18, bh = lines.length * lh + size * 0.55;
  const ca = cutawayAmount(t);
  const bx = MODE === "v" ? W / 2 : W * 0.3, by = MODE === "v" ? lerp(H * 0.905 - bh, H * 0.665, ca) : H * 0.84 - bh;
  ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 18);
  const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.1;
  ctx.fillStyle = "rgba(14,12,22,.78)"; rr(bx - bw / 2, by, bw, bh, size * 0.4); ctx.fill();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff";
  lines.forEach((l, i) => ctx.fillText(l, bx, by + size * 0.82 + i * lh));
  ctx.restore(); ctx.textAlign = "left";
}

function drawBrand(t) {
  const s = MODE === "v" ? 1 : 0.9;
  ctx.save(); ctx.translate(MODE === "v" ? 52 : 70, MODE === "v" ? 70 : 62); ctx.scale(s, s);
  ctx.drawImage(icon, 0, 0, 54, 54);
  ctx.fillStyle = "#fff"; ctx.font = `900 40px Impact, "Arial Black", Arial`; ctx.textBaseline = "middle"; ctx.fillText("CONSTRA", 70, 29);
  ctx.restore();
}

function drawLowerThird(t) {
  const a = 0.7, b = 4.2; if (t < a || t > b) return;
  const k = easeOut((t - a) / 0.5) * (1 - ease((t - (b - 0.4)) / 0.4));
  const x = MODE === "v" ? 52 : W * 0.06, y = MODE === "v" ? H * 0.64 : H * 0.62;
  ctx.save(); ctx.globalAlpha = k; ctx.translate((1 - k) * -40, 0);
  ctx.fillStyle = "#F5C400"; rr(x, y, 10, 108, 4); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `900 62px Impact, "Arial Black", Arial`; ctx.fillText("MAC", x + 28, y + 52);
  ctx.fillStyle = "#F5E9B8"; ctx.font = `600 28px "Segoe UI", Arial`; ctx.fillText("Framing foreman", x + 28, y + 88);
  ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.font = `500 22px "Segoe UI", Arial`; ctx.fillText("Animated character, not a customer", x + 28, y + 122);
  ctx.restore();
}

function drawHeadline(t) {
  // line 9: the tagline lands word by word with the voice
  const s = lineStart(8) + A[8].start, words = [["RUN THE JOB,", s + 0.6], ["NOT THE", s + 1.35], ["PAPERWORK.", s + 1.6]];
  const size = MODE === "v" ? 120 : 108;
  ctx.font = `900 ${size}px Impact, "Arial Black", Arial`; ctx.textAlign = MODE === "v" ? "center" : "left";
  const x0 = MODE === "v" ? W / 2 : W * 0.55;
  const fade = 1 - ease((t - END_AT) / 0.4);
  words.forEach(([w, at], i) => {
    if (t < at) return; const k = easeBack((t - at) / 0.35);
    ctx.save(); ctx.globalAlpha = clamp(k * 2) * fade; ctx.translate(x0, (MODE === "v" ? H * 0.12 : H * 0.32) + i * size * 0.98); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
    ctx.lineWidth = size * 0.1; ctx.strokeStyle = "rgba(10,8,20,.55)"; ctx.lineJoin = "round"; ctx.strokeText(w, 0, 0);
    ctx.fillStyle = i === 2 ? "#F5C400" : "#fff"; ctx.fillText(w, 0, 0); ctx.restore();
  });
  ctx.textAlign = "left";
}

function drawEnd(t) {
  const k = easeOut((t - END_AT) / 0.7); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k * 0.82; ctx.fillStyle = "#0b0a14"; ctx.fillRect(0, 0, W, H); ctx.restore();
  const cx = W / 2, cy = H * (MODE === "v" ? 0.42 : 0.44);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(cx, cy + (1 - k) * 30);
  const is = MODE === "v" ? 150 : 120; ctx.drawImage(icon, -is / 2, -is * 1.7, is, is);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `900 ${MODE === "v" ? 150 : 128}px Impact, "Arial Black", Arial`; ctx.fillText("CONSTRA", 0, 0);
  ctx.fillStyle = "#F5E9B8"; ctx.font = `600 ${MODE === "v" ? 40 : 36}px "Segoe UI", Arial`; ctx.fillText("Run the job, not the paperwork.", 0, 70);
  ctx.fillStyle = "#F5C400"; ctx.fillRect(-60, 100, 120, 7);
  const bk = easeBack((t - END_AT - 0.5) / 0.4);
  ctx.globalAlpha = clamp(bk * 2); ctx.translate(0, 190 + (1 - clamp(bk)) * 20);
  const bw = MODE === "v" ? 520 : 440, bh = MODE === "v" ? 104 : 90;
  ctx.fillStyle = "#F5C400"; rr(-bw / 2, -bh / 2, bw, bh, 6); ctx.fill();
  ctx.fillStyle = "#141414"; ctx.font = `800 ${MODE === "v" ? 40 : 34}px "Segoe UI", Arial`; ctx.textBaseline = "middle"; ctx.fillText("START FREE", 0, 2);
  ctx.textBaseline = "alphabetic"; ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.font = `600 ${MODE === "v" ? 36 : 30}px "Segoe UI", Arial`; ctx.fillText("getconstra.com", 0, bh / 2 + 56);
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `500 ${MODE === "v" ? 26 : 22}px "Segoe UI", Arial`; ctx.fillText("Free while we launch  ·  Android, iPhone and web", 0, bh / 2 + 100);
  ctx.restore();
}

// ── Mac, frame by frame ─────────────────────────────────────────────────────────────────
function macPose(t) {
  const i100 = Math.max(0, Math.min(mouthTrack.open.length - 1, Math.round((t + 0.035) * 100)));
  const open = mouthTrack.open[i100], round = mouthTrack.round[i100], wide = mouthTrack.wide[i100];
  const talking = t > VO_AT[0] - 0.2 && t < END_AT + 0.3;
  const sinceBeat = (b) => t - b.t;
  let beat = 0, beatIdx = 0; for (const b of emph) { const d = sinceBeat(b); if (d >= 0 && d < 0.5) { beat = Math.max(beat, Math.exp(-d * 6)); beatIdx = b.k; } }
  // expression per line
  const line = VO_AT.findIndex((a, i) => t >= a - 0.2 && t < lineEnd(i) + 0.2);
  const question = line === 1 && t - VO_AT[1] > 1.9 && t - VO_AT[1] < 2.9;
  const smileTarget = t < VO_AT[0] + 1.2 ? 0.7 : t < END_AT - 3 ? 0.28 : 0.55;
  const smile = smileTarget + 0.12 * Math.sin(t * 0.7);
  // blinks at fixed, uneven times
  const blinkAt = [1.9, 4.6, 7.8, 10.2, 13.7, 16.1, 19.4, 22.3, 25.6, 28.2, 31.5, 34.1, 37.2, 40.0];
  let blink = 0; for (const b of blinkAt) { const d = t - b; if (d > 0 && d < 0.14) blink = Math.sin((d / 0.14) * Math.PI); }
  const ca = cutawayAmount(t);
  const glance = cutaway(t) ? ease((t - (cutaway(t).a + 0.25)) / 0.3) * (1 - ease((t - (cutaway(t).b - 0.9)) / 0.3)) : 0;
  const hand = talking ? clamp(0.55 + (beat > 0.15 ? 0.45 : 0)) : 0;
  const gest = beatIdx % 2 ? 1 : -1;
  return {
    mouth: { open: open * (talking ? 1 : 0), round, smile: open > 0.1 ? smile * 0.6 : smile, wide },
    brow: 0.15 * Math.sin(t * 0.9) + beat * 0.8 + (question ? 0.9 : 0) + (t < 2 ? 0.5 : 0),
    browR: beat * 0.6, browTilt: question ? 0.5 : -0.1 * beat,
    nod: 0.03 * Math.sin(t * 1.3) + beat * 0.07 + open * 0.025 - glance * 0.02,
    turn: 0.05 * Math.sin(t * 0.55) + glance * 0.34,
    tilt: 0.025 * Math.sin(t * 0.7 + 1) + (question ? 0.05 : 0),
    blink, breathe: Math.sin(t * 1.55), lidOpen: beat * 0.6 + (question ? 0.6 : 0),
    lookX: glance * 0.9 + 0.08 * Math.sin(t * 0.9), lookY: 0.05 * Math.sin(t * 1.3),
    bodyX: 0.05 * Math.sin(t * 0.6), bodyY: 0,
    gesture: { amt: ease(hand * (1 - ca * 0.2)), x: 0.5 * Math.sin(t * 1.9) + gest * 0.3 * beat, y: 0.5 * Math.sin(t * 2.3 + 1) + beat * 0.8, z: 0.2 + beat * 0.5, swing: Math.sin(t * 2.7) * 0.6 },
  };
}

window.__force = null;
window.drawFrame = (t) => {
  ctx.clearRect(0, 0, W, H);
  drawBackground(t);
  drawCutaway(t);
  mac.update(window.__force ? { ...macPose(t), ...window.__force } : macPose(t));
  // Mac in front; he steps aside (smaller, lower-left) while the app is on screen
  const ca = cutawayAmount(t);
  const bob = t < 0.6 ? (1 - easeOut(t / 0.6)) * 40 : 0;
  const sc = lerp(1, MODE === "v" ? 0.52 : 0.9, ca);
  const ax = W * LAYOUT.head[0], ay = H * (LAYOUT.head[1] + (MODE === "v" ? 0.08 : 0.1));
  const tx = lerp(ax, MODE === "v" ? W * 0.28 : W * 0.3, ca), ty = lerp(ay, MODE === "v" ? H * 0.865 : ay, ca);
  const fadeEnd = 1 - ease((t - END_AT - 0.1) / 0.5) * 0.0;
  ctx.save(); ctx.globalAlpha = clamp(t / 0.35) * fadeEnd;
  ctx.translate(tx, ty + bob); ctx.scale(sc, sc); ctx.translate(-ax, -ay);
  ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.drawImage(glCanvas, 0, 0, W, H);
  ctx.restore();
  if (!window.__force) { drawHeadline(t); drawCaption(t); drawLowerThird(t); drawBrand(t); drawEnd(t); }
  // grade: a hint of contrast and grain-free warmth
  ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = "rgba(255,196,140,.10)"; ctx.fillRect(0, 0, W, H); ctx.restore();
};

// ── sound: the voice with a little body, and a warm music bed under it ──────────────────
async function mixAudio() {
  const SR = 48000, ctxA = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const master = ctxA.createGain(); master.gain.setValueAtTime(0.95, 0); master.gain.setValueAtTime(0.95, DURATION - 1.6); master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  const comp = ctxA.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  comp.connect(master).connect(ctxA.destination);

  // voice: low cut, a little warmth and presence, and a small room so it doesn't sit dry
  const vox = ctxA.createGain(); vox.gain.value = 1.15;
  const hp = ctxA.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 85;
  const warm = ctxA.createBiquadFilter(); warm.type = "lowshelf"; warm.frequency.value = 220; warm.gain.value = 3;
  const pres = ctxA.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3200; pres.gain.value = 3; pres.Q.value = 0.9;
  const deess = ctxA.createBiquadFilter(); deess.type = "highshelf"; deess.frequency.value = 7000; deess.gain.value = -3;
  vox.connect(hp).connect(warm).connect(pres).connect(deess);
  const dry = ctxA.createGain(); dry.gain.value = 1; deess.connect(dry).connect(comp);
  const ir = ctxA.createBuffer(2, Math.round(SR * 0.45), SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 11 + c * 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / d.length, 3.2); } }
  const conv = ctxA.createConvolver(); conv.buffer = ir; const wet = ctxA.createGain(); wet.gain.value = 0.13; deess.connect(conv).connect(wet).connect(comp);
  voiceBufs.forEach((b, i) => { const s = ctxA.createBufferSource(); s.buffer = b; s.connect(vox); s.start(VO_AT[i]); });

  // music bed: Am - F - C - G pad with a soft pluck, ducked under every spoken line
  const bed = ctxA.createGain(); bed.gain.value = 0.55; bed.connect(comp);
  bed.gain.setValueAtTime(0.0001, 0); bed.gain.linearRampToValueAtTime(0.5, 2.0);
  const spans = VO_AT.map((a, i) => [a - 0.05, a + voiceBufs[i].duration]);
  const duck = ctxA.createGain(); duck.gain.setValueAtTime(1, 0); duck.connect(bed);
  for (const [a, b] of spans) { duck.gain.setValueAtTime(1, Math.max(0, a - 0.2)); duck.gain.linearRampToValueAtTime(0.32, a); duck.gain.setValueAtTime(0.32, b); duck.gain.linearRampToValueAtTime(1, b + 0.5); }
  const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
  const BAR = 2.667, nBars = Math.ceil(DURATION / BAR);
  const tone = (f, t, d, type, vol, lpf, out) => { const o = ctxA.createOscillator(); o.type = type; o.frequency.value = f; const g = ctxA.createGain(); const lp = ctxA.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpf;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, d * 0.3)); g.gain.setValueAtTime(vol, t + d * 0.65); g.gain.linearRampToValueAtTime(0.0001, t + d);
    o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + d + 0.05); };
  const pluck = (f, t, vol) => { const o = ctxA.createOscillator(); o.type = "triangle"; o.frequency.value = f; const g = ctxA.createGain(); const lp = ctxA.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(lp).connect(g).connect(duck); o.start(t); o.stop(t + 0.7); };
  for (let b = 0; b < nBars; b++) {
    const t0 = b * BAR, ch = chords[b % 4];
    for (const f of ch) { tone(f * 0.5, t0, BAR + 0.3, "sawtooth", 0.05, 650, duck); tone(f, t0, BAR + 0.3, "sine", 0.06, 1400, duck); }
    tone(ch[0] * 0.25, t0, BAR, "sine", 0.16, 200, duck);
    if (t0 > 1.5) ch.concat([ch[1] * 2]).forEach((f, k) => pluck(f * 2, t0 + k * (BAR / 8) * 1.0 + (k % 2) * 0.0, 0.05));
    // a soft pulse under the second half
    if (t0 > 9) for (let k = 0; k < 4; k++) { const tk = t0 + k * (BAR / 4); const o = ctxA.createOscillator(); o.frequency.setValueAtTime(120, tk); o.frequency.exponentialRampToValueAtTime(45, tk + 0.1); const g = ctxA.createGain(); g.gain.setValueAtTime(0.0001, tk); g.gain.exponentialRampToValueAtTime(0.16, tk + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.25); o.connect(g).connect(duck); o.start(tk); o.stop(tk + 0.3); }
  }
  // the phone alert: whoosh in, then a two-note ping
  const ping = (t, f, v) => { const o = ctxA.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = ctxA.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.8); };
  const bt = bannerAt(); ping(bt, 1568, 0.22); ping(bt + 0.11, 2093, 0.2);
  // soft whooshes where the app slides in and out
  const noise = ctxA.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  const whoosh = (t, dur, v) => { const src = ctxA.createBufferSource(); src.buffer = noise; const bp = ctxA.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3200, t + dur);
    const g = ctxA.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur); src.connect(bp).connect(g).connect(comp); src.start(t); src.stop(t + dur + 0.1); };
  for (const t of [lineStart(3) - 0.5, lineStart(5) - 0.4, lineStart(6) - 0.4, lineEnd(6) + 0.2, END_AT + 0.05]) whoosh(t, 0.45, 0.1);
  return await ctxA.startRendering();
}

// ── encode ─────────────────────────────────────────────────────────────────────────────
const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
window.still = async (t) => { window.drawFrame(t); return (await b64(await new Promise((r) => out.toBlob(r, "image/png")))); };
window.encodeAll = async (bitrate) => {
  const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 }, fastStart: "in-memory" });
  let err = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = String(e); } });
  venc.configure({ codec: MODE === "v" ? "avc1.640033" : "avc1.640034", width: W, height: H, bitrate, framerate: FPS, latencyMode: "quality", bitrateMode: "variable" });
  const audio = await mixAudio();
  const L = audio.getChannelData(0), R = audio.getChannelData(1);
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0.97 ? 0.97 / peak : 1;
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { err = String(e); } });
  aenc.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
  for (let off = 0; off < L.length; off += 1024) {
    const n = Math.min(1024, L.length - off), d = new Float32Array(n * 2);
    for (let k = 0; k < n; k++) { d[k] = L[off + k] * g; d[n + k] = R[off + k] * g; }
    const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: d }); aenc.encode(ad); ad.close();
  }
  await aenc.flush();
  const total = Math.round(DURATION * FPS);
  for (let i = 0; i < total; i++) {
    window.drawFrame(i / FPS);
    const f = new VideoFrame(out, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(f, { keyFrame: i % 60 === 0 }); f.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 8));
    if (i % 90 === 0) console.log(`frame ${i}/${total}`);
  }
  await venc.flush(); muxer.finalize();
  if (err) throw new Error(err);
  return { video: await b64(muxer.target.buffer), peak: +peak.toFixed(3), gain: +g.toFixed(3) };
};

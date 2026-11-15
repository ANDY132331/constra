import { clamp, lerp, ease, easeOut, easeBack, loadImg } from "/engine.js";

// "The group chat": a Friday-afternoon text thread, every message read aloud by its own voice. Light, bright and fast: the opposite of the dark app demo.
const WHO = {
  Mac: { color: "#F5C400", ink: "#1a1600", init: "M", me: true },
  Jess: { color: "#ff8fb1", ink: "#3a0b1b", init: "J" },
  Dev: { color: "#6fb7ff", ink: "#08213f", init: "D" },
};
let ICON, items = [], LAYOUT = null;

function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

export default {
  endHold: 2.4, lead: 0.2, reverb: 0.05, bedGain: 0.32, duckTo: 0.3,
  voices: { Narrator: { pan: 0, gain: 1.05 }, Mac: { pan: 0.25, gain: 1 }, Jess: { pan: -0.2, gain: 1 }, Dev: { pan: -0.05, gain: 1 } },
  async init(E, c) {
    ICON = await loadImg("/icon.png");
    const { V } = E, S = V ? 1 : 0.62; E.S = S;
    LAYOUT = { S, CW: V ? E.W : 760, font: `500 ${Math.round(42 * S)}px 'IBM Plex Sans', sans-serif`, nameFont: `600 ${Math.round(27 * S)}px 'IBM Plex Sans', sans-serif` };
    // build the list of chat items and lay them out top to bottom
    c.font = LAYOUT.font; const maxText = (V ? 700 : 480), padX = 36 * S, padY = 26 * S, lh = 56 * S;
    let y = 0; items = [];
    E.lines.forEach((L, i) => {
      if (L.kind === "sep") { items.push({ type: "sep", i, y, h: 110 * S }); y += 110 * S; return; }
      if (L.kind !== "msg") return;
      const who = WHO[L.who], words = L.text.split(" "), ls = []; { let line = []; for (const w of words) { const test = [...line, w].join(" "); if (c.measureText(test).width > maxText && line.length) { ls.push(line); line = [w]; } else line.push(w); } ls.push(line); }
      const tw = Math.max(...ls.map((l) => c.measureText(l.join(" ")).width)), bw = tw + padX * 2, bh = ls.length * lh + padY * 2 - (lh - 42 * S) * 0.4;
      const nameH = who.me ? 0 : 36 * S, cardH = L.card ? 150 * S + 14 * S : 0;
      items.push({ type: "msg", i, who: L.who, ls, bw, bh, y, nameH, cardH, total: nameH + bh + cardH + 22 * S, words });
      y += nameH + bh + cardH + 22 * S;
    });
    LAYOUT.total = y;
  },

  draw(t, c, E) {
    const { W, H, V } = E, S = LAYOUT.S, CW = LAYOUT.CW, X0 = (W - CW) / 2;
    // page background (matters in the wide format: a soft pattern either side of the chat column)
    c.fillStyle = V ? "#eef0f3" : "#dde2e8"; c.fillRect(0, 0, W, H);
    if (!V) { c.fillStyle = "rgba(21,22,23,0.05)"; for (let x = (-t * 20) % 60; x < W; x += 60) for (let y = 0; y < H; y += 60) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } }

    // ── title card at the start, brand card at the end
    const iT = E.lines.findIndex((l) => l.kind === "title"), iE = E.lines.findIndex((l) => l.kind === "end"), iS = E.lines.findIndex((l) => l.kind === "sep");
    const tOut = E.LE(iT) + 0.25, eIn = E.L(iE) - 0.35;

    // chat column
    c.save(); c.beginPath(); c.rect(X0, 0, CW, H); c.clip();
    c.fillStyle = "#f7f8fa"; c.fillRect(X0, 0, CW, H);
    const topBar = (V ? 250 : 150) * (V ? 1 : 1), barH = topBar, inputH = (V ? 190 : 120), viewTop = barH, viewBot = H - inputH, viewH = viewBot - viewTop;
    // when does each item appear (typing dots show 0.6s before)
    const appear = (it) => E.L(it.i) - 0.02, typingAt = (it) => E.L(it.i) - Math.min(0.62, (E.L(it.i) - (it.prevEnd ?? 0)) - 0.05);
    let prevEnd = 0; for (const it of items) { it.prevEnd = prevEnd; prevEnd = E.LE(it.i); }
    // scroll position: latest visible item sits just above the input bar
    let scroll = 0, lastBottom = 0;
    for (const it of items) { const a = it.type === "msg" ? typingAt(it) : appear(it); if (t >= a) { const bottom = it.y + (it.type === "msg" ? it.total : it.h); const u = ease((t - a) / 0.35); scroll = Math.max(0, lerp(lastBottom, bottom, u) - viewH + 30 * S); lastBottom = bottom; } }
    // keep the very first messages from sitting under a blank top
    c.save(); c.beginPath(); c.rect(X0, viewTop, CW, viewH); c.clip(); c.translate(X0, viewTop - scroll + 24 * S);
    for (const it of items) {
      if (it.type === "sep") { const a = easeOut((t - appear(it)) / 0.4); if (a <= 0) continue; c.save(); c.globalAlpha = a; c.translate(CW / 2, it.y + it.h / 2); c.scale(0.9 + 0.1 * a, 0.9 + 0.1 * a); c.font = `700 ${30 * S}px 'IBM Plex Mono', monospace`; const txt = "MONDAY 7:02 AM", w = c.measureText(txt).width + 60 * S; c.fillStyle = "#151617"; rr(c, -w / 2, -30 * S, w, 60 * S, 30 * S); c.fill(); c.fillStyle = "#F5C400"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 2); c.restore(); continue; }
      drawMsg(c, E, it, t, CW, S);
    }
    c.restore();

    // top bar
    c.fillStyle = "#ffffff"; c.fillRect(X0, 0, CW, barH); c.fillStyle = "#e3e5e8"; c.fillRect(X0, barH - 2, CW, 2);
    c.fillStyle = "#151617"; c.font = `600 ${32 * S}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; const clock = t < E.L(iS) - 0.4 ? "4:58" : "7:02"; c.fillText(clock, X0 + 50 * S, (V ? 62 : 36)); c.textAlign = "right"; c.fillText("5G  86%", X0 + CW - 50 * S, (V ? 62 : 36));
    // group avatars
    const ay = barH - (V ? 100 : 62); [["Mac", -90], ["Jess", 0], ["Dev", 90]].forEach(([n, dx], i) => { const w = WHO[n]; c.fillStyle = w.color; c.strokeStyle = "#fff"; c.lineWidth = 5 * S; c.beginPath(); c.arc(X0 + CW / 2 + dx * S * 1.05, ay, 44 * S, 0, 7); c.fill(); c.stroke(); c.fillStyle = w.ink; c.font = `800 ${40 * S}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(w.init, X0 + CW / 2 + dx * S * 1.05, ay + 2); });
    c.fillStyle = "#151617"; c.font = `800 ${46 * S}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.fillText("CREW CHAT", X0 + CW / 2, barH - (V ? 38 : 22));
    // input bar
    c.fillStyle = "#ffffff"; c.fillRect(X0, viewBot, CW, inputH); c.fillStyle = "#e3e5e8"; c.fillRect(X0, viewBot, CW, 2);
    c.fillStyle = "#eef0f3"; rr(c, X0 + 36 * S, viewBot + 34 * S, CW - 72 * S - 110 * S, 84 * S, 42 * S); c.fill(); c.fillStyle = "#9aa0a6"; c.font = `400 ${36 * S}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.fillText("Message", X0 + 70 * S, viewBot + 77 * S);
    c.fillStyle = "#F5C400"; c.beginPath(); c.arc(X0 + CW - 82 * S, viewBot + 76 * S, 42 * S, 0, 7); c.fill(); c.fillStyle = "#1a1600"; c.beginPath(); c.moveTo(X0 + CW - 94 * S, viewBot + 62 * S); c.lineTo(X0 + CW - 64 * S, viewBot + 76 * S); c.lineTo(X0 + CW - 94 * S, viewBot + 90 * S); c.closePath(); c.fill();
    c.restore();

    // ── intro title card
    if (t < tOut + 0.5) {
      const u = ease((t - tOut) / 0.5), y = -u * H; c.save(); c.translate(0, y); c.fillStyle = "#151617"; c.fillRect(0, 0, W, H);
      const hz = (yy, hh) => { c.save(); c.beginPath(); c.rect(0, yy, W, hh); c.clip(); c.fillStyle = "#F5C400"; c.fillRect(0, yy, W, hh); c.fillStyle = "#151617"; for (let x = -hh * 2 + ((t * 50) % (hh * 2)); x < W + hh; x += hh * 2) { c.beginPath(); c.moveTo(x, yy + hh); c.lineTo(x + hh, yy + hh); c.lineTo(x + hh * 2, yy); c.lineTo(x + hh, yy); c.closePath(); c.fill(); } c.restore(); };
      hz(0, V ? 40 : 26); hz(H - (V ? 40 : 26), V ? 40 : 26);
      const a = easeBack(t / 0.6); c.textAlign = "center"; c.textBaseline = "alphabetic"; c.save(); c.translate(W / 2, H * 0.44); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.fillStyle = "#F5C400"; c.font = `800 ${V ? 150 : 130}px 'Barlow Condensed', sans-serif`; c.fillText("FRIDAY", 0, -20); c.fillStyle = "#fff"; c.font = `800 ${V ? 280 : 250}px 'Barlow Condensed', sans-serif`; c.fillText("4:58 PM", 0, V ? 230 : 200); c.restore();
      c.fillStyle = "#cfd0d2"; c.font = `500 ${V ? 44 : 38}px 'IBM Plex Mono', monospace`; c.globalAlpha = clamp((t - 0.7) / 0.4); c.fillText("a group chat, about to go wrong", W / 2, H * 0.44 + (V ? 330 : 290)); c.globalAlpha = 1;
      E.caption(c, t, { y: H * 0.86, size: V ? 58 : 48 });
      c.restore();
    }
    // ── end card
    if (t >= eIn) {
      const u = easeOut((t - eIn) / 0.5), tin = t - eIn; c.save(); c.globalAlpha = u; c.fillStyle = "#151617"; c.fillRect(0, 0, W, H);
      const hz = (yy, hh) => { c.save(); c.beginPath(); c.rect(0, yy, W, hh); c.clip(); c.fillStyle = "#F5C400"; c.fillRect(0, yy, W, hh); c.fillStyle = "#151617"; for (let x = -hh * 2 + ((t * 50) % (hh * 2)); x < W + hh; x += hh * 2) { c.beginPath(); c.moveTo(x, yy + hh); c.lineTo(x + hh, yy + hh); c.lineTo(x + hh * 2, yy); c.lineTo(x + hh, yy); c.closePath(); c.fill(); } c.restore(); };
      hz(0, V ? 40 : 26); hz(H - (V ? 40 : 26), V ? 40 : 26);
      const cy = H * 0.42, ip = easeBack(tin / 0.6), sz = (V ? 230 : 190) * ip; c.drawImage(ICON, W / 2 - sz / 2, cy - (V ? 300 : 260) - sz / 2 + 100, sz, sz);
      c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillStyle = "#fff"; c.font = `800 ${V ? 190 : 160}px 'Barlow Condensed', sans-serif`; c.fillText("CONSTRA", W / 2, cy + 90);
      c.fillStyle = "#F5C400"; c.font = `800 ${V ? 70 : 58}px 'Barlow Condensed', sans-serif`; c.fillText("RUN THE JOB, NOT THE PAPERWORK", W / 2, cy + 190);
      const p = easeBack((tin - 0.5) / 0.5); c.save(); c.translate(W / 2, cy + (V ? 340 : 310)); c.scale(clamp(p, 0, 1.2), clamp(p, 0, 1.2)); c.fillStyle = "#F5C400"; rr(c, -330, -58, 660, 116, 58); c.fill(); c.fillStyle = "#1a1600"; c.font = `800 ${V ? 58 : 50}px 'Barlow Condensed', sans-serif`; c.textBaseline = "middle"; c.fillText("FREE WHILE IT'S LAUNCHING", 0, 3); c.restore();
      c.textBaseline = "alphabetic"; c.fillStyle = "#cfd0d2"; c.font = `500 ${V ? 46 : 40}px 'IBM Plex Mono', monospace`; c.globalAlpha = clamp((tin - 1.0) / 0.5) * u; c.fillText("getconstra.com", W / 2, cy + (V ? 500 : 460)); c.globalAlpha = u;
      E.caption(c, t, { y: H * 0.9, size: V ? 58 : 48 });
      c.restore();
    }
    // narrator caption for the Monday separator
    if (t > E.L(iS) - 0.1 && t < E.LE(iS) + 0.2 && t < eIn) E.caption(c, t, { y: H * 0.9, size: V ? 52 : 44, fg: "#151617", stroke: "rgba(255,255,255,0.9)", hi: "#b88a00" });
  },

  audio(h, E) {
    const { note, kick, hat, snare, tone, burst, ding } = h; const D = E.DURATION;
    // a light, bouncy bed: walking bass + staccato plucks, 104 bpm
    const BEAT = 60 / 104, BAR = BEAT * 4, prog = [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]], roots = [65.4, 55, 43.65, 49];
    for (let b = 0; b * BAR < D - 1; b++) { const t0 = b * BAR, ch = prog[b % 4], rt = roots[b % 4]; for (let k = 0; k < 4; k++) { note(rt * (k % 2 ? 2 : 1), t0 + k * BEAT, BEAT * 0.5, "triangle", 0.2, 600); } for (let k = 0; k < 8; k++) if ([0, 3, 4, 6].includes(k)) note(ch[k % 3] * 2, t0 + k * BEAT / 2, 0.14, "square", 0.022, 1800); kick(t0, 0.12); kick(t0 + BEAT * 2.5, 0.1); snare(t0 + BEAT, 0.035); snare(t0 + BEAT * 3, 0.035); hat(t0 + BEAT / 2, 0.02); hat(t0 + BEAT * 1.5, 0.02); hat(t0 + BEAT * 2.5, 0.02); hat(t0 + BEAT * 3.5, 0.02); }
    // message sounds: a typing flutter, then "sent" (Mac) or "received" (others)
    E.lines.forEach((L, i) => { if (L.kind !== "msg") return; const t0 = E.L(i) - 0.02; for (let k = 0; k < 5; k++) tone(1900 + (k % 2) * 300, t0 - 0.5 + k * 0.1, 0.03, 0.025, "square"); if (L.who === "Mac") { tone([700, 1100], t0, 0.12, 0.08, "sine"); } else { ding(t0, 1250, 0.07); ding(t0 + 0.09, 1650, 0.06); } });
    // comedy stings: after "Retired." and "A good guess!"
    const rim = (t) => { snare(t, 0.1, h.comp); kick(t + 0.18, 0.2, h.comp); h.burst(t + 0.34, [9000, 4000], 0.5, 0.5, 0.05, "highpass"); };
    const iRet = E.lines.findIndex((l) => l.text === "Retired."), iGG = E.lines.findIndex((l) => l.text === "A good guess!"); rim(E.LE(iRet) + 0.1); rim(E.LE(iGG) + 0.05);
    // title and Monday whooshes, end sparkle
    const iS = E.lines.findIndex((l) => l.kind === "sep"), iE = E.lines.findIndex((l) => l.kind === "end"), iT = 0; burst(E.LE(iT) + 0.2, [400, 4000], 0.6, 0.45, 0.1); burst(E.L(iS) - 0.1, [300, 3500], 0.6, 0.4, 0.08); burst(E.L(iE) - 0.35, [400, 4000], 0.6, 0.45, 0.1);
    for (let k = 0; k < 5; k++) ding(E.L(iE) + 0.2 + k * 0.08, 880 * Math.pow(1.26, k), 0.07);
  },
};

function drawMsg(c, E, it, t, CW, S) {
  const L = E.lines[it.i], who = WHO[it.who], me = who.me, tIn = E.L(it.i) - 0.02, tType = tIn - Math.min(0.62, 0.6);
  if (t < tType) return;
  const side = me ? "R" : "L", avW = 74 * S, gap = 16 * S, margin = 34 * S;
  const bx = me ? CW - margin - it.bw : margin + avW + gap, by = it.y + it.nameH;
  // avatar for received messages
  if (!me) { const sp = E.speaking(it.who, t) >= 0; c.save(); c.translate(margin + avW / 2, by + it.bh - avW / 2); const a = easeBack((t - tType) / 0.3); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.fillStyle = who.color; c.beginPath(); c.arc(0, 0, avW / 2, 0, 7); c.fill(); if (sp) { c.strokeStyle = who.color; c.lineWidth = 4 * S; c.globalAlpha = 0.5; c.beginPath(); c.arc(0, 0, avW / 2 + 7 * S + Math.sin(t * 14) * 2 * S, 0, 7); c.stroke(); c.globalAlpha = 1; } c.fillStyle = who.ink; c.font = `800 ${44 * S}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(who.init, 0, 2); c.restore();
    c.fillStyle = "#6b7078"; c.font = `600 ${26 * S}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; c.globalAlpha = clamp((t - tType) / 0.3); c.fillText(it.who, bx + 8 * S, it.y + it.nameH * 0.5); c.globalAlpha = 1; }
  if (t < tIn) { // typing dots
    const a = easeOut((t - tType) / 0.2); c.save(); c.globalAlpha = a; c.translate(bx, by); c.fillStyle = me ? "#ffe27a" : "#e4e7eb"; rr(c, me ? it.bw - 150 * S : 0, 0, 150 * S, 80 * S, 40 * S); c.fill(); for (let k = 0; k < 3; k++) { const ph = Math.sin(t * 10 - k * 0.9); c.fillStyle = me ? "#6b5600" : "#8a9099"; c.beginPath(); c.arc((me ? it.bw - 150 * S : 0) + 45 * S + k * 30 * S, 40 * S - ph * 7 * S, 9 * S, 0, 7); c.fill(); } c.restore(); return; }
  const a = easeBack((t - tIn) / 0.28), sp = E.speaking(it.who, t) >= 0, pulse = sp ? 1 + 0.012 * Math.sin(t * 12) : 1;
  c.save(); c.translate(bx + (me ? it.bw : 0), by + it.bh); c.scale(clamp(a, 0, 1.08) * pulse, clamp(a, 0, 1.08) * pulse); c.translate(-(me ? it.bw : 0), -it.bh);
  c.shadowColor = "rgba(21,22,23,0.12)"; c.shadowBlur = 14 * S; c.shadowOffsetY = 4 * S;
  c.fillStyle = me ? "#F5C400" : "#ffffff"; rr(c, 0, 0, it.bw, it.bh, 38 * S); c.fill(); c.shadowColor = "transparent";
  if (!me) { c.strokeStyle = "#e3e5e8"; c.lineWidth = 2; rr(c, 0, 0, it.bw, it.bh, 38 * S); c.stroke(); }
  // words light up as they are spoken
  c.font = `500 ${Math.round(42 * S)}px 'IBM Plex Sans', sans-serif`; c.textAlign = "left"; c.textBaseline = "middle"; const cur = E.wordIndex(it.i, t, it.words.length), done = t > E.LE(it.i) + 0.05; let k = 0;
  const lh = 56 * S;
  it.ls.forEach((line, li) => { let x = 36 * S; const yy = 26 * S + li * lh + 22 * S; for (const w of line) { const spoken = done || k <= cur; c.globalAlpha = spoken ? 1 : 0.38; c.fillStyle = me ? "#1a1600" : "#151617"; c.fillText(w, x, yy); x += c.measureText(w + " ").width; k++; } });
  c.globalAlpha = 1;
  // the Constra notification card tucked under Jess's message
  if (it.cardH) { const u = easeBack((t - (tIn + 0.5)) / 0.4); if (u > 0.01) { c.save(); c.translate(0, it.bh + 14 * S); c.globalAlpha = clamp(u); const cw = Math.max(it.bw, 560 * S); c.scale(clamp(u, 0, 1.05), clamp(u, 0, 1.05)); c.fillStyle = "#151617"; rr(c, 0, 0, cw, 150 * S, 26 * S); c.fill(); c.fillStyle = "#F5C400"; rr(c, 0, 0, 10 * S, 150 * S, 5 * S); c.fill(); if (ICON) c.drawImage(ICON, 30 * S, 30 * S, 90 * S, 90 * S); c.fillStyle = "#fff"; c.font = `800 ${42 * S}px 'Barlow Condensed', sans-serif`; c.fillText("CLOCKED IN", 140 * S, 52 * S); c.fillStyle = "#b9bcc0"; c.font = `500 ${26 * S}px 'IBM Plex Mono', monospace`; c.fillText("7:02 AM · photo + GPS saved", 140 * S, 100 * S); c.restore(); } }
  c.restore();
}

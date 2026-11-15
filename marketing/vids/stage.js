// Shared staging helpers for the story videos: acting, app-screen insets, callout chips, the brand end card, comedy sound effects.
import { clamp, lerp, ease, easeOut, easeBack, loadImg, rnd } from "/engine.js";
import { STYLES, drawPuppet, drawTalker, track, jitter, qt, blinkAt } from "/puppet.js";

export function rr(c, x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
export const loadShots = async (names) => { const o = {}; for (const n of names) o[n] = await loadImg(`/assets/app-${n}.png`); return o; };

// ── acting ─────────────────────────────────────────────────────────────
// Draws one person from a keyed track. Talking: mouth from word timings, hands gesture. Pass `over` to force fields (mood, arms, prop...).
export function actor(c, E, t, who, ch, style, keys, o = {}) {
  const tt = qt(t, style), k = track(keys, tt, o.speed ?? 380), sp = E.speaking(o.voice ?? who, tt) >= 0, m = E.mouth(o.voice ?? who, tt), seed = o.seed ?? 1;
  const sc = o.scale, moving = k.moving;
  const idle = Math.sin(tt * 1.7 + seed) * 0.03;
  const gest = sp && !moving ? { armL: [0.35 + 0.3 * Math.sin(tt * 2.7 + seed), 0.7 + 0.4 * Math.sin(tt * 3.3 + seed)], armR: [0.4 + 0.3 * Math.sin(tt * 2.2 + seed + 1), 0.6 + 0.4 * Math.sin(tt * 3.9 + seed)] } : { armL: [0.1 + idle, 0.12], armR: [0.1 - idle, 0.12] };
  const p = { x: k.x, y: k.y ?? 0, scale: sc, flip: k.flip ?? 1, t: tt, mouth: m, mood: k.mood || "neutral", blink: blinkAt(tt, seed), look: k.look || [0, 0], walk: tt * 9, walkAmt: moving ? 1 : 0, armL: k.armL ?? (moving ? undefined : gest.armL), armR: k.armR ?? (moving ? undefined : gest.armR), prop: k.prop, propHand: k.propHand || "R", screen: k.screen, soggy: k.soggy, bgCol: o.bgCol, bounce: (k.bounce || 0) + (sp ? Math.abs(Math.sin(tt * 8)) * -3 : 0), tilt: (k.tilt ?? 0) + (sp ? Math.sin(tt * 2.5 + seed) * 0.03 : 0), squash: k.squash, sweat: k.sweat, flush: k.flush, jit: jitter(t, seed, style), noShadow: o.noShadow };
  if (o.over) Object.assign(p, typeof o.over === "function" ? o.over(p, k, tt) : o.over);
  if (o.kind) drawTalker(c, o.kind, { ...p, tie: o.tie }, style); else drawPuppet(c, ch, p, style);
  return { p, k };
}

// ── app screen floating beside the action ──────────────────────────────
export function phoneInset(c, img, cx, cy, w, rot, a, t = 0) {
  if (a <= 0.01) return; const h = w * img.height / img.width, pad = w * 0.04, r = w * 0.15;
  c.save(); c.translate(cx, cy + Math.sin(t * 1.4) * 6); c.rotate(rot + Math.sin(t * 0.9) * 0.012); c.scale(clamp(a, 0, 1.06), clamp(a, 0, 1.06)); c.globalAlpha = clamp(a * 1.4);
  c.shadowColor = "rgba(0,0,0,0.45)"; c.shadowBlur = 40; c.shadowOffsetY = 20; c.fillStyle = "#101113"; rr(c, -w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2, r + pad); c.fill(); c.shadowColor = "transparent";
  c.save(); rr(c, -w / 2, -h / 2, w, h, r); c.clip(); c.drawImage(img, -w / 2, -h / 2, w, h); c.restore(); c.restore();
}
export function chip(c, label, x, y, a, size = 44, rot = 0.04) {
  if (a <= 0.01) return; c.save(); c.translate(x, y); c.rotate(rot); c.scale(clamp(a, 0, 1.08), clamp(a, 0, 1.08)); c.globalAlpha = clamp(a * 1.4);
  c.font = `800 ${size}px 'Barlow Condensed', sans-serif`; const w = c.measureText(label).width + size * 1.1, h = size * 1.5; c.shadowColor = "rgba(0,0,0,0.4)"; c.shadowBlur = 18; c.shadowOffsetY = 8; c.fillStyle = "#F5C400"; rr(c, -w / 2, -h / 2, w, h, h * 0.22); c.fill(); c.shadowColor = "transparent";
  c.fillStyle = "#1a1600"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, 0, size * 0.06); c.restore();
}
// speech-bubble style "pop" word (POW, ZZZ...)
export function pop(c, txt, x, y, a, size = 120, col = "#F5C400", rot = -0.1, ink = "#1a1a1f") {
  if (a <= 0.01) return; c.save(); c.translate(x, y); c.rotate(rot); c.scale(clamp(a, 0, 1.15), clamp(a, 0, 1.15)); c.globalAlpha = clamp(a * 1.5); c.font = `800 ${size}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.lineWidth = size * 0.2; c.strokeStyle = ink; c.strokeText(txt, 0, 0); c.fillStyle = col; c.fillText(txt, 0, 0); c.restore();
}
export function clouds(c, W, H, t, y0, col = "rgba(255,255,255,0.9)") { for (let i = 0; i < 5; i++) { const x = ((i * 380 + t * (14 + i * 4)) % (W + 500)) - 250, y = y0 + (i % 3) * 90; c.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 46], [52, -16, 58], [112, 0, 44], [56, 14, 50]]) { c.beginPath(); c.arc(x + dx, y + dy, r, 0, 7); c.fill(); } } }
export function endCard(c, E, t, u, o = {}) {
  const { W, H, V } = E, bg = o.bg ?? "#151617"; c.fillStyle = bg; c.fillRect(0, 0, W, H);
  const hz = (y, hh) => { c.save(); c.beginPath(); c.rect(0, y, W, hh); c.clip(); c.fillStyle = "#F5C400"; c.fillRect(0, y, W, hh); c.fillStyle = "#151617"; for (let x = -hh * 2 + ((t * 60) % (hh * 2)); x < W + hh; x += hh * 2) { c.beginPath(); c.moveTo(x, y + hh); c.lineTo(x + hh, y + hh); c.lineTo(x + hh * 2, y); c.lineTo(x + hh, y); c.closePath(); c.fill(); } c.restore(); }; hz(0, V ? 44 : 30); hz(H - (V ? 44 : 30), V ? 44 : 30);
  const cy = H * 0.4, ip = easeBack(u / 0.5), sz = (V ? 250 : 200) * ip, icon = o.icon; if (icon) { c.save(); c.shadowColor = "rgba(245,196,0,0.5)"; c.shadowBlur = 90; c.drawImage(icon, W / 2 - sz / 2, cy - (V ? 330 : 270) - sz / 2 + 100, sz, sz); c.restore(); }
  c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillStyle = "#fff"; c.font = `800 ${V ? 210 : 175}px 'Barlow Condensed', sans-serif`; c.fillText("CONSTRA", W / 2, cy + 100);
  const w = easeOut((u - 0.6) / 0.3); c.globalAlpha = w; c.fillStyle = "#F5C400"; c.font = `800 ${V ? 78 : 66}px 'Barlow Condensed', sans-serif`; c.fillText("RUN THE JOB, NOT THE PAPERWORK", W / 2, cy + (V ? 200 : 175)); c.globalAlpha = 1;
  const p = easeBack((u - 1.1) / 0.5); c.save(); c.translate(W / 2, cy + (V ? 350 : 310)); c.scale(clamp(p, 0, 1.1), clamp(p, 0, 1.1)); c.fillStyle = "#F5C400"; rr(c, -340, -60, 680, 120, 60); c.fill(); c.fillStyle = "#1a1600"; c.font = `800 ${V ? 60 : 52}px 'Barlow Condensed', sans-serif`; c.textBaseline = "middle"; c.fillText("FREE WHILE IT'S LAUNCHING", 0, 3); c.restore();
  c.globalAlpha = clamp((u - 1.6) / 0.4); c.textBaseline = "alphabetic"; c.fillStyle = "#cfd0d2"; c.font = `500 ${V ? 48 : 40}px 'IBM Plex Mono', monospace`; c.fillText("getconstra.com", W / 2, cy + (V ? 510 : 450)); c.globalAlpha = 1;
}

// ── sound: a bouncy bed and cartoon effects ────────────────────────────
export function bed(h, E, o = {}) {
  const { note, kick, snare, hat } = h, D = E.DURATION, BPM = o.bpm ?? 108, BEAT = 60 / BPM, BAR = BEAT * 4, prog = o.prog ?? [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]], roots = o.roots ?? [65.4, 55, 43.65, 49], v = o.vol ?? 1;
  for (let b = 0; b * BAR < D - 0.5; b++) { const t0 = b * BAR, ch = prog[b % 4], rt = roots[b % 4];
    for (let q = 0; q < 4; q++) { note(rt * (q % 2 ? 2 : 1), t0 + q * BEAT, BEAT * 0.55, "triangle", 0.2 * v, 600); hat(t0 + q * BEAT + BEAT / 2, 0.025 * v); }
    for (let q = 0; q < 8; q++) if ([0, 3, 4, 6, 7].includes(q)) note(ch[q % 3] * 2, t0 + q * BEAT / 2, 0.13, "square", 0.02 * v, 1900);
    if (o.beat !== false) { kick(t0, 0.1 * v); kick(t0 + BEAT * 2.5, 0.08 * v); snare(t0 + BEAT, 0.03 * v); snare(t0 + BEAT * 3, 0.03 * v); } }
}
export const sfx = {
  trombone: (h, t) => { [[233, 0, 0.32], [220, 0.36, 0.32], [208, 0.72, 0.32], [185, 1.08, 0.9]].forEach(([f, dt, d]) => { const tt = t + dt, { A, comp } = h; const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f, tt); if (dt > 1) o.frequency.linearRampToValueAtTime(f * 0.88, tt + d); const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(700, tt); lp.frequency.linearRampToValueAtTime(1500, tt + d * 0.5); const g = A.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.09, tt + 0.04); g.gain.setValueAtTime(0.09, tt + d - 0.06); g.gain.linearRampToValueAtTime(0.0001, tt + d); o.connect(lp).connect(g).connect(comp); o.start(tt); o.stop(tt + d + 0.05); }); },
  rim: (h, t) => { h.snare(t, 0.1, h.comp); h.kick(t + 0.18, 0.2, h.comp); h.burst(t + 0.34, [9000, 4000], 0.5, 0.5, 0.05, "highpass"); },
  boing: (h, t) => h.tone([180, 520], t, 0.35, 0.14, "triangle"),
  pop: (h, t) => h.tone([500, 1200], t, 0.09, 0.12, "sine"),
  whoosh: (h, t, d = 0.35) => h.burst(t, [300, 4000], 0.7, d, 0.08),
  thump: (h, t) => { h.tone([140, 45], t, 0.25, 0.4, "sine"); h.burst(t, [800, 200], 0.8, 0.2, 0.15); },
  scratch: (h, t) => { const { A, comp } = h; const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.32); const g = A.createGain(); g.gain.setValueAtTime(0.16, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.34); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.4); },
  splat: (h, t) => { h.burst(t, [1800, 300], 0.6, 0.3, 0.2); h.tone([260, 70], t, 0.2, 0.25, "sine"); },
  sparkle: (h, t) => { for (let q = 0; q < 6; q++) h.ding(t + q * 0.07, 784 * Math.pow(1.25, q), 0.07); },
  applause: (h, t, d = 2) => { const { A, comp, noiseBuf } = h; const s = A.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.4; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.28, t + 0.25); for (let k = 0; k < d * 9; k++) g.gain.linearRampToValueAtTime(0.28 * (0.55 + 0.45 * Math.abs(Math.sin(k * 1.7))), t + 0.25 + k / 9); g.gain.linearRampToValueAtTime(0.0001, t + d); s.connect(bp).connect(g).connect(comp); s.start(t); s.stop(t + d + 0.1); },
};
export { STYLES, drawPuppet, drawTalker, track, jitter, qt, blinkAt, clamp, lerp, ease, easeOut, easeBack, loadImg, rnd };

import * as THREE from "three";
import { createAvatar } from "/world.js";
import { createStudio } from "/studio.js";

// "Are you tired of paperwork?" v2: a TV-infomercial parody for Constra. Everyone walks, the TV wall shows the real app, the crew gets a real arc.
const MODE = new URLSearchParams(location.search).get("mode") === "h" ? "h" : "v";
const W = MODE === "v" ? 1080 : 1920, H = MODE === "v" ? 1920 : 1080, FPS = 30, V = MODE === "v";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t = clamp(t), t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t) => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + src)); i.src = src; });

// who / caption text / gap before the line / voice pan
const LINES = [
  { who: "Announcer", text: "Are you tired of paperwork? Buried in it? Drowning in it?", gap: 0.7 },
  { who: "Dev", text: "Help! I can't find the timesheet!", gap: 0.2 },
  { who: "Announcer", text: "Lost hours? Missed invoices? A crew who swears they were at Queen Street?", gap: 0.55 },
  { who: "Jess", text: "I swear, I was at Queen Street!", gap: 0.2 },
  { who: "Mac", text: "Okay. That's enough. There has to be a better way!", gap: 0.45 },
  { who: "Announcer", text: "Introducing... Constra!", gap: 0.6 },
  { who: "Mac", text: "Watch this. Clock in, with a photo and GPS.", gap: 0.9 },
  { who: "Jess", text: "Timesheets? Done. PDF or Excel, with overtime already worked out.", gap: 0.35 },
  { who: "Mac", text: "Schedules, daily tasks, progress at a glance. And an AI assistant that answers anything.", gap: 0.3 },
  { who: "Jess", text: "Twenty-six tools, in one app!", gap: 0.4 },
  { who: "Announcer", text: "But wait... there's more! Twenty-three more tools!", gap: 0.25 },
  { who: "Mac", text: "Now, how much would you pay? Ten thousand dollars? Five thousand?", gap: 0.4 },
  { who: "Announcer", text: "Nope! It's free while it's launching!", gap: 0.45 },
  { who: "Dev", text: "And I'm done by noon!", gap: 0.3 },
  { who: "Mac", text: "Constra. Run the job, not the paperwork!", gap: 0.4 },
];
const N = LINES.length, END_HOLD = 3.4, COL = { Mac: "#F5C400", Jess: "#8fe3a0", Dev: "#ff9e7a", Announcer: "#ff9ee0" };
const PAN = { Announcer: 0, Mac: -0.22, Jess: 0.3, Dev: 0.42 };
const I = { TIRED: 0, HELP: 1, LOST: 2, SWEAR: 3, ENOUGH: 4, INTRO: 5, CLOCK: 6, SHEETS: 7, SCHED: 8, TOOLS: 9, MORE: 10, PRICE: 11, NOPE: 12, NOON: 13, TAG: 14 };

const out = document.getElementById("out"); out.width = W; out.height = H; const ctx = out.getContext("2d");
const glCanvas = document.getElementById("gl"); glCanvas.width = W; glCanvas.height = H;
const scr = document.createElement("canvas"); scr.width = 1280; scr.height = 720; const sg = scr.getContext("2d");
let WIDE = false, renderer, studio, camera, av = {}, icon, bufs = [], words = [], gains = [], VO_AT = [], VO_END = [], DURATION = 0, END_AT = 0, BURST = 0, ST = null;

window.prepare = async () => {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  studio = createStudio(scr); camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 300); window.__cam = camera;
  av.Mac = createAvatar({ name: "Mac", skin: "#e8b98a", shirt: "#fff", vest: "#fff", pants: "#1f2a44", suit: "#1f2a44|#d62b21", noHat: true, hairTop: true, stache: true, brows: true, hairColor: "#3a2519", hat: "#fff" });
  av.Jess = createAvatar({ name: "Jess", skin: "#f3c9a5", shirt: "#fff", vest: "#fff", pants: "#2b2f3a", suit: "#c2336b|#F5C400", noHat: true, hairTop: true, ponytail: true, lashes: true, hairColor: "#7a3b1d", hat: "#fff" });
  av.Dev = createAvatar({ name: "Dev", skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", beard: true, brows: true, glove: "#2a2a2d", hairColor: "#1d1410" });
  for (const a of Object.values(av)) studio.scene.add(a.root);
  icon = await loadImg("/icon.png");
  const dec = new OfflineAudioContext(1, 48000, 48000); let t = 0;
  for (let i = 0; i < N; i++) {
    const n = String(i + 1).padStart(2, "0");
    const b = await dec.decodeAudioData(await (await fetch(`/vo/vo-${n}.mp3`)).arrayBuffer()); bufs.push(b); words.push(await (await fetch(`/vo/vo-${n}.json`)).json());
    // loudness match: every line to the same RMS so nobody jumps out
    const d = b.getChannelData(0); let s = 0, c = 0; for (let k = 0; k < d.length; k++) if (Math.abs(d[k]) > 0.01) { s += d[k] * d[k]; c++; } const rms = Math.sqrt(s / Math.max(1, c)); gains.push(clamp(0.115 / Math.max(rms, 0.01), 0.55, 2.4));
    t += LINES[i].gap; VO_AT.push(t); const lw = words[i][words[i].length - 1], sp = lw ? lw.t + lw.d : b.duration, dur = Math.min(b.duration, sp + 0.4); VO_END.push(t + dur); t += dur;
  }
  END_AT = t; DURATION = t + END_HOLD; BURST = W_(I.INTRO, /konstra/i, 0.7) - 0.05;
  return { duration: +DURATION.toFixed(2), lines: VO_AT.map((a, i) => [+a.toFixed(2), +VO_END[i].toFixed(2)]), burst: +BURST.toFixed(2), gains: gains.map((g) => +g.toFixed(2)), W, H };
};
const L = (i) => VO_AT[i], LE = (i) => VO_END[i];
function W_(i, re, fb = 0) { const ws = words[i]; const k = ws.findIndex((w) => re.test(w.w)); return VO_AT[i] + (k >= 0 ? ws[k].t : (ws[ws.length - 1].t + ws[ws.length - 1].d) * fb); }
const lineAt = (t) => { for (let i = 0; i < N; i++) if (t >= L(i) - 0.05 && t < LE(i) + 0.05) return i; return -1; };
function mouthFor(who, t) { const i = lineAt(t); if (i < 0 || LINES[i].who !== who) return null; const ws = words[i], rel = t - L(i); for (let k = 0; k < ws.length; k++) if (rel >= ws[k].t - 0.02 && rel < ws[k].t + ws[k].d + 0.05) return ["talk1", "talk2", "talk3", "talk2", "talk1", "talk3"][Math.floor((rel - ws[k].t) * 11 + k * 2) % 6]; return "smile"; }
const talkAmt = (who, t) => { const i = lineAt(t); return i >= 0 && LINES[i].who === who ? ease((t - L(i) + 0.1) / 0.25) * (1 - ease((t - LE(i)) / 0.2)) : 0; };
const blinkOf = (t, s) => ((t + s) % 3.4 < 0.13 ? "blink" : null);
const gest = (t, s, g) => ({ armL: [(-0.3 - 0.5 * (0.5 + 0.5 * Math.sin(t * 2.3 + s))) * g, -0.25 * g], armR: [(-0.35 - 0.6 * (0.5 + 0.5 * Math.sin(t * 2.9 + s + 1))) * g, 0.3 * g * (0.5 + 0.5 * Math.sin(t * 2 + s))] });
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const lerpAng = (a, b, k) => a + angDiff(a, b) * clamp(k);

// a walker: keys are [time, x, z, facing]. Between keys they walk (turning to face where they go), then turn to the key's facing.
function walker(t, keys, speed = 2.2) {
  let dist = 0;
  if (t <= keys[0][0]) return { x: keys[0][1], z: keys[0][2], ry: keys[0][3], amt: 0, ph: 0, moving: false };
  for (let i = 1; i < keys.length; i++) {
    const [t0, x0, z0, f0] = keys[i - 1], [t1, x1, z1, f1] = keys[i], len = Math.hypot(x1 - x0, z1 - z0), moving = len > 0.5;
    if (t <= t1) {
      const u = clamp((t - t0) / Math.max(0.001, t1 - t0)), e = moving ? ease(u) : 0, hd = Math.atan2(x1 - x0, z1 - z0);
      const ry = moving ? lerpAng(lerpAng(f0, hd, u / 0.14), f1, (u - 0.86) / 0.14) : lerpAng(f0, f1, ease(u));
      return { x: lerp(x0, x1, e), z: lerp(z0, z1, e), ry, amt: moving ? 0.95 * clamp(Math.sin(Math.PI * u) * 4, 0, 1) : 0, ph: (dist + e * len) * speed, moving };
    }
    dist += len;
  }
  const k = keys[keys.length - 1]; return { x: k[1], z: k[2], ry: k[3], amt: 0, ph: dist * speed, moving: false };
}
const PILE = [-8, 5];
const STAND = { mac: [0.6, 7.4], jess: [5.4, 6.8], dev: [9.4, 7.2] };
// every walk, so the sound mix can add footsteps
function keysFor(who) {
  if (who === "Dev") return [[0, -11, 17, 0.9], [1.7, -8.4, 5.9, 0.3], [BURST + 1.4, -8.4, 5.9, 0.3], [BURST + 4.8, STAND.dev[0], STAND.dev[1], -0.3]];
  if (who === "Mac") return [[0, 4.4, 7.0, -1.75], [L(I.ENOUGH) - 0.35, 4.4, 7.0, -1.75], [L(I.ENOUGH) + 0.55, STAND.mac[0], STAND.mac[1], 0.08], [L(I.CLOCK) + 0.1, STAND.mac[0], STAND.mac[1], 0.08], [L(I.CLOCK) + 1.5, -3.4, 3.4, 0.5], [LE(I.SCHED) + 0.1, -3.4, 3.4, 0.5], [L(I.PRICE) - 0.15, STAND.mac[0], STAND.mac[1], 0.08]];
  if (who === "Jess") return [[0, 14, 19, -2.6], [L(I.LOST) + 1.0, 14, 19, -2.6], [L(I.SWEAR) - 0.05, STAND.jess[0], STAND.jess[1], -0.12], [L(I.SHEETS) - 0.35, STAND.jess[0], STAND.jess[1], -0.12], [L(I.SHEETS) + 0.8, 4.2, 3.7, -0.4], [LE(I.SHEETS) + 0.25, 4.2, 3.7, -0.4], [L(I.TOOLS) - 0.2, STAND.jess[0], STAND.jess[1], -0.12]];
}
function acting(t) {
  const mood = ease((t - BURST) / 0.4), g = (who, s, k = 1) => gest(t, s, (0.15 + 0.85 * talkAmt(who, t)) * k);
  const wm = walker(t, keysFor("Mac")), wj = walker(t, keysFor("Jess")), wd = walker(t, keysFor("Dev"), 2.6);
  // Mac
  const gm = g("Mac", 0.4, 1.1), m = { x: wm.x, z: wm.z, ry: wm.ry, ph: wm.ph, amt: wm.amt, armL: gm.armL, armR: gm.armR, hy: 0.04 * Math.sin(t * 0.8) };
  if (t < L(I.ENOUGH) - 0.3) { const k = 0.5 + 0.5 * Math.sin(t * 5); m.armR = [-2.5 - 0.15 * k, 0.5]; m.armL = [-0.2, -0.2]; m.hp = 0.3; m.hr = 0.08; } // facepalm at the carnage
  const pr = ease((t - L(I.INTRO) + 0.1) / 0.3) * (1 - ease((t - LE(I.INTRO) - 0.4) / 0.3)); if (pr > 0) { m.armR = [-1.3 * pr, 1.0 * pr]; m.armL = [-0.4, -0.15]; }
  const tvPoint = ease((t - L(I.CLOCK) - 1.5) / 0.4) * (1 - ease((t - LE(I.SCHED)) / 0.3)); if (tvPoint > 0.01) { const sw = 0.12 * Math.sin(t * 1.6); m.armR = [lerp(m.armR[0], -2.7 + sw, tvPoint), lerp(m.armR[1], 0.5, tvPoint)]; }
  const phone = t > L(I.CLOCK) - 0.1 && t < L(I.CLOCK) + 1.5; if (phone) { m.armR = [-1.6, 0.25]; m.armL = [-0.3, -0.2]; }
  const sh = ease((t - L(I.PRICE)) / 0.3) * (1 - ease((t - LE(I.PRICE)) / 0.3)); if (sh > 0) { m.armL = [-0.3 * sh, -0.9 * sh]; m.armR = [-0.3 * sh, 0.9 * sh]; m.hr = 0.14 * sh; }
  // Jess
  const gj = g("Jess", 1.9, 1.1), j = { x: wj.x, z: wj.z, ry: wj.ry, ph: wj.ph, amt: wj.amt, armL: gj.armL, armR: gj.armR };
  if (t < L(I.SWEAR) - 0.05) j.y = -40;
  const shrug = ease((t - L(I.SWEAR) - 0.2) / 0.2) * (1 - ease((t - LE(I.SWEAR) - 0.1) / 0.3)); if (shrug > 0) { j.armL = [-0.5 * shrug, -1.2 * shrug]; j.armR = [-0.5 * shrug, 1.2 * shrug]; j.hr = 0.18 * shrug; j.sway = 0.05 * shrug; }
  const clip = t > L(I.SHEETS) - 0.3 && t < LE(I.SHEETS) + 0.6; if (clip) { j.armL = [-1.0, 0.15]; j.armR = [-0.4 - 0.5 * talkAmt("Jess", t) * (0.5 + 0.5 * Math.sin(t * 3)), 0.35]; }
  const pj = ease((t - L(I.TOOLS)) / 0.25) * (1 - ease((t - LE(I.TOOLS) - 0.4) / 0.3)); if (pj > 0) { j.armL = [-1.0 * pj, -0.9 * pj]; j.armR = [-1.0 * pj, 0.9 * pj]; j.hop = 0.14 * Math.abs(Math.sin(t * 8)) * pj; }
  // everyone cheers on FREE
  const ch = ease((t - L(I.NOPE) - 0.3) / 0.3) * (t < LE(I.NOPE) + 1.3 ? 1 : 0); if (ch > 0) { m.armL = [-3 * ch, -0.4]; m.armR = [-3 * ch, 0.4]; j.armL = [-3 * ch, -0.4]; j.armR = [-3 * ch, 0.4]; m.hop = Math.abs(Math.sin(t * 7)) * 0.7 * ch; j.hop = Math.abs(Math.sin(t * 7 + 1)) * 0.7 * ch; }
  // Dev: runs in loaded with paper, trips, drowns, is rescued by the reveal, strolls over and starts dancing
  const gd = g("Dev", 3.1, 1), d = { x: wd.x, z: wd.z, ry: wd.ry, ph: wd.ph, amt: wd.amt, armL: gd.armL, armR: gd.armR };
  if (t < 1.7) { d.armL = [-1.5, 0.12]; d.armR = [-1.5, -0.12]; d.lean = 0.12; }
  else if (t < 2.1) { const k = (t - 1.7) / 0.4; d.lean = 0.12 + 0.9 * k; d.hop = 0.5 * Math.sin(k * 3.1); d.armL = [-2.6, -0.5]; d.armR = [-2.6, 0.5]; }
  else if (t < BURST + 0.1) { d.armL = [-2.7 + 0.5 * Math.sin(t * 9), -0.45]; d.armR = [-2.7 + 0.5 * Math.sin(t * 9 + 1.4), 0.45]; d.hy = 0.25 * Math.sin(t * 5); d.hr = 0.12 * Math.sin(t * 7); }
  else if (t < BURST + 1.5) { const k = ease((t - BURST) / 0.3); d.armL = [-3 * k, -0.4]; d.armR = [-3 * k, 0.4]; d.hop = Math.abs(Math.sin(t * 8)) * 0.8 * k; }
  else if (t > BURST + 4.8 && t < L(I.NOON) - 0.2) { d.hop = 0.18 * Math.abs(Math.sin(t * 4.2)); d.sway = 0.09 * Math.sin(t * 4.2); d.armL = [-1.2 - 0.6 * Math.sin(t * 4.2), -0.5]; d.armR = [-1.2 + 0.6 * Math.sin(t * 4.2), 0.5]; }
  else if (t >= L(I.NOON) - 0.2 && t < LE(I.NOON) + 0.9) { d.armL = [-3, -0.5]; d.armR = [-0.6, 0.5]; d.hop = Math.abs(Math.sin(t * 8)) * 0.5; }
  else if (t >= LE(I.NOON) + 0.9) { d.hop = 0.12 * Math.abs(Math.sin(t * 4.2)); d.sway = 0.06 * Math.sin(t * 4.2); }
  const face = (who, base) => mouthFor(who, t) || blinkOf(t, who.length * 1.3) || base;
  const f = { Mac: face("Mac", t < L(I.ENOUGH) - 0.3 ? "oops" : "smile"), Jess: face("Jess", mood > 0.5 ? "cheer" : "smile"), Dev: face("Dev", t < BURST + 0.1 && t > 1.6 ? "oops" : "cheer") };
  const props = { macPhone: phone, jessClip: clip };
  return { Mac: m, Jess: j, Dev: d, face: f, mood, props };
}

// ── camera ─────────────────────────────────────────────────────────────────────────────────────
const SHOTS = [
  { follow: "Dev", dy: 3.4, az: [14, 5], el: [9, 5], d: [24, 13], vv: 1.25 },
  { look: [[PILE[0], 4.3, 5]], az: [18, 12], el: [4, 4], d: [8.5, 6.8] },
  { look: [[-3, 4, 6], [2.5, 4, 7]], az: [8, 4], el: [5, 5], d: [21, 17], vv: 1.5 },
  { follow: "Jess", dy: 4.1, az: [-18, -8], el: [3, 3], d: [11, 8.5], lyV: 1.2 },
  { follow: "Mac", dy: 4.1, az: [24, 8], el: [3, 3], d: [12, 8.6], lyV: 1.5 },
  { look: [[0, 5.5, 6]], az: [0, 0], el: [5, 3], d: [30, 22], vv: 1.55 },
  { look: [[0, 6.3, 4], [-0.5, 6.3, 4]], az: [14, 4], el: [6, 5], d: [27, 24], vv: 1.55 },
  { look: [[0, 6.3, 4], [0.5, 6.3, 4]], az: [-12, -2], el: [6, 5], d: [27, 24], vv: 1.55 },
  { look: [[-0.5, 6.3, 4], [0, 6.3, 4]], az: [10, -6], el: [6, 5], d: [25, 27], vv: 1.55 },
  { follow: "Jess", dy: 4.1, az: [-14, -6], el: [3, 3], d: [10.5, 8.2], lyV: 1.3 },
  { look: [[4.2, 4.5, 7]], az: [0, 0], el: [5, 3], d: [19, 25], vv: 2.0 },
  { follow: "Mac", dy: 4.1, az: [16, 8], el: [3, 3], d: [10, 8], lyV: 1.5 },
  { look: [[4.2, 4.5, 7]], az: [0, 0], el: [5, 3], d: [19, 25], vv: 2.0 },
  { follow: "Dev", dy: 4.1, az: [-22, -12], el: [3, 3], d: [10, 7.8], lyV: 1.4 },
  { look: [[2.6, 5.6, 6]], az: [0, 0], el: [4, 5], d: [20, 30], vv: 1.8 },
];
const cutAt = (i) => (i === 0 ? 0 : L(i) - 0.25);
function placeCamera(t) {
  let i = 0; for (let k = 0; k < N; k++) if (t >= cutAt(k)) i = k;
  const s = SHOTS[i], a = cutAt(i), b = i + 1 < N ? cutAt(i + 1) : DURATION, u = ease((t - a) / (b - a));
  let lk0; if (s.follow) { const p = ST[s.follow]; lk0 = [p.x * 0.85 + (s.follow === "Dev" && t < 2 ? 0 : 0), s.dy, p.z]; if (s.follow !== "Dev" || t > 2) lk0[0] = p.x; } else lk0 = s.look.length > 1 ? s.look[0].map((v, k) => lerp(v, s.look[1][k], u)) : s.look[0];
  const lk = V && s.lyV ? [lk0[0], lk0[1] + s.lyV, lk0[2]] : lk0;
  const az = lerp(s.az[0], s.az[1], u) * Math.PI / 180, el = lerp(s.el[0], s.el[1], u) * Math.PI / 180, d = lerp(s.d[0], s.d[1], u) * (V ? (s.vv ?? 1.55) : 1);
  const hx = 0.035 * Math.sin(t * 1.7), hy = 0.03 * Math.sin(t * 1.3 + 1);
  camera.position.set(hx + lk[0] + d * Math.sin(az) * Math.cos(el), hy + lk[1] + d * Math.sin(el) + (V ? 0.4 : 0), lk[2] + d * Math.cos(az) * Math.cos(el));
  camera.lookAt(lk[0], lk[1] + (V ? 0.5 : 0), lk[2]); camera.updateProjectionMatrix(); WIDE = lerp(s.d[0], s.d[1], u) > 16; return i;
}

// ── the TV wall: first an error screen, then the real app ──────────────────────────────────────
const P = { dark: "#0a0a0a", raised: "#111111", raised2: "#1a1a1a", line: "rgba(255,255,255,.1)", text: "#ECEAE5", dim: "#9A9C9F", hv: "#F5C400", go: "#2EAA62", info: "#0ea5e9" };
const rrg = (g, x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
const tx = (g, s, x, y, size, col, weight = 700, align = "left", font = "Segoe UI, Arial") => { g.font = `${weight} ${size}px ${font}`; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); };
function phoneShell(g, x, y, w, h, body) { rrg(g, x - 10, y - 10, w + 20, h + 20, 46, "#050505", "#3a3d44"); g.save(); g.beginPath(); g.roundRect(x, y, w, h, 38); g.clip(); g.fillStyle = P.dark; g.fillRect(x, y, w, h); body(g, x, y, w, h); g.restore(); }
function bigTitle(g, a, b, col, s1, s2, t0) { const k = easeBack((t0) / 0.35); g.save(); g.globalAlpha = clamp(k * 1.6); g.translate(0, (1 - clamp(k)) * 24); tx(g, a, 70, 250, 130, col, 900, "left", "Impact, Arial Black"); tx(g, b, 70, 340, 130, "#fff", 900, "left", "Impact, Arial Black"); tx(g, s1, 74, 430, 44, "#e8ecff", 700); tx(g, s2, 74, 488, 44, "#e8ecff", 700); g.restore(); }
function drawClockIn(g, t) {
  const t0 = t - L(I.CLOCK); g.fillStyle = "#0b1030"; g.fillRect(0, 0, 1280, 720); const gr = g.createRadialGradient(900, 360, 20, 900, 360, 700); gr.addColorStop(0, "rgba(255,200,40,.2)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
  bigTitle(g, "CLOCK", "IN.", P.hv, "One tap, from any phone.", "Photo and GPS on every punch.", t0);
  const pressed = t0 > 1.9, pk = clamp((t0 - 1.9) / 0.35); const px = 780 + (1 - easeOut(t0 / 0.5)) * 300;
  g.save(); g.globalAlpha = clamp(t0 / 0.25); phoneShell(g, px, 36, 360, 650, (g2, x, y, w, h) => {
    rrg(g2, x, y, w, 70, 0, P.raised); g2.drawImage(icon, x + 18, y + 16, 38, 38); tx(g2, "CONSTRA", x + 66, y + 46, 30, "#fff", 900, "left", "Impact, Arial Black");
    tx(g2, "Queen Street Framing", x + 24, y + 112, 26, P.text, 800); tx(g2, "Today, 7:02 AM", x + 24, y + 144, 20, P.dim, 600);
    // the selfie
    rrg(g2, x + 100, y + 170, 160, 160, 28, "#e8b98a"); g2.fillStyle = "#3a2519"; g2.fillRect(x + 100, y + 170, 160, 34); g2.fillStyle = "#151617"; g2.fillRect(x + 138, y + 238, 20, 28); g2.fillRect(x + 202, y + 238, 20, 28); g2.strokeStyle = "#151617"; g2.lineWidth = 7; g2.lineCap = "round"; g2.beginPath(); g2.arc(x + 180, y + 270, 30, 0.2, Math.PI - 0.2); g2.stroke();
    rrg(g2, x + 100, y + 170, 160, 160, 28, null, pressed ? P.go : P.hv); tx(g2, "PHOTO", x + 180, y + 360, 18, P.dim, 800, "center");
    rrg(g2, x + 24, y + 384, w - 48, 58, 29, pressed ? "rgba(46,170,98,.16)" : "rgba(255,255,255,.07)", pressed ? P.go : P.line); g2.fillStyle = pressed ? P.go : P.hv; g2.beginPath(); g2.arc(x + 58, y + 413, 9, 0, 7); g2.fill(); tx(g2, pressed ? "On site, 18 m from the job" : "Finding your location...", x + 78, y + 421, 20, P.text, 700);
    const pulse = pressed ? 1 : 1 + 0.03 * Math.sin(t * 7); g2.save(); g2.translate(x + w / 2, y + 520); g2.scale(pulse - 0.04 * Math.sin(pk * 3.14), pulse - 0.04 * Math.sin(pk * 3.14)); rrg(g2, -w / 2 + 24, -42, w - 48, 84, 42, pressed ? P.go : P.hv); tx(g2, pressed ? "CLOCKED IN  7:02" : "CLOCK IN", 0, 14, 34, pressed ? "#fff" : "#1A1600", 900, "center"); g2.restore();
    if (pressed) { g2.strokeStyle = "#fff"; g2.lineWidth = 9; g2.lineCap = "round"; g2.lineJoin = "round"; g2.beginPath(); g2.moveTo(x + w - 86, y + 148); g2.lineTo(x + w - 66, y + 168); g2.lineTo(x + w - 32, y + 124); g2.stroke(); }
  }); g.restore();
}
function drawSheets(g, t) {
  const t0 = t - L(I.SHEETS); g.fillStyle = "#0b1030"; g.fillRect(0, 0, 1280, 720); const gr = g.createRadialGradient(640, 360, 20, 640, 360, 800); gr.addColorStop(0, "rgba(67,217,255,.16)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
  const k = easeBack(t0 / 0.35); g.save(); g.globalAlpha = clamp(k * 1.6); tx(g, "TIMESHEETS", 70, 120, 100, "#43d9ff", 900, "left", "Impact, Arial Black"); tx(g, "overtime worked out. Logo on top.", 74, 176, 38, "#e8ecff", 700); g.restore();
  const x = 70, y = 220, w = 1140; rrg(g, x, y, w, 420, 24, P.raised, P.line); const cols = ["Worker", "Mon", "Tue", "Wed", "Thu", "Fri", "Total", "Overtime"], cx = [x + 36, x + 420, x + 520, x + 620, x + 720, x + 820, x + 930, x + 1040];
  cols.forEach((c, i) => tx(g, c, cx[i], y + 52, 24, P.dim, 800, i === 0 ? "left" : "center"));
  g.fillStyle = P.line; g.fillRect(x + 20, y + 72, w - 40, 2);
  const rows = [["Mac", [8, 8, 8, 8, 8], "40", "0"], ["Jess", [8, 8, 8, 9, 5.5], "38.5", "0"], ["Dev", [8, 8, 9, 8, 8], "41", "1"]];
  rows.forEach((r, i) => { const a = easeOut((t0 - 0.35 - i * 0.22) / 0.35); if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate((1 - a) * 60, 0); const yy = y + 130 + i * 96; rrg(g, x + 16, yy - 52, w - 32, 80, 14, i % 2 ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.06)"); tx(g, r[0], cx[0], yy, 38, P.text, 800); r[1].forEach((h, c) => tx(g, String(h), cx[c + 1], yy, 34, P.text, 600, "center")); tx(g, r[2], cx[6], yy, 38, P.hv, 900, "center"); tx(g, r[3] === "0" ? "-" : r[3] + " h", cx[7], yy, 34, r[3] === "0" ? P.dim : "#ff9e7a", 800, "center"); g.restore(); });
  const bt = (s, bx, on) => { const sc = on ? 1 + 0.06 * Math.sin((t - L(I.SHEETS)) * 10) : 1; g.save(); g.translate(bx, y + 372); g.scale(sc, sc); rrg(g, -80, -26, 160, 52, 26, on ? P.hv : "rgba(255,255,255,.1)"); tx(g, s, 0, 11, 28, on ? "#1A1600" : P.text, 900, "center"); g.restore(); };
  bt("PDF", x + w - 340, t > W_(I.SHEETS, /pdf/i, 0.5) - 0.1 && t < W_(I.SHEETS, /excel/i, 0.7) - 0.05); bt("Excel", x + w - 160, t > W_(I.SHEETS, /excel/i, 0.7) - 0.05);
}
function drawSched(g, t) {
  const t0 = t - L(I.SCHED); g.fillStyle = "#0b1030"; g.fillRect(0, 0, 1280, 720); const gr = g.createRadialGradient(640, 360, 20, 640, 360, 800); gr.addColorStop(0, "rgba(143,227,160,.15)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
  const k = easeBack(t0 / 0.35); g.save(); g.globalAlpha = clamp(k * 1.6); tx(g, "SCHEDULE", 60, 110, 90, "#8fe3a0", 900, "left", "Impact, Arial Black"); tx(g, "+ DAILY TASKS", 60 + 400, 110, 90, "#fff", 900, "left", "Impact, Arial Black"); g.restore();
  // crew plan
  const x = 60, y = 150; rrg(g, x, y, 600, 330, 22, P.raised, P.line); ["M", "T", "W", "T", "F"].forEach((d, i) => tx(g, d, x + 200 + i * 78, y + 44, 24, P.dim, 800, "center"));
  [["Mac", "#F5C400", [0, 0, 5]], ["Jess", "#8fe3a0", [0, 1, 4]], ["Dev", "#ff9e7a", [1, 2, 5]]].forEach(([n, c, [a, , b]], i) => { const yy = y + 100 + i * 80; tx(g, n, x + 30, yy + 10, 30, P.text, 800); const gk = easeOut((t0 - 0.4 - i * 0.2) / 0.5); rrg(g, x + 160 + a * 78, yy - 24, (b - a) * 78 * gk - 8 + 8, 48, 24, c); if (gk > 0.5) tx(g, i === 0 ? "Framing" : i === 1 ? "Windows" : "Roof", x + 170 + a * 78, yy + 8, 22, "#151617", 800); });
  // daily tasks + progress
  const tx0 = 700; rrg(g, tx0, y, 520, 330, 22, P.raised, P.line); tx(g, "Today", tx0 + 28, y + 52, 28, P.text, 900);
  [["Frame level 2", 0.8, P.hv], ["Install windows", 0.45, P.info], ["Inspection prep", 0.2, "#ff9e7a"]].forEach(([n, v, c], i) => { const yy = y + 110 + i * 70, gk = easeOut((t0 - 0.6 - i * 0.2) / 0.7); tx(g, n, tx0 + 28, yy, 24, P.text, 700); tx(g, Math.round(v * 100 * gk) + "%", tx0 + 492, yy, 24, P.dim, 800, "right"); rrg(g, tx0 + 28, yy + 14, 464, 14, 7, "rgba(255,255,255,.1)"); rrg(g, tx0 + 28, yy + 14, Math.max(14, 464 * v * gk), 14, 7, c); });
  // the AI assistant
  const ta = W_(I.SCHED, /assistant/i, 0.8) - 0.15, a1 = easeBack((t - ta) / 0.3); if (a1 > 0) { g.save(); g.globalAlpha = clamp(a1 * 1.5); g.translate(0, (1 - clamp(a1)) * 20); rrg(g, 60, 500, 1160, 200, 24, P.raised2, P.hv); g.fillStyle = P.hv; g.beginPath(); g.arc(112, 548, 26, 0, 7); g.fill(); tx(g, "AI", 112, 558, 24, "#1A1600", 900, "center");
    rrg(g, 160, 520, 520, 56, 28, "rgba(255,255,255,.12)"); tx(g, "How many hours did Jess work?", 184, 557, 27, P.text, 700);
    const ans = "Jess worked 38.5 hours this week.", n = Math.floor(clamp((t - ta - 0.7) / 1.2) * ans.length); if (n > 0) { rrg(g, 160, 600, 640, 62, 31, P.hv); tx(g, ans.slice(0, n), 186, 641, 28, "#1A1600", 800); } g.restore(); }
}
function drawTV(t) {
  const g = sg; g.clearRect(0, 0, 1280, 720); g.textAlign = "center"; g.textBaseline = "alphabetic";
  const big = (s, y, size, col) => { g.font = `900 ${size}px Impact, Arial Black`; g.fillStyle = col; g.textAlign = "center"; g.fillText(s, 640, y); };
  if (t < BURST) { g.fillStyle = "#1a0b0b"; g.fillRect(0, 0, 1280, 720); for (let i = 0; i < 14; i++) { const y = ((i * 97 + Math.floor(t * 12) * 53) % 720); g.fillStyle = `rgba(255,${40 + (i * 20) % 80},60,.18)`; g.fillRect(0, y, 1280, 8 + (i % 3) * 6); } big("ERROR 404", 250, 190, "#ff4d4d"); big("TIMESHEET NOT FOUND", 440, 90, "#ffd0d0"); g.font = "700 44px Courier New"; g.fillStyle = "#ff9a9a"; g.textAlign = "center"; g.fillText("ctrl+f 'where did I put it' ...", 640, 560); if (Math.floor(t * 3) % 2) { g.fillStyle = "#ff4d4d"; g.fillRect(900, 540, 20, 44); } return; }
  g.fillStyle = "#0b1030"; g.fillRect(0, 0, 1280, 720); const gr = g.createRadialGradient(640, 360, 20, 640, 360, 700); gr.addColorStop(0, "rgba(255,200,40,.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
  const logo = (y, s) => { g.drawImage(icon, 640 - 330 * s, y - 70 * s, 140 * s, 140 * s); g.textAlign = "left"; g.font = `900 ${150 * s}px Impact, Arial Black`; g.fillStyle = "#fff"; g.fillText("CONSTRA", 640 - 170 * s, y + 44 * s); g.textAlign = "center"; };
  if (t < L(I.CLOCK) - 0.1) { logo(300, 1); g.font = "800 70px Segoe UI, Arial"; g.fillStyle = "#F5C400"; g.textAlign = "center"; g.fillText("Run the job, not the paperwork.", 640, 500); return; }
  if (t < L(I.SHEETS) - 0.1) return drawClockIn(g, t);
  if (t < L(I.SCHED) - 0.1) return drawSheets(g, t);
  if (t < L(I.TOOLS) - 0.1) return drawSched(g, t);
  if (t < LE(I.MORE) + 0.3) { if (t < L(I.MORE)) { big("26", 280, 300, "#F5C400"); big("TOOLS IN ONE APP", 500, 80, "#fff"); } else { big("+ 23", 270, 270, "#46c768"); big("MORE TOOLS", 490, 100, "#fff"); } return; }
  if (t < L(I.NOPE)) { big("$ ? ? ?", 340, 260, "#ffd400"); return; }
  if (t < L(I.NOON) - 0.1) { big("FREE", 310, 330, "#F5C400"); g.font = "800 72px Segoe UI, Arial"; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText("while we launch", 640, 540); return; }
  logo(250, 1.1); big("RUN THE JOB,", 470, 100, "#fff"); big("NOT THE PAPERWORK.", 580, 100, "#F5C400");
}

// ── overlays ───────────────────────────────────────────────────────────────────────────────────
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const UI = `"Segoe UI", Arial, sans-serif`, DISP = `Impact, "Arial Black", Arial`;
const pop = (cx, cy, k, fn) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.globalAlpha = clamp(k * 1.6); fn(); ctx.restore(); };
const sticker = (s, bg, fg, rot, size = 54) => { ctx.font = `900 ${size}px ${DISP}`; const w = ctx.measureText(s).width + 60; ctx.save(); ctx.rotate(rot); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.fillStyle = bg; rr(-w / 2, -size * 0.7, w, size * 1.4, 18); ctx.fill(); ctx.shadowColor = "transparent"; ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, 0, 4); ctx.restore(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; };
const CHIPS = [[I.CLOCK, /^clock/i, "Photo + GPS clock-in", "#F5C400", "#151617", 0], [I.SHEETS, /^timesheets/i, "PDF + Excel timesheets", "#fff", "#151617", 0], [I.SCHED, /^schedules/i, "Schedules + daily tasks", "#fff", "#151617", 0], [I.SCHED, /assistant/i, "AI assistant", "#151617", "#F5C400", 1]];
function drawOverlays(t) {
  const cx = V ? W / 2 : W * 0.84, top = V ? H * 0.1 : H * 0.2;
  [["LOST HOURS", /lost/i, "#e0342a", -0.06], ["MISSED INVOICES", /missed/i, "#e0342a", 0.05], ["\"I WAS AT QUEEN STREET\"", /swears/i, "#151617", -0.04]].forEach(([s, re, bg, rot], i) => { const at = W_(I.LOST, re, 0.3), k = easeBack((t - at + 0.05) / 0.3) * (1 - ease((t - (LE(I.LOST) + 0.5)) / 0.3)); if (k > 0.01) pop(cx, top + i * (V ? 110 : 108), k, () => sticker(s, bg, "#fff", rot, V ? 50 : 46)); });
  CHIPS.forEach(([li, re, s, bg, fg, slot]) => { const k = easeBack((t - W_(li, re, 0.5) + 0.05) / 0.3) * (1 - ease((t - (LE(li) + 0.3)) / 0.3)); if (k > 0.01) pop(cx, top + slot * 96, k, () => { ctx.font = `800 40px ${UI}`; const w = ctx.measureText(s).width + 70; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; ctx.fillStyle = bg; rr(-w / 2, -32, w, 64, 32); ctx.fill(); ctx.shadowColor = "transparent"; ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, 0, 2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }); });
  { const t0 = W_(I.TOOLS, /twenty/i), fin = 1 - ease((t - (LE(I.TOOLS) + 0.5)) / 0.3), k = easeBack((t - t0 + 0.1) / 0.35) * fin; if (k > 0.01) { const n = Math.round(26 * easeOut((t - t0) / 0.9)); pop(cx, top + 70, k, () => { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "#fff"; rr(-260, -95, 520, 190, 26); ctx.fill(); ctx.restore(); ctx.fillStyle = "#F5C400"; ctx.fillRect(-260, -95, 520, 14); ctx.fillStyle = "#151617"; ctx.font = `900 150px ${DISP}`; ctx.textAlign = "right"; ctx.fillText(String(n), -10, 54); ctx.textAlign = "left"; ctx.font = `900 52px ${DISP}`; ctx.fillText("TOOLS", 8, 8); ctx.font = `700 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText("in one app", 8, 52); }); } }
  { const t0 = W_(I.MORE, /twenty/i), k = easeBack((t - t0 + 0.05) / 0.35) * (1 - ease((t - (LE(I.MORE) + 0.5)) / 0.3)); if (k > 0.01) pop(cx, top + 80, k, () => sticker("+ 23 MORE TOOLS", "#46c768", "#fff", -0.05, V ? 74 : 66)); }
  [["$10,000?", /^ten$/i, 0.07, 0], ["$5,000?", /^five$/i, -0.06, 1]].forEach(([s, re, rot, i]) => { const at = W_(I.PRICE, re, 0.6), k = easeBack((t - at + 0.05) / 0.3) * (1 - ease((t - (L(I.NOPE) + 0.2)) / 0.2)); if (k > 0.01) pop(cx, top + 40 + i * 150, k, () => sticker(s, "#F5C400", "#151617", rot, V ? 96 : 86)); });
  { const at = W_(I.NOPE, /free/i, 0.4) - 0.05, k = (t - at) / 0.22, fade = 1 - ease((t - (LE(I.NOPE) + 1.2)) / 0.4); if (k > 0 && fade > 0) { const sc = lerp(2.4, 1, easeOut(k)); ctx.save(); ctx.globalAlpha = clamp(k * 3) * fade; ctx.translate(V ? W / 2 : W * 0.78, V ? H * 0.2 : H * 0.33); ctx.scale(sc, sc);
      ctx.fillStyle = "#e0342a"; ctx.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283 + t * 0.6, r = i % 2 ? 250 : 330; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#F5C400"; ctx.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283 + t * 0.6, r = i % 2 ? 215 : 285; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.6); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#151617"; ctx.font = `900 190px ${DISP}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("FREE", 0, -10); ctx.font = `800 40px ${UI}`; ctx.fillText("while we launch", 0, 90); ctx.restore(); } }
}
function wrap(text, maxW) { const ws = text.split(" "), lines = []; let cur = ""; for (const w of ws) { const t2 = cur ? cur + " " + w : w; if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); return lines; }
function drawCaption(t) {
  const i = lineAt(t); if (i < 0 || t > END_AT - 0.05) return; const ln = LINES[i], size = (V ? 52 : 40) * (ln.text.length > 80 ? 0.84 : 1), maxW = V ? W - 150 : W * 0.6;
  ctx.font = `700 ${size}px ${UI}`; const toks = ln.text.split(" "), nW = words[i].length, lines = wrap(ln.text, maxW), lh = size * 1.28, h = lines.length * lh + 70, w = Math.min(maxW + 70, Math.max(...lines.map((s) => ctx.measureText(s).width)) + 70);
  const cx = W / 2, y = V ? H * 0.8 - h / 2 + 30 : H - h - 56, a = clamp((t - L(i) + 0.15) / 0.12) * (1 - ease((t - LE(i) - 0.25) / 0.15));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - easeOut((t - L(i) + 0.15) / 0.2)) * 14); ctx.fillStyle = "rgba(10,10,24,.78)"; rr(cx - w / 2 - 20, y, w + 40, h, 22); ctx.fill();
  ctx.fillStyle = COL[ln.who]; ctx.font = `800 ${size * 0.62}px ${UI}`; ctx.fillText(`[${ln.who}]`, cx - w / 2 + 10, y + 12 + size * 0.62); ctx.font = `700 ${size}px ${UI}`; let ti = 0;
  lines.forEach((s, r) => { let x = cx - w / 2 + 10; const yy = y + 52 + size * 0.78 + r * lh; for (const tk of s.split(" ")) { const idx = ti++, at = L(i) + (words[i][Math.min(nW - 1, Math.round(idx * nW / toks.length))]?.t ?? 0) - 0.03; ctx.fillStyle = t >= at ? "#fff" : "rgba(255,255,255,.4)"; ctx.fillText(tk, x, yy); x += ctx.measureText(tk + " ").width; } });
  ctx.restore();
}
function drawBrand(t) {
  const s = V ? 1 : 0.9; ctx.save(); ctx.translate(V ? 48 : 64, V ? 58 : 48); ctx.scale(s, s); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 12; ctx.drawImage(icon, 0, 0, 56, 56); ctx.fillStyle = "#fff"; ctx.font = `900 42px ${DISP}`; ctx.textBaseline = "middle"; ctx.fillText("CONSTRA", 72, 30); ctx.restore();
  ctx.save(); ctx.translate(W - (V ? 150 : 170), V ? 84 : 76); ctx.fillStyle = "#e0342a"; rr(-14, -26, 128, 52, 10); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `900 34px ${DISP}`; ctx.textBaseline = "middle"; ctx.beginPath(); ctx.arc(10, 0, 8, 0, 7); ctx.fill(); ctx.fillText("LIVE", 28, 2); ctx.restore();
  const k = 1 - ease((t - 4.4) / 0.5); if (k > 0.01) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = "rgba(10,10,24,.72)"; ctx.font = `700 24px ${UI}`; const s2 = "Animated parody. Characters are fictional."; const w = ctx.measureText(s2).width + 36; rr(V ? 48 : 64, V ? 128 : 112, w, 44, 22); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(s2, (V ? 48 : 64) + 18, (V ? 128 : 112) + 23); ctx.restore(); }
  ctx.textBaseline = "alphabetic";
}
function drawEnd(t) {
  const k = easeOut((t - (END_AT - 0.35)) / 0.7);
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = k * 0.9; ctx.fillStyle = "#0c0a1c"; ctx.fillRect(0, 0, W, H); ctx.restore();
  const cx = W / 2, cy = H * (V ? 0.42 : 0.44); ctx.save(); ctx.globalAlpha = k; ctx.translate(cx, cy + (1 - k) * 30); const is = V ? 150 : 120; ctx.drawImage(icon, -is / 2, -is * 1.7, is, is); ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `900 ${V ? 150 : 128}px ${DISP}`; ctx.fillText("CONSTRA", 0, 0);
  ctx.fillStyle = "#F5E9B8"; ctx.font = `600 ${V ? 40 : 36}px ${UI}`; ctx.fillText("Run the job, not the paperwork.", 0, 70); ctx.fillStyle = "#F5C400"; ctx.fillRect(-60, 100, 120, 7);
  const bk = easeBack((t - END_AT - 0.1) / 0.4); ctx.globalAlpha = clamp(bk * 2); ctx.translate(0, 190 + (1 - clamp(bk)) * 20); const bw = V ? 520 : 440, bh = V ? 104 : 90; ctx.fillStyle = "#F5C400"; rr(-bw / 2, -bh / 2, bw, bh, 18); ctx.fill(); ctx.fillStyle = "#141414"; ctx.font = `800 ${V ? 40 : 34}px ${UI}`; ctx.textBaseline = "middle"; ctx.fillText("START FREE", 0, 2); ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `600 ${V ? 36 : 30}px ${UI}`; ctx.fillText("getconstra.com", 0, bh / 2 + 56); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `500 ${V ? 26 : 22}px ${UI}`; ctx.fillText("Free while we launch  ·  Android, iPhone and web", 0, bh / 2 + 100); ctx.restore();
}

window.drawFrame = (t) => {
  const st = acting(t); ST = st;
  studio.burst(0, BURST, [0.5, 6, 7.5]); studio.burst(1, W_(I.NOPE, /free/i, 0.4), [4, 6, 7.5]);
  placeCamera(t); drawTV(t); studio.update(t, { wide: WIDE, mood: st.mood, fall0: 1.0, burst0: BURST, pools: [[st.Mac.x, st.Mac.z], [st.Jess.x, st.Jess.z], [st.Dev.x, st.Dev.z]], speaker: lineAt(t) >= 0 ? LINES[lineAt(t)].who : null });
  av.Mac.phone.visible = st.props.macPhone; av.Jess.clip.visible = st.props.jessClip;
  for (const k of ["Mac", "Jess", "Dev"]) { av[k].setFace(st.face[k]); av[k].set({ ...st[k], tag: false }); }
  renderer.render(studio.scene, camera);
  ctx.clearRect(0, 0, W, H); ctx.drawImage(glCanvas, 0, 0);
  { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(8,6,22,.4)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (t > BURST - 0.05 && t < BURST + 0.25) { ctx.save(); ctx.globalAlpha = 0.7 * (1 - (t - BURST + 0.05) / 0.3); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  drawOverlays(t); drawEnd(t); drawBrand(t); drawCaption(t);
};

// ── sound ──────────────────────────────────────────────────────────────────────────────────────
async function mixAudio() {
  const SR = 48000, A = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const master = A.createGain(); master.gain.setValueAtTime(0.95, 0); master.gain.setValueAtTime(0.95, DURATION - 1.4); master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(master).connect(A.destination);
  // voices: high-pass, warmth, presence, a touch of studio room; each voice panned to where they stand
  const vox = A.createGain(); vox.gain.value = 1.3; const hp = A.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 90; const warm = A.createBiquadFilter(); warm.type = "lowshelf"; warm.frequency.value = 200; warm.gain.value = 2.5; const pres = A.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3200; pres.gain.value = 2.4; pres.Q.value = 0.9; const air = A.createBiquadFilter(); air.type = "highshelf"; air.frequency.value = 8500; air.gain.value = 1.5;
  vox.connect(hp).connect(warm).connect(pres).connect(air); air.connect(comp);
  const ir = A.createBuffer(2, Math.round(SR * 0.7), SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 11 + c * 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / d.length, 3.2); } }
  const conv = A.createConvolver(); conv.buffer = ir; const wet = A.createGain(); wet.gain.value = 0.11; air.connect(conv).connect(wet).connect(comp);
  const paSend = A.createGain(); paSend.gain.value = 0.22; paSend.connect(conv); // the announcer gets a bigger room: "voice of the studio"
  bufs.forEach((b, i) => { const s = A.createBufferSource(); s.buffer = b; const gn = A.createGain(); gn.gain.value = gains[i]; const pan = A.createStereoPanner(); pan.pan.value = PAN[LINES[i].who];
    if (i === I.HELP) { const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; s.connect(gn).connect(lp).connect(pan).connect(vox); } else s.connect(gn).connect(pan).connect(vox); if (LINES[i].who === "Announcer") gn.connect(paSend); s.start(VO_AT[i]); });
  const noiseBuf = A.createBuffer(1, SR * 2, SR); { const d = noiseBuf.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  const bed = A.createGain(); bed.gain.value = 0.42; bed.connect(comp); const duck = A.createGain(); duck.gain.setValueAtTime(1, 0); duck.connect(bed);
  for (let i = 0; i < N; i++) { const a = VO_AT[i] - 0.05, b = VO_END[i]; duck.gain.setValueAtTime(1, Math.max(0, a - 0.15)); duck.gain.linearRampToValueAtTime(0.35, a + 0.06); duck.gain.setValueAtTime(0.35, b); duck.gain.linearRampToValueAtTime(1, b + 0.45); }
  const note = (f, t, d, type, vol, lpf, dest = duck) => { const o = A.createOscillator(); o.type = type; o.frequency.value = f; const g = A.createGain(), lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp).connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05); };
  const hat = (t, v) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const hf = A.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 7500; const g = A.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(hf).connect(g).connect(duck); s.start(t); s.stop(t + 0.08); };
  const kick = (t, v) => { const o = A.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(duck); o.start(t); o.stop(t + 0.28); };
  const burst = (t, f, q, dur, v, type = "bandpass", dest = comp) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const bp = A.createBiquadFilter(); bp.type = type; bp.frequency.setValueAtTime(f[0], t); bp.frequency.exponentialRampToValueAtTime(f[1], t + dur); bp.Q.value = q; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(bp).connect(g).connect(dest); s.start(t); s.stop(t + dur + 0.05); };
  // before the reveal: a tired, worried drone with a ticking clock
  { const o = A.createOscillator(), o2 = A.createOscillator(); o.type = o2.type = "sawtooth"; o.frequency.value = 55; o2.frequency.value = 55.7; const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260; const g = A.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.linearRampToValueAtTime(0.13, 1.5); g.gain.setValueAtTime(0.13, BURST - 0.2); g.gain.linearRampToValueAtTime(0.0001, BURST); o.connect(lp); o2.connect(lp); lp.connect(g).connect(comp); o.start(0); o2.start(0); o.stop(BURST + 0.1); o2.stop(BURST + 0.1);
    for (let tt = 2.2; tt < BURST - 0.3; tt += 0.5) note(tt % 1 === 0 ? 900 : 700, tt, 0.05, "square", 0.035, 3000, comp); }
  // slapstick: the stack lands (paper rustle + thump) and a sad trombone after Dev's cry for help
  burst(1.0, [6000, 2500], 0.7, 1.2, 0.14); { const tt = 1.0 + 0.8 + 0.55; const o = A.createOscillator(); o.frequency.setValueAtTime(110, tt); o.frequency.exponentialRampToValueAtTime(38, tt + 0.25); const g = A.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.5, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5); o.connect(g).connect(comp); o.start(tt); o.stop(tt + 0.55); burst(tt, [900, 200], 0.8, 0.4, 0.2); }
  [[233, 0, 0.32], [220, 0.36, 0.32], [208, 0.72, 0.32], [185, 1.08, 0.9]].forEach(([f, dt, dur]) => { const tt = LE(I.HELP) + 0.15 + dt; const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f, tt); if (dt > 1) { o.frequency.linearRampToValueAtTime(f * 0.88, tt + dur); } const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(700, tt); lp.frequency.linearRampToValueAtTime(1500, tt + dur * 0.5); const g = A.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.09, tt + 0.04); g.gain.setValueAtTime(0.09, tt + dur - 0.06); g.gain.linearRampToValueAtTime(0.0001, tt + dur); o.connect(lp).connect(g).connect(comp); o.start(tt); o.stop(tt + dur + 0.05); });
  // drum roll into the reveal
  for (let tt = L(I.ENOUGH) + 1.2, k = 0; tt < BURST; k++) { const v = 0.1 + 0.25 * (tt - L(I.ENOUGH)) / (BURST - L(I.ENOUGH)); burst(tt, [1800, 1800], 1, 0.07, v); tt += Math.max(0.045, 0.16 - k * 0.006); }
  // the reveal: a brass stab, then a bright bed
  for (const f of [261.6, 329.6, 392, 523.3]) { const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; const g = A.createGain(); g.gain.setValueAtTime(0.0001, BURST); g.gain.exponentialRampToValueAtTime(0.065, BURST + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, BURST + 1.2); o.connect(lp).connect(g).connect(comp); o.start(BURST); o.stop(BURST + 1.3); }
  { const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]], roots = [65.4, 49, 55, 43.65];
    for (let b = 0; BURST + b * BAR < DURATION; b++) { const t0 = BURST + b * BAR, ch = chords[b % 4], rt = roots[b % 4]; for (let k = 0; k < 8; k++) note(ch[[0, 1, 2, 1, 0, 1, 2, 1][k]] * 2, t0 + k * BEAT / 2, 0.24, "triangle", 0.06, 2200); for (let k = 0; k < 4; k++) { note(rt * 2, t0 + k * BEAT, BEAT * 0.8, "triangle", 0.2, 520); kick(t0 + k * BEAT, 0.28); hat(t0 + k * BEAT + BEAT / 2, 0.045); } } }
  // footsteps: a soft tap per stride for every walk, quieter than the voices
  for (const who of ["Mac", "Jess", "Dev"]) { const keys = keysFor(who); for (let i = 1; i < keys.length; i++) { const [t0, x0, z0] = keys[i - 1], [t1, x1, z1] = keys[i], len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.5) continue; const dur = t1 - t0, steps = Math.round(len / 1.15 * 1.0); for (let s = 0; s < steps; s++) { const u = 0.1 + 0.8 * s / Math.max(1, steps - 1); burst(t0 + u * dur, [420, 160], 1.2, 0.07, who === "Dev" && i === 1 ? 0.08 : 0.05); } } }
  // applause, a record scratch, price pings, stage whooshes
  const applause = (t, v, dur) => { const s = A.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.4; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.25); for (let k = 0; k < dur * 9; k++) g.gain.linearRampToValueAtTime(v * (0.55 + 0.45 * Math.abs(Math.sin(k * 1.7))), t + 0.25 + k / 9); g.gain.linearRampToValueAtTime(0.0001, t + dur); s.connect(bp).connect(g).connect(comp); s.start(t); s.stop(t + dur + 0.1); };
  applause(BURST + 0.15, 0.3, 3.0); applause(W_(I.NOPE, /free/i, 0.4), 0.36, 2.6); applause(L(I.TAG) + 1.0, 0.3, 2.4); applause(L(I.TOOLS) + 1.2, 0.14, 1.4);
  { const tt = W_(I.NOPE, /nope/i, 0.1) - 0.05; const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(900, tt); o.frequency.exponentialRampToValueAtTime(70, tt + 0.32); const g = A.createGain(); g.gain.setValueAtTime(0.16, tt); g.gain.linearRampToValueAtTime(0.0001, tt + 0.34); o.connect(g).connect(comp); o.start(tt); o.stop(tt + 0.4); }
  const ding = (t, f, v = 0.12) => { const o = A.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.6); };
  const popTimes = [W_(I.LOST, /lost/i, 0.3), W_(I.LOST, /missed/i, 0.3), W_(I.LOST, /swears/i, 0.3), ...CHIPS.map(([li, re]) => W_(li, re, 0.5)), W_(I.TOOLS, /twenty/i), W_(I.MORE, /twenty/i), W_(I.CLOCK, /clock/i, 0.5) + 1.9];
  popTimes.forEach((t) => { ding(t, 1300 + (t * 53 % 4) * 150); burst(t - 0.12, [500, 3000], 0.8, 0.14, 0.05); });
  for (const t of [W_(I.PRICE, /^ten$/i, 0.5), W_(I.PRICE, /^five$/i, 0.6)]) { ding(t, 1800, 0.14); ding(t + 0.09, 2400, 0.12); }
  return await A.startRendering();
}

const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
window.still = async (t) => { window.drawFrame(t); return await b64(await new Promise((r) => out.toBlob(r, "image/png"))); };
window.encodeAll = async (bitrate) => {
  const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 }, fastStart: "in-memory" });
  let err = null; const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = String(e); } });
  venc.configure({ codec: V ? "avc1.640033" : "avc1.640034", width: W, height: H, bitrate, framerate: FPS, latencyMode: "quality", bitrateMode: "variable" });
  const audio = await mixAudio(), Lc = audio.getChannelData(0), Rc = audio.getChannelData(1); let peak = 0; for (let i = 0; i < Lc.length; i++) peak = Math.max(peak, Math.abs(Lc[i]), Math.abs(Rc[i])); const g = peak > 0.97 ? 0.97 / peak : 1;
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { err = String(e); } }); aenc.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
  for (let off = 0; off < Lc.length; off += 1024) { const n = Math.min(1024, Lc.length - off), d = new Float32Array(n * 2); for (let k = 0; k < n; k++) { d[k] = Lc[off + k] * g; d[n + k] = Rc[off + k] * g; } const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: d }); aenc.encode(ad); ad.close(); }
  await aenc.flush(); const total = Math.round(DURATION * FPS);
  for (let i = 0; i < total; i++) { window.drawFrame(i / FPS); const f = new VideoFrame(out, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) }); venc.encode(f, { keyFrame: i % 60 === 0 }); f.close(); while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 8)); if (i % 90 === 0) console.log(`frame ${i}/${total}`); }
  await venc.flush(); muxer.finalize(); if (err) throw new Error(err);
  return { video: await b64(muxer.target.buffer), peak: +peak.toFixed(3), gain: +g.toFixed(3) };
};

import * as THREE from "three";
import { createAvatar } from "/world.js";
import { createStudio } from "/studio.js";

// "Are you tired of paperwork?": a TV-infomercial parody for Constra, in a game-show studio with a live audience.
const MODE = new URLSearchParams(location.search).get("mode") === "h" ? "h" : "v";
const W = MODE === "v" ? 1080 : 1920, H = MODE === "v" ? 1920 : 1080, FPS = 30, V = MODE === "v";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t = clamp(t), t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t) => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + src)); i.src = src; });
const mixPath = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))); return keys[keys.length - 1][1]; };

const LINES = [
  { who: "Announcer", text: "Are you tired of paperwork? Buried in it? Drowning in it?", gap: 0.8 },
  { who: "Dev",  text: "Help! I can't find the timesheet!", gap: 0.15 },
  { who: "Announcer", text: "Lost hours? Missed invoices? A crew who swears they were at Queen Street?", gap: 0.2 },
  { who: "Mac",  text: "There has to be a better way!", gap: 0.25 },
  { who: "Announcer", text: "Introducing... Constra!", gap: 0.7 },
  { who: "Mac",  text: "Clock in with a photo and GPS. Timesheets in PDF or Excel. Schedules, tasks, and an AI assistant that answers anything.", gap: 0.8 },
  { who: "Jess", text: "Twenty-six tools, in one app!", gap: 0.3 },
  { who: "Announcer", text: "But wait... there's more! Twenty-three more tools!", gap: 0.25 },
  { who: "Mac",  text: "Now, how much would you pay? Ten thousand dollars? Five thousand?", gap: 0.35 },
  { who: "Announcer", text: "Nope! It's free while it's launching!", gap: 0.5 },
  { who: "Dev",  text: "I'm done by noon!", gap: 0.3 },
  { who: "Mac",  text: "Constra. Run the job, not the paperwork!", gap: 0.35 },
];
const N = LINES.length, END_HOLD = 3.4, COL = { Mac: "#F5C400", Jess: "#8fe3a0", Dev: "#ff9e7a", Announcer: "#ff9ee0" };
const IDX_BURST = 4;

const out = document.getElementById("out"); out.width = W; out.height = H; const ctx = out.getContext("2d");
const glCanvas = document.getElementById("gl"); glCanvas.width = W; glCanvas.height = H;
const scr = document.createElement("canvas"); scr.width = 1280; scr.height = 720; const sg = scr.getContext("2d");
let renderer, studio, camera, av = {}, icon, bufs = [], words = [], VO_AT = [], VO_END = [], DURATION = 0, END_AT = 0, BURST = 0;

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
    bufs.push(await dec.decodeAudioData(await (await fetch(`/vo/vo-${n}.mp3`)).arrayBuffer())); words.push(await (await fetch(`/vo/vo-${n}.json`)).json());
    t += LINES[i].gap; VO_AT.push(t); const lw = words[i][words[i].length - 1], sp = lw ? lw.t + lw.d : bufs[i].duration, dur = Math.min(bufs[i].duration, sp + 0.4); VO_END.push(t + dur); t += dur;
  }
  END_AT = t; DURATION = t + END_HOLD; BURST = W_(IDX_BURST, /konstra/i, 0.7) - 0.05;
  return { duration: +DURATION.toFixed(2), lines: VO_AT.map((a, i) => [+a.toFixed(2), +VO_END[i].toFixed(2)]), burst: +BURST.toFixed(2), W, H };
};
const L = (i) => VO_AT[i], LE = (i) => VO_END[i];
function W_(i, re, fb = 0) { const ws = words[i]; const k = ws.findIndex((w) => re.test(w.w)); return VO_AT[i] + (k >= 0 ? ws[k].t : (ws[ws.length - 1].t + ws[ws.length - 1].d) * fb); }
const lineAt = (t) => { for (let i = 0; i < N; i++) if (t >= L(i) - 0.05 && t < LE(i) + 0.05) return i; return -1; };
function mouthFor(who, t) { const i = lineAt(t); if (i < 0 || LINES[i].who !== who) return null; const ws = words[i], rel = t - L(i); for (let k = 0; k < ws.length; k++) if (rel >= ws[k].t - 0.02 && rel < ws[k].t + ws[k].d + 0.05) return ["talk1", "talk2", "talk3", "talk2", "talk1", "talk3"][Math.floor((rel - ws[k].t) * 11 + k * 2) % 6]; return "smile"; }
const talkAmt = (who, t) => { const i = lineAt(t); return i >= 0 && LINES[i].who === who ? ease((t - L(i) + 0.1) / 0.25) * (1 - ease((t - LE(i)) / 0.2)) : 0; };
const blinkOf = (t, s) => ((t + s) % 3.4 < 0.13 ? "blink" : null);
const gest = (t, s, g) => ({ armL: [(-0.3 - 0.5 * (0.5 + 0.5 * Math.sin(t * 2.3 + s))) * g, -0.25 * g], armR: [(-0.35 - 0.6 * (0.5 + 0.5 * Math.sin(t * 2.9 + s + 1))) * g, 0.3 * g * (0.5 + 0.5 * Math.sin(t * 2 + s))] });

// ── the people ─────────────────────────────────────────────────────────────────────────────────
const MX = 0.6, JX = 5.2, Z = 7.4;
function acting(t) {
  const mood = ease((t - BURST) / 0.4), g = (who, s, k = 1) => gest(t, s, (0.15 + 0.85 * talkAmt(who, t)) * k);
  const gm = g("Mac", 0.4, 1.1), m = { x: MX, z: Z, ry: 0.08, armL: gm.armL, armR: gm.armR, hy: 0.04 * Math.sin(t * 0.8) };
  const pr = ease((t - L(4) + 0.2) / 0.3) * (1 - ease((t - LE(4) - 0.3) / 0.3)); if (pr > 0) { m.armR = [-1.3 * pr, 1.0 * pr]; m.armL = [-0.4, -0.15]; }
  const sh = ease((t - L(8)) / 0.3) * (1 - ease((t - LE(8)) / 0.3)); if (sh > 0) { m.armL = [-0.3 * sh, -0.9 * sh]; m.armR = [-0.3 * sh, 0.9 * sh]; m.hr = 0.14 * sh; }
  const gj = g("Jess", 1.9, 1.1), j = { x: JX, z: Z - 0.4, ry: -0.12, armL: gj.armL, armR: gj.armR };
  const pj = ease((t - L(6)) / 0.25) * (1 - ease((t - LE(6) - 0.4) / 0.3)); if (pj > 0) { j.armL = [-1.0 * pj, -0.9 * pj]; j.armR = [-1.0 * pj, 0.9 * pj]; j.hop = 0.12 * Math.abs(Math.sin(t * 8)) * pj; }
  const ch = ease((t - L(9) - 0.3) / 0.3); if (ch > 0 && t < LE(9) + 1) { m.armL = [-3 * ch, -0.4]; m.armR = [-3 * ch, 0.4]; j.armL = [-3 * ch, -0.4]; j.armR = [-3 * ch, 0.4]; m.hop = Math.abs(Math.sin(t * 7)) * 0.7 * ch; j.hop = Math.abs(Math.sin(t * 7 + 1)) * 0.7 * ch; }
  // Dev: buried, flapping, then out and walking over to join the hosts
  const walk0 = BURST + 1.6, walk1 = L(7) - 0.2, wk = clamp((t - walk0) / (walk1 - walk0)), walking = t > walk0 && t < walk1;
  const dx = lerp(studio.pile[0], 9.4, ease(wk)), dz = lerp(studio.pile[1], Z - 0.2, ease(wk)), gd = g("Dev", 3.1, 1);
  const d = { x: dx, z: dz, ry: walking ? 1.1 : -0.1, ph: t * 9, amt: walking ? 0.9 : 0, armL: gd.armL, armR: gd.armR };
  if (t < BURST + 0.1) { d.armL = [-2.7 + 0.5 * Math.sin(t * 9), -0.45]; d.armR = [-2.7 + 0.5 * Math.sin(t * 9 + 1.4), 0.45]; d.hy = 0.25 * Math.sin(t * 5); d.hr = 0.12 * Math.sin(t * 7); }
  else if (t < BURST + 1.6) { const k = ease((t - BURST) / 0.3); d.armL = [-3 * k, -0.4]; d.armR = [-3 * k, 0.4]; d.hop = Math.abs(Math.sin(t * 8)) * 0.8 * k; }
  else if (t > L(10) - 0.2 && t < LE(10) + 0.8) { d.armL = [-3, -0.5]; d.armR = [-0.6, 0.5]; d.hop = Math.abs(Math.sin(t * 8)) * 0.5; }
  const face = (who, base) => mouthFor(who, t) || blinkOf(t, who.length * 1.3) || base;
  const f = { Mac: face("Mac", "smile"), Jess: face("Jess", mood > 0.5 ? "cheer" : "smile"), Dev: face("Dev", t < BURST + 0.1 ? "oops" : "cheer") };
  return { Mac: m, Jess: j, Dev: d, face: f, mood };
}

// ── camera ─────────────────────────────────────────────────────────────────────────────────────
const SHOTS = [
  { look: [[-6, 4, 5], [-8, 3.8, 5]], az: [14, 8], el: [6, 4], d: [20, 15], vv: 1.4 },
  { look: [[-8, 4.3, 5]], az: [18, 12], el: [4, 4], d: [8.5, 6.8] },
  { look: [[-8, 3.8, 5], [0, 4, 7.4]], az: [10, 6], el: [5, 5], d: [18, 18], vv: 1.5 },
  { look: [[MX, 4.1, Z]], az: [16, 10], el: [3, 3], d: [10, 8.4] },
  { look: [[0, 5.5, 6]], az: [0, 0], el: [5, 3], d: [30, 22], vv: 1.55 },
  { look: [[MX, 4.1, Z]], az: [20, 8], el: [3, 3], d: [11, 9.2], lyV: 1.6 },
  { look: [[JX, 4.1, Z - 0.4]], az: [-18, -10], el: [3, 3], d: [10, 8.4], lyV: 1.2 },
  { look: [[4.2, 4.1, Z]], az: [0, 0], el: [4, 4], d: [18, 15.5], vv: 2.0, lyV: 1.3 },
  { look: [[MX, 4.1, Z]], az: [16, 10], el: [3, 3], d: [9.5, 8], lyV: 1.5 },
  { look: [[4.2, 4.5, Z]], az: [0, 0], el: [5, 3], d: [19, 23], vv: 2.0 },
  { look: [[9.4, 4.1, Z - 0.2]], az: [-22, -14], el: [3, 3], d: [9.5, 7.8] },
  { look: [[4.2, 4.6, Z]], az: [0, 0], el: [4, 5], d: [17, 26], vv: 1.9 },
];
const cutAt = (i) => (i === 0 ? 0 : L(i) - 0.25);
function placeCamera(t) {
  let i = 0; for (let k = 0; k < N; k++) if (t >= cutAt(k)) i = k;
  const s = SHOTS[i], a = cutAt(i), b = i + 1 < N ? cutAt(i + 1) : DURATION, u = ease((t - a) / (b - a));
  const lk0 = s.look.length > 1 ? s.look[0].map((v, k) => lerp(v, s.look[1][k], u)) : s.look[0], lk = V && s.lyV ? [lk0[0], lk0[1] + s.lyV, lk0[2]] : lk0;
  const az = lerp(s.az[0], s.az[1], u) * Math.PI / 180, el = lerp(s.el[0], s.el[1], u) * Math.PI / 180, d = lerp(s.d[0], s.d[1], u) * (V ? (s.vv ?? 1.55) : 1);
  const hx = 0.035 * Math.sin(t * 1.7), hy = 0.03 * Math.sin(t * 1.3 + 1);
  camera.position.set(hx + lk[0] + d * Math.sin(az) * Math.cos(el), hy + lk[1] + d * Math.sin(el) + (V ? 0.4 : 0), lk[2] + d * Math.cos(az) * Math.cos(el));
  camera.lookAt(lk[0], lk[1] + (V ? 0.5 : 0), lk[2]); camera.updateProjectionMatrix(); return i;
}

// ── the TV wall ────────────────────────────────────────────────────────────────────────────────
function drawTV(t) {
  const g = sg; g.clearRect(0, 0, 1280, 720); g.textAlign = "center"; g.textBaseline = "middle";
  const big = (s, y, size, col) => { g.font = `900 ${size}px Impact, Arial Black`; g.fillStyle = col; g.fillText(s, 640, y); };
  if (t < BURST) { g.fillStyle = "#1a0b0b"; g.fillRect(0, 0, 1280, 720); for (let i = 0; i < 14; i++) { const y = ((i * 97 + Math.floor(t * 12) * 53) % 720); g.fillStyle = `rgba(255,${40 + (i * 20) % 80},60,.18)`; g.fillRect(0, y, 1280, 8 + (i % 3) * 6); } big("ERROR 404", 250, 190, "#ff4d4d"); big("TIMESHEET NOT FOUND", 440, 90, "#ffd0d0"); g.font = "700 44px Courier New"; g.fillStyle = "#ff9a9a"; g.fillText("ctrl+f 'where did I put it' ...", 640, 560); if (Math.floor(t * 3) % 2) { g.fillStyle = "#ff4d4d"; g.fillRect(900, 540, 20, 44); } return; }
  g.fillStyle = "#0b1030"; g.fillRect(0, 0, 1280, 720); const gr = g.createRadialGradient(640, 360, 20, 640, 360, 700); gr.addColorStop(0, "rgba(255,200,40,.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
  const logo = (y, s) => { g.drawImage(icon, 640 - 330 * s, y - 70 * s, 140 * s, 140 * s); g.textAlign = "left"; g.font = `900 ${150 * s}px Impact, Arial Black`; g.fillStyle = "#fff"; g.fillText("CONSTRA", 640 - 170 * s, y + 4); g.textAlign = "center"; };
  const slide = (a, b, title, sub, col) => { if (t < a || t >= b) return false; const k = easeBack((t - a) / 0.3); g.save(); g.translate(640, 360); g.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k); g.translate(-640, -360); g.globalAlpha = clamp(k * 1.6); big(title, 290, 150, col); g.font = "700 62px Segoe UI, Arial"; g.fillStyle = "#e8ecff"; g.fillText(sub, 640, 450); g.restore(); return true; };
  if (t < L(5)) { logo(300, 1); g.font = "800 70px Segoe UI, Arial"; g.fillStyle = "#F5C400"; g.fillText("Run the job, not the paperwork.", 640, 500); return; }
  if (t < LE(5) + 0.3) { slide(L(5), W_(5, /^timesheets$/i, 0.3) - 0.05, "CLOCK IN", "photo + GPS, from any phone", "#F5C400") || slide(W_(5, /^timesheets$/i, 0.3) - 0.05, W_(5, /^schedules/i, 0.6) - 0.05, "TIMESHEETS", "PDF or Excel, overtime worked out", "#43d9ff") || slide(W_(5, /^schedules/i, 0.6) - 0.05, W_(5, /assistant/i, 0.8) - 0.1, "SCHEDULE + TASKS", "daily progress at a glance", "#8fe3a0") || slide(W_(5, /assistant/i, 0.8) - 0.1, LE(5) + 0.3, "AI ASSISTANT", "ask it anything about your jobs", "#ff9ee0"); return; }
  if (t < LE(7) + 0.3) { if (t < L(7)) { big("26", 280, 300, "#F5C400"); big("TOOLS IN ONE APP", 500, 80, "#fff"); } else { big("+ 23", 270, 270, "#46c768"); big("MORE TOOLS", 490, 100, "#fff"); } return; }
  if (t < L(9)) { big("$ ? ? ?", 340, 260, "#ffd400"); return; }
  if (t < L(11) - 0.1) { big("FREE", 310, 330, "#F5C400"); g.font = "800 72px Segoe UI, Arial"; g.fillStyle = "#fff"; g.fillText("while we launch", 640, 540); return; }
  logo(280, 1.1); big("RUN THE JOB,", 470, 100, "#fff"); big("NOT THE PAPERWORK.", 580, 100, "#F5C400");
}

// ── overlays ───────────────────────────────────────────────────────────────────────────────────
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const UI = `"Segoe UI", Arial, sans-serif`, DISP = `Impact, "Arial Black", Arial`;
const pop = (cx, cy, k, fn) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.globalAlpha = clamp(k * 1.6); fn(); ctx.restore(); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => easeBack((t - a) / fi) * (1 - ease((t - (b - fo)) / fo));
const sticker = (s, bg, fg, rot, size = 54) => { ctx.font = `900 ${size}px ${DISP}`; const w = ctx.measureText(s).width + 60; ctx.save(); ctx.rotate(rot); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; ctx.fillStyle = bg; rr(-w / 2, -size * 0.7, w, size * 1.4, 18); ctx.fill(); ctx.shadowColor = "transparent"; ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, 0, 4); ctx.restore(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; };

function drawOverlays(t) {
  const cx = V ? W / 2 : W * 0.78, top = V ? H * 0.13 : H * 0.2;
  // gag labels over the list of problems
  [["LOST HOURS", /lost/i, "#e0342a", -0.06], ["MISSED INVOICES", /missed/i, "#e0342a", 0.05], ["\"I WAS AT QUEEN STREET\"", /swears/i, "#151617", -0.04]].forEach(([s, re, bg, rot], i) => { const at = W_(2, re, 0.3), k = easeBack((t - at + 0.05) / 0.3) * (1 - ease((t - (LE(2) + 0.5)) / 0.3)); if (k > 0.01) pop(cx, top + i * (V ? 110 : 108), k, () => sticker(s, bg, "#fff", rot, V ? 50 : 46)); });
  // what it does
  { const items = [["Photo + GPS clock-in", /^clock$/i, "#F5C400", "#151617"], ["PDF + Excel timesheets", /^timesheets$/i, "#fff", "#151617"], ["Schedules + tasks", /^schedules/i, "#fff", "#151617"], ["AI assistant", /assistant/i, "#151617", "#F5C400"]], fo = 1 - ease((t - (LE(5) + 0.4)) / 0.3);
    items.forEach(([s, re, bg, fg], i) => { const k = easeBack((t - W_(5, re, 0.5) + 0.05) / 0.3) * fo; if (k > 0.01) pop(cx, top + i * 96, k, () => { ctx.font = `800 40px ${UI}`; const w = ctx.measureText(s).width + 70; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; ctx.fillStyle = bg; rr(-w / 2, -32, w, 64, 32); ctx.fill(); ctx.shadowColor = "transparent"; ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, 0, 2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }); }); }
  // 26 tools
  { const t0 = W_(6, /twenty/i), fin = 1 - ease((t - (LE(6) + 0.5)) / 0.3), k = easeBack((t - t0 + 0.1) / 0.35) * fin; if (k > 0.01) { const n = Math.round(26 * easeOut((t - t0) / 0.9)); pop(cx, top + 70, k, () => { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "#fff"; rr(-260, -95, 520, 190, 26); ctx.fill(); ctx.restore(); ctx.fillStyle = "#F5C400"; ctx.fillRect(-260, -95, 520, 14); ctx.fillStyle = "#151617"; ctx.font = `900 150px ${DISP}`; ctx.textAlign = "right"; ctx.fillText(String(n), -10, 54); ctx.textAlign = "left"; ctx.font = `900 52px ${DISP}`; ctx.fillText("TOOLS", 8, 8); ctx.font = `700 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText("in one app", 8, 52); }); } }
  // + 23 more tools
  { const t0 = W_(7, /twenty/i), k = easeBack((t - t0 + 0.05) / 0.35) * (1 - ease((t - (LE(7) + 0.5)) / 0.3)); if (k > 0.01) pop(cx, top + 80, k, () => sticker("+ 23 MORE TOOLS", "#46c768", "#fff", -0.05, V ? 74 : 66)); }
  // the price gag
  [["$10,000?", /^ten$/i, 0.07, 0], ["$5,000?", /^five$/i, -0.06, 1]].forEach(([s, re, rot, i]) => { const at = W_(8, re, 0.6), k = easeBack((t - at + 0.05) / 0.3) * (1 - ease((t - (L(9) + 0.2)) / 0.2)); if (k > 0.01) pop(cx, top + 40 + i * 150, k, () => sticker(s, "#F5C400", "#151617", rot, V ? 96 : 86)); });
  // FREE
  { const at = W_(9, /free/i, 0.4) - 0.05, k = (t - at) / 0.22, fade = 1 - ease((t - (LE(9) + 1.2)) / 0.4); if (k > 0 && fade > 0) { const sc = lerp(2.4, 1, easeOut(k)); ctx.save(); ctx.globalAlpha = clamp(k * 3) * fade; ctx.translate(V ? W / 2 : W * 0.78, V ? H * 0.2 : H * 0.33); ctx.scale(sc, sc);
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
  // a "LIVE" bug, TV style
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
  const st = acting(t);
  studio.burst(0, BURST, [0.5, 6, 7.5]); studio.burst(1, W_(9, /free/i, 0.4), [4, 6, 7.5]);
  drawTV(t); studio.update(t, { mood: st.mood, fall0: 0.15, burst0: BURST });
  for (const k of ["Mac", "Jess", "Dev"]) { av[k].setFace(st.face[k]); av[k].set({ ...st[k], tag: false }); }
  placeCamera(t); renderer.render(studio.scene, camera);
  ctx.clearRect(0, 0, W, H); ctx.drawImage(glCanvas, 0, 0);
  { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(8,6,22,.4)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (t > BURST - 0.05 && t < BURST + 0.25) { ctx.save(); ctx.globalAlpha = 0.7 * (1 - (t - BURST + 0.05) / 0.3); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  drawOverlays(t); drawEnd(t); drawBrand(t); drawCaption(t);
};

// ── sound ──────────────────────────────────────────────────────────────────────────────────────
async function mixAudio() {
  const SR = 48000, A = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const master = A.createGain(); master.gain.setValueAtTime(0.95, 0); master.gain.setValueAtTime(0.95, DURATION - 1.4); master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18; comp.connect(master).connect(A.destination);
  const vox = A.createGain(); vox.gain.value = 1.25; const hp = A.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80; const warm = A.createBiquadFilter(); warm.type = "lowshelf"; warm.frequency.value = 200; warm.gain.value = 2.5; const pres = A.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3000; pres.gain.value = 2.2; pres.Q.value = 0.9;
  vox.connect(hp).connect(warm).connect(pres); pres.connect(comp);
  const ir = A.createBuffer(2, Math.round(SR * 0.55), SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 11 + c * 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / d.length, 3); } }
  const conv = A.createConvolver(); conv.buffer = ir; const wet = A.createGain(); wet.gain.value = 0.12; pres.connect(conv).connect(wet).connect(comp);
  // Dev is under a mountain of paper in line 2: muffle him
  bufs.forEach((b, i) => { const s = A.createBufferSource(); s.buffer = b; if (i === 1) { const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; const g = A.createGain(); g.gain.value = 0.9; s.connect(lp).connect(g).connect(vox); } else s.connect(vox); s.start(VO_AT[i]); });
  const noiseBuf = A.createBuffer(1, SR * 2, SR); { const d = noiseBuf.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  const bed = A.createGain(); bed.gain.value = 0.5; bed.connect(comp); const duck = A.createGain(); duck.gain.setValueAtTime(1, 0); duck.connect(bed);
  for (let i = 0; i < N; i++) { const a = VO_AT[i] - 0.05, b = VO_END[i]; duck.gain.setValueAtTime(1, Math.max(0, a - 0.15)); duck.gain.linearRampToValueAtTime(0.4, a + 0.05); duck.gain.setValueAtTime(0.4, b); duck.gain.linearRampToValueAtTime(1, b + 0.4); }
  const note = (f, t, d, type, vol, lpf) => { const o = A.createOscillator(); o.type = type; o.frequency.value = f; const g = A.createGain(), lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp).connect(g).connect(duck); o.start(t); o.stop(t + d + 0.05); };
  const hat = (t, v) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const hf = A.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 7500; const g = A.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(hf).connect(g).connect(duck); s.start(t); s.stop(t + 0.08); };
  const kick = (t, v) => { const o = A.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(duck); o.start(t); o.stop(t + 0.28); };
  // before the reveal: a tired, worried drone with a ticking clock
  { const o = A.createOscillator(), o2 = A.createOscillator(); o.type = o2.type = "sawtooth"; o.frequency.value = 55; o2.frequency.value = 55.7; const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 280; const g = A.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.linearRampToValueAtTime(0.16, 1.5); g.gain.setValueAtTime(0.16, BURST - 0.2); g.gain.linearRampToValueAtTime(0.0001, BURST); o.connect(lp); o2.connect(lp); lp.connect(g).connect(comp); o.start(0); o2.start(0); o.stop(BURST + 0.1); o2.stop(BURST + 0.1);
    for (let tt = 0.5; tt < BURST - 0.3; tt += 0.5) note(tt % 1 === 0 ? 900 : 700, tt, 0.05, "square", 0.05, 3000); }
  // drum roll into the reveal
  for (let tt = L(3) + 0.4, k = 0; tt < BURST; k++) { const s = A.createBufferSource(); s.buffer = noiseBuf; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; const g = A.createGain(); const v = 0.1 + 0.25 * (tt - L(3)) / (BURST - L(3)); g.gain.setValueAtTime(v, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.07); s.connect(bp).connect(g).connect(comp); s.start(tt); s.stop(tt + 0.1); tt += Math.max(0.045, 0.16 - k * 0.006); }
  // the reveal: a brass stab, then a bright bed
  for (const f of [261.6, 329.6, 392, 523.3]) { const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; const g = A.createGain(); g.gain.setValueAtTime(0.0001, BURST); g.gain.exponentialRampToValueAtTime(0.07, BURST + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, BURST + 1.2); o.connect(lp).connect(g).connect(comp); o.start(BURST); o.stop(BURST + 1.3); }
  { const BPM = 124, BEAT = 60 / BPM, BAR = BEAT * 4, chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]], roots = [65.4, 49, 55, 43.65];
    for (let b = 0; BURST + b * BAR < DURATION; b++) { const t0 = BURST + b * BAR, ch = chords[b % 4], rt = roots[b % 4]; for (let k = 0; k < 8; k++) note(ch[[0, 1, 2, 1, 0, 1, 2, 1][k]] * 2, t0 + k * BEAT / 2, 0.22, "square", 0.045, 2600); for (let k = 0; k < 4; k++) { note(rt * 2, t0 + k * BEAT, BEAT * 0.8, "triangle", 0.22, 520); kick(t0 + k * BEAT, 0.32); hat(t0 + k * BEAT + BEAT / 2, 0.055); } } }
  // applause, a record scratch, price pings
  const applause = (t, v, dur) => { const s = A.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.4; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.25); for (let k = 0; k < dur * 9; k++) g.gain.linearRampToValueAtTime(v * (0.55 + 0.45 * Math.abs(Math.sin(k * 1.7))), t + 0.25 + k / 9); g.gain.linearRampToValueAtTime(0.0001, t + dur); s.connect(bp).connect(g).connect(comp); s.start(t); s.stop(t + dur + 0.1); };
  applause(BURST + 0.15, 0.32, 2.8); applause(W_(9, /free/i, 0.4), 0.38, 2.6); applause(L(11) + 1.2, 0.3, 2.2);
  { const tt = W_(9, /nope/i, 0.1) - 0.05; const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(900, tt); o.frequency.exponentialRampToValueAtTime(70, tt + 0.32); const g = A.createGain(); g.gain.setValueAtTime(0.18, tt); g.gain.linearRampToValueAtTime(0.0001, tt + 0.34); o.connect(g).connect(comp); o.start(tt); o.stop(tt + 0.4); }
  const ding = (t, f, v = 0.14) => { const o = A.createOscillator(); o.type = "sine"; o.frequency.value = f; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.6); };
  for (const t of [W_(2, /lost/i, 0.3), W_(2, /missed/i, 0.3), W_(2, /swears/i, 0.3), W_(5, /^clock$/i, 0.5), W_(5, /^timesheets$/i, 0.5), W_(5, /^schedules/i, 0.5), W_(5, /assistant/i, 0.5), W_(6, /twenty/i), W_(7, /twenty/i)]) ding(t, 1300 + (t * 53 % 4) * 150);
  for (const t of [W_(8, /^ten$/i, 0.5), W_(8, /^five$/i, 0.6)]) { ding(t, 1800, 0.16); ding(t + 0.09, 2400, 0.14); }
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

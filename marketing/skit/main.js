import * as THREE from "three";
import { createWorld, createAvatar, createDog } from "/world.js";

// "The Case of the Missing Hours": a noir skit. Detective Mac, a rainy night site, a suspect, and Constra's GPS log.
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
  { who: "Mac",  text: "Friday. Payroll day. And somewhere on this site... three hours had gone missing.", gap: 0.9 },
  { who: "Jess", text: "Mac! Dev's timesheet says forty-one hours. I only saw him for thirty-eight!", gap: 0.35 },
  { who: "Mac",  text: "Three hours. Somebody's lying.", gap: 0.35 },
  { who: "Mac",  text: "Dev. Where were you Tuesday... at eleven forty-two?", gap: 0.7 },
  { who: "Dev",  text: "Me? I was framing! All day! Ask anyone!", gap: 0.25 },
  { who: "Mac",  text: "Funny. Because Constra says otherwise.", gap: 0.5 },
  { who: "Mac",  text: "Left the site Tuesday. Wednesday. Thursday. One hour each. Same taco truck.", gap: 0.3 },
  { who: "Dev",  text: "...It was a really good taco.", gap: 0.9 },
  { who: "Jess", text: "Case closed!", gap: 0.25 },
  { who: "Mac",  text: "No guessing. No arguing. Every hour, on record, for the whole crew.", gap: 0.5 },
  { who: "Mac",  text: "Constra. Twenty-six tools, one app. Free while it's launching.", gap: 0.4 },
  { who: "Mac",  text: "Run the job, not the paperwork.", gap: 0.35 },
];
const N = LINES.length, END_HOLD = 3.4, COL = { Mac: "#F5C400", Jess: "#8fe3a0", Dev: "#ff9e7a" };

const out = document.getElementById("out"); out.width = W; out.height = H; const ctx = out.getContext("2d");
const glCanvas = document.getElementById("gl"); glCanvas.width = W; glCanvas.height = H;
let renderer, world, camera, av = {}, dog, spot, icon, bufs = [], words = [], VO_AT = [], VO_END = [], DURATION = 0, END_AT = 0, drops = [];

window.prepare = async () => {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  world = createWorld(W, H, { night: true }); camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 400); window.__cam = camera;
  av.Mac = createAvatar({ name: "Mac", skin: "#e8b98a", shirt: "#e9e6df", vest: "#fff", pants: "#2b2f3a", hat: "#5a4636", fedora: true, coat: true, stache: true, brows: true, hairColor: "#3a2519" });
  av.Jess = createAvatar({ name: "Jess", skin: "#f3c9a5", shirt: "#1f9d8b", vest: "#c8e63a", pants: "#2b2f3a", hat: "#ffffff", ponytail: true, lashes: true, glasses: true, hairColor: "#7a3b1d" });
  av.Dev = createAvatar({ name: "Dev", skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", beard: true, brows: true, glove: "#2a2a2d", hairColor: "#1d1410" });
  for (const a of Object.values(av)) world.scene.add(a.root);
  dog = createDog(); world.scene.add(dog.root);
  spot = new THREE.SpotLight("#fff1d0", 800, 55, 0.4, 0.6, 1.3); spot.position.set(2.6, 19, 9); spot.target.position.set(2.4, 2, 4.6); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0005; world.scene.add(spot, spot.target);
  const dt = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#7cc6ff"; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(58, 36, 32, 58); g.quadraticCurveTo(6, 36, 32, 4); g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(24, 36, 6, 0, 7); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dt, transparent: true, depthTest: false })); s.scale.setScalar(0.5); s.renderOrder = 12; s.visible = false; world.scene.add(s); drops.push(s); }
  icon = await loadImg("/icon.png");
  const dec = new OfflineAudioContext(1, 48000, 48000); let t = 0;
  for (let i = 0; i < N; i++) {
    const n = String(i + 1).padStart(2, "0");
    bufs.push(await dec.decodeAudioData(await (await fetch(`/vo/vo-${n}.mp3`)).arrayBuffer()));
    words.push(await (await fetch(`/vo/vo-${n}.json`)).json());
    t += LINES[i].gap; VO_AT.push(t); const lw = words[i][words[i].length - 1], sp = lw ? lw.t + lw.d : bufs[i].duration; const dur = Math.min(bufs[i].duration, sp + 0.4); VO_END.push(t + dur); t += dur;
  }
  END_AT = t; DURATION = t + END_HOLD;
  return { duration: +DURATION.toFixed(2), lines: VO_AT.map((a, i) => [+a.toFixed(2), +VO_END[i].toFixed(2)]), W, H };
};
const L = (i) => VO_AT[i], LE = (i) => VO_END[i];
const W_ = (i, re, fb = 0) => { const ws = words[i]; const k = ws.findIndex((w) => re.test(w.w)); return VO_AT[i] + (k >= 0 ? ws[k].t : (ws[ws.length - 1].t + ws[ws.length - 1].d) * fb); };
const lineAt = (t) => { for (let i = 0; i < N; i++) if (t >= L(i) - 0.05 && t < LE(i) + 0.05) return i; return -1; };
function mouthFor(who, t) {
  const i = lineAt(t); if (i < 0 || LINES[i].who !== who) return null; const ws = words[i], rel = t - L(i);
  for (let k = 0; k < ws.length; k++) if (rel >= ws[k].t - 0.02 && rel < ws[k].t + ws[k].d + 0.05) return ["talk1", "talk2", "talk3", "talk2", "talk1", "talk3"][Math.floor((rel - ws[k].t) * 11 + k * 2) % 6];
  return "smile";
}
const talkAmt = (who, t) => { const i = lineAt(t); return i >= 0 && LINES[i].who === who ? ease((t - L(i) + 0.1) / 0.25) * (1 - ease((t - LE(i)) / 0.2)) : 0; };
const blinkOf = (t, s) => ((t + s) % 3.6 < 0.13 ? "blink" : null);
const gest = (t, s, g) => ({ armL: [(-0.25 - 0.4 * (0.5 + 0.5 * Math.sin(t * 2.1 + s))) * g, -0.18 * g], armR: [(-0.3 - 0.5 * (0.5 + 0.5 * Math.sin(t * 2.7 + s + 1))) * g, 0.25 * g * (0.5 + 0.5 * Math.sin(t * 1.9 + s))] });

// ── the acting ─────────────────────────────────────────────────────────────────────────────────
const DX = 2.4, DZ = 4.6, JX = 8, JZ = 5.6;
function acting(t) {
  const g = (who, s, k = 1) => gest(t, s, (0.12 + 0.88 * talkAmt(who, t)) * k);
  const step = ease((t - (L(3) - 0.1)) / 0.9), mx = t < 4.9 ? mixPath(t, [[0, -15], [4.8, -3.4]]) : lerp(-3.4, -1.2, step), mz = t < 4.9 ? mixPath(t, [[0, 13], [4.8, 5.2]]) : 5.2;
  const walking = t < 4.9;
  const gm = g("Mac", 0.4, 0.55);
  const m = { x: mx, z: mz, ry: walking ? 0.95 - ease(t / 4.8) * 0.0 : 1.2, ph: t * 7, amt: walking ? 0.9 : 0, armL: gm.armL, armR: gm.armR, lean: walking ? 0 : 0.05 + 0.2 * step * (1 - ease((t - LE(4)) / 0.4)), hp: 0.04 * Math.sin(t * 1.3) };
  if (!walking && t < L(3) - 0.1) { m.ry = 1.2 + 0.0; }
  // points a finger at Dev while he asks
  const pt = ease((t - L(3)) / 0.3) * (1 - ease((t - LE(3)) / 0.3)); if (pt > 0) m.armR = [-1.5 * pt, 0.2 * pt];
  // phone out for the evidence
  const ph = ease((t - (L(5) + 0.9)) / 0.35) * (1 - ease((t - (LE(9) - 0.2)) / 0.4));
  if (ph > 0) { m.armR = [-1.45 * ph, -0.15 * ph]; av.Mac.phone.visible = true; } else av.Mac.phone.visible = false;
  // a slow dramatic head turn to the camera before the first line
  if (t > L(10)) { const k = ease((t - L(10)) / 0.4); m.hy = -0.5 * k; }
  const gj = g("Jess", 1.9, 1.2);
  const jz = { x: JX, z: JZ, ry: -0.95, armL: [-1.25, -0.1], armR: gj.armR, hy: 0.1 };
  av.Jess.clip.visible = true;
  const cc = ease((t - L(8)) / 0.2) * (1 - ease((t - (LE(8) + 0.8)) / 0.4)); if (cc > 0) { jz.armR = [-3.0 * cc, 0.4 * cc]; jz.hop = Math.abs(Math.sin(t * 8)) * 0.7 * cc; }
  const fin = ease((t - L(10)) / 0.5); if (fin > 0 && !cc) jz.armR = [-0.6, 0.35 * fin];
  const gd = g("Dev", 3.1, 0.9);
  const dv = { x: DX, z: DZ, ry: -1.15, armL: gd.armL, armR: gd.armR, sway: 0.03 * Math.sin(t * 5.5) * (t > L(3) ? 1 : 0), hp: t > L(7) ? 0.35 : 0 };
  const fr = ease((t - L(4)) / 0.2) * (1 - ease((t - LE(4)) / 0.3)); if (fr > 0) dv.armR = [-0.5 - 0.5 * Math.max(0, Math.sin(t * 8)) * fr, 0.7];
  const bag = t > L(7) - 0.25; av.Dev.bag.visible = bag; if (bag) dv.armL = [-0.95, 0.0];
  if (t > L(7) && t < L(9)) { dv.armR = [-0.2, 0.55 + 0.1 * Math.sin(t * 4)]; }
  const face = (who, base) => mouthFor(who, t) || blinkOf(t, who.length * 1.3) || base;
  const f = {
    Mac: face("Mac", t > L(10) ? "smile" : "stern"),
    Jess: face("Jess", t > L(8) - 0.05 ? "cheer" : "stern"),
    Dev: face("Dev", t > L(8) + 1 ? "smile" : t > L(3) ? "oops" : "smile"),
  };
  const dg = { x: 4.9, z: 5.5, ry: -1.35, sit: true, t };
  return { Mac: m, Jess: jz, Dev: dv, dog: dg, face: f };
}

// ── camera ─────────────────────────────────────────────────────────────────────────────────────
const SHOTS = [
  { look: [[0, 4, 6], [-1, 3.8, 5.5]], az: [24, 12], el: [10, 5], d: [38, 24], vv: 1.2 },
  { look: [[JX, 3.9, JZ]], az: [-26, -18], el: [3, 3], d: [11, 9.5] },
  { look: [[-3.4, 4.1, 5.2]], az: [30, 22], el: [2, 2], d: [8.5, 6.8] },
  { look: [[-0.4, 3.9, 4.9]], az: [4, -2], el: [4, 4], d: [15, 12.5], vv: 1.45 },
  { look: [[DX, 3.9, DZ]], az: [-30, -20], el: [2, 2], d: [9, 7] },
  { look: [[-1.2, 3.9, 5.2]], az: [32, 24], el: [2, 2], d: [10, 8.6], lyV: 1.1 },
  { look: [[-1.2, 3.9, 5.2]], az: [26, 18], el: [2, 2], d: [10.5, 9.5], lyV: 1.9 },
  { look: [[DX, 3.9, DZ]], az: [-24, -16], el: [2, 2], d: [8.4, 6.6] },
  { look: [[2.6, 3.9, 5.2]], az: [0, 0], el: [5, 5], d: [17, 15], vv: 2.0 },
  { look: [[-1.2, 3.9, 5.2]], az: [26, 14], el: [2, 2], d: [10, 8.6], lyV: 1.7 },
  { look: [[2.4, 3.9, 5.2]], az: [0, 0], el: [5, 5], d: [16.5, 14.5], vv: 2.05, lyV: 1.0 },
  { look: [[-1.2, 4.2, 5.2]], az: [14, 0], el: [2, 2], d: [8, 13], vv: 1.3, lyV: 1.8 },
];
const cutAt = (i) => (i === 0 ? 0 : L(i) - 0.25);
function placeCamera(t) {
  let i = 0; for (let k = 0; k < N; k++) if (t >= cutAt(k)) i = k;
  const s = SHOTS[i], a = cutAt(i), b = i + 1 < N ? cutAt(i + 1) : DURATION, u = ease((t - a) / (b - a));
  const lk0 = s.look.length > 1 ? s.look[0].map((v, k) => lerp(v, s.look[1][k], u)) : s.look[0], lk = V && s.lyV ? [lk0[0], lk0[1] + s.lyV, lk0[2]] : lk0;
  const az = lerp(s.az[0], s.az[1], u) * Math.PI / 180, el = lerp(s.el[0], s.el[1], u) * Math.PI / 180, d = lerp(s.d[0], s.d[1], u) * (V ? (s.vv ?? 1.55) : 1);
  const hx = 0.04 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 5.3), hy = 0.03 * Math.sin(t * 1.3 + 1);
  camera.position.set(hx + lk[0] + d * Math.sin(az) * Math.cos(el), hy + lk[1] + d * Math.sin(el) + (V ? 0.4 : 0), lk[2] + d * Math.cos(az) * Math.cos(el));
  camera.lookAt(lk[0], lk[1] + (V ? 0.5 : 0), lk[2]); camera.updateProjectionMatrix(); return i;
}

// ── overlays ───────────────────────────────────────────────────────────────────────────────────
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const UI = `"Segoe UI", Arial, sans-serif`, DISP = `Impact, "Arial Black", Arial`, TYPE = `"Courier New", monospace`;
const pop = (cx, cy, k, fn) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.globalAlpha = clamp(k * 1.6); fn(); ctx.restore(); };
function card(w, h, accent = "#F5C400") { ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 32; ctx.shadowOffsetY = 10; ctx.fillStyle = "#fff"; rr(-w / 2, -h / 2, w, h, 26); ctx.fill(); ctx.restore(); ctx.fillStyle = accent; ctx.save(); rr(-w / 2, -h / 2, w, h, 26); ctx.clip(); ctx.fillRect(-w / 2, -h / 2, w, 14); ctx.restore(); }
const OV = () => (V ? { x: W / 2, y: H * 0.2 } : { x: W * 0.77, y: H * 0.36 });
const win = (t, a, b, fi = 0.35, fo = 0.3) => easeBack((t - a) / fi) * (1 - ease((t - (b - fo)) / fo));
const flashAt = (t) => Math.max(0, Math.exp(-Math.abs(t - (L(2) + 0.15)) * 14), 0.8 * Math.exp(-Math.abs(t - (L(2) + 0.5)) * 12));

function drawOverlays(t) {
  const o = OV();
  // title card
  { const k = easeOut((t - 0.3) / 0.6) * (1 - ease((t - 3.7) / 0.6)); if (k > 0.01) { ctx.save(); ctx.globalAlpha = k; ctx.textAlign = "center"; const cx = W / 2, cy = H * (V ? 0.36 : 0.42);
      ctx.fillStyle = "rgba(6,8,18,.45)"; ctx.fillRect(0, cy - 150, W, 330);
      ctx.fillStyle = "#e9e2cf"; ctx.font = `700 ${V ? 44 : 40}px ${TYPE}`; ctx.fillText("A CONSTRA SKIT", cx, cy - 80);
      ctx.font = `900 ${V ? 70 : 76}px ${DISP}`; ctx.fillText("THE CASE OF THE", cx, cy);
      ctx.fillStyle = "#F5C400"; ctx.font = `900 ${V ? 150 : 150}px ${DISP}`; ctx.fillText("MISSING HOURS", cx, cy + (V ? 135 : 140)); ctx.restore(); } }
  // typewriter place and time
  { const a = L(0) + 1.4, b = LE(0) + 0.3, k = clamp((t - a) / 0.3) * (1 - ease((t - b) / 0.3)); if (k > 0.01) { const s1 = "FRIDAY 4:58 PM", s2 = "DUNDAS ST RENO · ON SITE", n = Math.floor((t - a) * 22); ctx.save(); ctx.globalAlpha = k; ctx.font = `700 ${V ? 34 : 30}px ${TYPE}`; ctx.fillStyle = "#e9e2cf"; ctx.shadowColor = "#000"; ctx.shadowBlur = 8; ctx.fillText(s1.slice(0, n), V ? 48 : 64, V ? H * 0.72 : H * 0.72); ctx.fillText(s2.slice(0, Math.max(0, n - 14)), V ? 48 : 64, (V ? H * 0.72 : H * 0.72) + 46); ctx.restore(); } }
  // Constra logo pops when Mac names it
  { const a = W_(5, /constra/i, 0.5) - 0.1, k = win(t, a, a + 2.3); if (k > 0.01) pop(o.x, o.y, k, () => { card(600, 230); ctx.drawImage(icon, -250, -72, 130, 130); ctx.fillStyle = "#151617"; ctx.font = `900 92px ${DISP}`; ctx.textBaseline = "middle"; ctx.fillText("CONSTRA", -102, -6); ctx.font = `600 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText("Every clock-in, on record.", -250, 82); ctx.textBaseline = "alphabetic"; }); }
  // the GPS log
  { const k = win(t, L(6) + 0.1, LE(6) + 0.7, 0.4, 0.35); if (k > 0.01) pop(o.x, o.y + 50, k, () => { card(680, 500, "#e0342a");
      ctx.fillStyle = "#151617"; ctx.font = `900 44px ${DISP}`; ctx.fillText("GPS LOG · DEV", -306, -170); ctx.fillStyle = "#77797C"; ctx.font = `600 24px ${UI}`; ctx.fillText("Dundas St Reno  →  Taco truck, 1.8 km", -306, -134);
      [["TUE", "11:42 → 12:42", W_(6, /^Tuesday/i, 0.2)], ["WED", "11:15 → 12:15", W_(6, /^Wednesday/i, 0.4)], ["THU", "11:30 → 12:30", W_(6, /^Thursday/i, 0.5)]].forEach(([d, r, at], i) => { const y = -70 + i * 84, kk = easeBack((t - at) / 0.3); ctx.save(); ctx.globalAlpha = clamp(kk * 2); ctx.translate(0, (1 - clamp(kk)) * 14);
        ctx.fillStyle = "#fdecea"; rr(-306, y - 30, 612, 68, 18); ctx.fill(); ctx.fillStyle = "#e0342a"; ctx.beginPath(); ctx.arc(-270, y + 4, 13, 0, 7); ctx.fill(); ctx.fillStyle = "#151617"; ctx.font = `800 32px ${UI}`; ctx.fillText(d, -244, y + 15); ctx.font = `600 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText(r, -150, y + 15); ctx.textAlign = "right"; ctx.fillStyle = "#e0342a"; ctx.font = `800 30px ${UI}`; ctx.fillText("1h 00m", 292, y + 15); ctx.textAlign = "left"; ctx.restore(); });
      const tk = easeBack((t - W_(6, /truck/i, 0.9)) / 0.3); ctx.save(); ctx.globalAlpha = clamp(tk * 2); ctx.fillStyle = "#151617"; rr(-306, 190, 612, 76, 20); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `800 34px ${UI}`; ctx.fillText("Off site this week", -282, 238); ctx.textAlign = "right"; ctx.fillStyle = "#F5C400"; ctx.font = `900 52px ${DISP}`; ctx.fillText("3h 00m", 288, 242); ctx.textAlign = "left"; ctx.restore(); }); }
  // CASE CLOSED
  { const a = L(8) + 0.2, k = (t - a) / 0.22, fade = 1 - ease((t - (LE(8) + 1.4)) / 0.4); if (k > 0 && fade > 0) { const sc = lerp(2.6, 1, easeOut(k)), shake = k < 1.4 ? Math.sin(t * 70) * (1 - clamp(k)) * 10 : 0; ctx.save(); ctx.globalAlpha = clamp(k * 3) * fade; ctx.translate(W / 2 + shake, V ? H * 0.22 : H * 0.3); ctx.rotate(-0.14); ctx.scale(sc, sc); ctx.strokeStyle = "#d62b21"; ctx.lineWidth = 16; rr(-360, -110, 720, 220, 14); ctx.stroke(); ctx.lineWidth = 6; rr(-340, -90, 680, 180, 8); ctx.stroke(); ctx.fillStyle = "#d62b21"; ctx.font = `900 150px ${DISP}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("CASE CLOSED", 0, 6); ctx.restore(); } }
  // what Constra does about it
  { const items = [["GPS clock-in", /guessing/i], ["Photo proof", /arguing/i], ["PDF + Excel timesheets", /record/i], ["Works offline", /crew/i]];
    ctx.font = `800 40px ${UI}`; const ws = items.map((it) => ctx.measureText(it[0]).width + 70), fo = 1 - ease((t - (LE(9) + 0.4)) / 0.3);
    const rows = V ? [[0, 1], [2], [3]] : [[0], [1], [2], [3]];
    rows.forEach((row, r) => { const tot = row.reduce((a2, k) => a2 + ws[k], 0) + (row.length - 1) * 16; let x = (V ? W / 2 : W * 0.77) - tot / 2; const y = (V ? H * 0.12 : H * 0.2) + r * 86;
      for (const k of row) { const kk = easeBack((t - W_(9, items[k][1], 0.5) + 0.05) / 0.3) * fo; if (kk > 0.01) pop(x + ws[k] / 2, y, kk, () => { ctx.font = `800 40px ${UI}`; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; ctx.fillStyle = k === 0 ? "#F5C400" : k === 3 ? "#151617" : "#fff"; rr(-ws[k] / 2, -32, ws[k], 64, 32); ctx.fill(); ctx.shadowColor = "transparent"; ctx.fillStyle = k === 3 ? "#F5C400" : "#151617"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(items[k][0], 0, 2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }); x += ws[k] + 16; } }); }
  // 26 tools
  { const t0 = W_(10, /twenty/i), fin = 1 - ease((t - (LE(10) + 0.3)) / 0.3), kc = easeBack((t - t0 + 0.1) / 0.35) * fin; if (kc > 0.01) { const n = Math.round(26 * easeOut((t - t0) / 0.9)); pop(V ? W / 2 : W * 0.77, V ? H * 0.12 : H * 0.2, kc, () => { card(V ? 520 : 480, 190, "#F5C400"); ctx.fillStyle = "#151617"; ctx.font = `900 150px ${DISP}`; ctx.textAlign = "right"; ctx.fillText(String(n), -10, 54); ctx.textAlign = "left"; ctx.font = `900 52px ${DISP}`; ctx.fillText("TOOLS", 8, 8); ctx.font = `700 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText("in one app", 8, 52); }); } }
}

function wrap(text, maxW) { const ws = text.split(" "), lines = []; let cur = ""; for (const w of ws) { const t2 = cur ? cur + " " + w : w; if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); return lines; }
function drawCaption(t) {
  const i = lineAt(t); if (i < 0 || t > END_AT - 0.05) return; const ln = LINES[i], size = (V ? 52 : 40) * (ln.text.length > 80 ? 0.86 : 1), maxW = V ? W - 150 : W * 0.6;
  ctx.font = `700 ${size}px ${UI}`; const toks = ln.text.split(" "), nW = words[i].length, lines = wrap(ln.text, maxW), lh = size * 1.28, h = lines.length * lh + 70, w = Math.min(maxW + 70, Math.max(...lines.map((s) => ctx.measureText(s).width)) + 70);
  const cx = W / 2, y = V ? H * 0.8 - h / 2 + 30 : H - h - 56, a = clamp((t - L(i) + 0.15) / 0.12) * (1 - ease((t - LE(i) - 0.25) / 0.15));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - easeOut((t - L(i) + 0.15) / 0.2)) * 14); ctx.fillStyle = "rgba(8,10,20,.8)"; rr(cx - w / 2 - 20, y, w + 40, h, 22); ctx.fill();
  ctx.fillStyle = COL[ln.who]; ctx.font = `800 ${size * 0.62}px ${UI}`; ctx.fillText(`[${ln.who}]`, cx - w / 2 + 10, y + 12 + size * 0.62); ctx.font = `700 ${size}px ${UI}`; let ti = 0;
  lines.forEach((s, r) => { let x = cx - w / 2 + 10; const yy = y + 52 + size * 0.78 + r * lh; for (const tk of s.split(" ")) { const idx = ti++, at = L(i) + (words[i][Math.min(nW - 1, Math.round(idx * nW / toks.length))]?.t ?? 0) - 0.03; ctx.fillStyle = t >= at ? "#fff" : "rgba(255,255,255,.4)"; ctx.fillText(tk, x, yy); x += ctx.measureText(tk + " ").width; } });
  ctx.restore();
}
function drawBrand(t) {
  const s = V ? 1 : 0.9; ctx.save(); ctx.translate(V ? 48 : 64, V ? 58 : 48); ctx.scale(s, s); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 12; ctx.drawImage(icon, 0, 0, 56, 56); ctx.fillStyle = "#fff"; ctx.font = `900 42px ${DISP}`; ctx.textBaseline = "middle"; ctx.fillText("CONSTRA", 72, 30); ctx.restore();
  const k = 1 - ease((t - 4.6) / 0.5); if (k > 0.01) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = "rgba(8,10,20,.7)"; ctx.font = `700 24px ${UI}`; const s2 = "Animated skit. Characters are fictional."; const w = ctx.measureText(s2).width + 36; rr(V ? 48 : 64, V ? 128 : 112, w, 44, 22); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(s2, (V ? 48 : 64) + 18, (V ? 128 : 112) + 23); ctx.restore(); }
  ctx.textBaseline = "alphabetic";
}
function drawEnd(t) {
  const k = easeOut((t - (END_AT - 0.35)) / 0.7); const size = V ? 118 : 100;
  [["RUN THE JOB,", /^run$/i], ["NOT THE", /^not$/i], ["PAPERWORK.", /paperwork/i]].forEach(([w, re], i) => { const at = W_(11, re, 0.8) - 0.05; if (t < at) return; const kk = easeBack((t - at) / 0.35) * (1 - ease((t - (END_AT - 0.1)) / 0.3)); if (kk <= 0.01) return; ctx.save(); ctx.globalAlpha = clamp(kk * 2); ctx.translate(V ? W / 2 : W * 0.77, (V ? H * 0.12 : H * 0.28) + i * size); ctx.scale(0.8 + 0.2 * kk, 0.8 + 0.2 * kk); ctx.textAlign = "center"; ctx.font = `900 ${size}px ${DISP}`; ctx.lineWidth = size * 0.11; ctx.strokeStyle = "rgba(10,12,20,.7)"; ctx.lineJoin = "round"; ctx.strokeText(w, 0, 0); ctx.fillStyle = i === 2 ? "#F5C400" : "#fff"; ctx.fillText(w, 0, 0); ctx.restore(); });
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = k * 0.9; ctx.fillStyle = "#0b0e18"; ctx.fillRect(0, 0, W, H); ctx.restore();
  const cx = W / 2, cy = H * (V ? 0.42 : 0.44); ctx.save(); ctx.globalAlpha = k; ctx.translate(cx, cy + (1 - k) * 30); const is = V ? 150 : 120; ctx.drawImage(icon, -is / 2, -is * 1.7, is, is); ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `900 ${V ? 150 : 128}px ${DISP}`; ctx.fillText("CONSTRA", 0, 0);
  ctx.fillStyle = "#F5E9B8"; ctx.font = `600 ${V ? 40 : 36}px ${UI}`; ctx.fillText("Run the job, not the paperwork.", 0, 70); ctx.fillStyle = "#F5C400"; ctx.fillRect(-60, 100, 120, 7);
  const bk = easeBack((t - END_AT - 0.1) / 0.4); ctx.globalAlpha = clamp(bk * 2); ctx.translate(0, 190 + (1 - clamp(bk)) * 20); const bw = V ? 520 : 440, bh = V ? 104 : 90; ctx.fillStyle = "#F5C400"; rr(-bw / 2, -bh / 2, bw, bh, 18); ctx.fill(); ctx.fillStyle = "#141414"; ctx.font = `800 ${V ? 40 : 34}px ${UI}`; ctx.textBaseline = "middle"; ctx.fillText("START FREE", 0, 2); ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `600 ${V ? 36 : 30}px ${UI}`; ctx.fillText("getconstra.com", 0, bh / 2 + 56); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `500 ${V ? 26 : 22}px ${UI}`; ctx.fillText("Free while we launch  ·  Android, iPhone and web", 0, bh / 2 + 100); ctx.restore();
}

// ── one frame ──────────────────────────────────────────────────────────────────────────────────
window.drawFrame = (t) => {
  const fl = flashAt(t); world.hemi.intensity = 1.5 + 4 * fl; world.sun.intensity = 1.9 + 3 * fl;
  world.update(t);
  const st = acting(t);
  for (const k of ["Mac", "Jess", "Dev"]) { av[k].setFace(st.face[k]); av[k].set({ ...st[k], tag: false }); }
  dog.set(st.dog);
  // sweat
  { const on = t > L(5) && t < LE(8) + 0.5; drops.forEach((s, i) => { s.visible = on; if (!on) return; const k = ((t * 0.9) + i / 4) % 1; s.position.set(DX + (i - 1.5) * 0.45, 6.3 - k * 1.6, DZ + 0.7); s.material.opacity = 1 - k * 0.8; }); }
  const si = placeCamera(t);
  renderer.render(world.scene, camera);
  ctx.clearRect(0, 0, W, H); ctx.drawImage(glCanvas, 0, 0);
  { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.hypot(W, H) * 0.6); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(4,6,16,.55)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (fl > 0.02) { ctx.save(); ctx.globalAlpha = Math.min(0.5, fl * 0.5); ctx.fillStyle = "#e8f0ff"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  drawOverlays(t); drawEnd(t); drawBrand(t); drawCaption(t);
};

// ── sound: rain, thunder, a noir bed that turns upbeat for the promo ───────────────────────────
async function mixAudio() {
  const SR = 48000, A = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const master = A.createGain(); master.gain.setValueAtTime(0.95, 0); master.gain.setValueAtTime(0.95, DURATION - 1.4); master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18; comp.connect(master).connect(A.destination);
  const vox = A.createGain(); vox.gain.value = 1.25; const hp = A.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80; const warm = A.createBiquadFilter(); warm.type = "lowshelf"; warm.frequency.value = 200; warm.gain.value = 2.5; const pres = A.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3000; pres.gain.value = 2.2; pres.Q.value = 0.9;
  vox.connect(hp).connect(warm).connect(pres); const dry = A.createGain(); pres.connect(dry).connect(comp);
  const ir = A.createBuffer(2, Math.round(SR * 0.5), SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 11 + c * 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / d.length, 3); } }
  const conv = A.createConvolver(); conv.buffer = ir; const wet = A.createGain(); wet.gain.value = 0.14; pres.connect(conv).connect(wet).connect(comp);
  bufs.forEach((b, i) => { const s = A.createBufferSource(); s.buffer = b; s.connect(vox); s.start(VO_AT[i]); });
  const noiseBuf = A.createBuffer(1, SR * 2, SR); { const d = noiseBuf.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  // rain bed
  { const src = A.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 5200; bp.Q.value = 0.5; const g = A.createGain(); g.gain.setValueAtTime(0.16, 0); g.gain.linearRampToValueAtTime(0.05, L(10)); src.connect(bp).connect(g).connect(comp); src.start(0); src.stop(DURATION); }
  // thunder
  for (const tt of [L(2) + 0.2, L(2) + 0.55]) { const src = A.createBufferSource(); src.buffer = noiseBuf; const lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(900, tt + 0.3); lp.frequency.exponentialRampToValueAtTime(90, tt + 2.4); const g = A.createGain(); g.gain.setValueAtTime(0.0001, tt + 0.2); g.gain.exponentialRampToValueAtTime(0.7, tt + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, tt + 2.6); src.connect(lp).connect(g).connect(comp); src.start(tt + 0.2); src.stop(tt + 2.8); }
  // the bed
  const bed = A.createGain(); bed.gain.value = 0.5; bed.connect(comp); const duck = A.createGain(); duck.gain.setValueAtTime(1, 0); duck.connect(bed);
  for (let i = 0; i < N; i++) { const a = VO_AT[i] - 0.05, b = VO_END[i]; duck.gain.setValueAtTime(1, Math.max(0, a - 0.15)); duck.gain.linearRampToValueAtTime(0.4, a + 0.05); duck.gain.setValueAtTime(0.4, b); duck.gain.linearRampToValueAtTime(1, b + 0.4); }
  const note = (f, t, d, type, vol, lpf) => { const o = A.createOscillator(); o.type = type; o.frequency.value = f; const g = A.createGain(), lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp).connect(g).connect(duck); o.start(t); o.stop(t + d + 0.05); };
  const hat = (t, v) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const hf = A.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 7500; const g = A.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(hf).connect(g).connect(duck); s.start(t); s.stop(t + 0.08); };
  const kick = (t, v) => { const o = A.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(duck); o.start(t); o.stop(t + 0.28); };
  const SW = L(10) - 0.4, noirBPM = 68, nb = 60 / noirBPM;
  const dm7 = [[146.8, 174.6, 220, 261.6], [196, 246.9, 293.7, 349.2], [130.8, 164.8, 196, 246.9], [220, 277.2, 329.6, 392]]; // Dm7 G7 Cmaj7 A7 (loosely)
  const walk = [[73.4, 87.3, 110, 98], [98, 123.5, 146.8, 130.8], [65.4, 82.4, 98, 87.3], [110, 138.6, 164.8, 130.8]];
  for (let b = 0; b * nb * 4 < SW; b++) { const t0 = b * nb * 4, ch = dm7[b % 4], wk = walk[b % 4];
    for (let k = 0; k < 4; k++) { note(wk[k], t0 + k * nb, nb * 0.9, "triangle", 0.26, 420); hat(t0 + k * nb + nb * (k % 2 ? 0.66 : 0), 0.04); }
    if (b % 2 === 0) { ch.forEach((f, k) => note(f * 2, t0 + 0.02 * k + nb * 0.05, nb * 3, "sine", 0.05, 1800)); } else { note(ch[2] * 2, t0 + nb * 1.66, nb * 0.8, "triangle", 0.08, 2000); note(ch[3] * 2, t0 + nb * 2.66, nb * 0.8, "triangle", 0.07, 2000); } }
  { const BPM = 116, BEAT = 60 / BPM, BAR = BEAT * 4, chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]], roots = [65.4, 49, 55, 43.65];
    for (let b = 0; SW + b * BAR < DURATION; b++) { const t0 = SW + b * BAR, ch = chords[b % 4], rt = roots[b % 4]; for (let k = 0; k < 8; k++) note(ch[[0, 1, 2, 1, 0, 1, 2, 1][k]] * 2, t0 + k * BEAT / 2, 0.22, "square", 0.04, 2400); for (let k = 0; k < 4; k++) { note(rt * 2, t0 + k * BEAT, BEAT * 0.8, "triangle", 0.2, 500); kick(t0 + k * BEAT, 0.3); hat(t0 + k * BEAT + BEAT / 2, 0.05); } } }
  // effects
  const ping = (t, f, v) => { const o = A.createOscillator(); o.frequency.value = f; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.8); };
  const blip = (t, f, v = 0.12) => { const o = A.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.08); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.2); };
  ping(L(5) + 0.9, 1568, 0.2); ping(L(5) + 1.01, 2093, 0.18);
  for (const t of [W_(6, /^Tuesday/i, 0.2), W_(6, /^Wednesday/i, 0.4), W_(6, /^Thursday/i, 0.5), W_(6, /truck/i, 0.9), W_(9, /guessing/i), W_(9, /arguing/i), W_(9, /record/i), W_(9, /crew/i), W_(10, /twenty/i)]) blip(t, 520 + (t * 37 % 5) * 60);
  { const tt = L(8) + 0.2; const o = A.createOscillator(); o.frequency.setValueAtTime(110, tt); o.frequency.exponentialRampToValueAtTime(40, tt + 0.2); const g = A.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.9, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5); o.connect(g).connect(comp); o.start(tt); o.stop(tt + 0.6); const s = A.createBufferSource(); s.buffer = noiseBuf; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; const g2 = A.createGain(); g2.gain.setValueAtTime(0.4, tt); g2.gain.exponentialRampToValueAtTime(0.0001, tt + 0.18); s.connect(bp).connect(g2).connect(comp); s.start(tt); s.stop(tt + 0.25); }
  return await A.startRendering();
}

// ── encode ─────────────────────────────────────────────────────────────────────────────────────
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

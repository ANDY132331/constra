import * as THREE from "three";
import { createWorld, createAvatar, createDog } from "/world.js";

// ── format ──────────────────────────────────────────────────────────────────────────────────────
const MODE = new URLSearchParams(location.search).get("mode") === "h" ? "h" : "v";
const W = MODE === "v" ? 1080 : 1920, H = MODE === "v" ? 1920 : 1080, FPS = 30, V = MODE === "v";
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t = clamp(t), t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeBack = (t) => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("img " + src)); i.src = src; });

// ── the script: who says what, and how it's shown in the captions ──────────────────────────────
const LINES = [
  { who: "Mac",  text: "Hey. I'm Mac. I run a framing crew.", gap: 0.9 },
  { who: "Mac",  text: "Every Friday, same story... Who worked Tuesday?", gap: 0.3 },
  { who: "Jess", text: "Mac! I was on Queen Street!", gap: 0.12 },
  { who: "Mac",  text: "Or was it the other job? Honestly... nobody knows.", gap: 0.18 },
  { who: "Mac",  text: "So I put my whole crew on Constra.", gap: 0.55 },
  { who: "Jess", text: "Clocked in. Photo, location, done.", gap: 0.35 },
  { who: "Mac",  text: "And now I can actually see who's on site.", gap: 0.3 },
  { who: "Mac",  text: "Wait... Dev just left the site. On the clock!", gap: 0.5 },
  { who: "Dev",  text: "Uh... lunch run?", gap: 0.18 },
  { who: "Mac",  text: "Constra told me. The exact time, and how far you went.", gap: 0.22 },
  { who: "Mac",  text: "Come Friday, the timesheets are just there. My logo on top. PDF or Excel. Overtime already worked out.", gap: 0.5 },
  { who: "Mac",  text: "Hours track themselves. Every worker, every job.", gap: 0.4 },
  { who: "Mac",  text: "I plan the crew's schedule, and see daily tasks and progress at a glance.", gap: 0.3 },
  { who: "Mac",  text: "There's even an AI assistant. Just ask it. How many hours did Jess work?", gap: 0.3 },
  { who: "Mac",  text: "Twenty-six tools, in one app. Estimates, invoices, RFIs, change orders, plus twenty-three more tools. And it all works when the signal drops.", gap: 0.35 },
  { who: "Mac",  text: "It's free while it's launching. Get your crew on Constra.", gap: 0.45 },
  { who: "Mac",  text: "Constra. Run the job, not the paperwork.", gap: 0.4 },
];
const END_HOLD = 3.4;
const N = LINES.length;
const COL = { Mac: "#F5C400", Jess: "#8fe3a0", Dev: "#ff9e7a" };

// ── set-up ──────────────────────────────────────────────────────────────────────────────────────
const out = document.getElementById("out"); out.width = W; out.height = H; const ctx = out.getContext("2d");
const glCanvas = document.getElementById("gl"); glCanvas.width = W; glCanvas.height = H;
let dog, renderer, world, camera, av = {}, icon, doc, bufs = [], words = [], VO_AT = [], VO_END = [], DURATION = 0, END_AT = 0;

window.prepare = async () => {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  world = createWorld(W, H); camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 400); window.__cam = camera; window.__dbg = { av, get world() { return world; } };
  av.Mac = createAvatar({ name: "Mac", tagColor: COL.Mac, skin: "#e8b98a", shirt: "#2f6db5", vest: "#ff7a1c", pants: "#3c4a63", hat: "#F5C400", stache: true, brows: true, hairColor: "#3a2519" });
  av.Jess = createAvatar({ name: "Jess", tagColor: COL.Jess, skin: "#f3c9a5", shirt: "#1f9d8b", vest: "#c8e63a", pants: "#2b2f3a", hat: "#ffffff", ponytail: true, lashes: true, glasses: true, hairColor: "#7a3b1d" });
  av.Dev = createAvatar({ name: "Dev", tagColor: COL.Dev, skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", beard: true, brows: true, glove: "#2a2a2d", hairColor: "#1d1410" });
  for (const a of Object.values(av)) world.scene.add(a.root);
  const npc = (o) => { const a = createAvatar({ name: '', ...o }); world.scene.add(a.root); return a; };
  av.N1 = npc({ skin: '#c98f63', shirt: '#7a5a3a', vest: '#ff7a1c', pants: '#34495e', hat: '#ffffff', beard: true, hairColor: '#241812' });
  av.N2 = npc({ skin: '#f1c7a0', shirt: '#b5413a', vest: '#c8e63a', pants: '#3a3f46', hat: '#3a86d9', stache: true, hairColor: '#8a5a2b', glasses: true });
  av.N3 = npc({ skin: '#8d5a3b', shirt: '#2f9e8f', vest: '#ff7a1c', pants: '#2b2f3a', hat: '#F5C400', hairColor: '#120d0a', brows: true });
  av.N4 = npc({ skin: '#d9a77c', shirt: '#6b4fa0', vest: '#c8e63a', pants: '#3a3f46', hat: '#ff7a1c', beard: true, hairColor: '#4a3220', glasses: true });
  av.N5 = npc({ skin: '#b8835a', shirt: '#2a2d31', vest: '#ff7a1c', pants: '#2a2d31', hat: '#d94a38', stache: true, hairColor: '#1d1410', glove: '#2a2a2d' });
  av.N6 = npc({ skin: '#efc19a', shirt: '#2f6db5', vest: '#ff7a1c', pants: '#34495e', hat: '#ffffff', brows: true, hairColor: '#8a5a2b' });
  dog = createDog(); world.scene.add(dog.root);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 6), new THREE.MeshStandardMaterial({ color: '#d9a45f', roughness: 0.6 })); plank.position.set(0, 3.0, 1.1); plank.castShadow = true; av.N2.root.add(plank);
  [icon, doc] = await Promise.all([loadImg("/icon.png"), loadImg("/timesheet.png")]);
  const dec = new OfflineAudioContext(1, 48000, 48000);
  let t = 0;
  for (let i = 0; i < N; i++) {
    const n = String(i + 1).padStart(2, "0");
    bufs.push(await dec.decodeAudioData(await (await fetch(`/vo/vo-${n}.mp3`)).arrayBuffer()));
    words.push(await (await fetch(`/vo/vo-${n}.json`)).json());
    t += LINES[i].gap; VO_AT.push(t);
    const lw = words[i][words[i].length - 1], speech = lw ? lw.t + lw.d : bufs[i].duration;
    const dur = Math.min(bufs[i].duration, speech + 0.4); VO_END.push(t + dur); t += dur;
  }
  END_AT = t; DURATION = t + END_HOLD;
  return { duration: +DURATION.toFixed(2), lines: VO_AT.map((a, i) => [+a.toFixed(2), +VO_END[i].toFixed(2)]), W, H };
};
const L = (i) => VO_AT[i], LE = (i) => VO_END[i];
const wordT = (i, k) => VO_AT[i] + (words[i][Math.min(k, words[i].length - 1)]?.t ?? 0);
const W_ = (i, re, fb = 0) => { const ws = words[i]; const k = ws.findIndex((w) => re.test(w.w)); return VO_AT[i] + (k >= 0 ? ws[k].t : (ws[ws.length - 1].t + ws[ws.length - 1].d) * fb); };
const lineAt = (t) => { for (let i = 0; i < N; i++) if (t >= L(i) - 0.05 && t < LE(i) + 0.05) return i; return -1; };

// ── who is talking, and the mouth ──────────────────────────────────────────────────────────────
function mouthFor(who, t) {
  const i = lineAt(t); if (i < 0 || LINES[i].who !== who) return null;
  const ws = words[i], rel = t - L(i);
  for (let k = 0; k < ws.length; k++) if (rel >= ws[k].t - 0.02 && rel < ws[k].t + ws[k].d + 0.05) return ["talk1", "talk2", "talk3", "talk2", "talk1", "talk3"][Math.floor((rel - ws[k].t) * 11 + k * 2) % 6];
  return "smile";
}
const talkAmt = (who, t) => { const i = lineAt(t); return i >= 0 && LINES[i].who === who ? ease((t - L(i) + 0.1) / 0.25) * (1 - ease((t - LE(i)) / 0.2)) : 0; };
const blinkOf = (t, s) => { const p = (t + s) % 3.4; return p < 0.13 ? "blink" : null; };
const gest = (t, s, g) => ({ armL: [(-0.3 - 0.45 * (0.5 + 0.5 * Math.sin(t * 2.1 + s))) * g, -0.2 * g], armR: [(-0.35 - 0.55 * (0.5 + 0.5 * Math.sin(t * 2.7 + s + 1))) * g, 0.28 * g * (0.5 + 0.5 * Math.sin(t * 1.9 + s))] });
const mixPath = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))); return keys[keys.length - 1][1]; };

const POS = { Mac: [-2.2, 4.4], Jess: [2.8, 4.7], Dev: [6.6, 3.9] };

function acting(t) {
  const g = (who, s) => { const k = talkAmt(who, t); return gest(t, s, 0.15 + 0.85 * k); };
  const celeb = ease((t - (L(15) + 0.5)) / 0.3);
  const hop = celeb * Math.abs(Math.sin(t * 7)) * 0.9;
  // ---- Mac
  let m;
  { const walk = t < 2.5; const wx = mixPath(t, [[0, -9], [2.4, POS.Mac[0]]]), wz = mixPath(t, [[0, 15], [2.4, POS.Mac[1]]]);
    const phv = t * 7.2; const gg = g("Mac", 0.3);
    m = { x: walk ? wx : POS.Mac[0], z: walk ? wz : POS.Mac[1], ry: walk ? 0.75 - ease(t / 2.4) * 0.45 : 0.3 + 0.04 * Math.sin(t * 0.6), ph: phv, amt: walk ? 1 : 0, armL: gg.armL, armR: gg.armR, hy: 0, hp: 0.04 * Math.sin(t * 1.7) };
    // wave on "Hey"
    const w = ease((t - 2.4) / 0.2) * (1 - ease((t - 3.7) / 0.25)); if (w > 0) m.armR = [-2.5 * w, 0.5 * w + 0.35 * w * Math.sin(t * 11)];
    // shrug on "Nobody knows"
    const sh = ease((t - W_(3, /nobody/i, 0.7)) / 0.2) * (1 - ease((t - LE(3)) / 0.3)); if (sh > 0) { m.armL = [-0.2 * sh, -0.85 * sh]; m.armR = [-0.2 * sh, 0.85 * sh]; m.hr = 0.18 * sh; m.hp = -0.12 * sh; }
    // phone up from the moment he says Constra, until timesheets
    const ph = Math.max(ease((t - (W_(4, /konstra/i, 0.9) - 0.6)) / 0.35) * (1 - ease((t - (LE(9) + 0.25)) / 0.3)), ease((t - (L(13) - 0.2)) / 0.35) * (1 - ease((t - (LE(13) + 2.2)) / 0.3)));
    if (ph > 0) { const pt = ease((t - L(9)) / 0.25) * (1 - ease((t - LE(9)) / 0.3)); m.armR = [-1.45 * ph - 0.12 * pt, 0.1 * ph - 0.25 * pt]; av.Mac.phone.visible = true; av.Mac.scr.material.color.set(t % 1.4 < 0.7 ? "#F5C400" : "#ffd84a"); if (t > L(6) && t < LE(7)) m.hy = -0.3 * ph; } else av.Mac.phone.visible = false;
    // cheer
    if (celeb > 0) { m.armL = [-3.0 * celeb, -0.5 * celeb]; m.armR = [-3.0 * celeb, 0.5 * celeb]; m.hop = hop; m.sway = 0.06 * Math.sin(t * 7) * celeb; }
    // lean in on the tagline
    if (t > L(16) - 0.2) { const k = ease((t - L(16)) / 0.5); m.armR = [-0.35 * k - 0.1, 0.55 * k]; m.armL = [-0.15 * k, -0.1]; }
  }
  // ---- Jess
  let j;
  { const gg = g("Jess", 1.7); j = { x: POS.Jess[0], z: POS.Jess[1], ry: -0.28 + 0.03 * Math.sin(t * 0.7), ph: 0, amt: 0, armL: gg.armL, armR: gg.armR, hy: 0.25 * (1 - talkAmt("Jess", t)) };
    // phone up while she clocks in
    const ph = ease((t - (L(5) - 0.5)) / 0.3) * (1 - ease((t - (LE(5) + 0.5)) / 0.3));
    if (ph > 0) { j.armR = [-1.4 * ph, 0.12 * ph]; av.Jess.phone.visible = true; } else av.Jess.phone.visible = false;
    // shock when Mac asks about Tuesday; she answers with both hands
    const ans = ease((t - L(2)) / 0.2) * (1 - ease((t - LE(2)) / 0.3)); if (ans > 0) { j.armL = [-0.9 * ans, -0.7 * ans]; j.armR = [-0.9 * ans, 0.7 * ans]; j.hop = 0.12 * Math.abs(Math.sin(t * 9)) * ans; }
    if (celeb > 0) { j.armL = [-3.0 * celeb, -0.5 * celeb]; j.armR = [-3.0 * celeb, 0.5 * celeb]; j.hop = Math.abs(Math.sin(t * 7 + 0.9)) * 0.9 * celeb; }
  }
  // ---- Dev: hammering until he spots the food truck, then the lunch run
  let d;
  { const dx = mixPath(t, [[0, 9.6], [L(7) + 0.9, 9.6], [L(7) + 2.4, 17], [LE(8) + 0.3, 17], [LE(9) - 0.5, 17], [LE(9) + 1.6, POS.Dev[0]]]);
    const dz = mixPath(t, [[0, -2.2], [L(7) + 0.9, -2.2], [L(7) + 2.4, 6.6], [LE(9) - 0.5, 6.6], [LE(9) + 1.6, POS.Dev[1]]]);
    const moving = (t > L(7) + 0.9 && t < L(7) + 2.4) || (t > LE(9) - 0.5 && t < LE(9) + 1.6);
    const out1 = t > L(7) + 0.9 && t < L(7) + 2.4, back = t > LE(9) - 0.5 && t < LE(9) + 1.6;
    const gg = g("Dev", 2.9);
    d = { x: dx, z: dz, ry: out1 ? 1.15 : back ? -1.9 : (t < L(7) + 0.9 ? 0.6 : -0.1 + 0.03 * Math.sin(t * 0.8)), ph: t * (out1 ? 14 : 8), amt: moving ? (out1 ? 1.25 : 0.8) : 0, armL: moving ? [0, 0] : gg.armL, armR: gg.armR, y: 0 };
    if (t < L(7) + 0.9) { const sw = Math.sin(t * 9); d.armR = [-0.9 - 0.9 * Math.max(0, sw), 0]; d.armL = [-0.6, 0]; d.hp = 0.12; }
    if (out1) { d.armL = [-0.2, -0.1]; d.armR = [-0.2, 0.1]; d.lean = 0.28; }
    // caught: holds the bag, hands up a little
    if (t > L(7) + 2.4 && t < LE(9)) { av.Dev.bag.visible = true; d.armL = [-0.9, 0.0]; if (t > L(8) - 0.1) d.armR = [-0.5, 0.65 + 0.2 * Math.sin(t * 5)]; } else av.Dev.bag.visible = false;
    if (celeb > 0) { d.armL = [-3.0 * celeb, -0.5 * celeb]; d.armR = [-3.0 * celeb, 0.5 * celeb]; d.hop = Math.abs(Math.sin(t * 7 + 1.8)) * 0.9 * celeb; }
  }
  // ---- background crew: hammering, carrying a plank, working up on the platform
  const sw = Math.sin(t * 8);
  const nA = { x: -11, z: -1.5, ry: 2.2, armR: [-1.0 - 1.0 * Math.max(0, sw), 0], armL: [-0.6, 0], hp: 0.1, hy: 0.0 };
  const per = 11, ps = t % per, fwd = ps < 4.5, mv = ps < 4.5 || (ps > 5.5 && ps < 10);
  const kk = fwd ? ease(ps / 4.5) : ps > 5.5 && ps < 10 ? 1 - ease((ps - 5.5) / 4.5) : (ps >= 10 ? 0 : 1);
  const nB = { x: lerp(13, 2.2, kk), z: lerp(-0.6, -2.8, kk), ry: fwd || ps >= 10 ? -1.55 : 1.55, ph: t * 7, amt: mv ? 0.9 : 0, armL: [-1.3, 0.1], armR: [-1.3, -0.1] };
  const nC = { x: 4.8, y: 4.7, z: -5.4, ry: -0.7, armR: [-1.0 - 1.0 * Math.max(0, Math.sin(t * 7 + 1)), 0], armL: [-0.6, 0], hp: 0.12 };
  // N4 saws a plank, N6 studies the plans and waves now and then, N5 drives the forklift
  const nD = { x: 11.7, z: 2.9, ry: 0.35, armR: [-0.95 + 0.38 * Math.sin(t * 9), 0.1], armL: [-0.75, 0.05], lean: 0.12, hp: 0.15 };
  const wv = Math.max(0, Math.sin(t * 0.9 + 1)) > 0.93 ? 1 : 0;
  const nF = { x: -13, z: -6.6, ry: 0.15, lean: 0.22, hp: 0.3, armL: [-0.95, -0.15], armR: wv ? [-2.6, 0.5 + 0.35 * Math.sin(t * 11)] : [-0.95, 0.15] };
  const fp = world.fork.position;
  const nE = { x: fp.x, z: fp.z, y: 0.55, ry: world.fork.rotation.y, sit: true, armL: [-0.9, 0.1], armR: [-0.9, -0.1], tag: false };
  // the dog: hangs about, chases Dev to the taco truck, begs, then follows him back
  const sprint = (a, b) => ease((t - a) / (b - a));
  let dg; { const o = t < L(7) + 1.2, w = t * 0.5;
    if (o) dg = { x: 12 + 2.2 * Math.cos(w), z: -0.4 + 2.2 * Math.sin(w), ry: Math.atan2(-Math.sin(w), Math.cos(w)), amt: 0.8, ph: t * 9 };
    else if (t < L(7) + 3.2) { const k = sprint(L(7) + 1.2, L(7) + 3.2); dg = { x: lerp(12 + 2.2 * Math.cos((L(7) + 1.2) * 0.5), 15.4, k), z: lerp(-0.4 + 2.2 * Math.sin((L(7) + 1.2) * 0.5), 7.6, k), ry: 0.95, amt: 1.2, ph: t * 14 }; }
    else if (t < LE(9) - 0.2) dg = { x: 15.4, z: 7.6, ry: 1.9, sit: true };
    else if (t < LE(9) + 2.2) { const k = sprint(LE(9) - 0.2, LE(9) + 2.2); dg = { x: lerp(15.4, 8.6, k), z: lerp(7.6, 5.4, k), ry: -1.5, amt: 1, ph: t * 12 }; }
    else dg = { x: 8.6, z: 5.6, ry: -0.6, sit: true }; }
  dg.t = t;
  // faces
  const face = (who, base, extra) => {
    const mth = mouthFor(who, t); if (mth) return mth;
    if (extra) return extra; const b = blinkOf(t, who.length * 1.1); return b || base;
  };
  const f = {
    Mac: face("Mac", celeb > 0.5 ? "cheer" : "smile", celeb > 0.5 ? "cheer" : null),
    Jess: face("Jess", celeb > 0.5 ? "cheer" : "smile", celeb > 0.5 ? "cheer" : null),
    Dev: face("Dev", "smile", celeb > 0.5 ? "cheer" : (t > L(7) + 2.4 && t < LE(9) ? "oops" : null)),
  };
  return { Mac: m, Jess: j, Dev: d, N1: nA, N2: nB, N3: nC, N4: nD, N5: nE, N6: nF, dog: dg, face: f };
}

// ── camera ──────────────────────────────────────────────────────────────────────────────────────
// look/az/d are blended across each shot; V (vertical) pulls back because the frame is narrow
const SHOTS = [
  { look: [[-5, 3.2, 9], [-1.5, 3.6, 4.6]], az: [30, 18], el: 7, d: [30, 15], vv: 1.25 },
  { look: [[-2.2, 3.9, 4.4]], az: [20, 14], el: 3, d: [12, 10] },
  { look: [[3, 3.9, 4.7]], az: [-18, -12], el: 3, d: [11, 9.5] },
  { look: [[0.4, 3.7, 4.5]], az: [8, 0], el: 4, d: [17, 15], vv: 1.4 },
  { look: [[-2.2, 3.9, 4.4]], az: [12, 8], el: 2, d: [10, 8.2] },
  { look: [[3, 3.9, 4.7]], az: [-10, -6], el: 2, d: [9, 7.6] },
  { look: [[-2.2, 3.9, 4.4]], az: [18, 12], el: 3, d: [11, 9.5] },
  { look: [[-1.5, 3.8, 4.6], [14, 3.6, 5.5]], az: [14, 6], el: 6, d: [18, 20], vv: 1.25 },
  { look: [[17, 3.8, 6.6]], az: [-8, -3], el: 2, d: [11, 8.6] },
  { look: [[-2.2, 3.9, 4.4]], az: [15, 10], el: 2, d: [10, 8.4] },
  { look: [[2.3, 3.7, 4.5]], az: [-8, -2], el: 4, d: [16, 14], vv: 2.0, lyV: 1.9 },
  { look: [[-2.2, 3.9, 4.4]], az: [16, 10], el: 3, d: [11, 9.5], lyV: 1.6 },
  { look: [[0.3, 3.8, 4.5]], az: [-6, 0], el: 3, d: [14, 12.5], vv: 1.55, lyV: 1.6 },
  { look: [[-2.2, 3.9, 4.4]], az: [12, 8], el: 2, d: [9.5, 8], lyV: 1.6 },
  { look: [[-2.2, 3.9, 4.4]], az: [20, 8], el: 3, d: [10.5, 9], lyV: 1.6 },
  { look: [[2.3, 3.8, 4.5]], az: [0, 0], el: 5, d: [18, 15.5], vv: 2.05 },
  { look: [[-2.2, 4.2, 4.4]], az: [8, 0], el: 2, d: [8.5, 15], vv: 1.3, lyV: 1.8 },
];
const cutAt = (i) => (i === 0 ? 0 : L(i) - 0.25);
function placeCamera(t) {
  let i = 0; for (let k = 0; k < N; k++) if (t >= cutAt(k)) i = k;
  const s = SHOTS[i], a = cutAt(i), b = i + 1 < N ? cutAt(i + 1) : DURATION, u = ease((t - a) / (b - a)), pan = ease((t - a - (i === 7 ? 1.4 : 0)) / (b - a - (i === 7 ? 1.4 : 0)));
  const lk0 = s.look.length > 1 ? s.look[0].map((v, k) => lerp(v, s.look[1][k], pan)) : s.look[0], lk = V && s.lyV ? [lk0[0], lk0[1] + s.lyV, lk0[2]] : lk0;
  const az = lerp(s.az[0], s.az[1], u) * Math.PI / 180, el = s.el * Math.PI / 180, vm = V ? (s.vv ?? 1.55) : (s.vh ?? 1);
  const d = lerp(s.d[0], s.d[1], u) * vm;
  const hx = 0.045 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 5.3), hy = 0.035 * Math.sin(t * 1.3 + 1);
  camera.position.set(hx + lk[0] + d * Math.sin(az) * Math.cos(el), hy + lk[1] + d * Math.sin(el) + (V ? 0.4 : 0), lk[2] + d * Math.cos(az) * Math.cos(el));
  camera.lookAt(lk[0], lk[1] + (V ? 0.5 : 0), lk[2]);
  camera.updateProjectionMatrix(); return i;
}

// ── 2D overlays ─────────────────────────────────────────────────────────────────────────────────
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const UI = `"Segoe UI", Arial, sans-serif`, DISP = `Impact, "Arial Black", Arial`;
const U = (V ? 1 : 1);
function pop(ctx0, cx, cy, k, fn) { ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.globalAlpha = clamp(k * 1.6); fn(); ctx.restore(); }
function card(w, h, accent = "#F5C400") {
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 32; ctx.shadowOffsetY = 10; ctx.fillStyle = "#fff"; rr(-w / 2, -h / 2, w, h, 26); ctx.fill(); ctx.restore();
  ctx.fillStyle = accent; ctx.save(); rr(-w / 2, -h / 2, w, h, 26); ctx.clip(); ctx.fillRect(-w / 2, -h / 2, w, 14); ctx.restore();
}
const OV = () => (V ? { x: W / 2, y: H * 0.2, s: 1 } : { x: W * 0.77, y: H * 0.36, s: 1 });
const win = (t, a, b, fi = 0.35, fo = 0.3) => easeBack((t - a) / fi) * (1 - ease((t - (b - fo)) / fo));
const clockStr = "7:02 AM";

function drawOverlays(t) {
  const o = OV();
  // 1) the Constra logo pops when Mac names it
  { const a = W_(4, /konstra/i, 0.9) - 0.1, k = win(t, a, a + 2.4); if (k > 0.01) pop(ctx, o.x, o.y, k, () => { card(600, 230); ctx.drawImage(icon, -250, -72, 130, 130); ctx.fillStyle = "#151617"; ctx.font = `900 92px ${DISP}`; ctx.textBaseline = "middle"; ctx.fillText("CONSTRA", -102, -6); ctx.font = `600 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText("Run the job, not the paperwork.", -250, 82); ctx.textBaseline = "alphabetic"; }); }
  // 2) Jess clocks in: photo, location, time
  { const k = win(t, L(5) + 0.1, LE(5) + 0.7); if (k > 0.01) pop(ctx, o.x, o.y + 10, k, () => { card(640, 330, "#2EAA62");
      ctx.fillStyle = "#2EAA62"; ctx.beginPath(); ctx.arc(-262, -92, 34, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(-278, -92); ctx.lineTo(-266, -80); ctx.lineTo(-244, -106); ctx.stroke();
      ctx.fillStyle = "#151617"; ctx.font = `900 54px ${DISP}`; ctx.fillText("CLOCKED IN", -208, -72); ctx.fillStyle = "#4B4D50"; ctx.font = `600 32px ${UI}`; ctx.fillText(`Jess  ·  ${clockStr}`, -270, -10);
      ctx.fillStyle = "#77797C"; ctx.fillText("Dundas St Reno", -270, 36);
      for (const [x, s] of [[-270, "Photo"], [-90, "Location"]]) { ctx.fillStyle = "#e9f7ee"; rr(x, 70, 160, 54, 27); ctx.fill(); ctx.fillStyle = "#1E7A45"; ctx.font = `700 26px ${UI}`; ctx.fillText("✓  " + s, x + 24, 106); } }); }
  // 3) who is on site
  { const k = win(t, L(6) + 0.3, LE(6) + 0.5); if (k > 0.01) pop(ctx, o.x, o.y + 20, k, () => { card(600, 360, "#0ea5e9"); ctx.fillStyle = "#151617"; ctx.font = `900 46px ${DISP}`; ctx.fillText("ON SITE NOW", -270, -96);
      ["Jess", "Dev", "Sam"].forEach((n, i) => { const y = -40 + i * 64, kk = easeBack((t - (L(6) + 0.55 + i * 0.28)) / 0.3); ctx.save(); ctx.globalAlpha = clamp(kk * 2); ctx.fillStyle = "#2EAA62"; ctx.beginPath(); ctx.arc(-250, y + 10, 13, 0, 7); ctx.fill(); ctx.fillStyle = "#151617"; ctx.font = `700 38px ${UI}`; ctx.fillText(n, -216, y + 24); ctx.fillStyle = "#77797C"; ctx.font = `600 26px ${UI}`; ctx.textAlign = "right"; ctx.fillText("Dundas St Reno", 270, y + 22); ctx.textAlign = "left"; ctx.restore(); }); }); }
  // 4) the alert: slides in from the top like a phone notification
  { const a = L(7) + 0.35, k = easeBack((t - a) / 0.4) * (1 - ease((t - (LE(8) + 0.6)) / 0.35)); if (k > 0.01) { const w = V ? 960 : 760, h = 168, x = W / 2 - (V ? 0 : -W * 0.0), y = (V ? 90 : 40) - (1 - clamp(k)) * 220;
      ctx.save(); ctx.translate(V ? W / 2 : W * 0.72, y + h / 2); ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.fillStyle = "rgba(250,250,252,.97)"; rr(-w / 2, -h / 2, w, h, 36); ctx.fill(); ctx.shadowColor = "transparent";
      ctx.drawImage(icon, -w / 2 + 28, -h / 2 + 28, 112, 112); ctx.fillStyle = "#77797C"; ctx.font = `600 26px ${UI}`; ctx.fillText("CONSTRA", -w / 2 + 160, -h / 2 + 52); ctx.textAlign = "right"; ctx.fillText("now", w / 2 - 28, -h / 2 + 52); ctx.textAlign = "left";
      ctx.fillStyle = "#151617"; ctx.font = `800 36px ${UI}`; ctx.fillText("Dev left Dundas St Reno", -w / 2 + 160, -h / 2 + 100); ctx.fillStyle = "#4B4D50"; ctx.font = `500 28px ${UI}`; ctx.fillText("1.8 km away · still on the clock", -w / 2 + 160, -h / 2 + 140); ctx.restore(); } }
  // 5) the exact time and how far
  { const a = L(9) + 0.35; const chips = [["LEFT SITE", "11:42 AM", "#e0342a", 0.0], ["DISTANCE", "1.8 KM", "#F5C400", 0.9]];
    chips.forEach(([h1, h2, col, off], i) => { const k = win(t, a + off, LE(9) + 0.5); if (k > 0.01) pop(ctx, o.x, o.y + i * 150 - 20, k, () => { card(540, 126, col); ctx.fillStyle = "#77797C"; ctx.font = `700 26px ${UI}`; ctx.fillText(h1, -240, -6); ctx.fillStyle = "#151617"; ctx.font = `900 60px ${DISP}`; ctx.fillText(h2, -240, 46); }); }); }
  // 6) the timesheet, and its tags
  { const a = L(10) + 0.2, k = win(t, a, LE(10) + 0.6, 0.45, 0.35); if (k > 0.01) { const dw = V ? 600 : 460, dh = dw * doc.height / doc.width; ctx.save(); ctx.translate(V ? W / 2 : W * 0.78, V ? H * 0.2 + dh * 0.25 : H * 0.4); ctx.rotate(0.05 * (1 - clamp(k) * 0.5) - 0.03); ctx.scale(k, k); ctx.globalAlpha = clamp(k * 1.5); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.fillStyle = "#fff"; ctx.fillRect(-dw / 2 - 4, -dh / 2 - 4, dw + 8, dh + 8); ctx.shadowColor = "transparent"; ctx.drawImage(doc, -dw / 2, -dh / 2, dw, dh); ctx.restore();
      const tags = [["PDF", W_(10, /^pdf$/i, 0.5), "#e0342a"], ["EXCEL", W_(10, /^excel/i, 0.6), "#1E7A45"], ["OVERTIME ✓", W_(10, /overtime/i, 0.8), "#151617"]];
      tags.forEach(([s, at, col], i) => { const kk = easeBack((t - at) / 0.3) * (1 - ease((t - (LE(10) + 0.5)) / 0.3)); if (kk > 0.01) pop(ctx, (V ? W / 2 - 330 : W * 0.78 - 340) + (i === 2 ? 40 : 0), (V ? H * 0.2 + dh * 0.25 - 90 : H * 0.4 - 100) + i * 82, kk, () => { ctx.font = `800 36px ${UI}`; const w = ctx.measureText(s).width + 44; ctx.fillStyle = col; rr(-w / 2, -30, w, 60, 30); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(s, 0, 12); ctx.textAlign = "left"; }); }); } }
  // 7a) hours track themselves
  { const k = win(t, L(11) + 0.1, LE(11) + 0.6); if (k > 0.01) pop(ctx, o.x, o.y + 40, k, () => { card(660, 420, "#0ea5e9");
      ctx.fillStyle = "#151617"; ctx.font = `900 44px ${DISP}`; ctx.fillText("HOURS THIS WEEK", -296, -126); ctx.fillStyle = "#2EAA62"; ctx.beginPath(); ctx.arc(150, -140, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#1E7A45"; ctx.font = `700 24px ${UI}`; ctx.fillText("2 clocked in", 168, -131);
      [["Jess", 38.5], ["Dev", 41.0], ["Sam", 36.0]].forEach(([n, h], i) => { const y = -60 + i * 92, g = easeOut((t - (L(11) + 0.35 + i * 0.25)) / 0.8), bw = 400, mx = 45;
        ctx.fillStyle = "#151617"; ctx.font = `700 34px ${UI}`; ctx.fillText(n, -296, y + 12); ctx.fillStyle = "#e6e9ec"; rr(-190, y - 14, bw, 34, 17); ctx.fill();
        const w1 = Math.min(h, 40) / mx * bw * g; ctx.fillStyle = "#0ea5e9"; rr(-190, y - 14, Math.max(w1, 0.1), 34, 17); ctx.fill();
        if (h > 40) { const w2 = (h - 40) / mx * bw * g; ctx.fillStyle = "#F5C400"; ctx.fillRect(-190 + 40 / mx * bw * g - 6, y - 14, w2 + 6, 34); }
        ctx.fillStyle = "#4B4D50"; ctx.font = `800 30px ${UI}`; ctx.textAlign = "right"; ctx.fillText((h * g).toFixed(1) + "h", 318, y + 12); ctx.textAlign = "left"; });
      ctx.fillStyle = "#77797C"; ctx.font = `600 22px ${UI}`; ctx.fillText("Yellow = overtime  ·  sample data", -296, 168); }); }
  // 7b) schedule, daily tasks and progress
  { const k = win(t, L(12) + 0.1, LE(12) + 0.6); if (k > 0.01) pop(ctx, o.x, o.y + 60, k, () => { card(660, 480, "#8b5cf6");
      ctx.fillStyle = "#151617"; ctx.font = `900 42px ${DISP}`; ctx.fillText("CREW SCHEDULE", -296, -170);
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri"], cols = ["#0ea5e9", "#F5C400", "#0ea5e9", "#2EAA62", "#F5C400"], t0 = W_(12, /schedule/i, 0.4);
      days.forEach((d, i) => { const x = -296 + i * 122, kk = easeBack((t - t0 - i * 0.08) / 0.3); ctx.fillStyle = "#77797C"; ctx.font = `700 22px ${UI}`; ctx.fillText(d, x + 30, -128); ctx.save(); ctx.globalAlpha = clamp(kk * 2); ctx.fillStyle = cols[i]; rr(x, -112, 108, 22, 8); ctx.fill(); ctx.fillStyle = cols[(i + 2) % 5]; rr(x, -84, 108, 22, 8); ctx.fill(); ctx.restore(); });
      ctx.fillStyle = "#151617"; ctx.font = `900 34px ${DISP}`; ctx.fillText("TODAY'S TASKS", -296, -22);
      [["Frame north wall", W_(12, /daily/i, 0.4)], ["Install window headers", W_(12, /daily/i, 0.5) + 0.35], ["Sheathing", W_(12, /tasks/i, 0.6) + 0.3]].forEach(([n, at], i) => { const y = 28 + i * 46, kk = easeBack((t - at) / 0.3), done = i < 2;
        ctx.fillStyle = done ? "#2EAA62" : "#e6e9ec"; rr(-296, y - 20, 30, 30, 8); ctx.fill(); if (done && kk > 0.3) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-289, y - 4); ctx.lineTo(-282, y + 3); ctx.lineTo(-272, y - 13); ctx.stroke(); }
        ctx.fillStyle = "#151617"; ctx.font = `600 30px ${UI}`; ctx.fillText(n, -250, y + 4); });
      const pg = easeOut((t - W_(12, /progress/i, 0.7)) / 0.8); ctx.fillStyle = "#4B4D50"; ctx.font = `700 24px ${UI}`; ctx.fillText("Dundas St Reno", -296, 178); ctx.textAlign = "right"; ctx.fillText(Math.round(68 * pg) + "%", 316, 178); ctx.textAlign = "left";
      ctx.fillStyle = "#e6e9ec"; rr(-296, 192, 612, 18, 9); ctx.fill(); ctx.fillStyle = "#2EAA62"; rr(-296, 192, Math.max(0.1, 612 * 0.68 * pg), 18, 9); ctx.fill(); }); }
  // 7c) the AI assistant answers
  { const a = W_(13, /assistant/i, 0.4) + 0.2, b = L(14) + 0.7, k = win(t, a, b); if (k > 0.01) pop(ctx, o.x, o.y + 20, k, () => { card(640, 360, "#F5C400");
      ctx.drawImage(icon, -296, -150, 52, 52); ctx.fillStyle = "#151617"; ctx.font = `900 40px ${DISP}`; ctx.textBaseline = "middle"; ctx.fillText("ASK CONSTRA", -230, -124); ctx.textBaseline = "alphabetic";
      const q = easeBack((t - W_(13, /^how$/i, 0.7) - 0.05) / 0.3); if (q > 0.01) { ctx.save(); ctx.globalAlpha = clamp(q * 2); ctx.fillStyle = "#F5C400"; rr(-20, -88, 336, 78, 26); ctx.fill(); ctx.fillStyle = "#151617"; ctx.font = `700 28px ${UI}`; ctx.fillText("How many hours did", 0, -52); ctx.fillText("Jess work?", 0, -22); ctx.restore(); }
      const r = easeBack((t - (LE(13) + 0.35)) / 0.3), dots = t > LE(13) - 0.1 && t < LE(13) + 0.35;
      if (dots) { ctx.fillStyle = "#e9edf1"; rr(-296, 14, 130, 62, 26); ctx.fill(); ctx.fillStyle = "#77797C"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-262 + i * 32, 45 - Math.abs(Math.sin(t * 9 + i)) * 7, 8, 0, 7); ctx.fill(); } }
      if (r > 0.01) { ctx.save(); ctx.globalAlpha = clamp(r * 2); ctx.fillStyle = "#e9edf1"; rr(-296, 14, 520, 130, 26); ctx.fill(); ctx.fillStyle = "#151617"; ctx.font = `700 32px ${UI}`; ctx.fillText("Jess worked 38.5 hours", -272, 62); ctx.fillText("this week, on 2 jobs.", -272, 104); ctx.restore(); }
      ctx.fillStyle = "#77797C"; ctx.font = `600 22px ${UI}`; ctx.fillText("sample data", -296, 168); }); }
  // 7) how much is in the app: the count, then the pieces
  { const fin = (t > LE(14) + 0.4) ? 1 - ease((t - (LE(14) + 0.4)) / 0.3) : 1, t0 = W_(14, /twenty/i);
    const kc = easeBack((t - t0 + 0.1) / 0.35) * fin;
    if (kc > 0.01) { const n = Math.round(26 * easeOut((t - t0) / 0.9)); pop(ctx, V ? W / 2 : W * 0.77, V ? H * 0.115 : H * 0.17, kc, () => { card(V ? 520 : 480, 190, "#F5C400"); ctx.fillStyle = "#151617"; ctx.font = `900 150px ${DISP}`; ctx.textAlign = "right"; ctx.fillText(String(n), -10, 54); ctx.textAlign = "left"; ctx.font = `900 52px ${DISP}`; ctx.fillText("TOOLS", 8, 8); ctx.font = `700 30px ${UI}`; ctx.fillStyle = "#4B4D50"; ctx.fillText("in one app", 8, 52); }); }
    const items = [["Estimates", /estimates/i, "#F5C400", "#151617"], ["Invoices", /invoices/i, "#fff", "#151617"], ["RFIs", /^R$/i, "#fff", "#151617"], ["Change orders", /change/i, "#fff", "#151617"], ["+ 23 more tools", /twenty-three|^three/i, "#1E7A45", "#fff"], ["Works offline", /signal/i, "#151617", "#F5C400"]];
    ctx.font = `800 40px ${UI}`; const ws = items.map((it) => ctx.measureText(it[0]).width + 70);
    const rows = V ? [[0, 1, 2], [3], [4], [5]] : [[0], [1], [2], [3], [4], [5]];
    rows.forEach((row, r) => { const tot = row.reduce((a2, k) => a2 + ws[k], 0) + (row.length - 1) * 16; let x = (V ? W / 2 : W * 0.77) - tot / 2; const y = V ? H * 0.115 + 170 + r * 84 : H * 0.17 + 160 + r * 82;
      for (const k of row) { const [s2, re, bg, fg] = items[k], at = W_(14, re, 0.5), kk = easeBack((t - at + 0.05) / 0.3) * fin; if (kk > 0.01) pop(ctx, x + ws[k] / 2, y, kk, () => { ctx.font = `800 40px ${UI}`; ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5; ctx.fillStyle = bg; rr(-ws[k] / 2, -32, ws[k], 64, 32); ctx.fill(); ctx.shadowColor = "transparent"; ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s2, 0, 2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }); x += ws[k] + 16; } }); }
}

// ── captions, Roblox-chat style ────────────────────────────────────────────────────────────────
function wrap(text, maxW) { const ws = text.split(" "), lines = []; let cur = ""; for (const w of ws) { const t2 = cur ? cur + " " + w : w; if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2; } if (cur) lines.push(cur); return lines; }
const ln0len = (i) => LINES[i].text.length;
function drawCaption(t) {
  const i = lineAt(t); if (i < 0 || t > END_AT - 0.05) return;
  const ln = LINES[i], size = (V ? 52 : 40) * (ln0len(i) > 95 ? 0.82 : 1), maxW = (V ? W - 150 : W * 0.6);
  ctx.font = `700 ${size}px ${UI}`; const toks = ln.text.split(" "); const nW = words[i].length;
  const lines = wrap(ln.text, maxW), lh = size * 1.28, h = lines.length * lh + 70, w = Math.min(maxW + 70, Math.max(...lines.map((s) => ctx.measureText(s).width)) + 70 + 0);
  const cx = W / 2, y = V ? H * 0.8 - h / 2 + 30 : H - h - 56, a = clamp((t - L(i) + 0.15) / 0.12) * (1 - ease((t - LE(i) - 0.25) / 0.15));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - easeOut((t - L(i) + 0.15) / 0.2)) * 14);
  ctx.fillStyle = "rgba(12,14,20,.78)"; rr(cx - w / 2 - 20, y, w + 40, h, 22); ctx.fill();
  ctx.fillStyle = COL[ln.who]; ctx.font = `800 ${size * 0.62}px ${UI}`; ctx.fillText(`[${ln.who}]`, cx - w / 2 + 10, y + 12 + size * 0.62);
  ctx.font = `700 ${size}px ${UI}`; let ti = 0;
  lines.forEach((s, r) => { let x = cx - w / 2 + 10; const yy = y + 52 + size * 0.78 + r * lh;
    for (const tk of s.split(" ")) { const idx = ti++, at = L(i) + (words[i][Math.min(nW - 1, Math.round(idx * nW / toks.length))]?.t ?? 0) - 0.03; ctx.fillStyle = t >= at ? "#ffffff" : "rgba(255,255,255,.4)"; ctx.fillText(tk, x, yy); x += ctx.measureText(tk + " ").width; } });
  ctx.restore();
}

function drawBrand(t) {
  const s = V ? 1 : 0.9; ctx.save(); ctx.translate(V ? 48 : 64, V ? 58 : 48); ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 12; ctx.drawImage(icon, 0, 0, 56, 56); ctx.fillStyle = "#fff"; ctx.font = `900 42px ${DISP}`; ctx.textBaseline = "middle"; ctx.fillText("CONSTRA", 72, 30); ctx.restore();
  const k = 1 - ease((t - 5.2) / 0.5); if (k > 0.01) { ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = "rgba(12,14,20,.7)"; ctx.font = `700 24px ${UI}`; const s2 = "Animated characters, not real customers"; const w = ctx.measureText(s2).width + 36; rr(V ? 48 : 64, V ? 128 : 112, w, 44, 22); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(s2, (V ? 48 : 64) + 18, (V ? 128 : 112) + 23); ctx.restore(); }
  ctx.textBaseline = "alphabetic";
}

function drawEnd(t) {
  const a = L(16) + 0.1, k = easeOut((t - (END_AT - 0.35)) / 0.7);
  // tagline words land with the voice
  const tl = [["RUN THE JOB,", /^run$/i], ["NOT THE", /^not$/i], ["PAPERWORK.", /paperwork/i]]; const size = V ? 118 : 100;
  tl.forEach(([w, wi], i) => { const at = W_(16, wi, 0.8) - 0.05; if (t < at) return; const kk = easeBack((t - at) / 0.35) * (1 - ease((t - (END_AT - 0.1)) / 0.3)); if (kk <= 0.01) return;
    ctx.save(); ctx.globalAlpha = clamp(kk * 2); ctx.translate(V ? W / 2 : W * 0.77, (V ? H * 0.12 : H * 0.28) + i * size * 1.0); ctx.scale(0.8 + 0.2 * kk, 0.8 + 0.2 * kk); ctx.textAlign = "center"; ctx.font = `900 ${size}px ${DISP}`; ctx.lineWidth = size * 0.11; ctx.strokeStyle = "rgba(10,12,20,.7)"; ctx.lineJoin = "round"; ctx.strokeText(w, 0, 0); ctx.fillStyle = i === 2 ? "#F5C400" : "#fff"; ctx.fillText(w, 0, 0); ctx.restore(); });
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k * 0.88; ctx.fillStyle = "#0e1118"; ctx.fillRect(0, 0, W, H); ctx.restore();
  const cx = W / 2, cy = H * (V ? 0.42 : 0.44);
  ctx.save(); ctx.globalAlpha = k; ctx.translate(cx, cy + (1 - k) * 30); const is = V ? 150 : 120; ctx.drawImage(icon, -is / 2, -is * 1.7, is, is);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `900 ${V ? 150 : 128}px ${DISP}`; ctx.fillText("CONSTRA", 0, 0);
  ctx.fillStyle = "#F5E9B8"; ctx.font = `600 ${V ? 40 : 36}px ${UI}`; ctx.fillText("Run the job, not the paperwork.", 0, 70); ctx.fillStyle = "#F5C400"; ctx.fillRect(-60, 100, 120, 7);
  const bk = easeBack((t - END_AT - 0.1) / 0.4); ctx.globalAlpha = clamp(bk * 2); ctx.translate(0, 190 + (1 - clamp(bk)) * 20);
  const bw = V ? 520 : 440, bh = V ? 104 : 90; ctx.fillStyle = "#F5C400"; rr(-bw / 2, -bh / 2, bw, bh, 18); ctx.fill(); ctx.fillStyle = "#141414"; ctx.font = `800 ${V ? 40 : 34}px ${UI}`; ctx.textBaseline = "middle"; ctx.fillText("START FREE", 0, 2); ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `600 ${V ? 36 : 30}px ${UI}`; ctx.fillText("getconstra.com", 0, bh / 2 + 56); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `500 ${V ? 26 : 22}px ${UI}`; ctx.fillText("Free while we launch  ·  Android, iPhone and web", 0, bh / 2 + 100); ctx.restore();
}

// ── one frame ───────────────────────────────────────────────────────────────────────────────────
window.drawFrame = (t) => {
  world.burst(0, W_(4, /konstra/i, 0.9) - 0.05, [-2.2, 5.5, 4.4]); world.burst(1, L(15) + 0.55, [2.3, 6, 5]); world.paperWin[0] = L(1) + 0.8; world.paperWin[1] = LE(1) + 0.7;
  world.update(t);
  const st = acting(t);
  for (const k of ["Mac", "Jess", "Dev"]) av[k].setFace(st.face[k]);
  // sprites over heads
  const qa = lineAt(t);
  world.qs.forEach((q, i) => { const on = (t > L(3) + 1.5 && t < LE(3) + 0.2) || (t > L(1) + 1.3 && t < LE(1) + 0.4); q.visible = on; if (on) { const base = t < L(3) ? [-2.2, 7.7, 4.4] : [0.4, 8.4, 4.5]; q.position.set(base[0] + (i - 2.5) * 1.4, base[1] + Math.sin(t * 3 + i) * 0.35 + (i % 2) * 0.5, base[2] + 0.5); q.scale.setScalar(1.1 + 0.2 * Math.sin(t * 4 + i)); } });
  world.ok.visible = t > L(5) + 0.9 && t < LE(5) + 0.6; world.ok.position.set(POS.Jess[0], 8.5 + Math.sin(t * 5) * 0.15, POS.Jess[1]);
  world.ex.visible = t > L(7) + 0.5 && t < LE(8) + 0.4; world.ex.position.set(-2.2, 8.6 + Math.sin(t * 6) * 0.2, 4.4);
  world.burst(0, W_(4, /konstra/i, 0.9) - 0.05, [-2.2, 5.5, 4.4]); world.burst(1, L(15) + 0.55, [2.5, 6, 5]);
  world.paperWin[0] = L(1) + 0.8; world.paperWin[1] = LE(1) + 0.7; const si = placeCamera(t); const tg = [0, 3, 7, 10, 15].includes(si); for (const k of Object.keys(av)) av[k].set({ ...st[k], tag: tg && !/^N/.test(k) });
  dog.set(st.dog);
  av.Mac.clip.visible = t < W_(4, /konstra/i, 0.9) - 0.7;
  renderer.render(world.scene, camera);
  ctx.clearRect(0, 0, W, H); ctx.drawImage(glCanvas, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,205,150,.16)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,14,28,.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  drawOverlays(t); drawEnd(t); drawBrand(t); drawCaption(t);
};

// ── sound ───────────────────────────────────────────────────────────────────────────────────────
async function mixAudio() {
  const SR = 48000, A = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const master = A.createGain(); master.gain.setValueAtTime(0.95, 0); master.gain.setValueAtTime(0.95, DURATION - 1.4); master.gain.linearRampToValueAtTime(0, DURATION - 0.05);
  const comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18; comp.connect(master).connect(A.destination);
  // voices: low cut, a touch of body and presence, a tiny room
  const vox = A.createGain(); vox.gain.value = 1.25;
  const hp = A.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80;
  const warm = A.createBiquadFilter(); warm.type = "lowshelf"; warm.frequency.value = 200; warm.gain.value = 2.5;
  const pres = A.createBiquadFilter(); pres.type = "peaking"; pres.frequency.value = 3000; pres.gain.value = 2.2; pres.Q.value = 0.9;
  vox.connect(hp).connect(warm).connect(pres);
  const dry = A.createGain(); pres.connect(dry).connect(comp);
  const ir = A.createBuffer(2, Math.round(SR * 0.3), SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 11 + c * 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * Math.pow(1 - i / d.length, 3.4); } }
  const conv = A.createConvolver(); conv.buffer = ir; const wet = A.createGain(); wet.gain.value = 0.09; pres.connect(conv).connect(wet).connect(comp);
  bufs.forEach((b, i) => { const s = A.createBufferSource(); s.buffer = b; s.connect(vox); s.start(VO_AT[i]); });
  // music: bright, game-like. C - G - Am - F at 116 bpm, ducked under the talking
  const bed = A.createGain(); bed.gain.value = 0.5; bed.connect(comp);
  const duck = A.createGain(); duck.gain.setValueAtTime(1, 0); duck.connect(bed);
  for (let i = 0; i < N; i++) { const a = VO_AT[i] - 0.05, b = VO_END[i]; duck.gain.setValueAtTime(1, Math.max(0, a - 0.15)); duck.gain.linearRampToValueAtTime(0.4, a + 0.05); duck.gain.setValueAtTime(0.4, b); duck.gain.linearRampToValueAtTime(1, b + 0.4); }
  const BPM = 116, BEAT = 60 / BPM, BAR = BEAT * 4;
  const chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]], roots = [65.4, 49, 55, 43.65];
  const note = (f, t, d, type, vol, lpf) => { const o = A.createOscillator(); o.type = type; o.frequency.value = f; const g = A.createGain(), lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp).connect(g).connect(duck); o.start(t); o.stop(t + d + 0.05); };
  const noiseBuf = A.createBuffer(1, SR, SR); { const d = noiseBuf.getChannelData(0); let s = 5; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
  const hat = (t, v) => { const s = A.createBufferSource(); s.buffer = noiseBuf; const hf = A.createBiquadFilter(); hf.type = "highpass"; hf.frequency.value = 7500; const g = A.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(hf).connect(g).connect(duck); s.start(t); s.stop(t + 0.08); };
  const kick = (t, v) => { const o = A.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(duck); o.start(t); o.stop(t + 0.28); };
  const bars = Math.ceil(DURATION / BAR);
  for (let b = 0; b < bars; b++) {
    const t0 = b * BAR, ch = chords[b % 4], rt = roots[b % 4], lead = t0 > 2 ? 1 : 0.6;
    for (let k = 0; k < 8; k++) { const tt = t0 + k * BEAT / 2; note(ch[[0, 1, 2, 1, 0, 1, 2, 1][k] % 3] * 2, tt, 0.22, "square", 0.04 * lead, 2400); }
    for (let k = 0; k < 4; k++) { note(rt * 2, t0 + k * BEAT, BEAT * 0.8, "triangle", 0.2, 500); if (t0 > 1.5) { kick(t0 + k * BEAT, 0.3); hat(t0 + k * BEAT + BEAT / 2, 0.05); } }
    note(ch[0], t0, BAR, "sine", 0.05, 900); note(ch[1], t0, BAR, "sine", 0.04, 900);
  }
  // effects
  const ping = (t, f, v) => { const o = A.createOscillator(); o.frequency.value = f; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.8); };
  const blip = (t, f, v = 0.12) => { const o = A.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.08); const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(comp); o.start(t); o.stop(t + 0.2); };
  const bt = L(7) + 0.35; ping(bt, 1568, 0.2); ping(bt + 0.11, 2093, 0.18);
  for (const t of [W_(4, /konstra/i, 0.9) - 0.1, L(5) + 0.1, L(6) + 0.3, L(9) + 0.35, L(9) + 1.25, L(10) + 0.2, W_(10, /^pdf$/i, 0.5), W_(10, /^excel/i, 0.6), W_(10, /overtime/i, 0.8), L(11) + 0.3, L(12) + 0.3, W_(12, /daily/i, 0.4), W_(12, /progress/i, 0.7), W_(13, /^how$/i, 0.7), LE(13) + 0.35, W_(14, /twenty/i), W_(14, /estimates/i), W_(14, /invoices/i), W_(14, /^R$/i), W_(14, /change/i), W_(14, /twenty-three|^three/i, 0.6), W_(14, /signal/i, 0.9)]) blip(t, 520 + (t * 37 % 5) * 60);
  // confetti pops
  for (const t of [W_(4, /konstra/i, 0.9) - 0.05, L(15) + 0.55]) { const s = A.createBufferSource(); s.buffer = noiseBuf; const bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; const g = A.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); s.connect(bp).connect(g).connect(comp); s.start(t); s.stop(t + 0.5); }
  // a little foot-stomp bed for the hammering and the run
  for (let k = 0; k < 40; k++) { const tt = 3.5 + k * 0.33; if (tt < L(7) + 0.9 && Math.floor(tt * 3) % 2 === 0) { const o = A.createOscillator(); o.type = "square"; o.frequency.value = 180; const g = A.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.035, tt + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05); o.connect(g).connect(duck); o.start(tt); o.stop(tt + 0.07); } }
  return await A.startRendering();
}

// ── encode ──────────────────────────────────────────────────────────────────────────────────────
const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
window.still = async (t) => { window.drawFrame(t); return await b64(await new Promise((r) => out.toBlob(r, "image/png"))); };
window.encodeAll = async (bitrate) => {
  const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 }, fastStart: "in-memory" });
  let err = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = String(e); } });
  venc.configure({ codec: V ? "avc1.640033" : "avc1.640034", width: W, height: H, bitrate, framerate: FPS, latencyMode: "quality", bitrateMode: "variable" });
  const audio = await mixAudio(), Lc = audio.getChannelData(0), Rc = audio.getChannelData(1);
  let peak = 0; for (let i = 0; i < Lc.length; i++) peak = Math.max(peak, Math.abs(Lc[i]), Math.abs(Rc[i])); const g = peak > 0.97 ? 0.97 / peak : 1;
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { err = String(e); } });
  aenc.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
  for (let off = 0; off < Lc.length; off += 1024) { const n = Math.min(1024, Lc.length - off), d = new Float32Array(n * 2); for (let k = 0; k < n; k++) { d[k] = Lc[off + k] * g; d[n + k] = Rc[off + k] * g; } const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: d }); aenc.encode(ad); ad.close(); }
  await aenc.flush();
  const total = Math.round(DURATION * FPS);
  for (let i = 0; i < total; i++) { window.drawFrame(i / FPS); const f = new VideoFrame(out, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) }); venc.encode(f, { keyFrame: i % 60 === 0 }); f.close(); while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 8)); if (i % 90 === 0) console.log(`frame ${i}/${total}`); }
  await venc.flush(); muxer.finalize(); if (err) throw new Error(err);
  return { video: await b64(muxer.target.buffer), peak: +peak.toFixed(3), gain: +g.toFixed(3) };
};

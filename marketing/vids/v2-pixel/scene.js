import { clamp, lerp, ease, easeOut, rnd, loadImg } from "/engine.js";
import { loadShots, endCard, sfx } from "/stage.js";

// "Payroll: The Boss Fight": an 8-bit side-scroller. No voices, just a chiptune track; all the text is on screen.
const LW = 270, LH = 480; let lo, lc, SH, ICON;
const C = { ink: "#14101f", gold: "#F5C400", white: "#fffef0" };
const px = (x, y, w, h, col) => { lc.fillStyle = col; lc.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const txt = (s, x, y, col = C.white, size = 12, align = "left", shadow = true) => { lc.font = `700 ${size}px 'IBM Plex Mono', monospace`; lc.textAlign = align; lc.textBaseline = "top"; if (shadow) { lc.fillStyle = C.ink; lc.fillText(s, Math.round(x) + 1, Math.round(y) + 1); } lc.fillStyle = col; lc.fillText(s, Math.round(x), Math.round(y)); };
const GROUND = 396;
const JUMPS = [4.9, 6.85, 8.85, 9.55, 10.25], COINS = [3.4, 3.8, 4.2, 5.7, 6.1, 6.5, 7.6, 8.0], SLIMES = [5.35, 7.2];
const BOSS_IN = 8.2, PHONE_AT = 11.0, FIRE = 12.3, KO = 14.2, CLEAR = 14.8, APP = 17.0, END = 21.0, DUR = 25.6;
const jumpY = (t) => { for (const j of JUMPS) { const u = (t - j) / 0.6; if (u > 0 && u < 1) return Math.sin(u * Math.PI) * 44; } return 0; };

export default {
  duration: DUR, lead: 0, reverb: 0.02, bedGain: 0.8, duckTo: 1,
  voices: {},
  async init(E) { lo = document.createElement("canvas"); lo.width = LW; lo.height = LH; lc = lo.getContext("2d"); lc.imageSmoothingEnabled = false; SH = await loadShots(["timesheets"]); ICON = await loadImg("/icon.png"); },

  draw(t, c, E) {
    const { W, H } = E; lc.save(); lc.clearRect(0, 0, LW, LH);
    const scroll = t < 2.2 ? t * 20 : t < BOSS_IN ? (t - 2.2) * 95 + 44 : 44 + (BOSS_IN - 2.2) * 95 + (t - BOSS_IN) * 8;
    const shake = t > BOSS_IN && t < KO && Math.floor(t * 12) % 7 === 0 ? 2 : 0; lc.translate(shake, shake ? 1 : 0);
    [["#2a1b5e", 0, 120], ["#8a3a8e", 120, 80], ["#ff6a6a", 200, 70], ["#ffb15a", 270, 130]].forEach(([col, y, h]) => px(0, y, LW, h, col)); px(150, 288, 70, 34, "#ffe27a"); px(160, 280, 50, 8, "#ffe27a"); for (let i = 0; i < 6; i++) px(145, 296 + i * 7, 80, 2, "#ffb15a");
    for (let k = 0; k < 14; k++) { const bx = ((k * 38 - scroll * 0.25) % 380 + 380) % 380 - 40, bh = 40 + (k * 37) % 70; px(bx, GROUND - bh, 30, bh, "#3a2a6a"); for (let w = 0; w < 4; w++) px(bx + 5 + (w % 2) * 12, GROUND - bh + 8 + Math.floor(w / 2) * 14, 5, 7, (k + w) % 3 ? "#ffd27a" : "#5a4a8a"); }
    px(0, GROUND, LW, 84, "#6a4a2a"); px(0, GROUND, LW, 8, "#3fbf5a"); for (let i = 0; i < 20; i++) px(((i * 24 - scroll) % 300 + 300) % 300 - 10, GROUND + 18 + (i % 3) * 14, 14, 4, "#4a3320");
    const hours = t < 3.4 ? 0 : COINS.filter((ct) => t > ct).length * 8, shownHours = t > KO ? 64 : hours;
    px(0, 70, LW, 26, "rgba(20,16,31,0.75)"); txt("HOURS", 22, 77, C.gold, 11); txt(String(shownHours).padStart(2, "0") + "H", 76, 77, C.white, 11); txt("SCORE", 130, 77, C.gold, 11); txt(String(Math.floor(shownHours * 125 + (t > KO ? 5000 : 0))).padStart(5, "0"), 184, 77, C.white, 11);
    if (t < 2.4) titleScreen(t); else {
      COINS.forEach((ct, i) => { if (t < ct + 0.5 && t > ct - 2.4) { const x = 58 + (ct - t) * 95, y = GROUND - 58 - (i % 3 === 1 ? 14 : 0); if (t < ct) coin(x, y, t); else txt("+8H", 52, y - (t - ct) * 60, C.gold, 10); } });
      SLIMES.forEach((st) => { if (t > st - 2.4 && t < st + 0.2) slime(58 + (st - t) * 95, GROUND - 14, t); });
      hero(58, GROUND - jumpY(t), t, t > FIRE - 0.3 && t < KO, t > PHONE_AT + 0.8);
      if (t > BOSS_IN && t < KO) bossFight(t);
      if (t >= PHONE_AT && t < PHONE_AT + 0.9) { const u = (t - PHONE_AT) / 0.9; phoneItem(78, lerp(60, GROUND - 40, easeOut(u)), t); }
      if (t > PHONE_AT + 0.9 && t < PHONE_AT + 2.4) { const a = 1 - ((t - PHONE_AT - 0.9) / 1.5); txt("GOT CONSTRA!", 135, 150 - (1 - a) * 20, C.gold, 14, "center"); txt("POWER UP", 135, 170 - (1 - a) * 20, C.white, 11, "center"); }
      if (t > 2.4 && t < 4) { txt("LEVEL 1", 135, 120, C.white, 22, "center"); txt("FRIDAY 4:59 PM", 135, 150, C.gold, 12, "center"); }
      if (t > BOSS_IN - 0.3 && t < BOSS_IN + 1.4) { txt("WARNING!", 135, 110, "#ff4a4a", 22, "center"); txt("THE TIMESHEET", 135, 140, C.white, 12, "center"); }
      if (t >= KO && t < CLEAR + 2.2) { const a = ease((t - KO) / 0.3); txt("K.O.!", 135, 120, C.gold, 34 * a, "center"); if (t > CLEAR) txt("STAGE CLEAR", 135, 175, C.white, 18, "center"); }
      if (t > KO + 0.4 && t < APP + 1) for (let i = 0; i < 22; i++) { const ph = ((t - KO - 0.4) * 1.2 + i * 0.13) % 1.6, x = 24 + (i * 47) % 220, y = 90 + ph * 260; if (ph > 0 && y < GROUND - 8) coin(x, y, t + i); }
      if (t > CLEAR + 0.4 && t < APP - 0.3) [["HOURS", "64:00", 0], ["OVERTIME", "WORKED OUT", 1], ["SIGNED OFF", "YES", 2]].forEach(([a, b, i]) => { const aa = clamp((t - CLEAR - 0.8 - i * 0.55) / 0.3); if (aa > 0) { px(30, 220 + i * 34, 210, 26, "rgba(20,16,31,0.82)"); txt(a, 40, 227 + i * 34, C.white, 11); txt(b, 230, 227 + i * 34, i === 0 ? C.white : "#5af08a", 11, "right"); } });
    }
    lc.restore();
    c.imageSmoothingEnabled = false; c.drawImage(lo, 15, 70, 240, 426, 0, 0, W, H);
    { const a = easeOut((t - APP) / 0.4) * (1 - ease((t - (END - 0.3)) / 0.3)); if (a > 0.01) { c.save(); c.globalAlpha = a; const fh = H * 0.5, fy = H * 0.22; c.fillStyle = "#14101f"; c.fillRect(W * 0.15 - 16, fy - 16, W * 0.7 + 32, fh + 32); c.strokeStyle = "#F5C400"; c.lineWidth = 8; c.strokeRect(W * 0.15 - 16, fy - 16, W * 0.7 + 32, fh + 32); c.imageSmoothingEnabled = true; const im = SH.timesheets, s = fh / im.height; c.drawImage(im, W / 2 - im.width * s / 2, fy, im.width * s, fh); c.fillStyle = "#F5C400"; c.font = "800 54px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.fillText("THE REAL APP", W / 2, fy - 40); c.restore(); } }
    if (t >= END) endCard(c, E, t, t - END, { icon: ICON });
    c.fillStyle = "rgba(0,0,0,0.08)"; for (let y = 0; y < H; y += 8) c.fillRect(0, y, W, 3);
  },

  audio(h, E) {
    const { note, kick, snare, hat, tone, burst, ding } = h; const BPM = 140, B = 60 / BPM;
    const lead = [523, 659, 784, 659, 523, 659, 784, 1047], bassN = [130.8, 130.8, 98, 98, 110, 110, 87.3, 87.3];
    for (let bar = 0; bar * B * 4 < DUR - 4; bar++) {
      const t0 = bar * B * 4, boss = t0 >= BOSS_IN && t0 < KO - 0.5;
      for (let s = 0; s < 16; s++) { const f = (boss ? [440, 523, 659, 523] : lead)[s % (boss ? 4 : 8)] * (bar % 2 ? 1 : 0.75); note(f, t0 + s * B / 4, B * 0.2, "square", 0.028, 3000); }
      for (let s = 0; s < 8; s++) note(bassN[(bar * 2 + (s >> 2)) % 8] * (boss ? 0.84 : 1), t0 + s * B / 2, B * 0.42, "triangle", 0.2, 500);
      for (let q = 0; q < 4; q++) { kick(t0 + q * B, 0.18); if (q % 2) snare(t0 + q * B, 0.06); hat(t0 + q * B + B / 2, 0.035); }
    }
    COINS.forEach((ct) => tone([988, 1319], ct, 0.12, 0.09, "square"));
    JUMPS.forEach((j) => tone([260, 620], j, 0.2, 0.09, "square")); SLIMES.forEach((s) => tone([300, 100], s - 0.05, 0.15, 0.1, "square"));
    tone([100, 40], BOSS_IN, 0.6, 0.35, "sawtooth"); [9.0, 9.7, 10.4].forEach((s) => burst(s, [3000, 500], 0.8, 0.12, 0.1));
    for (let k = 0; k < 8; k++) tone(392 * Math.pow(1.122, k), PHONE_AT + 0.9 + k * 0.06, 0.12, 0.08, "square");
    for (let k = 0; k < 6; k++) tone([1600, 400], FIRE + k * 0.28, 0.18, 0.09, "sawtooth");
    burst(KO, [4000, 200], 0.5, 0.9, 0.3); tone([200, 40], KO, 0.8, 0.4, "sawtooth"); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, KO + 0.3 + i * 0.12, 0.14, 0.09, "square"));
    for (let k = 0; k < 14; k++) ding(KO + 0.5 + k * 0.17, 988 + (k % 4) * 150, 0.05);
    sfx.whoosh(h, END - 0.05, 0.35); sfx.sparkle(h, END + 0.25);
  },
};

function titleScreen(t) {
  px(0, 70, LW, LH - 70, "rgba(20,16,31,0.35)"); const s = 1 + Math.sin(t * 5) * 0.02; txt("PAYROLL", 135, 130, C.gold, 38 * s, "center"); txt("THE BOSS FIGHT", 135, 176, C.white, 20, "center");
  if (Math.floor(t * 3) % 2 === 0) txt("PRESS START", 135, 290, C.white, 14, "center"); txt("1 PLAYER", 135, 320, C.gold, 11, "center"); txt("FREE WHILE IT LAUNCHES", 135, 420, C.white, 10, "center");
}
function hero(x, y, t, shooting, powered) {
  const run = Math.floor(t * 10) % 2, air = y < GROUND - 1;
  px(x - 9, y - 40, 18, 7, C.gold); px(x - 11, y - 34, 22, 4, "#d9a800"); px(x - 8, y - 33, 16, 12, "#7b4a2f"); px(x - 5, y - 29, 3, 3, C.ink); px(x + 2, y - 29, 3, 3, C.ink); px(x - 3, y - 24, 6, 2, C.ink);
  px(x - 10, y - 32, 3, 18, C.ink); px(x + 7, y - 32, 3, 18, C.ink);
  px(x - 9, y - 21, 18, 16, "#ff7a1c"); px(x - 9, y - 16, 18, 3, "#e9f2ff"); px(x - 12, y - 20, 4, 10, "#7b4a2f"); px(x + 8, y - 20, shooting ? 12 : 4, 4, "#7b4a2f");
  if (powered) { px(x + 10, y - 22, 6, 10, C.gold); px(x + 11, y - 20, 4, 6, C.ink); }
  px(x - 8, y - 5, 7, 5, "#2a3a6a"); px(x + 1, y - 5, 7, 5, "#2a3a6a"); const f = air ? 0 : run ? 3 : -3; px(x - 9 + f, y - 1, 8, 3, "#3a2a20"); px(x + 1 - f, y - 1, 8, 3, "#3a2a20");
}
function coin(x, y, t) { const w = 4 + Math.abs(Math.sin(t * 8 + x)) * 6; px(x - w / 2, y - 6, w, 12, C.gold); px(x - w / 2 + 1, y - 4, Math.max(1, w - 2), 8, "#ffe27a"); px(x - 0.5, y - 3, 1, 4, C.ink); }
function slime(x, y, t) { const b = Math.abs(Math.sin(t * 8)) * 2; px(x - 10, y - 12 - b, 20, 14 + b, C.white); px(x - 10, y - 12 - b, 20, 2, C.ink); px(x - 10, y, 20, 2, C.ink); px(x - 10, y - 12 - b, 2, 14 + b, C.ink); px(x + 8, y - 12 - b, 2, 14 + b, C.ink); px(x - 6, y - 8 - b, 4, 4, C.ink); px(x + 2, y - 8 - b, 4, 4, C.ink); }
function phoneItem(x, y, t) { const g = 6 + Math.sin(t * 10) * 3; px(x - g, y - g - 8, 14 + g * 2, 28 + g * 2, "rgba(245,196,0,0.25)"); px(x, y - 8, 14, 26, C.ink); px(x + 2, y - 6, 10, 20, C.gold); px(x + 5, y + 16, 4, 2, C.white); }
function bossFight(t) {
  const enter = clamp((t - BOSS_IN) / 0.9), x = lerp(330, 205, easeOut(enter)), hp = t < FIRE + 0.3 ? 1 : clamp(1 - (t - FIRE - 0.3) / 1.6), flash = t > FIRE + 0.3 && Math.floor(t * 14) % 2 === 0, bob = Math.sin(t * 5) * 3;
  const y = GROUND - 4 + bob;
  px(x - 30, y - 82, 60, 82, flash ? "#ff9a9a" : C.white); px(x - 30, y - 82, 60, 3, C.ink); px(x - 30, y - 3, 60, 3, C.ink); px(x - 30, y - 82, 3, 82, C.ink); px(x + 27, y - 82, 3, 82, C.ink);
  for (let i = 0; i < 5; i++) px(x - 22, y - 62 + i * 8, 44 - (i % 2) * 14, 2, "#bfc7d9");
  px(x - 20, y - 48, 14, 10, C.ink); px(x + 6, y - 48, 14, 10, C.ink); px(x - 17, y - 46, 6, 6, "#ff3a3a"); px(x + 9, y - 46, 6, 6, "#ff3a3a"); px(x - 22, y - 54, 18, 3, C.ink); px(x + 4, y - 54, 18, 3, C.ink);
  px(x - 18, y - 26, 36, 12, C.ink); for (let i = 0; i < 6; i++) px(x - 17 + i * 6, y - 26, 4, 5, C.white);
  px(x - 40, y - 40, 10, 5, "#f5c400"); px(x + 30, y - 40, 10, 5, "#f5c400");
  px(40, 104, 190, 10, C.ink); px(42, 106, 186 * hp, 6, "#ff4a4a"); txt("TIMESHEET", 42, 116, C.white, 9);
  [9.0, 9.7, 10.4].forEach((s) => { const u = (t - s) / 1.0; if (u > 0 && u < 1) { const sx = x - 30 - u * (x - 70), sy = GROUND - 22; px(sx, sy - 6, 14, 18, C.white); px(sx, sy - 6, 14, 2, C.ink); px(sx + 3, sy, 8, 1, "#9aa3b8"); px(sx + 3, sy + 4, 8, 1, "#9aa3b8"); } });
  if (t > FIRE) for (let k = 0; k < 3; k++) { const u = (t - FIRE - k * 0.28) / 0.5; if (u > 0 && u < 1) { const sx = lerp(80, x - 34, u), sy = GROUND - 26; px(sx - 14, sy - 6, 34, 12, C.gold); txt(["PHOTO", "GPS", "TOTALS"][k], sx + 3, sy - 4, C.ink, 8, "center", false); } }
}

import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, paper, notebookBg } from "/stick.js";
import { phoneInset, chip, pop, bed, sfx, loadShots, endCard } from "/stage.js";

// "Friday 4:59": a stick-figure disaster. Three workers dump their timesheets on the boss, the tower falls, one tap fixes it.
let SH, ICON, PAPERS, T; const pp = (c, x, y, r, s) => paper(c, x, y, r, (s || 1) * 1.55);
const colors = { Mac: "#151617" };

export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Dev: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) {
    SH = await loadShots(["timesheets"]); ICON = await loadImg("/icon.png");
    const { W, H } = E, gy = H * 0.82;
    T = { a: E.L(0), b: E.L(1), be: E.LE(1), c: E.L(2), tap: E.W_(2, /Tap/i, 0.7), d: E.L(3), e: E.L(4) };
    T.crash = T.be + 0.9; T.suck = T.tap + 0.45; T.suckEnd = T.suck + 1.2;
    // 24 sheets: three workers throw eight each into a tower on the boss's desk
    PAPERS = []; const towerX = W * 0.22, deskTop = gy - 215, enter = [T.a - 0.1, T.b + 0.1, T.b + 0.9], stopX = [W * 0.58, W * 0.72, W * 0.86];
    for (let w = 0; w < 3; w++) for (let k = 0; k < 8; k++) {
      const i = w * 8 + k, tThrow = enter[w] + 1.0 + k * 0.17 + w * 0.05, slotY = deskTop - 26 - Math.floor(i / 2) * 17, slotX = towerX + (i % 2 ? 7 : -7) + (rnd(i * 3 + 1) - 0.5) * 8;
      const r1 = rnd(i * 7 + 2), r2 = rnd(i * 11 + 3), r3 = rnd(i * 13 + 5);
      PAPERS.push({ i, w, tThrow, tLand: tThrow + 0.62, sx: stopX[w] - 30, sy: gy - 470, slotX, slotY, vx: (r1 - 0.5) * 520 - 120, vy: -360 - r2 * 260, fx: W * 0.1 + r3 * W * 0.5, fy: gy - 6 - rnd(i * 17 + 9) * 22, rot: (r3 - 0.5) * 3 });
    }
    PAPERS.forEach((p) => { const g = 1900, dy = p.fy - (p.slotY - 30); const disc = p.vy * p.vy + 2 * g * dy; p.fall = (-p.vy + Math.sqrt(Math.max(0, disc))) / g; p.fx = p.slotX + p.vx * p.fall; p.fx = clamp(p.fx, W * 0.06, W * 0.74); });
    T.enter = enter; T.stopX = stopX;
  },

  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.82, sc = 2.6, deskX = W * 0.07, deskW = W * 0.3, deskTop = gy - 215;
    // punch-in before the crash, shake on it
    const zIn = 1 + 0.12 * ease((t - (T.be - 0.8)) / 0.9) * (1 - ease((t - (T.crash + 0.4)) / 0.5)), cd = t - T.crash, shake = cd >= 0 && cd < 0.5 ? (1 - cd / 0.5) * 16 : 0;
    c.save(); c.translate(W * 0.3 + (rnd(Math.floor(t * 50) + 1) - 0.5) * shake, gy * 0.9 + (rnd(Math.floor(t * 50) + 4) - 0.5) * shake); c.scale(zIn, zIn); c.translate(-W * 0.3, -gy * 0.9);
    notebookBg(c, W, H, gy, t);
    // the clock on the wall: 4:59, ticking, until the end
    { const cx = W * 0.8, cy = H * 0.17, done = t > T.e - 0.2; c.strokeStyle = "#151617"; c.lineWidth = 8; c.fillStyle = "#fffef8"; c.beginPath(); c.arc(cx, cy, 110, 0, 7); c.fill(); c.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.lineWidth = 5; c.beginPath(); c.moveTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92); c.lineTo(cx + Math.cos(a) * 104, cy + Math.sin(a) * 104); c.stroke(); }
      const mA = (done ? 0 : -0.1 + Math.sin(t * 9) * 0.02) - 1.5708 + (done ? 0 : -0.1), hA = (done ? 0 : -0.5236) - 1.5708 - 0.0; c.lineWidth = 9; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(hA) * 62, cy + Math.sin(hA) * 62); c.stroke(); c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(mA) * 90, cy + Math.sin(mA) * 90); c.stroke(); c.fillStyle = "#e0301e"; c.beginPath(); c.arc(cx, cy, 8, 0, 7); c.fill(); }
    // desk, drawn like marker lines
    c.strokeStyle = "#151617"; c.lineWidth = 8; c.fillStyle = "#e8cf9a"; c.beginPath(); c.rect(deskX, deskTop, deskW, 26); c.fill(); c.stroke(); c.beginPath(); c.moveTo(deskX + 16, deskTop + 26); c.lineTo(deskX + 16, gy); c.moveTo(deskX + deskW - 16, deskTop + 26); c.lineTo(deskX + deskW - 16, gy); c.stroke();
    // the boss
    const buried = t >= T.crash && t < T.c + 0.7 + 0.5, rise = ease((t - (T.d - 0.6)) / 0.5);
    let boss = { x: W * 0.4, y: gy, s: sc, flip: -1, hat: "#ffffff", t, mood: "neutral", pose: POSE.idle(t), seed: 1, mouth: E.mouth("Mac", t) };
    if (t < T.crash) { const nowPapers = PAPERS.filter((p) => t > p.tLand).length; if (nowPapers > 4 || t > T.b - 0.3) { boss.mood = "shock"; boss.sweat = true; boss.pose = POSE.panic(t); } else boss.pose = POSE.slump(t); if (t < T.a - 0.5) { boss.pose = POSE.idle(t); } }
    else if (t < T.d - 0.6) { boss.rot = 90; boss.x = W * 0.3; boss.pose = POSE.kick(t); boss.mood = "shock"; boss.noShadow = true; boss.y = gy - 8; boss.flip = 1; }
    else { boss.rot = lerp(90, 0, rise); boss.x = lerp(W * 0.3, W * 0.36, rise); boss.pose = rise < 1 ? POSE.slump(t) : (t > T.e - 0.2 ? POSE.dance(t) : POSE.slump(t)); boss.mood = t > T.e - 0.2 ? "happy" : "shock"; boss.flip = rise < 1 ? 1 : -1; }
    if (t > T.d + 0.4 && t < T.e - 0.2) { boss.mood = "happy"; boss.pose = POSE.shrug(t); }
    // workers: run in, throw, cheer
    const W3 = [{ n: "Dev", hat: "#ff7a1c", hair: null, seed: 2 }, { n: "Jess", hat: "#F5C400", hair: "pony", seed: 3 }, { n: "Kai", hat: null, hair: "braids", seed: 4 }];
    const workers = W3.map((w, i) => {
      const t0 = T.enter[i], x1 = T.stopX[i], tRun = clamp((t - t0) / 0.95), x = lerp(W * 1.14, x1, easeOut(tRun)), threw = t > t0 + 1.0, afterAll = t > T.crash - 0.2;
      let pose = POSE.run(t), prop = tRun < 1 ? "stack" : null, flip = -1, mood = "happy";
      if (tRun >= 1) { pose = threw ? (t < t0 + 2.5 ? POSE.cheer(t + i) : POSE.shrug(t)) : POSE.hold(t); prop = threw ? null : "stack"; }
      if (afterAll) { pose = POSE.shrug(t); mood = "shock"; }
      let xx = x; if (w.n === "Dev" && t > T.c - 1.2) { xx = lerp(x1, W * 0.5, ease((t - (T.c - 1.2)) / 0.9)); flip = -1; pose = t > T.tap - 0.9 ? POSE.point(t) : POSE.walk(t); prop = t > T.c - 0.3 ? "phone" : null; mood = "neutral"; }
      if (t > T.e - 0.2) { pose = POSE.dance(t + i * 0.7); mood = "happy"; prop = null; }
      return { ...w, x: xx, y: gy, s: sc, flip, t, pose, prop, mood, mouth: w.n === "Dev" ? E.mouth("Dev", t) : 0 };
    });
    // desk-top tower
    { const inTower = PAPERS.filter((p) => t >= p.tLand && t < T.crash); inTower.forEach((p) => { const sway = Math.sin(t * 9 + p.i) * Math.max(0, (t - (T.be - 0.6)) * 3.2); pp(c, p.slotX + sway * (p.i / 24), p.slotY - 6, (rnd(p.i * 5) - 0.5) * 0.18, 0.8); }); }
    // sheets in flight (thrown) and sheets that have fallen
    for (const p of PAPERS) {
      if (t >= p.tThrow && t < p.tLand) { const u = (t - p.tThrow) / 0.62, x = lerp(p.sx, p.slotX, u), y = lerp(p.sy, p.slotY - 6, u) - Math.sin(u * Math.PI) * 130; pp(c, x, y, u * 7, 0.8); }
      if (t >= T.crash && t < T.suck) { const dt = t - T.crash, y = Math.min(p.fy, (p.slotY - 30) + p.vy * dt + 950 * dt * dt), x = p.slotX + p.vx * Math.min(dt, p.fall); pp(c, clamp(x, W * 0.06, W * 0.74), y, p.rot * Math.min(1, dt / p.fall) * 3, 0.8); }
      if (t >= T.suck && t < T.suckEnd) { const u = clamp((t - T.suck - p.i * 0.025) / 0.7), tx = W * 0.5 + 16, ty = gy - 260; if (u > 0 && u < 1) { const x0 = clamp(p.slotX + p.vx * p.fall, W * 0.06, W * 0.74), e = easeOut(u); pp(c, lerp(x0, tx, e), lerp(p.fy, ty, e) - Math.sin(u * Math.PI) * 120, p.rot * 3 + u * 9, lerp(0.8, 0.12, u)); } else if (u <= 0) pp(c, clamp(p.slotX + p.vx * p.fall, W * 0.06, W * 0.74), p.fy, p.rot * 3, 0.8); }
    }
    // draw people (boss under the pile while buried)
    drawStick(c, boss);
    if (buried) for (const p of PAPERS.slice(0, 14)) pp(c, W * 0.3 + (p.fx - W * 0.3) * 0.25, gy - 30 - (p.i % 5) * 9, p.rot, 0.85);
    if (!buried && t > T.d - 0.7 && t < T.e - 0.3) pp(c, boss.x - 6, gy - 470, 0.3, 0.6);
    workers.forEach((w) => drawStick(c, w));
    // dust puff on the crash
    if (cd >= 0 && cd < 0.7) { const a = 1 - cd / 0.7; c.fillStyle = `rgba(120,110,90,${0.4 * a})`; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(W * 0.3 + (i - 3.5) * 52 + Math.sin(i * 3) * 20, gy - 20 - cd * 80 - (i % 3) * 22, 30 + cd * 60, 0, 7); c.fill(); } pop(c, "CRASH!", W * 0.3, gy - 380, easeBack(cd / 0.2) * a, 140, "#F5C400", -0.1); }
    // the tap
    { const d = t - T.tap; if (d >= 0 && d < 0.8) { const u = d / 0.8; c.strokeStyle = `rgba(245,196,0,${1 - u})`; c.lineWidth = 10; c.beginPath(); c.arc(W * 0.5 + 16, gy - 260, 20 + u * 90, 0, 7); c.stroke(); } }
    c.restore();
    // title and the app screen
    { const a = easeBack(t / 0.35) * (1 - ease((t - 1.9) / 0.3)); if (a > 0.01) { c.save(); c.translate(W / 2, H * 0.2); c.rotate(-0.03); c.scale(clamp(a, 0, 1.1), clamp(a, 0, 1.1)); c.font = `700 ${V ? 120 : 110}px Caveat, cursive`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#151617"; c.fillText("FRIDAY 4:59 PM", 0, 0); c.strokeStyle = "#e0301e"; c.lineWidth = 10; c.beginPath(); c.moveTo(-W * 0.36, 90); c.quadraticCurveTo(0, 110, W * 0.36, 86); c.stroke(); c.restore(); } }
    { const a0 = T.suck + 0.7, b0 = T.e - 0.1, aa = easeBack((t - a0) / 0.4) * (1 - ease((t - (b0 - 0.3)) / 0.3)); if (aa > 0.01) { phoneInset(c, SH.timesheets, W * 0.5, H * 0.3, V ? 340 : 260, -0.04, aa, t); chip(c, "TIMESHEETS", W * 0.3, H * 0.15, easeBack((t - (a0 + 0.3)) / 0.3) * (1 - ease((t - (b0 - 0.3)) / 0.3)), 46, -0.06); chip(c, "OVERTIME ✓", W * 0.74, H * 0.46, easeBack((t - (a0 + 0.7)) / 0.3) * (1 - ease((t - (b0 - 0.3)) / 0.3)), 46, 0.05); } }
    // confetti for the finish
    if (t > T.d + 0.9 && t < T.e + 1.4) for (let i = 0; i < 40; i++) { const k = (t - T.d - 0.9) * 0.55 + rnd(i + 3) * 0.2; const x = rnd(i * 5 + 1) * W, y = -40 + k * H * 1.1; c.fillStyle = ["#F5C400", "#e0301e", "#3a8fe0", "#22a85a"][i % 4]; c.save(); c.translate(x, y); c.rotate(k * 9 + i); c.fillRect(-9, -5, 18, 10); c.restore(); }
    E.caption(c, t, { y: V ? H * 0.92 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },

  audio(h, E) {
    bed(h, E, { bpm: 118, vol: 0.8 });
    const { burst, tone } = h;
    PAPERS.forEach((p) => { burst(p.tThrow, [3000, 1200], 0.8, 0.12, 0.05); });
    T.enter.forEach((t0) => { sfx.whoosh(h, t0 - 0.05, 0.5); for (let s = 0; s < 6; s++) burst(t0 + s * 0.15, [380, 140], 1.2, 0.07, 0.05); });
    for (let k = 0; k < 6; k++) tone([180 + k * 20, 200 + k * 20], T.be - 0.8 + k * 0.14, 0.2, 0.05, "triangle");
    sfx.thump(h, T.crash); burst(T.crash, [4000, 800], 0.6, 0.6, 0.18); sfx.trombone(h, T.crash + 0.5);
    sfx.pop(h, T.tap); sfx.whoosh(h, T.suck, 0.8); sfx.sparkle(h, T.suckEnd - 0.3); sfx.boing(h, T.d - 0.5);
    sfx.applause(h, T.e - 0.3, 2.2); const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

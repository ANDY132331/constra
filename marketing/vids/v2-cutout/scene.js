import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { siteBg } from "/sitebg.js";
import { phoneInset, chip, pop, bed, sfx, loadShots, endCard } from "/stage.js";

// "The cardboard cutout": top panel is the job site, bottom panel is a beach. Dev sent a cardboard copy of himself to clock in.
let SH, ICON, T;

export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Dev: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) {
    SH = await loadShots(["time-tracking"]); ICON = await loadImg("/icon.png");
    T = { a: E.L(0), b: E.L(1), c: E.L(2), d: E.L(3), e: E.L(4) };
    T.flash = T.d + 1.9; T.stamp = T.flash + 0.5; T.phone0 = T.b - 0.5;
  },

  draw(t, c, E) {
    const { W, H, V } = E, half = H * 0.5;
    c.fillStyle = "#f6f1e3"; c.fillRect(0, 0, W, H);
    // ── top panel: the job site (notebook paper)
    c.save(); c.beginPath(); c.rect(0, 0, W, half - 6); c.clip();
    const gy1 = half - 120; siteBg(c, W, half, gy1, t, "skyline");
    // a hard-hat sign and a fence, drawn like marker doodles
    c.strokeStyle = "#151617"; c.lineWidth = 7; c.fillStyle = "#F5C400"; c.beginPath(); c.rect(W * 0.04, gy1 - 300, 230, 76); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "800 46px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("JOB SITE", W * 0.04 + 115, gy1 - 262); c.beginPath(); c.moveTo(W * 0.04 + 115, gy1 - 224); c.lineTo(W * 0.04 + 115, gy1); c.stroke();
    // the cardboard cutout of Dev, standing at the gate
    const cx = W * 0.62, tilt = t > T.c + 0.7 ? clamp((t - T.c - 0.7) / 0.3) * 1.45 : Math.sin(t * 1.5) * 0.01;
    if (t < T.flash - 0.6 || tilt > 0) { c.save(); c.translate(cx, gy1); c.rotate(t > T.c + 0.7 ? tilt * 0.9 : tilt); c.fillStyle = "#c9a46a"; c.strokeStyle = "#151617"; c.lineWidth = 7; c.beginPath(); c.roundRect(-86, -480, 172, 480, 16); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-22, 0); c.lineTo(0, 60); c.lineTo(22, 0); c.stroke(); drawStick(c, { x: 0, y: -26, s: 1.78, hat: "#ff7a1c", mood: "happy", t, pose: POSE.cheer(1.2), hop: 0, noShadow: true, lw: 8, boil: 0.6 }); c.restore(); }
    // the boss walks in, looks, taps his phone
    const walkIn = clamp((t - (T.a - 1.8)) / 1.6), bx = lerp(-W * 0.1, W * 0.28, easeOut(walkIn));
    let boss = { x: bx, y: gy1, s: 2.15, flip: 1, hat: "#ffffff", t, mood: "happy", mouth: E.mouth("Mac", t), pose: walkIn < 1 ? POSE.walk(t) : POSE.idle(t), seed: 1, prop: t > T.phone0 ? "phone" : null, screen: "#F5C400" };
    if (t > T.b - 0.2 && t < T.d + 1.0) { boss.mood = t > T.c ? "shock" : "neutral"; boss.pose = t > T.c + 0.6 ? POSE.panic(t) : POSE.hold(t); boss.sweat = t > T.c; }
    if (t >= T.d + 1.0 && t < T.flash) { boss.mood = "angry"; boss.pose = POSE.point(t); boss.x = W * 0.28; }
    if (t >= T.flash) { boss.mood = "happy"; boss.pose = POSE.shrug(t); }
    drawStick(c, boss);
    // Dev arrives for real, out of breath, takes a selfie
    if (t >= T.d + 1.0) { const run = clamp((t - (T.d + 1.0)) / 0.9), dx = lerp(W * 1.1, cx, easeOut(run)); const p = { x: dx, y: gy1, s: 2.15, flip: -1, hat: "#ff7a1c", t, mood: run < 1 ? "shock" : "happy", pose: run < 1 ? POSE.run(t) : t < T.flash ? POSE.hold(t) : POSE.cheer(t), prop: run >= 1 ? "phone" : null, mouth: E.mouth("Dev", t), seed: 2, sweat: run < 1 }; drawStick(c, p); }
    if (t >= T.flash && t < T.flash + 0.35) { c.fillStyle = `rgba(255,255,255,${1 - (t - T.flash) / 0.35})`; c.fillRect(0, 0, W, half); }
    // stamp when he really is there
    { const u = clamp((t - T.stamp) / 0.2); if (u > 0) { c.save(); c.translate(W * 0.42, gy1 - 520); c.rotate(-0.16); c.scale(lerp(2.2, 1, easeOut(u)), lerp(2.2, 1, easeOut(u))); c.globalAlpha = u; c.strokeStyle = "#1e7a45"; c.fillStyle = "#1e7a45"; c.lineWidth = 12; c.beginPath(); c.roundRect(-250, -70, 500, 140, 20); c.stroke(); c.font = "800 90px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("ACTUALLY HERE", 0, 4); c.restore(); } }
    c.restore();
    // ── bottom panel: the beach, in colour
    c.save(); c.translate(0, half); c.beginPath(); c.rect(0, 6, W, half - 6); c.clip();
    c.fillStyle = "#bfe6ff"; c.fillRect(0, 0, W, half); c.fillStyle = "#ffe9a8"; c.fillRect(0, half - 170, W, 170); c.fillStyle = "#4aa8e8"; c.fillRect(0, half - 330, W, 160);
    c.strokeStyle = "#ffffff"; c.lineWidth = 6; for (let r = 0; r < 4; r++) { c.beginPath(); for (let x = 0; x <= W; x += 30) c.lineTo(x, half - 330 + r * 38 + Math.sin(t * 2 + x * 0.03 + r) * 7); c.stroke(); }
    c.fillStyle = "#ffd23a"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.arc(W * 0.85, 120, 62, 0, 7); c.fill(); c.stroke();
    const gy2 = half - 90;
    // palm tree doodle and umbrella
    c.strokeStyle = "#151617"; c.lineWidth = 9; c.beginPath(); c.moveTo(W * 0.1, gy2); c.quadraticCurveTo(W * 0.14, gy2 - 200, W * 0.1, gy2 - 380); c.stroke(); c.fillStyle = "#3fbf5a"; for (let k = 0; k < 6; k++) { const a = -2.9 + k * 0.5 + Math.sin(t * 1.2 + k) * 0.05; c.beginPath(); c.moveTo(W * 0.1, gy2 - 380); c.quadraticCurveTo(W * 0.1 + Math.cos(a) * 120, gy2 - 380 + Math.sin(a) * 60 - 30, W * 0.1 + Math.cos(a) * 200, gy2 - 380 + Math.sin(a) * 100 + 40); c.quadraticCurveTo(W * 0.1 + Math.cos(a) * 110, gy2 - 380 + Math.sin(a) * 40, W * 0.1, gy2 - 380); c.fill(); c.stroke(); }
    c.fillStyle = "#e0301e"; c.beginPath(); c.arc(W * 0.4, gy2 - 300, 130, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(W * 0.4, gy2 - 300); c.lineTo(W * 0.4, gy2); c.stroke();
    // Dev, on holiday: shades, a drink, a smile that turns into a spit-take
    if (t < T.d + 1.2) {
      const spit = t > T.c - 0.1 && t < T.c + 0.8, dv = { x: W * 0.38, y: gy2, s: 2.15, flip: 1, hat: null, t, mood: spit ? "shock" : "happy", pose: t > T.c + 0.8 ? POSE.shrug(t) : POSE.hold(t), prop: "coffee", mouth: t > T.d - 0.2 ? E.mouth("Dev", t) : spit ? 0.9 : 0, seed: 3 };
      if (t > T.d + 0.4) { dv.x = lerp(W * 0.38, W * 1.2, ease((t - T.d - 0.4) / 0.6)); dv.pose = POSE.run(t); }
      const h = drawStick(c, dv); if (!spit || true) { const hh = h; c.fillStyle = "#151617"; c.fillRect(hh.hx - 30, hh.hy - 6 - 0, 60, 12); }
      if (spit) { c.fillStyle = "#58b8ff"; for (let k = 0; k < 14; k++) { const u = (t - T.c + 0.1) * 1.4 + k * 0.02; c.beginPath(); c.arc(h.hx + 40 + u * 300 + k * 6, h.hy + 20 + Math.sin(k) * 12 - Math.sin(u * 3) * 40 + u * u * 150, 7, 0, 7); c.fill(); } }
    }
    c.restore();
    // divider
    c.strokeStyle = "#151617"; c.lineWidth = 12; c.beginPath(); c.moveTo(0, half); c.lineTo(W, half); c.stroke();
    // labels
    { const a = easeBack(t / 0.3) * (1 - ease((t - 2.0) / 0.3)); if (a > 0.01) { c.save(); c.font = `700 ${V ? 110 : 90}px Caveat, cursive`; c.textAlign = "left"; c.fillStyle = "#151617"; c.globalAlpha = clamp(a); c.fillText("7:02 AM  the site", 48, 130); c.fillStyle = "#1e5fb0"; c.fillText("7:02 AM  ...somewhere else", 48, half + 150); c.restore(); } }
    if (t > T.flash + 0.2) { c.save(); c.font = `700 ${V ? 100 : 80}px Caveat, cursive`; c.fillStyle = "#151617"; c.globalAlpha = easeOut((t - T.flash - 0.2) / 0.3); c.textAlign = "left"; c.fillText("7:49 AM  for real", 48, 130); c.restore(); }
    // the phone, big, with what the boss is seeing
    { const a0 = T.b + 0.1, b0 = T.c + 1.3, aa = easeBack((t - a0) / 0.4) * (1 - ease((t - (b0 - 0.3)) / 0.3)); if (aa > 0.01) { phoneInset(c, SH["time-tracking"], W * 0.5, half, V ? 360 : 280, -0.04, aa, t); chip(c, "PHOTO: CARDBOARD", W * 0.74, half - 230, easeBack((t - (a0 + 0.35)) / 0.3) * (1 - ease((t - (b0 - 0.3)) / 0.3)), 44, 0.05); chip(c, "PLACE: A BEACH", W * 0.26, half + 250, easeBack((t - (T.c + 0.1)) / 0.3) * (1 - ease((t - (b0 - 0.3)) / 0.3)), 44, -0.05); } }
    E.caption(c, t, { y: V ? H * 0.93 : H * 0.94, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },

  audio(h, E) {
    bed(h, E, { bpm: 108, vol: 0.8 });
    sfx.whoosh(h, T.a - 1.8, 0.5); for (let s = 0; s < 5; s++) h.burst(T.a - 1.8 + s * 0.3, [380, 140], 1.2, 0.07, 0.05);
    sfx.pop(h, T.b - 0.4); sfx.scratch(h, T.b + 0.15); sfx.thump(h, T.c + 0.2); sfx.boing(h, T.c + 0.8); sfx.trombone(h, T.d + 0.15);
    sfx.whoosh(h, T.d + 0.9, 0.7); for (let s = 0; s < 7; s++) h.burst(T.d + 1.0 + s * 0.12, [380, 140], 1.2, 0.07, 0.06);
    h.burst(T.flash, [6000, 2000], 0.6, 0.18, 0.2); sfx.thump(h, T.stamp + 0.15); sfx.sparkle(h, T.stamp + 0.2); sfx.applause(h, T.stamp + 0.3, 1.8);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

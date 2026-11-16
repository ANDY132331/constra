import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { notif, scribble, tapRipple, stamp } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "Still clocked in": it is 11:30 at night, Dev is asleep in his hard hat and the app is still counting his shift.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.45, duckTo: 0.3,
  voices: { Dev: { pan: 0.1 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l0: E.L(0), l1: E.L(1), l2: E.L(2), e: E.L(3) }; T.buzz = T.l1 - 1.4; T.tap = E.W_(2, /sleep/i, 0.9) + 0.35; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.74, ink = "#e8ecff";
    // night: dark navy paper with pale lines
    c.fillStyle = "#1a2040"; c.fillRect(0, 0, W, H); c.strokeStyle = "rgba(180,200,255,0.1)"; c.lineWidth = 2; for (let y = 90; y < H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // moon and stars at the window
    c.fillStyle = "#0e1530"; c.strokeStyle = ink; c.lineWidth = 8; c.beginPath(); c.roundRect(W * 0.56, H * 0.08, 380, 440, 14); c.fill(); c.stroke(); c.beginPath(); c.moveTo(W * 0.56 + 190, H * 0.08); c.lineTo(W * 0.56 + 190, H * 0.08 + 440); c.moveTo(W * 0.56, H * 0.08 + 220); c.lineTo(W * 0.56 + 380, H * 0.08 + 220); c.stroke(); c.fillStyle = "#fff3b0"; c.beginPath(); c.arc(W * 0.56 + 280, H * 0.08 + 110, 56, 0, 7); c.fill(); c.fillStyle = "#0e1530"; c.beginPath(); c.arc(W * 0.56 + 304, H * 0.08 + 96, 50, 0, 7); c.fill(); for (let i = 0; i < 9; i++) { c.fillStyle = "#fff"; c.fillRect(W * 0.56 + 20 + rnd(i * 3 + 1) * 340, H * 0.08 + 20 + rnd(i * 5 + 2) * 400, 6, 6); }
    // bed with a blanket and pillow
    const bx = W * 0.08, bw = W * 0.7, by = gy - 120; c.strokeStyle = ink; c.lineWidth = 9; c.fillStyle = "#2c3566"; c.beginPath(); c.roundRect(bx, by, bw, 120, 12); c.fill(); c.stroke(); c.beginPath(); c.moveTo(bx + 20, by + 120); c.lineTo(bx + 20, gy + 20); c.moveTo(bx + bw - 20, by + 120); c.lineTo(bx + bw - 20, gy + 20); c.stroke(); c.fillStyle = "#e8ecff"; c.beginPath(); c.roundRect(bx + 24, by - 36, 190, 56, 28); c.fill(); c.stroke();
    // the nightstand with the glowing phone
    const nx = W * 0.82; c.fillStyle = "#2c3566"; c.beginPath(); c.roundRect(nx - 80, gy - 150, 160, 150, 8); c.fill(); c.stroke(); const buzz = t > T.buzz && t < T.tap ? Math.sin(t * 60) * 4 : 0; c.save(); c.translate(nx + buzz, gy - 150); c.fillStyle = "#F5C400"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-34, -110, 68, 110, 10); c.fill(); c.stroke(); c.restore();
    if (t > T.buzz && t < T.tap) { c.strokeStyle = `rgba(245,196,0,${0.6 + 0.4 * Math.sin(t * 12)})`; c.lineWidth = 6; for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(nx, gy - 200, 80 + r * 38 + ((t * 40) % 38), -2.4, -0.7); c.stroke(); } }
    // Dev: asleep in his hard hat, then sitting bolt upright, then asleep again
    const awake = t > T.buzz + 0.5 && t < T.tap + 0.4, up = ease((t - (T.buzz + 0.5)) / 0.4) * (t < T.tap + 0.4 ? 1 : 1 - ease((t - T.tap - 0.4) / 0.4));
    const dev = { x: bx + 360, y: by + 14, s: 2.5, flip: -1, hat: "#ff7a1c", col: ink, t, mood: awake ? "shock" : "happy", mouth: E.mouth("Dev", t), pose: awake ? POSE.slump(t) : POSE.idle(t), rot: lerp(-88, -4, up), seed: 2, noShadow: true, blink: !awake, sweat: awake && t < T.tap };
    drawStick(c, dev);
    // z z z while he sleeps
    if (!awake) for (let i = 0; i < 3; i++) { const k = ((t * 0.7 + i * 0.33) % 1); c.fillStyle = `rgba(232,236,255,${1 - k})`; c.font = `700 ${70 + i * 24}px Caveat, cursive`; c.fillText("z", bx + 220 + k * 120 + i * 40, by - 100 - k * 170); }
    // the shift counter
    const showN = t > T.buzz + 0.3 && t < T.tap + 1.4; if (showN) { const hh = 9 + Math.floor(((t - T.buzz) * 1) % 4), mm = Math.floor(((t * 11) % 60)); notif(c, W, H * 0.45, "CONSTRA  ·  REMINDER", "Still clocked in", `shift open  ·  ${hh}:${String(mm).padStart(2, "0")}`, easeBack((t - (T.buzz + 0.35)) / 0.4) * (1 - ease((t - (T.tap + 1.0)) / 0.3)), true); }
    tapRipple(c, nx, gy - 230, t - T.tap);
    stamp(c, W * 0.5, H * 0.3, "CLOCKED OUT", T.tap + 0.45, t, "#2eaa62");
    scribble(c, W, H * 0.2, "11:30 PM", easeBack(t / 0.35) * (1 - ease((t - 1.4) / 0.3)), 140, ink);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#F5C400", fg: "#ffffff", stroke: "rgba(10,14,40,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(3) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 84, vol: 0.55, prog: [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [220, 261.6, 329.6]], beat: false }); const { tone, burst } = h;
    for (let k = 0; k < 10; k++) tone(1000 + (k % 2) * 160, T.buzz + k * 0.12, 0.08, 0.1, "square"); burst(T.buzz, [200, 2000], 0.6, 1.2, 0.05, "bandpass");
    sfx.boing(h, T.buzz + 0.5); sfx.pop(h, T.tap); sfx.thump(h, T.tap + 0.45); sfx.sparkle(h, T.tap + 0.7); sfx.trombone(h, E.LE(2) + 0.3);
    const ec = E.L(3) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

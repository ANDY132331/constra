import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { scribble, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The spreadsheet": Dev draws a grid all week, then a deck of ready-made templates fans out.
let ICON, T; const NAMES = ["TIMESHEET", "ESTIMATE", "INVOICE", "SAFETY", "DAILY REPORT", "PUNCH LIST", "MATERIALS", "CHANGE ORDER"];
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Dev: { pan: -0.15 }, Sonia: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), l4: E.L(4), e: E.L(5) }; T.deck = T.l3 + 0.4; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    notebookBg(c, W, H, gy, t);
    const cols = Math.min(14, Math.floor(2 + t * 1.1)), deck = t > T.deck, gx = W * 0.1, gyy = H * 0.2, cw = (W * 0.8) / 14, rh = 56;
    c.save(); c.globalAlpha = deck ? 1 - clamp((t - T.deck) / 0.4) : 1; c.strokeStyle = "#151617"; c.lineWidth = 4; c.fillStyle = "#fffef8"; c.fillRect(gx, gyy, cw * cols, rh * 7);
    for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(gx + i * cw, gyy); c.lineTo(gx + i * cw, gyy + rh * 7); c.stroke(); }
    for (let r = 0; r <= 7; r++) { c.beginPath(); c.moveTo(gx, gyy + r * rh); c.lineTo(gx + cw * cols, gyy + r * rh); c.stroke(); } c.restore();
    if (!deck) { c.fillStyle = "#c2336b"; c.font = "700 80px Caveat, cursive"; c.textAlign = "center"; c.fillText(t < T.l1 - 0.5 ? "MONDAY" : t < T.l2 - 0.2 ? "TUESDAY... WEDNESDAY..." : "FRIDAY", W / 2, gyy - 30); }
    const dev = { x: W * 0.3, y: gy, s, flip: 1, hat: "#ff7a1c", t, mood: deck ? "shock" : t > T.l2 ? "sad" : "angry", mouth: E.mouth("Dev", t), pose: deck ? POSE.shrug(t) : POSE.slump(t), seed: 2, sweat: !deck && t > T.l1, prop: !deck ? "paper" : null };
    const son = { x: W * 0.82, y: gy, s, flip: -1, t, mood: "smug", mouth: E.mouth("Sonia", t), pose: t > T.l3 ? POSE.point(t) : POSE.idle(t), seed: 3, hair: "pony" };
    drawStick(c, dev); if (t > T.l3 - 0.4) drawStick(c, son);
    if (deck) NAMES.forEach((nm, i) => {
      const u = easeBack(clamp((t - T.deck - i * 0.12) / 0.4)); if (u <= 0) return;
      const ang = (i - 3.5) * 0.17, px = W / 2 + (i - 3.5) * W * 0.07, py = H * 0.42 + Math.abs(i - 3.5) * 14;
      c.save(); c.translate(px, py + 90 * (1 - u)); c.rotate(ang); c.scale(u, u); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-110, -170, 220, 340, 12); c.fill(); c.stroke();
      c.fillStyle = "#1e7a45"; c.fillRect(-100, -160, 200, 52); c.fillStyle = "#fff"; c.font = "800 34px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("XLSX", 0, -134);
      c.fillStyle = "#151617"; c.font = "800 38px 'Barlow Condensed', sans-serif"; c.fillText(nm, 0, -60); c.strokeStyle = "rgba(21,22,23,0.35)"; c.lineWidth = 3; for (let g = 0; g < 5; g++) { c.beginPath(); c.moveTo(-90, -20 + g * 36); c.lineTo(90, -20 + g * 36); c.stroke(); } c.restore();
    });
    if (deck) { c.save(); c.fillStyle = "#c2336b"; c.font = "800 120px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.globalAlpha = clamp((t - T.deck - 0.8) / 0.4); c.fillText("23 TEMPLATES", W / 2, H * 0.17); c.restore(); confetti(c, W, H, t - T.deck); }
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(5) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 104, vol: 0.8 }); const { burst } = h;
    for (let k = 0; k < 14; k++) burst(0.6 + k * 0.45, [2500, 800], 1, 0.04, 0.05);
    sfx.trombone(h, E.LE(2) + 0.2); sfx.scratch(h, T.l3); for (let i = 0; i < 8; i++) sfx.pop(h, T.deck + i * 0.12); sfx.sparkle(h, T.deck + 1.0); sfx.applause(h, T.deck + 0.8, 1.6);
    const ec = E.L(5) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

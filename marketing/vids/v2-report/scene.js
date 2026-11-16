import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { scribble, stamp, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The report writes itself": Mac is stuck at 9 PM, then hours, weather, tasks and photos fly into the daily report.
let ICON, T; const BITS = ["HOURS", "WEATHER", "TASKS", "PHOTOS"];
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Clara: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.fill = E.W_(2, /hours/i, 1.0); },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    notebookBg(c, W, H, gy, t);
    const filled = t > T.fill;
    // the report card
    const rx = W / 2, ry = H * 0.3; c.save(); c.translate(rx, ry); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-380, -230, 760, 460, 16); c.fill(); c.stroke();
    c.fillStyle = "#F5C400"; c.fillRect(-374, -224, 748, 80); c.fillStyle = "#151617"; c.font = "800 58px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("DAILY REPORT", -340, -184);
    BITS.forEach((b, i) => { const a = T.fill + i * 0.45, u = easeOut(clamp((t - a) / 0.35)); const yy = -90 + i * 78; c.strokeStyle = "rgba(21,22,23,0.25)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-340, yy + 36); c.lineTo(340, yy + 36); c.stroke(); c.fillStyle = "#151617"; c.font = "700 44px 'IBM Plex Mono', monospace"; c.textAlign = "left"; c.fillText(b, -340, yy); if (u > 0) { c.globalAlpha = u; c.fillStyle = "#1e7a45"; c.textAlign = "right"; c.fillText("✔ added", 340 + (1 - u) * 80, yy); c.globalAlpha = 1; } });
    c.restore();
    const mac = { x: W * 0.2, y: gy, s, flip: 1, hat: null, t, mood: filled ? "happy" : "sad", mouth: E.mouth("Mac", t), pose: filled ? POSE.cheer(t) : POSE.slump(t), seed: 1, sweat: !filled };
    const cla = { x: W * 0.82, y: gy, s, flip: -1, t, mood: "smug", mouth: E.mouth("Clara", t), pose: t > T.l2 ? POSE.hold(t) : POSE.idle(t), seed: 2, hair: "pony", prop: t > T.l2 ? "phone" : null, screen: "#F5C400" };
    drawStick(c, mac); if (t > T.l2 - 0.5) drawStick(c, cla);
    if (!filled) { c.fillStyle = "#c2336b"; c.font = "700 70px Caveat, cursive"; c.textAlign = "center"; c.fillText("? ? ?", W * 0.2, gy - 520); }
    if (filled) { stamp(c, W / 2, H * 0.58, "DONE", T.fill + 2.0, t, "#1e7a45"); if (t > T.fill + 2.0) confetti(c, W, H, t - T.fill - 2.0); }
    scribble(c, W, H * 0.1, "9:00 PM", easeBack(t / 0.35) * (1 - ease((t - 1.5) / 0.3)), 120);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 92, vol: 0.7 });
    sfx.trombone(h, E.LE(1) + 0.2); for (let i = 0; i < 4; i++) sfx.pop(h, T.fill + i * 0.45); sfx.thump(h, T.fill + 2.0); sfx.sparkle(h, T.fill + 2.2); sfx.applause(h, T.fill + 2.3, 1.4);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

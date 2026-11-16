import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { scribble, stamp, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The final walk": the client lists issues, they land on a punch list, and each turns green.
let ICON, T; const ITEMS = ["Scuff on the wall", "Loose handle", "Paint touch-up"];
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Cliff: { pan: 0.2 }, Mac: { pan: -0.15 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.add = [T.l1 + 0.5, T.l1 + 1.7, T.l1 + 2.7]; T.tick = [T.l2 + 0.9, T.l2 + 1.7, T.l2 + 2.5]; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    notebookBg(c, W, H, gy, t);
    const done = T.tick.filter((a) => t > a).length, all = done === 3;
    c.save(); c.translate(W / 2, H * 0.3); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-380, -230, 760, 470, 16); c.fill(); c.stroke(); c.fillStyle = "#F5C400"; c.fillRect(-374, -224, 748, 80); c.fillStyle = "#151617"; c.font = "800 58px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("PUNCH LIST", -340, -184);
    ITEMS.forEach((it, i) => { const u = easeOut(clamp((t - T.add[i]) / 0.3)); if (u <= 0) return; const yy = -80 + i * 100, ok = t > T.tick[i]; c.globalAlpha = u; c.strokeStyle = "#151617"; c.lineWidth = 5; c.fillStyle = ok ? "#2eaa62" : "#fffef8"; c.beginPath(); c.roundRect(-340, yy - 28, 56, 56, 8); c.fill(); c.stroke(); if (ok) { c.strokeStyle = "#fff"; c.lineWidth = 8; c.beginPath(); c.moveTo(-328, yy); c.lineTo(-314, yy + 14); c.lineTo(-292, yy - 14); c.stroke(); } c.fillStyle = ok ? "#1e7a45" : "#151617"; c.font = "600 46px 'IBM Plex Sans', sans-serif"; c.fillText(it, -260, yy); c.globalAlpha = 1; });
    c.restore();
    const cliff = { x: W * 0.82, y: gy, s, flip: -1, t, mood: all ? "shock" : "neutral", mouth: E.mouth("Cliff", t), pose: t > T.l1 && t < T.l2 ? POSE.point(t) : POSE.idle(t), seed: 2, prop: "paper" };
    const mac = { x: W * 0.2, y: gy, s, flip: 1, hat: "#ffffff", t, mood: all ? "smug" : "happy", mouth: E.mouth("Mac", t), pose: t > T.l2 ? POSE.hold(t) : POSE.idle(t), seed: 1, prop: t > T.l2 ? "phone" : null, screen: "#F5C400" };
    drawStick(c, mac); drawStick(c, cliff);
    if (all) { stamp(c, W / 2, H * 0.58, "ALL CLEAR", T.tick[2] + 0.3, t, "#1e7a45"); if (t > T.tick[2] + 0.3) confetti(c, W, H, t - T.tick[2] - 0.3); }
    scribble(c, W, H * 0.1, "THE FINAL WALK", easeBack(t / 0.35) * (1 - ease((t - 1.6) / 0.3)), 110);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 110, vol: 0.75 });
    T.add.forEach((a) => sfx.pop(h, a)); T.tick.forEach((a) => sfx.sparkle(h, a)); sfx.thump(h, T.tick[2] + 0.3); sfx.applause(h, T.tick[2] + 0.4, 1.6);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { scribble, stamp, confetti, tapRipple } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The impatient client": the phone rings, Mac sends a link, the client just looks at the progress.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Cliff: { pan: 0.2 }, Mac: { pan: -0.15 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.send = E.W_(2, /link/i, 0.5); T.view = T.send + 1.2; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    notebookBg(c, W, H, gy, t);
    const sent = t > T.send, view = t > T.view;
    const ring = t < T.l2 ? Math.sin(t * 40) * 3 : 0;
    const mac = { x: W * 0.2, y: gy, s, flip: 1, hat: "#ffffff", t, mood: t > T.l2 ? "happy" : "angry", mouth: E.mouth("Mac", t), pose: t > T.l2 ? POSE.hold(t) : POSE.panic(t), seed: 1, prop: t > T.l2 ? "phone" : null, screen: "#F5C400", sweat: t < T.l2 };
    const cliff = { x: W * 0.82, y: gy, s, flip: -1, t, mood: view ? "happy" : "angry", mouth: E.mouth("Cliff", t), pose: view ? POSE.hold(t) : t > T.l1 ? POSE.point(t) : POSE.idle(t), seed: 2, hair: "pony", prop: "phone", screen: view ? "#2eaa62" : "#F5C400" };
    drawStick(c, mac); drawStick(c, cliff);
    if (t < T.l2) { c.save(); c.translate(W / 2 + ring, H * 0.3); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-300, -90, 600, 180, 20); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "800 60px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("CLIENT  ·  CALLING", 0, 0); c.restore(); }
    if (sent) { const u = easeBack((t - T.send) / 0.45); const fx = lerp(W * 0.3, W * 0.8, easeOut(clamp((t - T.send) / 0.9))), fy = gy - 330 - Math.sin(clamp((t - T.send) / 0.9) * Math.PI) * 200; if (!view) { c.save(); c.translate(fx, fy); c.scale(u, u); c.fillStyle = "#F5C400"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-120, -40, 240, 80, 14); c.fill(); c.stroke(); c.fillStyle = "#1a1600"; c.font = "800 44px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PROGRESS LINK", 0, 2); c.restore(); } }
    if (view) { const u = easeBack((t - T.view) / 0.5); c.save(); c.translate(W / 2, H * 0.3); c.scale(u, u); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-380, -200, 760, 400, 16); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "800 56px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("YOUR PROJECT", -340, -140); c.fillStyle = "#e7e5e0"; c.beginPath(); c.roundRect(-340, -60, 680, 60, 14); c.fill(); c.fillStyle = "#2eaa62"; c.beginPath(); c.roundRect(-340, -60, 680 * 0.65 * clamp((t - T.view) / 1.0), 60, 14); c.fill(); c.fillStyle = "#4B4D50"; c.font = "500 40px 'IBM Plex Sans', sans-serif"; c.fillText("Progress, photos and updates", -340, 70); c.fillText("No login. No prices.", -340, 130); c.restore(); stamp(c, W / 2, H * 0.58, "JUST LOOK", T.view + 1.4, t, "#1e7a45"); if (t > T.view + 1.4) confetti(c, W, H, t - T.view - 1.4); }
    tapRipple(c, W * 0.2 + 60, gy - 230, t - T.send);
    scribble(c, W, H * 0.1, "THE IMPATIENT CLIENT", easeBack(t / 0.35) * (1 - ease((t - 1.6) / 0.3)), 100);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 112, vol: 0.75 }); const { tone } = h;
    for (let k = 0; k < 12; k++) tone(k % 2 ? 1320 : 1040, 0.3 + k * 0.12, 0.08, 0.1, "square");
    sfx.scratch(h, E.L(1)); sfx.whoosh(h, T.send, 0.8); sfx.pop(h, T.view); sfx.thump(h, T.view + 1.4); sfx.sparkle(h, T.view + 1.6); sfx.applause(h, T.view + 1.6, 1.4);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

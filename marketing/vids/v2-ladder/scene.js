import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { siteBg } from "/sitebg.js";
import { scribble, stamp, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The ladder": Dev hunts for it; the equipment list shows where it is, service due, and low stock.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Dev: { pan: -0.15 }, Sonia: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.list = T.l2 + 0.2; T.found = T.l3 + 0.2; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    siteBg(c, W, H, gy, t, "trench");
    const listOn = t > T.list, found = t > T.found;
    // Dev pacing and looking around until he finds it
    const dx = found ? W * 0.3 : W * 0.3 + Math.sin(t * 1.6) * W * 0.16;
    const dev = { kind: "skeleton", x: dx, y: gy, s, flip: Math.cos(t * 1.6) > 0 ? 1 : -1, hat: "#ff7a1c", t, mood: found ? "happy" : "shock", mouth: E.mouth("Dev", t), pose: found ? POSE.cheer(t) : POSE.walk(t * 0.7, 0.9), seed: 2, sweat: !found };
    drawStick(c, dev);
    const son = { x: W * 0.86, y: gy, s, flip: -1, t, mood: "smug", mouth: E.mouth("Sonia", t), pose: t > T.l2 ? POSE.point(t) : POSE.idle(t), seed: 3, hair: "pony" };
    if (t > T.l2 - 0.5) drawStick(c, son);
    if (!found) { c.fillStyle = "#c2336b"; c.font = "700 90px Caveat, cursive"; c.textAlign = "center"; c.fillText("where's the ladder?", W * 0.5, H * 0.4); }
    if (listOn) { const u = easeBack((t - T.list) / 0.5); c.save(); c.translate(W / 2, H * 0.3); c.scale(u, u); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-400, -220, 800, 440, 16); c.fill(); c.stroke(); c.fillStyle = "#F5C400"; c.fillRect(-394, -214, 788, 76); c.fillStyle = "#151617"; c.font = "800 54px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("EQUIPMENT AND MATERIALS", -360, -176);
      c.font = "600 44px 'IBM Plex Mono', monospace"; c.fillText("Ladder", -360, -80); c.fillStyle = "#1e7a45"; c.textAlign = "right"; c.fillText("Job: Elm St. 3rd floor", 360, -80);
      c.fillStyle = "#151617"; c.textAlign = "left"; c.fillText("Nail gun", -360, 10); c.fillStyle = "#b9382c"; c.textAlign = "right"; c.fillText("SERVICE DUE", 360, 10);
      c.fillStyle = "#151617"; c.textAlign = "left"; c.fillText("Screws", -360, 100); c.fillStyle = "#b9382c"; c.textAlign = "right"; c.fillText("LOW STOCK", 360, 100); c.restore(); }
    if (found) { stamp(c, W / 2, H * 0.58, "FOUND IT", T.found + 0.4, t, "#1e7a45"); if (t > T.found + 0.4) confetti(c, W, H, t - T.found - 0.4); }
    scribble(c, W, H * 0.1, "THE LADDER", easeBack(t / 0.35) * (1 - ease((t - 1.4) / 0.3)), 120);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 106, vol: 0.75 }); const { burst } = h;
    for (let k = 0; k < 8; k++) burst(1.0 + k * 0.5, [380, 140], 1.2, 0.07, 0.04);
    sfx.boing(h, T.list); sfx.pop(h, T.list + 0.3); sfx.thump(h, T.found + 0.4); sfx.sparkle(h, T.found + 0.6); sfx.applause(h, T.found + 0.6, 1.4);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

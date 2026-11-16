import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { siteBg } from "/sitebg.js";
import { scribble, stamp } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "Near miss": a beam swings past Kai's head; Mac says he will remember; she logs it with a photo instead.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Kai: { pan: 0.2 }, Mac: { pan: -0.15 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.swing = T.l1 - 0.2; T.flash = E.W_(3, /photo/i, 0.6) + 0.1; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    siteBg(c, W, H, gy, t, "highrise");
    const swung = t > T.swing, logged = t > T.flash, bt = t - T.swing;
    const ang = swung && bt < 2.2 ? Math.sin(bt * 3.2) * 0.9 * (1 - bt / 2.4) : 0, bx = W * 0.62, by = H * 0.06;
    c.save(); c.translate(bx, by); c.rotate(ang); c.strokeStyle = "#151617"; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 560); c.stroke(); c.fillStyle = "#e0701e"; c.beginPath(); c.roundRect(-210, 560, 420, 46, 6); c.fill(); c.stroke(); c.restore();
    const kai = { x: W * 0.62, y: gy, s, flip: -1, hat: "#F5C400", hair: "braids", t, mood: logged ? "smug" : swung ? "shock" : "neutral", mouth: E.mouth("Kai", t), pose: logged ? POSE.hold(t) : swung && bt < 1.4 ? { ...POSE.panic(t), lean: -18 } : POSE.idle(t), seed: 3, sweat: swung && !logged, prop: logged ? "phone" : null, screen: "#F5C400", rot: swung && bt > 0.2 && bt < 0.9 ? 12 : 0 };
    const mac = { x: W * 0.18, y: gy, s, flip: 1, hat: "#ffffff", t, mood: t > T.l2 ? "happy" : "neutral", mouth: E.mouth("Mac", t), pose: t > T.l2 && t < T.l3 ? POSE.shrug(t) : POSE.idle(t), seed: 1 };
    drawStick(c, mac); drawStick(c, kai);
    if (t > T.l2 && t < T.l3 + 1.2) { const a = 1 - clamp((t - T.l2 - 0.8) / 2.2); c.save(); c.globalAlpha = a; c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 5; c.beginPath(); c.ellipse(W * 0.2, gy - 540, 190, 90, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "700 70px Caveat, cursive"; c.textAlign = "center"; c.fillText("beam. head. ...", W * 0.2, gy - 530); c.restore(); }
    if (logged) {
      const u = easeBack((t - T.flash - 0.25) / 0.45);
      if (u > 0) { c.save(); c.translate(W / 2, H * 0.3); c.scale(u, u); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-380, -170, 760, 340, 18); c.fill(); c.stroke(); c.fillStyle = "#e0301e"; c.fillRect(-374, -164, 748, 70); c.fillStyle = "#fff"; c.font = "800 52px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("SAFETY LOG  ·  NEAR MISS", -340, -128); c.fillStyle = "#cfe4f5"; c.fillRect(-340, -70, 250, 190); c.strokeStyle = "#151617"; c.strokeRect(-340, -70, 250, 190); c.fillStyle = "#e0701e"; c.fillRect(-310, 0, 190, 22); c.fillStyle = "#151617"; c.font = "500 36px 'IBM Plex Mono', monospace"; c.fillText("Swinging load", -60, -30); c.fillText("Photo attached", -60, 24); c.fillText("Logged", -60, 78); c.restore(); }
      stamp(c, W / 2, H * 0.52, "ON RECORD", T.flash + 0.8, t, "#1e7a45");
      const fl = 1 - clamp((t - T.flash) / 0.25); if (fl > 0) { c.fillStyle = `rgba(255,255,255,${fl})`; c.fillRect(0, 0, W, H); }
    }
    scribble(c, W, H * 0.1, "TUESDAY, 9:14 AM", easeBack(t / 0.35) * (1 - ease((t - 1.5) / 0.3)), 100);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 100, vol: 0.8 }); const { burst } = h;
    sfx.whoosh(h, T.swing, 0.7); sfx.boing(h, T.swing + 0.3); sfx.trombone(h, E.LE(2) + 0.2);
    burst(T.flash, [6000, 1200], 1, 0.12, 0.2); sfx.pop(h, T.flash + 0.3); sfx.thump(h, T.flash + 0.8); sfx.sparkle(h, T.flash + 1.0);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

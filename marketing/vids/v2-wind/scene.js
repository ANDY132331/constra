import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { siteBg } from "/sitebg.js";
import { scribble, stamp, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The wind steals the drawing": the paper blueprint blows away; the copy on the phone stays.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Kai: { pan: 0.2 }, Mac: { pan: -0.15 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.fly = T.l1 - 0.3; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    siteBg(c, W, H, gy, t, "sunset");
    const fb = t - T.fly, flew = t > T.fly;
    // wind streaks
    if (t > T.fly - 0.6 && t < T.l2) { c.strokeStyle = "rgba(70,120,190,0.5)"; c.lineWidth = 6; c.lineCap = "round"; for (let i = 0; i < 6; i++) { const x = ((t * 900 + i * 320) % (W + 400)) - 200, y = H * 0.15 + i * 140; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 220, y + Math.sin(t * 6 + i) * 14); c.stroke(); } }
    const kai = { x: W * 0.35, y: gy, s, flip: -1, hat: "#F5C400", hair: "braids", t, mood: t > T.l3 ? "smug" : flew && t < T.l2 ? "shock" : "neutral", mouth: E.mouth("Kai", t), pose: flew && t < T.l2 ? POSE.panic(t) : t > T.l2 ? POSE.hold(t) : POSE.hold(t), seed: 3, prop: t > T.l2 ? "phone" : null, screen: "#1e6fb0", sweat: flew && t < T.l2 };
    const mac = { kind: "robot", x: W * 0.8, y: gy, s, flip: -1, hat: "#ffffff", t, mood: "happy", mouth: E.mouth("Mac", t), pose: t > T.l2 ? POSE.point(t) : POSE.idle(t), seed: 1 };
    drawStick(c, mac); drawStick(c, kai);
    // paper blueprint: held, then flies off
    if (t < T.fly + 2.2) { const u = clamp(fb / 2.2); const x = flew ? lerp(W * 0.3, W * 1.3, easeOut(u)) : W * 0.28, y = flew ? gy - 330 - Math.sin(u * 7) * 90 - u * 300 : gy - 330, rot = flew ? u * 9 : -0.1; c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = "#2a5fa8"; c.strokeStyle = "#151617"; c.lineWidth = 5; c.beginPath(); c.rect(-120, -80, 240, 160); c.fill(); c.stroke(); c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-100, -50 + i * 34); c.lineTo(100 - i * 20, -50 + i * 34); c.stroke(); } c.restore(); }
    if (t > T.l2) { const u = easeBack((t - T.l2) / 0.5); c.save(); c.translate(W / 2, H * 0.3); c.scale(u, u); c.fillStyle = "#151617"; c.beginPath(); c.roundRect(-210, -300, 420, 600, 36); c.fill(); c.fillStyle = "#2a5fa8"; c.beginPath(); c.roundRect(-186, -270, 372, 540, 18); c.fill(); c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 4; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-150, -210 + i * 54); c.lineTo(150 - (i % 3) * 40, -210 + i * 54); c.stroke(); } c.restore(); }
    if (t > T.l3) { stamp(c, W / 2, H * 0.62, "STILL HERE", T.l3 + 0.2, t, "#1e7a45"); confetti(c, W, H, t - T.l3 - 0.2); }
    scribble(c, W, H * 0.1, "WINDY DAY", easeBack(t / 0.35) * (1 - ease((t - 1.4) / 0.3)), 120);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 100, vol: 0.7 }); const { burst } = h;
    burst(T.fly - 0.5, [1500, 300], 1, 2.2, 0.18, "bandpass"); sfx.whoosh(h, T.fly, 0.9); sfx.boing(h, T.fly + 0.3); sfx.pop(h, T.l2); sfx.sparkle(h, T.l3 + 0.4); sfx.applause(h, T.l3 + 0.4, 1.4);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

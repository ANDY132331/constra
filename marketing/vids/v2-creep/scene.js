import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { siteBg } from "/sitebg.js";
import { siren, scribble, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "Scope creep": the client keeps adding things; they pile onto Mac until each one gets a change order stamp.
let ICON, T; const ITEMS = ["+ WINDOW", "+ ISLAND", "+ HEATED FLOOR", "+ TINY MOAT"];
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Cliff: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), l4: E.L(4), e: E.L(5) }; T.add = [T.l1 + 1.2, T.l2 + 0.2, T.l2 + 1.2, T.l2 + 3.2]; T.fix = T.l3 + 1.4; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    siteBg(c, W, H, gy, t, "framing");
    const n = T.add.filter((a) => t > a).length, fixed = t > T.fix, sag = fixed ? 0 : n;
    const bx = W * 0.12, by = H * 0.17, bw = W * 0.76, pct = fixed ? 0.7 : Math.min(1.25, 0.35 + n * 0.22);
    c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 8; c.beginPath(); c.roundRect(bx, by, bw, 70, 14); c.fill();
    c.save(); c.beginPath(); c.roundRect(bx + 4, by + 4, bw - 8, 62, 10); c.clip(); c.fillStyle = fixed ? "#2eaa62" : pct > 1 ? "#e0301e" : "#F5C400"; c.fillRect(bx + 4, by + 4, (bw - 8) * Math.min(1, pct), 62); c.restore();
    c.beginPath(); c.roundRect(bx, by, bw, 70, 14); c.stroke(); c.fillStyle = "#151617"; c.font = "800 50px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.fillText("BUDGET", bx, by - 18);
    const mac = { x: W * 0.3, y: gy, s, flip: 1, hat: "#ffffff", t, mood: fixed ? "smug" : sag > 1 ? "shock" : "happy", mouth: E.mouth("Mac", t), pose: fixed ? POSE.hold(t) : sag ? { ...POSE.slump(t), lean: 8 + sag * 6 } : POSE.idle(t), seed: 1, sweat: sag > 2, prop: fixed ? "phone" : null, screen: "#F5C400" };
    const cliff = { kind: "robot", x: W * 0.82, y: gy, s, flip: -1, t, mood: "happy", mouth: E.mouth("Cliff", t), pose: n && !fixed ? POSE.point(t) : POSE.idle(t), seed: 2, hair: "pony" };
    drawStick(c, mac); drawStick(c, cliff);
    ITEMS.forEach((txt, i) => {
      const a = T.add[i]; if (t < a - 0.5) return;
      const u = clamp((t - (a - 0.5)) / 0.5), tx = W * 0.3, ty = gy - 560 - i * 78 + sag * 14, x = lerp(W * 0.78, tx, easeOut(u)), y = lerp(gy - 300, ty, easeOut(u)) - Math.sin(u * Math.PI) * 120;
      c.save(); c.translate(x, y); c.rotate((i % 2 ? 1 : -1) * 0.06); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-190, -34, 380, 68, 10); c.fill(); c.stroke();
      c.fillStyle = "#151617"; c.font = "800 44px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 2);
      if (fixed) { const k = clamp((t - T.fix - i * 0.18) / 0.2); if (k > 0) { c.globalAlpha = k; c.fillStyle = "#fffef8"; c.fillRect(-186, -30, 372, 60); c.fillStyle = "#1e7a45"; c.strokeStyle = "#1e7a45"; c.lineWidth = 5; c.beginPath(); c.roundRect(-176, -26, 352, 52, 8); c.stroke(); c.font = "800 34px 'Barlow Condensed', sans-serif"; c.fillText(txt.slice(2) + " · PRICED · APPROVED", 0, 2); } }
      c.restore();
    });
    if (t > T.add[3] && !fixed) siren(c, W, H, t, 0.8);
    if (t > T.fix + 0.2) confetti(c, W, H, t - T.fix - 0.2);
    scribble(c, W, H * 0.1, "DAY ONE", easeBack(t / 0.35) * (1 - ease((t - 1.4) / 0.3)), 120);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(5) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 116, vol: 0.8 });
    T.add.forEach((a) => sfx.thump(h, a)); sfx.trombone(h, E.LE(2) + 0.4); sfx.scratch(h, T.l3); sfx.pop(h, T.fix); sfx.sparkle(h, T.fix + 0.3); sfx.applause(h, T.fix + 0.4, 1.6);
    const ec = E.L(5) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

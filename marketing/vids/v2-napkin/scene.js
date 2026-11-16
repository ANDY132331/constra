import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { notif, siren, scribble, tapRipple, stamp, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The napkin": the quote is on a napkin, coffee ruins it, one tap turns the estimate into an invoice.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Rob: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), l4: E.L(4), e: E.L(5) }; T.spill = T.l2 + 0.9; T.tap = E.W_(4, /tap/i, 1.0) + 0.1; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    notebookBg(c, W, H, gy, t);
    const spilled = t > T.spill, tapped = t > T.tap;
    // napkin pinned on the wall
    const nx = W * 0.5, ny = H * 0.3, wob = spilled && t < T.spill + 0.5 ? Math.sin(t * 40) * 5 : 0;
    c.save(); c.translate(nx, ny); c.rotate(-0.04 + wob * 0.01); const nap = 1 - easeOut((t - (T.tap - 0.1)) / 0.4) * 1;
    if (nap > 0.01) { c.globalAlpha = Math.min(1, nap * 1.5); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.rect(-300, -150, 600, 300); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "700 76px Caveat, cursive"; c.textAlign = "left"; c.fillText("kitchen reno", -250, -60); c.fillText("cabinets .. $$", -250, 20); c.fillText("labour .. $$$", -250, 100);
      if (spilled) { const u = easeOut((t - T.spill) / 0.5); c.fillStyle = "rgba(100,60,25,0.78)"; c.beginPath(); c.ellipse(60, 20, 230 * u, 130 * u, 0.2, 0, 7); c.fill(); for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(-120 + i * 70, 150 + u * (30 + rnd(i) * 70), 14 * u, 0, 7); c.fill(); } } }
    c.restore();
    // invoice that replaces it
    if (tapped) { const u = easeBack((t - T.tap) / 0.5); c.save(); c.translate(nx, ny); c.scale(u, u); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-300, -190, 600, 380, 14); c.fill(); c.stroke(); c.fillStyle = "#F5C400"; c.fillRect(-294, -184, 588, 84); c.fillStyle = "#151617"; c.font = "800 70px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("INVOICE", -260, -142); c.font = "500 40px 'IBM Plex Mono', monospace"; c.fillText("Kitchen remodel", -260, -50); c.fillText("Cabinets", -260, 20); c.fillText("Labour", -260, 80); c.textAlign = "right"; c.fillText("1", 260, 20); c.fillText("2", 260, 80); c.restore(); }
    // people
    const mac = { x: W * 0.16, y: gy, s, flip: 1, hat: "#ffffff", t, mood: spilled && !tapped ? "shock" : tapped ? "smug" : "happy", mouth: E.mouth("Mac", t), pose: tapped ? POSE.hold(t) : spilled ? POSE.panic(t) : POSE.point(t), seed: 1, prop: tapped ? "phone" : null, screen: "#F5C400", sweat: spilled && !tapped };
    const rob = { x: W * 0.84, y: gy, s, flip: -1, t, mood: spilled && !tapped ? "angry" : "neutral", mouth: E.mouth("Rob", t), pose: t > T.l1 && t < T.l1 + 1 ? POSE.point(t) : spilled && !tapped ? POSE.shrug(t) : POSE.idle(t), seed: 2, prop: !spilled ? "coffee" : null, hair: null };
    drawStick(c, mac); drawStick(c, rob);
    if (spilled) { c.fillStyle = "rgba(100,60,25,0.8)"; c.beginPath(); c.ellipse(W * 0.7, gy + 10, 70 * easeOut((t - T.spill) / 0.5), 14, 0, 0, 7); c.fill(); }
    tapRipple(c, W * 0.16 + 60, gy - 230, t - T.tap);
    stamp(c, nx, ny + 290, "ESTIMATE → INVOICE", T.tap + 0.6, t, "#1e7a45");
    if (t > T.tap + 1.0) confetti(c, W, H, t - T.tap - 1.0);
    scribble(c, W, H * 0.1, "THE QUOTE", easeBack(t / 0.35) * (1 - ease((t - 1.6) / 0.3)), 120);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(5) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 108, vol: 0.8 });
    sfx.splat(h, T.spill); sfx.trombone(h, E.LE(3) + 0.2); sfx.pop(h, T.tap); sfx.sparkle(h, T.tap + 0.6); sfx.applause(h, T.tap + 1.0, 1.6);
    const ec = E.L(5) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

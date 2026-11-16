import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { scribble, stamp, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "Which version is final": a pile of contract_final copies collapses into one document with its versions kept.
let ICON, T; const NAMES = ["contract_final.pdf", "contract_final2.pdf", "contract_final_FINAL.pdf", "contract_final_v3_use_this.pdf"];
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Dev: { pan: -0.15 }, Sonia: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.add = [T.l1 + 0.3, T.l1 + 1.2, T.l1 + 2.1, T.l1 + 2.9]; T.fix = T.l2 + 0.5; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.8;
    notebookBg(c, W, H, gy, t);
    const n = T.add.filter((a) => t > a).length, fixed = t > T.fix;
    const dev = { x: W * 0.2, y: gy, s, flip: 1, hat: "#ff7a1c", t, mood: fixed ? "happy" : n > 2 ? "shock" : "neutral", mouth: E.mouth("Dev", t), pose: fixed ? POSE.cheer(t) : n > 2 ? POSE.panic(t) : POSE.idle(t), seed: 2, sweat: n > 2 && !fixed };
    const son = { x: W * 0.84, y: gy, s, flip: -1, t, mood: "smug", mouth: E.mouth("Sonia", t), pose: t > T.l2 ? POSE.point(t) : POSE.idle(t), seed: 3, hair: "pony" };
    drawStick(c, dev); if (t > T.l2 - 0.5) drawStick(c, son);
    if (!fixed) NAMES.forEach((nm, i) => { const a = T.add[i]; if (t < a) return; const u = easeOut(clamp((t - a) / 0.35)); c.save(); c.translate(W / 2 + (i % 2 ? 40 : -40), H * 0.18 + i * 120 + (1 - u) * -60); c.rotate((i % 2 ? 1 : -1) * 0.03); c.globalAlpha = u; c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 5; c.beginPath(); c.roundRect(-340, -44, 680, 88, 10); c.fill(); c.stroke(); c.fillStyle = "#b9382c"; c.fillRect(-326, -30, 44, 60); c.fillStyle = "#fff"; c.font = "800 22px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("PDF", -304, 0); c.fillStyle = "#151617"; c.font = "500 38px 'IBM Plex Mono', monospace"; c.textAlign = "left"; c.fillText(nm, -260, 2); c.restore(); });
    if (fixed) { const u = easeBack((t - T.fix) / 0.5); c.save(); c.translate(W / 2, H * 0.3); c.scale(u, u); c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(-380, -200, 760, 400, 16); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "800 56px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("CONTRACT", -340, -140);
      ["v3  ·  latest", "v2", "v1"].forEach((v, i) => { c.fillStyle = i ? "#77797C" : "#1e7a45"; c.font = `${i ? 500 : 700} 44px 'IBM Plex Mono', monospace`; c.fillText(v, -340, -50 + i * 80); }); c.restore(); stamp(c, W / 2, H * 0.58, "LATEST ON TOP", T.fix + 0.5, t, "#1e7a45"); if (t > T.fix + 0.5) confetti(c, W, H, t - T.fix - 0.5); }
    scribble(c, W, H * 0.1, "WHICH ONE?", easeBack(t / 0.35) * (1 - ease((t - 1.4) / 0.3)), 120);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 108, vol: 0.75 });
    T.add.forEach((a) => sfx.thump(h, a)); sfx.scratch(h, T.l2); sfx.pop(h, T.fix); sfx.thump(h, T.fix + 0.5); sfx.sparkle(h, T.fix + 0.7); sfx.applause(h, T.fix + 0.7, 1.4);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

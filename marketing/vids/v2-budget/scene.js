import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE, notebookBg } from "/stick.js";
import { notif, siren, scribble, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "Eighty percent": a job-cost meter fills while the crew hammers away. At 80% the siren goes and everybody freezes mid-swing.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Jess: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) { ICON = await loadImg("/icon.png"); T = { l0: E.L(0), l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.alert = T.l1 - 0.35; T.start = 0.9; T.thaw = E.LE(2) + 0.5; },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.8, s = 2.7;
    const frozen = t >= T.alert && t < T.thaw, ct = frozen ? T.alert : t;
    notebookBg(c, W, H, gy, t);
    // the job-cost meter, drawn like a thermometer on its side
    const mx = W * 0.1, my = H * 0.3, mw = W * 0.8, mh = 90, pct = t < T.start ? 0 : clamp((Math.min(t, T.alert) - T.start) / (T.alert - T.start)) * 0.8 + (t > T.thaw ? 0 : 0);
    c.fillStyle = "#fffef8"; c.strokeStyle = "#151617"; c.lineWidth = 8; c.beginPath(); c.roundRect(mx, my, mw, mh, 16); c.fill(); c.save(); c.beginPath(); c.roundRect(mx + 4, my + 4, (mw - 8) * pct, mh - 8, 12); c.fillStyle = pct > 0.75 ? "#e0301e" : "#F5C400"; c.fill(); c.restore(); c.beginPath(); c.roundRect(mx, my, mw, mh, 16); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(mx + mw * 0.8, my - 24); c.lineTo(mx + mw * 0.8, my + mh + 24); c.stroke(); c.fillStyle = "#151617"; c.font = "700 64px Caveat, cursive"; c.textAlign = "center"; c.fillText("80%", mx + mw * 0.8, my - 52); c.font = "800 54px 'Barlow Condensed', sans-serif"; c.textAlign = "left"; c.fillText("JOB COST", mx, my - 40); c.textAlign = "right"; c.font = "700 60px 'IBM Plex Mono', monospace"; c.fillText(Math.round(pct * 100) + "%", mx + mw, my + mh + 64);
    // the crew hammers like crazy; money flies off with every swing
    const crew = [{ n: "Jess", x: W * 0.44, hat: "#F5C400", hair: "pony" }, { n: "Dev", x: W * 0.64, hat: "#ff7a1c" }, { n: "Kai", x: W * 0.84, hat: null, hair: "braids" }];
    const mac = { x: W * 0.16, y: gy, s, flip: 1, hat: "#ffffff", t, mood: frozen ? "shock" : "happy", mouth: E.mouth("Mac", t), pose: frozen ? (t > E.L(2) - 0.2 ? POSE.panic(t) : POSE.panic(t)) : t > T.thaw ? POSE.slump(t) : POSE.hold(t), seed: 1, prop: "phone", screen: "#F5C400", sweat: frozen };
    if (t > T.thaw) mac.mood = "smug";
    drawStick(c, mac);
    crew.forEach((w, i) => { const sw = Math.sin(ct * (14 + i * 2)) * 0.5 + 0.5; const pose = { lean: 8, aF: [100 + sw * 60, 20], aB: [80 + sw * 20, 20], lF: [12, 8], lB: [-12, 8], hop: Math.abs(Math.sin(ct * (14 + i * 2))) * 12 }; const p = { x: w.x, y: gy, s, flip: -1, hat: w.hat, hair: w.hair, t: ct, mood: frozen ? "shock" : t > T.thaw ? "happy" : "angry", pose: t > T.thaw ? POSE.cheer(t + i) : pose, prop: t > T.thaw ? null : "hammer", seed: 2 + i, mouth: w.n === "Jess" ? E.mouth("Jess", t) : 0 }; drawStick(c, p); if (!frozen && t > T.start && t < T.alert) { const k = (ct * 3 + i * 0.4) % 1; c.fillStyle = `rgba(30,122,69,${1 - k})`; c.font = "800 80px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.fillText("$", w.x - 70 + Math.sin(k * 6) * 20, gy - 330 - k * 180); } });
    siren(c, W, H, t, clamp((t - T.alert) / 0.15) * (1 - ease((t - (T.alert + 2.6)) / 0.5)));
    notif(c, W, H * 0.06, "CONSTRA  ·  JOB COSTS", "80% of budget used", "Labour is at 80% on this job", easeBack((t - (T.alert + 0.1)) / 0.4) * (1 - ease((t - (T.thaw + 0.8)) / 0.3)));
    if (t > T.thaw + 0.6) confetti(c, W, H, t - T.thaw - 0.6);
    scribble(c, W, H * 0.17, "TUESDAY, 2 PM", easeBack(t / 0.35) * (1 - ease((t - 1.5) / 0.3)), 110);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 128, vol: 0.8 }); const { burst, tone } = h;
    for (let s = 0.9; s < T.alert; s += 0.22) burst(s, [3000, 900], 1, 0.05, 0.06);
    for (let k = 0; k < 8; k++) tone(k % 2 ? 880 : 620, T.alert + k * 0.26, 0.22, 0.12, "square"); sfx.scratch(h, T.alert); sfx.thump(h, T.alert + 0.05);
    sfx.trombone(h, E.LE(2) + 0.2); sfx.boing(h, T.thaw); sfx.applause(h, T.thaw + 0.3, 2.0); sfx.sparkle(h, T.thaw + 0.5);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

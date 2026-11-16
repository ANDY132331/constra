import { clamp, lerp, ease, easeOut, easeBack, rnd, loadImg } from "/engine.js";
import { drawStick, POSE } from "/stick.js";
import { siteBg } from "/sitebg.js";
import { notif, siren, scribble, confetti } from "/stickkit.js";
import { bed, sfx, endCard } from "/stage.js";

// "The coffee run": a geofence circle around the job, a stick figure who sneaks out of it, and the alert that follows him.
let ICON, T;
export default {
  endHold: 2.0, lead: 0.3, reverb: 0.05, bedGain: 0.5, duckTo: 0.3,
  voices: { Mac: { pan: -0.15 }, Dev: { pan: 0.2 }, Voice: { pan: 0 } },
  async init(E) {
    ICON = await loadImg("/icon.png"); const { W } = E;
    T = { l0: E.L(0), l1: E.L(1), l2: E.L(2), l3: E.L(3), e: E.L(4) }; T.leave = T.l1 - 0.1; T.cafe = T.leave + 3.4; T.cross = T.leave + 3.4 * ((0.62 - 0.4) / 0.5); T.back = E.LE(2) - 0.4; T.home = T.back + 1.5;
  },
  draw(t, c, E) {
    const { W, H, V } = E, gy = H * 0.78, s = 3.0, cxC = W * 0.33;
    const cd = t - T.cross, shake = cd >= 0 && cd < 0.5 ? (1 - cd / 0.5) * 10 : 0;
    c.save(); c.translate((rnd(Math.floor(t * 50) + 1) - 0.5) * shake, (rnd(Math.floor(t * 50) + 4) - 0.5) * shake);
    siteBg(c, W, H, gy, t, "sunset");
    // the geofence: a dashed circle on the ground around the job
    c.save(); c.strokeStyle = "#e0301e"; c.lineWidth = 8; c.setLineDash([26, 20]); c.lineDashOffset = -t * 30; c.beginPath(); c.ellipse(cxC, gy + 44, W * 0.3, 100, 0, 0, 7); c.stroke(); c.restore(); c.fillStyle = "rgba(224,48,30,0.07)"; c.beginPath(); c.ellipse(cxC, gy + 44, W * 0.3, 100, 0, 0, 7); c.fill();
    c.fillStyle = "#F5C400"; c.strokeStyle = "#151617"; c.lineWidth = 6; c.beginPath(); c.roundRect(W * 0.05, gy - 330, 230, 70, 8); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "800 44px 'Barlow Condensed', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("JOB SITE", W * 0.05 + 115, gy - 295); c.beginPath(); c.moveTo(W * 0.05 + 115, gy - 260); c.lineTo(W * 0.05 + 115, gy); c.stroke();
    // the coffee shop, far to the right
    const sx = W * 0.9; c.fillStyle = "#fffef8"; c.beginPath(); c.rect(sx - 110, gy - 250, 220, 250); c.fill(); c.stroke(); c.fillStyle = "#c9462c"; c.beginPath(); c.moveTo(sx - 130, gy - 250); c.lineTo(sx + 130, gy - 250); c.lineTo(sx + 110, gy - 190); c.lineTo(sx - 110, gy - 190); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#151617"; c.font = "800 44px 'Barlow Condensed', sans-serif"; c.fillText("COFFEE", sx, gy - 150); c.fillStyle = "#8a5a2b"; c.beginPath(); c.roundRect(sx - 40, gy - 110, 80, 80, 10); c.fill(); c.stroke();
    // distance line once he is out
    if (t > T.cross) { const a = easeOut((t - T.cross) / 0.4); c.save(); c.globalAlpha = a; c.strokeStyle = "#e0301e"; c.lineWidth = 6; c.setLineDash([14, 12]); c.beginPath(); c.moveTo(W * 0.62, gy - 40); c.lineTo(Math.min(W * 0.9, lerp(W * 0.62, W * 0.9, clamp((t - T.cross) / 1.2))), gy - 40); c.stroke(); c.setLineDash([]); c.fillStyle = "#e0301e"; c.font = "700 74px Caveat, cursive"; c.textAlign = "center"; c.fillText("1.2 km", W * 0.76, gy - 80); c.restore(); }
    // people
    let mac = { x: W * 0.14, y: gy, s, flip: 1, hat: "#ffffff", t, mood: "neutral", mouth: E.mouth("Mac", t), pose: POSE.idle(t), seed: 1, prop: "phone", screen: "#F5C400" };
    if (t > T.cross && t < T.back + 0.6) { mac.pose = t > T.l2 - 0.3 ? POSE.point(t) : POSE.panic(t); mac.mood = t > T.l2 ? "angry" : "shock"; mac.sweat = t < T.l2; }
    if (t >= T.back + 0.6) { mac.mood = "happy"; mac.pose = POSE.hold(t); mac.prop = "coffee"; }
    let dev = { x: W * 0.4, y: gy, s, flip: 1, hat: "#ff7a1c", t, mood: "happy", mouth: E.mouth("Dev", t), pose: POSE.cheer(t * 0.5), seed: 2, prop: "hammer" };
    if (t > T.leave && t < T.cafe) { const u = (t - T.leave) / 3.4; dev.x = lerp(W * 0.4, W * 0.9, u); dev.pose = POSE.walk(t * 0.6, 0.9); dev.prop = null; dev.mood = "smug"; dev.flip = 1; dev.look = [1, 0]; }
    if (t >= T.cafe && t < T.back) { dev.x = W * 0.9; dev.pose = POSE.hold(t); dev.prop = "coffee"; dev.mood = "happy"; dev.flip = -1; }
    if (t >= T.back) { const u = clamp((t - T.back) / 1.5); dev.x = lerp(W * 0.9, W * 0.2, easeOut(u)); dev.pose = u < 1 ? POSE.run(t) : POSE.cheer(t); dev.prop = "coffee"; dev.flip = -1; dev.mood = "happy"; dev.sweat = u < 1; if (u >= 1) dev.x = W * 0.2; }
    drawStick(c, mac); drawStick(c, dev);
    c.restore();
    siren(c, W, H, t, clamp((t - T.cross) / 0.2) * (1 - ease((t - (T.cross + 1.9)) / 0.4)));
    notif(c, W, H * 0.07, "CONSTRA  ·  SITE ALERT", "Dev left the job", "1.2 km away  ·  10:42 AM", easeBack((t - (T.cross + 0.15)) / 0.4) * (1 - ease((t - (T.l2 + 2.4)) / 0.3)));
    if (t >= T.back + 1.6) { c.save(); c.globalAlpha = easeOut((t - T.back - 1.6) / 0.3); c.fillStyle = "#1e7a45"; c.font = "700 90px Caveat, cursive"; c.textAlign = "center"; c.fillText("back on site", W * 0.5, H * 0.18); c.restore(); }
    scribble(c, W, H * 0.2, "10:42 AM", easeBack(t / 0.35) * (1 - ease((t - 1.5) / 0.3)), 130);
    E.caption(c, t, { y: V ? H * 0.91 : H * 0.93, size: V ? 58 : 48, hi: "#c2336b", fg: "#151617", stroke: "rgba(255,254,248,0.95)", font: "'Barlow Condensed', sans-serif", maxW: V ? W - 140 : W * 0.7 });
    const ec = E.L(4) - 0.1; if (t >= ec) endCard(c, E, t, t - ec, { icon: ICON });
  },
  audio(h, E) {
    bed(h, E, { bpm: 112, vol: 0.8 }); const { burst, tone } = h;
    for (let s = 0; s < 8; s++) burst(T.leave + s * 0.4, [380, 140], 1.2, 0.07, 0.04);
    for (let k = 0; k < 6; k++) tone(k % 2 ? 880 : 660, T.cross + k * 0.24, 0.2, 0.12, "square"); sfx.scratch(h, T.cross); sfx.thump(h, T.cross + 0.1); sfx.trombone(h, E.LE(2) + 0.2);
    sfx.whoosh(h, T.back, 0.8); for (let s = 0; s < 8; s++) burst(T.back + s * 0.17, [380, 140], 1.2, 0.07, 0.06); sfx.sparkle(h, T.back + 1.6); sfx.rim(h, E.LE(3) + 0.1);
    const ec = E.L(4) - 0.1; sfx.whoosh(h, ec - 0.05, 0.35); sfx.sparkle(h, ec + 0.2);
  },
};

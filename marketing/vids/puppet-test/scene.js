import { STYLES, drawPuppet, drawTalker, blinkAt } from "/puppet.js";
const CH = {
  Mac: { skin: "#e8b98a", shirt: "#fff", sleeve: "#fff", vest: null, pants: "#1f2a44", hat: "#ffffff", hair: "#3a2519", hairStyle: "short", stache: true, logo: "#F5C400" },
  Jess: { skin: "#f3c9a5", shirt: "#c2336b", pants: "#2b2f3a", vest: "#F5C400", hat: "#F5C400", hair: "#7a3b1d", hairStyle: "ponytail", glove: "#2a2a2d" },
  Dev: { skin: "#a56f4a", shirt: "#444b57", vest: "#ff7a1c", pants: "#5b4a3a", hat: "#ff7a1c", hair: "#1d1410", hairStyle: "short", beard: true, w: 1.12 },
};
export default {
  endHold: 1, voices: { Mac: {} }, async init() {},
  draw(t, c, E) {
    const { W, H } = E; c.fillStyle = "#dfe6ee"; c.fillRect(0, 0, W, H);
    const rows = ["toon", "paper", "flat", "comic"];
    rows.forEach((name, r) => {
      const st = STYLES[name], y = 430 + r * 440, sc = 0.78; c.fillStyle = ["#cfe6ff", "#e9d3a8", "#f4efe6", "#fff3b0"][r]; c.fillRect(0, y - 400, W, 440);
      const moods = ["neutral", "happy", "shock", "angry"];
      [["Mac", 180, "talk"], ["Jess", 540, "walk"], ["Dev", 900, "sad"]].forEach(([n, x, kind], i) => {
        const p = { x, y, scale: sc, flip: i === 1 ? -1 : 1, t, mouth: kind === "talk" ? 0.5 + 0.5 * Math.sin(t * 9) : 0, mood: kind === "sad" ? "sad" : moods[r], blink: blinkAt(t, i), walk: t * 7, walkAmt: kind === "walk" ? 1 : 0, armL: kind === "talk" ? [1.2, 0.8] : undefined, armR: kind === "talk" ? [0.5, 0.4] : undefined, prop: i === 0 ? "clipboard" : i === 1 ? "phone" : "coffee", propHand: "R", sweat: kind === "sad" };
        drawPuppet(c, CH[n], p, st);
      });
    });
    c.fillStyle = "#000"; c.font = "700 30px sans-serif"; rows.forEach((n, r) => c.fillText(n, 20, 60 + r * 440));
  },
  audio() {},
};

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Turns the drone orbit (Pexels 6033941, free for commercial use) into the scroll-played frames
// for the homepage hero: public/hero/w (1024x576, computers) and public/hero/m (450x800, phones,
// centre crop). node extract-frames.mjs <clip.mp4> [startSec] [endSec] [frames]
const [clip, startArg = "0", endArg = "30", countArg = "150"] = process.argv.slice(2);
const START = Number(startArg), END = Number(endArg), COUNT = Number(countArg);
const OUT = path.resolve("../../public/hero");
for (const d of ["w", "m"]) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });

const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage();
await p.route("https://x.local/**", (r) => r.request().url().endsWith(".mp4")
  ? r.fulfill({ contentType: "video/mp4", body: fs.readFileSync(clip) })
  : r.fulfill({ contentType: "text/html", body: "<body></body>" }));
await p.goto("https://x.local/");
await p.evaluate(async () => {
  const v = document.createElement("video"); v.muted = true;
  v.src = URL.createObjectURL(await (await fetch("/clip.mp4")).blob());
  await new Promise((r) => (v.onloadeddata = r));
  window.v = v;
});
let total = { w: 0, m: 0 };
for (let i = 0; i < COUNT; i++) {
  const t = START + (END - START) * (i / (COUNT - 1));
  const out = await p.evaluate(async (t) => {
    const v = window.v;
    v.currentTime = t;
    await new Promise((r) => (v.onseeked = r));
    const enc = async (c, q) => {
      const blob = await new Promise((r) => c.toBlob(r, "image/webp", q));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ""; for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode(...buf.subarray(k, k + 0x8000));
      return btoa(s);
    };
    const w = document.createElement("canvas"); w.width = 1024; w.height = 576;
    w.getContext("2d").drawImage(v, 0, 0, 1024, 576);
    // Phones: a 9:16 slice from the middle of the 16:9 frame
    const m = document.createElement("canvas"); m.width = 450; m.height = 800;
    const sw = v.videoHeight * 9 / 16, sx = (v.videoWidth - sw) / 2;
    m.getContext("2d").drawImage(v, sx, 0, sw, v.videoHeight, 0, 0, 450, 800);
    return { w: await enc(w, 0.5), m: await enc(m, 0.5) };
  }, t);
  const name = String(i).padStart(3, "0") + ".webp";
  for (const k of ["w", "m"]) {
    const buf = Buffer.from(out[k], "base64");
    fs.writeFileSync(`${OUT}/${k}/${name}`, buf);
    total[k] += buf.length;
  }
}
console.log(`${COUNT} frames  computers ${Math.round(total.w / 1024)} KB  phones ${Math.round(total.m / 1024)} KB`);
await b.close();

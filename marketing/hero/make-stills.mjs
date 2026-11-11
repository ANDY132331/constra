import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Card images and covers for the homepage hero → public/hero
//   worker.webp     a worker in hi-vis and a hard hat (Pexels 8488052, free for commercial use)
//   app-time.webp   the real Time screen, top part
//   poster-*.webp   re-encoded lighter; tiny-*.txt  ~1 KB blurred placeholders (data URIs)
const ROOT = path.resolve(".");
const OUT = `${ROOT}/public/hero`;
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage();
const files = {
  "/hat.mp4": [`${ROOT}/.tmp-ad/stock/paperwork.mp4`, "video/mp4"],
  "/time.png": [`${ROOT}/app-store-screenshots/iphone-6.9-2-time.png`, "image/png"],
  "/pw.webp": [`${OUT}/poster-w.webp`, "image/webp"],
  "/pm.webp": [`${OUT}/poster-m.webp`, "image/webp"],
};
await p.route("https://x.local/**", (r) => { const f = files[new URL(r.request().url()).pathname]; return f ? r.fulfill({ contentType: f[1], body: fs.readFileSync(f[0]) }) : r.fulfill({ contentType: "text/html", body: "<body></body>" }); });
await p.goto("https://x.local/");
const out = await p.evaluate(async () => {
  const enc = async (c, q) => { const bl = await new Promise((r) => c.toBlob(r, "image/webp", q)); const u = new Uint8Array(await bl.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  const res = {};
  // worker portrait, 3:4
  const v = document.createElement("video"); v.muted = true; v.src = URL.createObjectURL(await (await fetch("/hat.mp4")).blob());
  await new Promise((r) => (v.onloadeddata = r)); v.currentTime = 2.2; await new Promise((r) => (v.onseeked = r));
  { const c = document.createElement("canvas"); c.width = 480; c.height = 640; const sh = v.videoWidth * 4 / 3; c.getContext("2d").drawImage(v, 0, 0, v.videoWidth, sh, 0, 0, 480, 640); res["worker.webp"] = await enc(c, 0.72); }
  // app screen, top of the Time page
  { const img = new Image(); img.src = "/time.png"; await img.decode(); const c = document.createElement("canvas"); c.width = 430; c.height = 560; c.getContext("2d").drawImage(img, 0, 0, img.naturalWidth, img.naturalWidth * 560 / 430, 0, 0, 430, 560); res["app-time.webp"] = await enc(c, 0.75); }
  // lighter covers and tiny placeholders
  for (const [k, w, h, tw, th] of [["w", 1280, 720, 32, 18], ["m", 720, 1280, 18, 32]]) {
    const img = new Image(); img.src = `/p${k}.webp`; await img.decode();
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
    res[`poster-${k}.webp`] = await enc(c, 0.42);
    const t = document.createElement("canvas"); t.width = tw; t.height = th; t.getContext("2d").drawImage(img, 0, 0, tw, th);
    res[`tiny-${k}.txt`] = btoa(t.toDataURL("image/webp", 0.5));
  }
  return res;
});
for (const [name, data] of Object.entries(out)) {
  const buf = Buffer.from(data, "base64");
  fs.writeFileSync(name.endsWith(".txt") ? `marketing/hero/${name}` : `${OUT}/${name}`, buf);
  console.log(name, Math.round(buf.length / 1024 * 10) / 10, "KB");
}
await b.close();

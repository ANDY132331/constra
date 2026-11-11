import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// The app card in the homepage hero → public/hero/app-time.webp (the real Time screen, top part).
// The hero video, its posters and tiny-w.txt come from flight/render.mjs.
const ROOT = path.resolve(".");
const OUT = `${ROOT}/public/hero`;
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage();
const src = `${ROOT}/app-store-screenshots/iphone-6.9-2-time.png`;
await p.route("https://x.local/**", (r) => new URL(r.request().url()).pathname === "/time.png"
  ? r.fulfill({ contentType: "image/png", body: fs.readFileSync(src) })
  : r.fulfill({ contentType: "text/html", body: "<body></body>" }));
await p.goto("https://x.local/");
const data = await p.evaluate(async () => {
  const img = new Image(); img.src = "/time.png"; await img.decode();
  const c = document.createElement("canvas"); c.width = 430; c.height = 560;
  c.getContext("2d").drawImage(img, 0, 0, img.naturalWidth, img.naturalWidth * 560 / 430, 0, 0, 430, 560);
  const bl = await new Promise((r) => c.toBlob(r, "image/webp", 0.75));
  const u = new Uint8Array(await bl.arrayBuffer()); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
});
fs.writeFileSync(`${OUT}/app-time.webp`, Buffer.from(data, "base64"));
console.log("app-time.webp written");
await b.close();

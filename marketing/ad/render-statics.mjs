import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Static feed ads (statics.html): 5 hooks x 4:5 (1080x1350) and square (1080x1080) → ../static/
// Needs the stock clips in ../../.tmp-ad/stock (for the two footage frames) and Microsoft Edge.
const ROOT = path.resolve("../..");
const TMP = `${ROOT}/.tmp-ad`;
const OUT = path.resolve("../static");
fs.mkdirSync(OUT, { recursive: true });
const IMG = {
  "time.png": `${ROOT}/app-store-screenshots/iphone-6.9-2-time.png`,
  "icon.png": `${ROOT}/public/icon-512.png`,
  "pdf.png": "assets/timesheet-pdf.png",
};

const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const frames = {};
await ctx.route("https://ad.local/**", async (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === "/" || u.pathname === "/statics.html") return r.fulfill({ contentType: "text/html", body: fs.readFileSync("statics.html") });
  if (u.pathname === "/frame.html") return r.fulfill({ contentType: "text/html", body: "<body style='margin:0'><video id=v muted playsinline></video></body>" });
  if (u.pathname.startsWith("/stock/")) return r.fulfill({ contentType: "video/mp4", body: fs.readFileSync(`${TMP}/stock/${path.basename(u.pathname)}`) });
  const name = path.basename(u.pathname);
  if (frames[name]) return r.fulfill({ contentType: "image/jpeg", body: frames[name] });
  if (IMG[name]) return r.fulfill({ contentType: "image/png", body: fs.readFileSync(IMG[name]) });
  return r.fulfill({ status: 404, body: "" });
});

// Grab one good frame from each clip
const fp = await ctx.newPage();
await fp.goto("https://ad.local/frame.html");
for (const [name, file, t] of [["frame-paper.jpg", "paperwork.mp4", 2.2], ["frame-crew.jpg", "crew.mp4", 3.0]]) {
  const b64 = await fp.evaluate(async ({ file, t }) => {
    const v = document.getElementById("v");
    v.src = URL.createObjectURL(await (await fetch(`/stock/${file}`)).blob());
    await new Promise((r) => (v.onloadeddata = r));
    v.currentTime = t;
    await new Promise((r) => (v.onseeked = r));
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.9).split(",")[1];
  }, { file, t });
  frames[name] = Buffer.from(b64, "base64");
}

const p = await ctx.newPage();
for (const v of ["paper", "alert", "timesheet", "photo", "texts"]) {
  for (const [label, h] of [["4x5", 1350], ["1x1", 1080]]) {
    await p.setViewportSize({ width: 1080, height: h });
    await p.goto(`https://ad.local/statics.html?v=${v}&h=${h}`, { waitUntil: "networkidle" });
    await p.evaluate(() => window.ready);
    await p.screenshot({ path: `${OUT}/constra-${v}-${label}.png` });
  }
}
console.log(fs.readdirSync(OUT).join("\n"));
await b.close();

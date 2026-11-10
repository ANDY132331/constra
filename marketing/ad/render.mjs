import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// node render.mjs stills   → a contact sheet of key moments
// node render.mjs video    → constra-ad.mp4 (1080x1920, 30 fps, H.264)
// Needs: npm i mp4-muxer@5.1.3 in construction-web/.tmp-ad (gitignored), and Microsoft Edge.
const mode = process.argv[2] || "stills";
const ROOT = path.resolve("../.."); // construction-web (run from marketing/ad)
const IMG = {
  "time.png": `${ROOT}/app-store-screenshots/iphone-6.9-2-time.png`,
  "plan.png": `${ROOT}/app-store-screenshots/iphone-6.9-3-crew-plan.png`,
  "dash.png": `${ROOT}/app-store-screenshots/iphone-6.9-1-dashboard.png`,
  "icon.png": `${ROOT}/public/icon-512.png`,
  "pdf.png": "assets/timesheet-pdf.png",
};
const FPS = 30, DURATION = 30;

const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await ctx.route("https://ad.local/**", async (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === "/") return r.fulfill({ contentType: "text/html", body: fs.readFileSync("ad.html") });
  if (u.pathname.startsWith("/img/")) return r.fulfill({ contentType: "image/png", body: fs.readFileSync(IMG[u.pathname.slice(5)]) });
  if (u.pathname === "/mux.js") return r.fulfill({ contentType: "text/javascript", body: fs.readFileSync("../../.tmp-ad/node_modules/mp4-muxer/build/mp4-muxer.js") });
  return r.fulfill({ status: 404, body: "" });
});
const p = await ctx.newPage();
await p.goto("https://ad.local/", { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));

if (mode === "stills") {
  const times = [1.4, 2.6, 5.9, 7.6, 9.9, 12.4, 16.5, 20.9, 24.8, 29];
  const shots = [];
  for (const t of times) {
    await p.evaluate((t) => window.render(t), t);
    shots.push((await p.screenshot({ type: "jpeg", quality: 80 })).toString("base64"));
  }
  const sheet = await ctx.newPage();
  await sheet.setViewportSize({ width: 1700, height: 640 });
  await sheet.setContent(`<body style="margin:0;background:#555;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${shots.map((s, i) => `<div style="color:#fff;font:12px sans-serif"><img style="width:160px;display:block" src="data:image/jpeg;base64,${s}">${times[i]}s</div>`).join("")}</body>`);
  await sheet.screenshot({ path: "stills.png", fullPage: true });
  console.log("stills.png");
} else {
  // Encoder runs in its own secure page; frames are passed in as JPEG bytes
  const enc = await ctx.newPage();
  await enc.goto("https://ad.local/", { waitUntil: "domcontentloaded" });
  await enc.addScriptTag({ url: "https://ad.local/mux.js" });
  await enc.evaluate(({ FPS }) => {
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
    window.muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: 1080, height: 1920 }, fastStart: "in-memory" });
    window.encoder = new VideoEncoder({ output: (chunk, meta) => window.muxer.addVideoChunk(chunk, meta), error: (e) => { window.encErr = String(e); } });
    window.encoder.configure({ codec: "avc1.640033", width: 1080, height: 1920, bitrate: 10_000_000, framerate: FPS });
    window.frameNo = 0;
    window.addFrame = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
      const frame = new VideoFrame(bmp, { timestamp: Math.round((window.frameNo * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      window.encoder.encode(frame, { keyFrame: window.frameNo % (FPS * 2) === 0 });
      frame.close(); bmp.close();
      window.frameNo++;
      if (window.encoder.encodeQueueSize > 10) await new Promise((r) => setTimeout(r, 20));
    };
  }, { FPS });
  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    await p.evaluate((t) => window.render(t), i / FPS);
    const jpg = (await p.screenshot({ type: "jpeg", quality: 92 })).toString("base64");
    await enc.evaluate((b64) => window.addFrame(b64), jpg);
    if (i % 90 === 0) console.log(`frame ${i}/${total}`);
  }
  const b64 = await enc.evaluate(async () => {
    await window.encoder.flush();
    window.muxer.finalize();
    const buf = new Uint8Array(window.muxer.target.buffer);
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { data: btoa(s), err: window.encErr || null };
  });
  if (b64.err) throw new Error(b64.err);
  fs.writeFileSync("constra-ad.mp4", Buffer.from(b64.data, "base64"));
  console.log("constra-ad.mp4", fs.statSync("constra-ad.mp4").size, "bytes");
}
await b.close();

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// The voiced cut with real footage (ad2.html).
// node render2.mjs stills   → stills2.png, a contact sheet of key moments
// node render2.mjs video    → constra-ad-voice.mp4 (1080x1920, 30 fps, H.264 + AAC)
// Needs: stock clips in ../../.tmp-ad/stock, voice lines in ../../.tmp-ad/vo (voice.ps1),
// mp4-muxer in ../../.tmp-ad/node_modules, and Microsoft Edge.
const mode = process.argv[2] || "stills";
const ROOT = path.resolve("../..");
const TMP = `${ROOT}/.tmp-ad`;
const IMG = {
  "time.png": `${ROOT}/app-store-screenshots/iphone-6.9-2-time.png`,
  "plan.png": `${ROOT}/app-store-screenshots/iphone-6.9-3-crew-plan.png`,
  "dash.png": `${ROOT}/app-store-screenshots/iphone-6.9-1-dashboard.png`,
  "icon.png": `${ROOT}/public/icon-512.png`,
  "pdf.png": "assets/timesheet-pdf.png",
};
const FPS = 30;

const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await ctx.route("https://ad.local/**", async (r) => {
  const u = new URL(r.request().url());
  const send = (body, contentType) => r.fulfill({ contentType, body });
  if (u.pathname === "/") return send(fs.readFileSync("ad2.html"), "text/html");
  if (u.pathname.startsWith("/img/")) return send(fs.readFileSync(IMG[u.pathname.slice(5)]), "image/png");
  if (u.pathname.startsWith("/stock/")) return send(fs.readFileSync(`${TMP}/stock/${path.basename(u.pathname)}`), "video/mp4");
  if (u.pathname.startsWith("/vo/")) return send(fs.readFileSync(`${TMP}/vo/${path.basename(u.pathname)}`), "audio/wav");
  if (u.pathname === "/soundtrack.js") return send(fs.readFileSync("soundtrack.js"), "text/javascript");
  if (u.pathname === "/mux.js") return send(fs.readFileSync(`${TMP}/node_modules/mp4-muxer/build/mp4-muxer.js`), "text/javascript");
  return r.fulfill({ status: 404, body: "" });
});
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("[page]", e.message));
await p.goto("https://ad.local/", { waitUntil: "networkidle" });
const clipLengths = await p.evaluate(() => window.ready);
console.log("clips", clipLengths);
const DURATION = await p.evaluate(() => window.DURATION);

if (mode === "stills") {
  const times = [1.6, 3.4, 6.9, 9.6, 12.4, 14.6, 18.5, 22.8, 27, 32.5];
  const shots = [];
  for (const t of times) {
    await p.evaluate((t) => window.render(t), t);
    shots.push((await p.screenshot({ type: "jpeg", quality: 80 })).toString("base64"));
  }
  const sheet = await ctx.newPage();
  await sheet.setViewportSize({ width: 1700, height: 640 });
  await sheet.setContent(`<body style="margin:0;background:#555;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${shots.map((s, i) => `<div style="color:#fff;font:12px sans-serif"><img style="width:160px;display:block" src="data:image/jpeg;base64,${s}">${times[i]}s</div>`).join("")}</body>`);
  await sheet.screenshot({ path: "stills2.png", fullPage: true });
  console.log("stills2.png");
} else {
  const enc = await ctx.newPage();
  await enc.goto("https://ad.local/", { waitUntil: "domcontentloaded" });
  await enc.addScriptTag({ url: "https://ad.local/mux.js" });
  await enc.addScriptTag({ url: "https://ad.local/soundtrack.js" });
  const levels = await enc.evaluate(async ({ FPS, DURATION }) => {
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
    window.muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: 1080, height: 1920 }, audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 }, fastStart: "in-memory" });
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
    // Voice lines, placed and ducked
    const dec = new OfflineAudioContext(2, 48000, 48000);
    const cues = window.CUES;
    cues.voice = [];
    cues.duck = [[cues.alert.ping - 0.1, cues.alert.ping + 1.2, 0.45]];
    for (let i = 0; i < window.VO_AT.length; i++) {
      const buf = await dec.decodeAudioData(await (await fetch(`/vo/vo-${String(i + 1).padStart(2, "0")}.wav`)).arrayBuffer());
      cues.voice.push({ buffer: buf, at: window.VO_AT[i] });
      cues.duck.push([window.VO_AT[i], window.VO_AT[i] + buf.duration - 0.15, 0.3]);
    }
    const audio = await window.makeSoundtrack(DURATION, cues);
    const L = audio.getChannelData(0), R = audio.getChannelData(1);
    let peak = 0, sum = 0;
    for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > peak) peak = v; sum += L[i] * L[i]; }
    // Keep it from clipping where the voice sits on a hit
    const gain = peak > 0.98 ? 0.98 / peak : 1;
    const aenc = new AudioEncoder({ output: (chunk, meta) => window.muxer.addAudioChunk(chunk, meta), error: (e) => { window.encErr = String(e); } });
    aenc.configure({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
    const N = 1024;
    for (let off = 0; off < L.length; off += N) {
      const n = Math.min(N, L.length - off);
      const data = new Float32Array(n * 2);
      for (let k = 0; k < n; k++) { data[k] = L[off + k] * gain; data[n + k] = R[off + k] * gain; }
      const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off / 48000) * 1e6), data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush();
    return { peak: +peak.toFixed(3), gain: +gain.toFixed(3), rmsDb: +(10 * Math.log10(sum / L.length)).toFixed(1) };
  }, { FPS, DURATION });
  console.log("soundtrack", levels);
  const total = Math.round(FPS * DURATION);
  for (let i = 0; i < total; i++) {
    await p.evaluate((t) => window.render(t), i / FPS);
    const jpg = (await p.screenshot({ type: "jpeg", quality: 92 })).toString("base64");
    await enc.evaluate((b64) => window.addFrame(b64), jpg);
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
  const out = await enc.evaluate(async () => {
    await window.encoder.flush();
    window.muxer.finalize();
    const buf = new Uint8Array(window.muxer.target.buffer);
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { data: btoa(s), err: window.encErr || null };
  });
  if (out.err) throw new Error(out.err);
  fs.writeFileSync("constra-ad-voice.mp4", Buffer.from(out.data, "base64"));
  console.log("constra-ad-voice.mp4", fs.statSync("constra-ad-voice.mp4").size, "bytes");
}
await b.close();

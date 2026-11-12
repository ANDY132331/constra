import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// The homepage "How it works" flight as a looping video:
//   public/hero/fly-w.mp4 (1600x900), fly-p.mp4 (800x500, phones), fly-poster.webp
// The path is a closed loop, so the last frame leads straight back into the first.
//   node flyvideo.mjs
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ROOT = path.resolve(HERE, "../../..");
const b = await chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const p = await b.newPage();
p.on("console", (m) => console.log("[page]", m.text()));
p.on("pageerror", (e) => console.log("[error]", e.message));
await p.route("https://x.local/**", (r) => {
  const u = new URL(r.request().url()).pathname;
  const js = (f) => r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(f) });
  if (u === "/scene.js") return js(path.join(HERE, "scene.js"));
  if (u === "/mux.js") return js(`${ROOT}/.tmp-ad/node_modules/mp4-muxer/build/mp4-muxer.js`);
  if (u.startsWith("/three/")) return js(`${ROOT}/node_modules/three/${u.slice(7)}`);
  return r.fulfill({ contentType: "text/html", body: `<!doctype html><body><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">import * as S from "/scene.js"; window.S = S; window.ready = true;</script></body>` });
});
await p.goto("https://x.local/", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
await p.addScriptTag({ url: "https://x.local/mux.js" });
const res = await p.evaluate(async () => {
  const FPS = 24, SECONDS = 32, N = FPS * SECONDS, RW = 2400, RH = 1350;
  const c = document.createElement("canvas");
  const world = window.S.createWorld(c, RW, RH, { geofence: true });
  const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
  const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
  const sets = [["w", 1600, 900, 1_500_000, "avc1.640033"], ["p", 800, 500, 650_000, "avc1.64001f"]].map(([key, W, H, bitrate, codec]) => {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"); g.imageSmoothingQuality = "high";
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
    const st = { key, W, H, cv, g, muxer, err: null };
    st.enc = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: (e) => { st.err = String(e); } });
    st.enc.configure({ codec, width: W, height: H, bitrate, framerate: FPS });
    return st;
  });
  const out = {}, t0 = performance.now();
  for (let i = 0; i < N; i++) {
    world.flightAt(i / N);
    for (const s of sets) {
      if (s.key === "w") window.S.grade(s.g, c, 0, 0, RW, RH, s.W, s.H);
      else { const sw = RH * s.W / s.H, sx = (RW - sw) * 0.5; window.S.grade(s.g, c, sx, 0, sw, RH, s.W, s.H); }
      if (i === 0 && s.key === "w") out.poster = await b64(await new Promise((r) => s.cv.toBlob(r, "image/webp", 0.6)));
      const f = new VideoFrame(s.cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      s.enc.encode(f, { keyFrame: i % 48 === 0 }); f.close();
      while (s.enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 10));
    }
    if (i % 48 === 0) console.log(`frame ${i}/${N}`, Math.round((performance.now() - t0) / 1000), "s");
  }
  for (const s of sets) { await s.enc.flush(); s.muxer.finalize(); if (s.err) throw new Error(s.err); out[`fly-${s.key}`] = await b64(s.muxer.target.buffer); }
  return out;
});
for (const [name, data] of Object.entries(res)) {
  const file = `${ROOT}/public/hero/${name === "poster" ? "fly-poster.webp" : name + ".mp4"}`;
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  console.log(path.basename(file), Math.round(fs.statSync(file).size / 1024), "KB");
}
await b.close();

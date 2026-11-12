import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Golden-hour flights over the job site, for the homepage.
//   node dusk.mjs stills hero 0,0.1,0.3      → out/dusk-hero-*.png (to check the look)
//   node dusk.mjs video hero                 → public/hero/dusk-w.mp4, dusk-p.mp4, dusk-poster-w.webp, dusk-poster-p.webp
//   node dusk.mjs video fly                  → public/hero/fly-w.mp4, fly-p.mp4, fly-poster.webp
const [mode = "stills", preset = "hero", arg] = process.argv.slice(2);
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });

const PRESETS = {
  // opens wide on the lit-up site from the street, glides in through the gate, round the tower and back out
  hero: {
    seconds: 30, geofence: false,
    sun: { dusk: true, sunElev: 6, sunAz: 178, sunColor: "#ff9a52", sunPower: 5.5 },
    path: [
      [[-60, 30, 150], [10, 28, 0], 34], [[-60, 18, 108], [10, 27, 0], 36], [[-60, 10, 76], [8, 22, 10], 40],
      [[-34, 9, 66], [10, 20, 10], 44], [[-14, 9, 66], [14, 18, 8], 46], [[-10, 10, 48], [14, 22, 6], 48],
      [[30, 14, 40], [14, 28, 0], 46], [[60, 30, 20], [10, 30, 0], 40], [[70, 60, -40], [10, 34, 0], 38],
      [[0, 90, -90], [10, 30, 0], 36], [[-100, 70, -10], [10, 30, 0], 36], [[-130, 70, 120], [10, 28, 0], 34],
    ],
  },
};
PRESETS.fly = { seconds: 32, geofence: true, sun: { dusk: true, sunElev: 7, sunAz: 205, sunColor: "#ff9a52", sunPower: 5.5 }, path: null };
const P = PRESETS[preset];

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

if (mode === "stills") {
  const us = (arg ?? "0,0.1,0.3").split(",").map(Number);
  const shots = await p.evaluate(async ({ P, us }) => {
    const RW = 2400, RH = 1350, c = document.createElement("canvas");
    const w = window.S.createWorld(c, RW, RH, { ...P.sun, geofence: P.geofence, path: P.path });
    const o = document.createElement("canvas"); o.width = 1600; o.height = 900;
    const g = o.getContext("2d"), out = [];
    for (const u of us) { w.flightAt(u); window.S.grade(g, c, 0, 0, RW, RH, 1600, 900); out.push(o.toDataURL("image/png").split(",")[1]); }
    return out;
  }, { P, us });
  shots.forEach((d, i) => fs.writeFileSync(path.join(OUT, `dusk-${preset}-${us[i]}.png`), Buffer.from(d, "base64")));
  console.log("wrote", shots.length);
} else {
  await p.addScriptTag({ url: "https://x.local/mux.js" });
  const res = await p.evaluate(async ({ P }) => {
    const FPS = 24, N = FPS * P.seconds, RW = 2560, RH = 1440;
    const c = document.createElement("canvas");
    const world = window.S.createWorld(c, RW, RH, { ...P.sun, geofence: P.geofence, path: P.path });
    const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
    // w: widescreen; p: a 4:5 crop from the middle for phones
    const sets = [["w", 1920, 1080, 2_800_000, "avc1.640033"], ["p", 720, 900, 1_000_000, "avc1.64001f"]].map(([key, W, H, bitrate, codec]) => {
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const g = cv.getContext("2d"); g.imageSmoothingQuality = "high";
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
      const st = { key, W, H, cv, g, muxer, err: null };
      st.enc = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: (e) => { st.err = String(e); } });
      st.enc.configure({ codec, width: W, height: H, bitrate, framerate: FPS, latencyMode: "quality", bitrateMode: "variable" });
      return st;
    });
    const out = {}, t0 = performance.now();
    for (let i = 0; i < N; i++) {
      world.flightAt(i / N);
      for (const s of sets) {
        if (s.key === "w") window.S.grade(s.g, c, 0, 0, RW, RH, s.W, s.H);
        else { const sw = RH * s.W / s.H, sx = (RW - sw) * 0.5; window.S.grade(s.g, c, sx, 0, sw, RH, s.W, s.H); }
        if (i === 0) out[`poster-${s.key}`] = await b64(await new Promise((r) => s.cv.toBlob(r, "image/webp", s.key === "w" ? 0.72 : 0.7)));
        const f = new VideoFrame(s.cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        s.enc.encode(f, { keyFrame: i % 96 === 0 }); f.close();
        while (s.enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 10));
      }
      if (i % 48 === 0) console.log(`frame ${i}/${N}`, Math.round((performance.now() - t0) / 1000), "s");
    }
    for (const s of sets) { await s.enc.flush(); s.muxer.finalize(); if (s.err) throw new Error(s.err); out[`video-${s.key}`] = await b64(s.muxer.target.buffer); }
    return out;
  }, { P });
  const names = preset === "fly"
    ? { "video-w": "fly-w.mp4", "video-p": "fly-p.mp4", "poster-w": "fly-poster.webp" }
    : { "video-w": "dusk-w.mp4", "video-p": "dusk-p.mp4", "poster-w": "dusk-poster-w.webp", "poster-p": "dusk-poster-p.webp" };
  for (const [k, data] of Object.entries(res)) {
    if (!names[k]) continue;
    const file = `${ROOT}/public/hero/${names[k]}`;
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log(names[k], Math.round(fs.statSync(file).size / 1024), "KB");
  }
}
await b.close();

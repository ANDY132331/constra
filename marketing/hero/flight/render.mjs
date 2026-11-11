import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Renders the 3D site flight (scene.js) for the homepage hero.
//   node render.mjs stills   → out/still-*.png at four points of the loop (to check the look)
//   node render.mjs video    → public/hero/loop-w.mp4 (1280x720), loop-p.mp4 (720x450),
//                              poster-w/p.webp and marketing/hero/tiny-w.txt
// Frames are drawn at twice the size and scaled down, so edges and thin crane members are clean.
// Needs Microsoft Edge and mp4-muxer in ../../../.tmp-ad/node_modules.
const mode = process.argv[2] ?? "stills";
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ROOT = path.resolve(HERE, "../../..");
const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });

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
  return r.fulfill({ contentType: "text/html", body: `<!doctype html><body style="margin:0">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">import * as S from "/scene.js"; window.S = S; window.ready = true;</script></body>` });
});
await p.goto("https://x.local/");
await p.waitForFunction(() => window.ready, null, { timeout: 60000 });

const SS = 2; // supersampling
if (mode === "stills") {
  const times = (process.argv[3] ?? "0,0.25,0.5,0.75").split(",").map(Number);
  const shots = await p.evaluate(async ({ times, SS }) => {
    const c = document.createElement("canvas");
    const t0 = performance.now();
    const w = window.S.createWorld(c, 1280 * SS, 720 * SS);
    console.log("built in", Math.round(performance.now() - t0), "ms");
    const out = [], o = document.createElement("canvas"); o.width = 1280; o.height = 720;
    const g = o.getContext("2d"); g.imageSmoothingQuality = "high"; const grade = window.S.grade;
    for (const t of times) {
      const t1 = performance.now();
      w.renderAt(t); grade(g, c, 0, 0, c.width, c.height, 1280, 720);
      console.log("frame", t, Math.round(performance.now() - t1), "ms");
      out.push(o.toDataURL("image/png"));
    }
    return out;
  }, { times, SS });
  shots.forEach((d, i) => fs.writeFileSync(path.join(OUT, `still-${times[i]}.png`), Buffer.from(d.split(",")[1], "base64")));
  console.log("wrote", shots.length, "stills to", OUT);
} else {
  await p.addScriptTag({ url: "https://x.local/mux.js" });
  const res = await p.evaluate(async ({ SS }) => {
    const FPS = 24, SECONDS = window.S.LOOP.seconds, N = FPS * SECONDS;
    const c = document.createElement("canvas");
    const world = window.S.createWorld(c, 1280 * SS, 720 * SS);
    const b64 = async (x) => { const u = new Uint8Array(x instanceof Blob ? await x.arrayBuffer() : x); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
    const sets = [["w", 1280, 720, 850_000], ["p", 720, 450, 360_000]].map(([key, W, H, bitrate]) => {
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const g = cv.getContext("2d"); g.imageSmoothingQuality = "high";
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
      const st = { key, W, H, cv, g, muxer, err: null };
      st.enc = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: (e) => { st.err = String(e); } });
      st.enc.configure({ codec: key === "w" ? "avc1.640028" : "avc1.64001f", width: W, height: H, bitrate, framerate: FPS });
      return st;
    });
    const out = {};
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      world.renderAt(i / N);
      for (const s of sets) {
        if (s.key === "w") window.S.grade(s.g, c, 0, 0, c.width, c.height, s.W, s.H);
        else { // phone panel (16:10): crop around the building, right of centre
          const sh = c.height, sw = sh * s.W / s.H, sx = (c.width - sw) * 0.62;
          window.S.grade(s.g, c, sx, 0, sw, sh, s.W, s.H);
        }
        if (i === 0) {
          out[`poster-${s.key}`] = await b64(await new Promise((r) => s.cv.toBlob(r, "image/webp", 0.4)));
          if (s.key === "w") { const t = document.createElement("canvas"); t.width = 32; t.height = 18; t.getContext("2d").drawImage(s.cv, 0, 0, 32, 18); out.tiny = btoa(t.toDataURL("image/webp", 0.5)); }
        }
        const f = new VideoFrame(s.cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        s.enc.encode(f, { keyFrame: i % 48 === 0 }); f.close();
        while (s.enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 10));
      }
      if (i % 48 === 0) console.log(`frame ${i}/${N}`, Math.round((performance.now() - t0) / 1000), "s");
    }
    for (const s of sets) { await s.enc.flush(); s.muxer.finalize(); if (s.err) throw new Error(s.err); out[`loop-${s.key}`] = await b64(s.muxer.target.buffer); }
    return out;
  }, { SS });
  for (const [name, data] of Object.entries(res)) {
    if (name === "tiny") { fs.writeFileSync(path.join(ROOT, "marketing/hero/tiny-w.txt"), Buffer.from(data, "base64")); continue; }
    const file = `${ROOT}/public/hero/${name}.${name.startsWith("poster") ? "webp" : "mp4"}`;
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log(path.basename(file), Math.round(fs.statSync(file).size / 1024), "KB");
  }
}
await b.close();

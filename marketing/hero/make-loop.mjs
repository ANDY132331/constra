import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Builds the homepage hero media from a free Pexels clip (39303176, excavator under blue sky):
//   public/hero/loop-w.mp4   1280x720, for computers
//   public/hero/loop-m.mp4   720x1280 centre crop, for phones
//   public/hero/poster-w.webp, poster-m.webp   first frames
// The last half-second crossfades into the first, so the loop has no jump.
// Needs mp4-muxer in ../../.tmp-ad/node_modules and Microsoft Edge.
// node make-loop.mjs <clip.mp4>
const clip = process.argv[2];
const ROOT = path.resolve("../..");
const OUT = `${ROOT}/public/hero`;
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage();
await p.route("https://x.local/**", (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === "/clip.mp4") return r.fulfill({ contentType: "video/mp4", body: fs.readFileSync(clip) });
  if (u.pathname === "/mux.js") return r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(`${ROOT}/.tmp-ad/node_modules/mp4-muxer/build/mp4-muxer.js`) });
  return r.fulfill({ contentType: "text/html", body: "<body></body>" });
});
await p.goto("https://x.local/");
await p.addScriptTag({ url: "https://x.local/mux.js" });
const results = await p.evaluate(async () => {
  const v = document.createElement("video"); v.muted = true;
  v.src = URL.createObjectURL(await (await fetch("/clip.mp4")).blob());
  await new Promise((r) => (v.onloadeddata = r));
  const FPS = 30, FADE = 0.5;
  const dur = Math.floor((v.duration - 0.1) * FPS) / FPS;
  const total = Math.round(dur * FPS);
  const seek = (t) => new Promise((r) => { v.onseeked = () => r(); v.currentTime = t; });
  const b64 = async (blobOrBuf) => {
    const buf = blobOrBuf instanceof Blob ? new Uint8Array(await blobOrBuf.arrayBuffer()) : new Uint8Array(blobOrBuf);
    let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const out = {};
  for (const [key, W, H, bitrate] of [["w", 1280, 720, 2_600_000], ["m", 720, 1280, 2_000_000]]) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
    const tg = tmp.getContext("2d");
    const draw = (ctx) => {
      if (key === "w") ctx.drawImage(v, 0, 0, W, H);
      else { const sw = v.videoHeight * 9 / 16, sx = (v.videoWidth - sw) * 0.5; ctx.drawImage(v, sx, 0, sw, v.videoHeight, 0, 0, W, H); }
    };
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width: W, height: H }, fastStart: "in-memory" });
    let err = null;
    const enc = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: (e) => { err = String(e); } });
    enc.configure({ codec: "avc1.640028", width: W, height: H, bitrate, framerate: FPS });
    const fadeFrames = Math.round(FADE * FPS);
    for (let i = 0; i < total - fadeFrames; i++) {
      // the clip's own frames, shifted so the crossfade lands on the loop point
      const t = (i + fadeFrames) / FPS;
      await seek(t); draw(g);
      const k = i < fadeFrames ? 1 - i / fadeFrames : 0; // first frames blend with the clip's tail
      if (k > 0) {
        await seek(dur - (fadeFrames - i) / FPS); draw(tg);
        g.globalAlpha = k; g.drawImage(tmp, 0, 0); g.globalAlpha = 1;
      }
      if (i === 0) out[`poster-${key}`] = await b64(await new Promise((r) => c.toBlob(r, "image/webp", 0.7)));
      const frame = new VideoFrame(c, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(frame, { keyFrame: i % 60 === 0 }); frame.close();
      if (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 15));
    }
    await enc.flush(); muxer.finalize();
    if (err) throw new Error(err);
    out[`loop-${key}`] = await b64(muxer.target.buffer);
  }
  return out;
});
for (const [name, data] of Object.entries(results)) {
  const file = `${OUT}/${name}.${name.startsWith("poster") ? "webp" : "mp4"}`;
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  console.log(path.basename(file), Math.round(fs.statSync(file).size / 1024), "KB");
}
await b.close();

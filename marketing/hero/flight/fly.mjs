import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Frames for the scroll-driven fly-in on the homepage → public/hero/fly/f-000.webp …
//   node fly.mjs [count]
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ROOT = path.resolve(HERE, "../../..");
const N = Number(process.argv[2] ?? 72), OUT = `${ROOT}/public/hero/fly`;
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("[error]", e.message));
await p.route("https://x.local/**", (r) => {
  const u = new URL(r.request().url()).pathname;
  const js = (f) => r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(f) });
  if (u === "/scene.js") return js(path.join(HERE, "scene.js"));
  if (u.startsWith("/three/")) return js(`${ROOT}/node_modules/three/${u.slice(7)}`);
  return r.fulfill({ contentType: "text/html", body: `<!doctype html><body><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">import * as S from "/scene.js"; window.S = S; window.ready = true;</script></body>` });
});
await p.goto("https://x.local/");
await p.waitForFunction(() => window.ready);
await p.evaluate(({ SS }) => {
  window.c = document.createElement("canvas");
  window.w = window.S.createWorld(window.c, 1280 * SS, 720 * SS, { geofence: true });
  window.o = document.createElement("canvas"); window.o.width = 1152; window.o.height = 648;
}, { SS: 2 });
let total = 0;
for (let i = 0; i < N; i++) {
  const data = await p.evaluate((t) => {
    window.w.flightAt(t);
    const g = window.o.getContext("2d"); g.imageSmoothingQuality = "high";
    window.S.grade(g, window.c, 0, 0, window.c.width, window.c.height, 1152, 648);
    return window.o.toDataURL("image/webp", 0.55).split(",")[1];
  }, i / (N - 1));
  const buf = Buffer.from(data, "base64"); total += buf.length;
  fs.writeFileSync(`${OUT}/f-${String(i).padStart(3, "0")}.webp`, buf);
}
console.log(N, "frames", Math.round(total / 1024), "KB total");
await b.close();

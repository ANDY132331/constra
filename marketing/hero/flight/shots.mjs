import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// The three "One day on site" images on the homepage → public/site/site-{morning,midday,afternoon}.webp
// Same 3D site as the hero flight, with the sun where it would be at that time of day.
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ROOT = path.resolve(HERE, "../../..");
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
const SHOTS = [
  { name: "morning", t: 0.05, sun: { sunElev: 13, sunAz: 95, sunColor: "#ffcf9a", sunPower: 3.6 }, pos: [-118, 46, 128], look: [-14, 8, 14] },
  { name: "midday", t: 0.4, sun: { sunElev: 62, sunAz: 185, sunColor: "#fff4e6", sunPower: 4.4 }, pos: [74, 74, 78], look: [-2, 34, -2] },
  { name: "afternoon", t: 0.7, sun: { sunElev: 22, sunAz: 255, sunColor: "#ffdcb0", sunPower: 3.9 }, pos: [128, 52, 108], look: [38, -2, 18] },
];
for (const s of SHOTS) {
  const data = await p.evaluate(async (s) => {
    const W = 1400, H = 864, SS = 2, c = document.createElement("canvas");
    const w = window.S.createWorld(c, W * SS, H * SS, s.sun);
    const V = (a) => ({ x: a[0], y: a[1], z: a[2] });
    const THREE = await import("three");
    w.shot(s.t, new THREE.Vector3(...s.pos), new THREE.Vector3(...s.look), 40);
    const o = document.createElement("canvas"); o.width = W; o.height = H;
    const g = o.getContext("2d"); g.imageSmoothingQuality = "high";
    window.S.grade(g, c, 0, 0, c.width, c.height, W, H);
    w.renderer.dispose();
    return o.toDataURL("image/webp", 0.72).split(",")[1];
  }, s);
  const file = `${ROOT}/public/site/site-${s.name}.webp`;
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  console.log(path.basename(file), Math.round(fs.statSync(file).size / 1024), "KB");
}
await b.close();

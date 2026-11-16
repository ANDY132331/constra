import { chromium } from "playwright";
import fs from "fs";
import path from "path";
// node marketing/vids/render.mjs <name> stills v 1,5,9   -> .tmp-ad/vids/<name>/stills/*.png  (check the look)
// node marketing/vids/render.mjs <name> video v|h        -> marketing/promo-videos/<name>-vertical|wide.mp4  (LIGHT=1 -> -share, smaller)
// Needs: voice files from voice.mjs, mp4-muxer in .tmp-ad/node_modules, and Edge.
const [name, mode = "stills", fmt = "v", arg] = process.argv.slice(2);
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"); const ROOT = path.resolve(HERE, "../..");
const VO = `${ROOT}/.tmp-ad/vids/${name}/vo`; const ST = `${ROOT}/.tmp-ad/vids/${name}/stills`; fs.mkdirSync(ST, { recursive: true });
const b = await chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on("console", (m) => console.log("[page]", m.text())); p.on("pageerror", (e) => console.log("[error]", e.message));
const file = (f, type) => ({ contentType: type, body: fs.readFileSync(f) });
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg", ".js": "text/javascript", ".svg": "image/svg+xml" };
await p.route("https://vid.local/**", (r) => {
  const n = decodeURIComponent(new URL(r.request().url()).pathname);
  if (n.startsWith("/three/")) return r.fulfill(file(`${ROOT}/node_modules/three/${n.slice(7)}`, "text/javascript"));
  if (n.startsWith("/cine/")) return r.fulfill(file(`${HERE}/cine/${n.slice(6)}`, "text/javascript"));
  if (n === "/stickkit.js") return r.fulfill(file(`${HERE}/stickkit.js`, "text/javascript"));
  if (n === "/stick.js") return r.fulfill(file(`${HERE}/stick.js`, "text/javascript"));
  if (n === "/stage.js") return r.fulfill(file(`${HERE}/stage.js`, "text/javascript"));
  if (n === "/puppet.js") return r.fulfill(file(`${HERE}/puppet.js`, "text/javascript"));
  if (n === "/engine.js") return r.fulfill(file(`${HERE}/engine.js`, "text/javascript"));
  if (name.startsWith("sh-")) { if (n === "/scene.js") return r.fulfill(file(`${HERE}/shorts/scene.js`, "text/javascript")); if (n === "/lines.json" || n === "/scenario.json") return r.fulfill(file(`${ROOT}/.tmp-ad/vids/${name}${n}`, "application/json")); if (n.startsWith("/lib/")) return r.fulfill(file(`${HERE}/shorts${n}`, "text/javascript")); }
  if (n === "/lines.json" && !fs.existsSync(`${HERE}/${name}/lines.json`)) return r.fulfill({ contentType: "application/json", body: "[]" });
  if (n === "/scene.js" || n === "/lines.json") return r.fulfill(file(`${HERE}/${name}${n}`, n.endsWith("json") ? "application/json" : "text/javascript"));
  if (n === "/mux.js") return r.fulfill(file(`${ROOT}/.tmp-ad/node_modules/mp4-muxer/build/mp4-muxer.js`, "text/javascript"));
  if (n.startsWith("/vo/")) return r.fulfill(file(`${VO}/${path.basename(n)}`, MIME[path.extname(n)]));
  if (n.startsWith("/assets/")) { const f = [`${HERE}/${name}${n}`, `${HERE}/shared${n.slice(7)}`].find((x) => fs.existsSync(x)); if (f) return r.fulfill(file(f, MIME[path.extname(f)] || "application/octet-stream")); return r.fulfill({ status: 404, body: "" }); }
  if (n === "/icon.png") return r.fulfill(file(`${ROOT}/public/icon-192.png`, "image/png"));
  return r.fulfill({ contentType: "text/html", body: `<!doctype html><body style="margin:0;background:#000"><canvas id="out"></canvas>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800&family=IBM+Plex+Mono:wght@500;700&family=IBM+Plex+Sans:wght@400;600&family=Caveat:wght@700&family=Oswald:wght@500;700&display=swap">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script src="/mux.js"></script><script type="module">import { start } from "/engine.js"; import scene from "/scene.js"; await Promise.all(["800 40px 'Barlow Condensed'","700 30px 'IBM Plex Mono'","600 30px 'IBM Plex Sans'","700 40px Caveat","700 40px Oswald"].map((f)=>document.fonts.load(f))); await document.fonts.ready; await start(scene);</script></body>` });
});
await p.route("https://fonts.googleapis.com/**", (r) => r.continue()); await p.route("https://fonts.gstatic.com/**", (r) => r.continue());
await p.goto(`https://vid.local/?mode=${fmt}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => window.prepare, null, { timeout: 120000 });
const info = await p.evaluate(() => window.prepare()); console.log("timeline", JSON.stringify(info));
if (mode === "stills") {
  for (const t of (arg ?? "1,5,9").split(",").map(Number)) { const d = await p.evaluate((t) => window.still(t), t); fs.writeFileSync(path.join(ST, `${name}-${fmt}-${t}.png`), Buffer.from(d, "base64")); }
  console.log("stills ->", ST);
} else {
  const light = process.env.LIGHT === "1";
  const res = await p.evaluate(([br, ab, cb, sc]) => window.encodeAll(br, ab, cb, sc), [process.env.BR ? +process.env.BR : light ? (fmt === "v" ? 3_000_000 : 3_500_000) : (fmt === "v" ? 7_500_000 : 9_000_000), +(process.env.AB || 192000), process.env.CBR === "1", +(process.env.SCALE || 1)]);
  fs.mkdirSync(path.join(ROOT, "marketing", "promo-videos"), { recursive: true });
  const f = process.env.OUTFILE || path.join(ROOT, "marketing", "promo-videos", `${name}-${fmt === "v" ? "vertical" : "wide"}${process.env.BR ? "-upload" : light ? "-share" : ""}.mp4`);
  fs.writeFileSync(f, Buffer.from(res.video, "base64")); console.log("wrote", f, Math.round(fs.statSync(f).size / 1024), "KB", "peak", res.peak);
}
await b.close();

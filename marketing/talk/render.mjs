import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Mac, the animated foreman: a 3D character talking about Constra, built and rendered from code.
//   node render.mjs stills v 1,5,9,14      → stills in out/ (to check the look)
//   node render.mjs video v                → ../constra-talk-vertical.mp4  (1080x1920)
//   node render.mjs video h                → ../constra-talk-wide.mp4      (1920x1080)
// Needs the voice lines from voice.ps1 in ../../.tmp-ad/talk, mp4-muxer in ../../.tmp-ad/node_modules, and Edge.
const [mode = "stills", fmt = "v", arg] = process.argv.slice(2);
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(HERE, "out"); fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on("console", (m) => console.log("[page]", m.text()));
p.on("pageerror", (e) => console.log("[error]", e.message));
const file = (f, type) => ({ contentType: type, body: fs.readFileSync(f) });
await p.route("https://talk.local/**", (r) => {
  const u = new URL(r.request().url()); const n = u.pathname;
  if (n === "/main.js" || n === "/char.js") return r.fulfill(file(path.join(HERE, n.slice(1)), "text/javascript"));
  if (n === "/mux.js") return r.fulfill(file(`${ROOT}/.tmp-ad/node_modules/mp4-muxer/build/mp4-muxer.js`, "text/javascript"));
  if (n.startsWith("/three/")) return r.fulfill(file(`${ROOT}/node_modules/three/${n.slice(7)}`, "text/javascript"));
  if (n.startsWith("/vo/")) return r.fulfill(file(`${ROOT}/.tmp-ad/talk/${path.basename(n)}`, "audio/wav"));
  if (n === "/bg.webp") return r.fulfill(file(`${ROOT}/public/hero/dusk-poster-w.webp`, "image/webp"));
  if (n === "/icon.png") return r.fulfill(file(`${ROOT}/public/icon-192.png`, "image/png"));
  const shots = { "dash.png": "iphone-6.9-01-dashboard.png", "templates.png": "iphone-6.9-04-excel-templates.png", "invoices.png": "iphone-6.9-06-invoices.png" };
  if (n.startsWith("/shots/")) { const f = path.basename(n); return r.fulfill(file(f === "timesheet-pdf.png" ? `${ROOT}/marketing/ad/assets/timesheet-pdf.png` : `${ROOT}/app-store-screenshots/${shots[f]}`, "image/png")); }
  return r.fulfill({ contentType: "text/html", body: `<!doctype html><body style="margin:0;background:#000"><canvas id="out"></canvas><canvas id="gl" style="display:none"></canvas>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script src="/mux.js"></script><script type="module" src="/main.js"></script></body>` });
});
await p.goto(`https://talk.local/?mode=${fmt}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => window.prepare, null, { timeout: 120000 });
const info = await p.evaluate(() => window.prepare());
console.log("timeline", JSON.stringify(info));

if (mode === "stills") {
  for (const t of (arg ?? "1,5,9,14").split(",").map(Number)) {
    const d = await p.evaluate((t) => window.still(t), t);
    fs.writeFileSync(path.join(OUT, `talk-${fmt}-${t}.png`), Buffer.from(d, "base64"));
  }
  console.log("stills written");
} else {
  const light = process.env.LIGHT === "1";
  const res = await p.evaluate((br) => window.encodeAll(br), light ? (fmt === "v" ? 2_600_000 : 3_000_000) : (fmt === "v" ? 7_000_000 : 8_000_000));
  const file = path.join(ROOT, "marketing", (fmt === "v" ? "constra-talk-vertical" : "constra-talk-wide") + (light ? "-share" : "") + ".mp4");
  fs.writeFileSync(file, Buffer.from(res.video, "base64"));
  console.log("wrote", file, Math.round(fs.statSync(file).size / 1024), "KB", "peak", res.peak);
}
await b.close();

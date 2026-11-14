// Renders Mac with forced mouth shapes to check the face. node face.mjs
import { chromium } from "playwright";
import fs from "fs"; import path from "path";
const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"), ROOT = path.resolve(HERE, "../..");
const b = await chromium.launch({ channel: "msedge", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
p.on("pageerror", (e) => console.log("[error]", e.message));
const file = (f, t) => ({ contentType: t, body: fs.readFileSync(f) });
await p.route("https://talk.local/**", (r) => { const n = new URL(r.request().url()).pathname;
  if (n === "/main.js" || n === "/char.js") return r.fulfill(file(path.join(HERE, n.slice(1)), "text/javascript"));
  if (n === "/mux.js") return r.fulfill(file(`${ROOT}/.tmp-ad/node_modules/mp4-muxer/build/mp4-muxer.js`, "text/javascript"));
  if (n.startsWith("/three/")) return r.fulfill(file(`${ROOT}/node_modules/three/${n.slice(7)}`, "text/javascript"));
  if (n.startsWith("/vo/")) return r.fulfill(file(`${ROOT}/.tmp-ad/talk/${path.basename(n)}`, "audio/wav"));
  if (n === "/bg.webp") return r.fulfill(file(`${ROOT}/public/hero/dusk-poster-w.webp`, "image/webp"));
  if (n === "/icon.png") return r.fulfill(file(`${ROOT}/public/icon-192.png`, "image/png"));
  if (n.startsWith("/shots/")) { const m = { "dash.png": "iphone-6.9-01-dashboard.png", "templates.png": "iphone-6.9-04-excel-templates.png", "invoices.png": "iphone-6.9-06-invoices.png" }; const f = path.basename(n); return r.fulfill(file(f === "timesheet-pdf.png" ? `${ROOT}/marketing/ad/assets/timesheet-pdf.png` : `${ROOT}/app-store-screenshots/${m[f]}`, "image/png")); }
  return r.fulfill({ contentType: "text/html", body: `<!doctype html><body style="margin:0"><canvas id="out"></canvas><canvas id="gl" style="display:none"></canvas><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><script src="/mux.js"></script><script type="module" src="/main.js"></script></body>` }); });
await p.goto("https://talk.local/?mode=v"); await p.waitForFunction(() => window.prepare);
await p.evaluate(() => window.prepare());
const shapes = { closed: { open: 0, round: 0, smile: 0.4, wide: 0 }, open: { open: 0.9, round: 0, smile: 0.25, wide: 0 }, round: { open: 0.6, round: 1, smile: 0, wide: 0 }, smile: { open: 0.25, round: 0, smile: 1, wide: 1 } };
for (const [k, m] of Object.entries(shapes)) {
  const d = await p.evaluate((m) => { window.__force = { mouth: m, blink: 0 }; return window.still(2.2); }, m);
  fs.writeFileSync(path.join(HERE, "out", `face-${k}.png`), Buffer.from(d, "base64"));
}
await b.close(); console.log("done");

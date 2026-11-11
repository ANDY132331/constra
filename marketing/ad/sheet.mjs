import { chromium } from "playwright";
import fs from "fs";
const dir = "../static";
const files = fs.readdirSync(dir).filter((f) => f.endsWith("1x1.png")).sort();
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage({ viewport: { width: 1500, height: 420 } });
await p.setContent(`<body style="margin:0;background:#555;display:flex;gap:8px;padding:8px">${files.map((f) => `<img style="width:285px" src="data:image/png;base64,${fs.readFileSync(dir + "/" + f).toString("base64")}">`).join("")}</body>`);
await p.screenshot({ path: "statics-sheet-sq.png" });
await b.close();

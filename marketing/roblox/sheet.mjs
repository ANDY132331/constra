import { chromium } from "playwright"; import fs from "fs";
// node sheet.mjs out.png cols scale file1 file2 ...   -> contact sheet of stills
const [outp, cols, scale, ...files] = process.argv.slice(2);
const imgs = files.map((f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64"));
const b = await chromium.launch({ channel: "msedge" }); const p = await b.newPage();
const png = await p.evaluate(async ([imgs, cols, scale]) => {
  const ims = await Promise.all(imgs.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
  const w = ims[0].width * scale, h = ims[0].height * scale, rows = Math.ceil(ims.length / cols), c = document.createElement("canvas"); c.width = w * cols; c.height = h * rows; const g = c.getContext("2d");
  ims.forEach((im, k) => g.drawImage(im, (k % cols) * w, Math.floor(k / cols) * h, w, h)); return c.toDataURL("image/png").split(",")[1]; }, [imgs, +cols, +scale]);
fs.writeFileSync(outp, Buffer.from(png, "base64")); await b.close();

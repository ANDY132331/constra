import { chromium } from "playwright";
import fs from "fs";
const SEED = fs.readFileSync(process.argv[2], "utf8");
const b = await chromium.launch({ channel: "msedge" });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" })).newPage();
await p.goto("http://localhost:3004/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.evaluate(SEED);
await p.goto("http://localhost:3004/invoices", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
console.log("url:", p.url());
console.log(await p.evaluate(() => {
  const main = document.querySelector("main");
  if (!main) return "NO MAIN. body starts: " + document.body.innerText.slice(0, 80);
  const btns = [...main.querySelectorAll("button")].map((e) => JSON.stringify((e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30)));
  return "main buttons (" + btns.length + "): " + btns.slice(0, 12).join(", ");
}));
await b.close();

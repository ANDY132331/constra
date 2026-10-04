import { chromium } from "playwright";
import fs from "fs";
const SEED = fs.readFileSync(process.argv[2], "utf8");
const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark", acceptDownloads: true });
const d = new Date(); d.setHours(15, 10, 0, 0);
await ctx.clock.install({ time: d }); await ctx.clock.resume();
const p = await ctx.newPage();
await p.goto("http://localhost:3004/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.evaluate(SEED);
await p.goto("http://localhost:3004/reports", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4500);
await p.evaluate(() => document.querySelectorAll("nextjs-portal, .pwa-banner").forEach((e) => e.remove()));
console.log("buttons:", await p.evaluate(() => [...document.querySelectorAll("main button")].map((e)=> (e.textContent||"").trim().replace(/\s+/g," ")).filter(Boolean).slice(0,14).join(" | ")));
// open the payroll menu
const btn = p.getByRole("button", { name: "Export Payroll", exact: true }).first();
console.log("payroll button found:", await btn.count());
await btn.click({ timeout: 5000 }).catch((e) => console.log("click err", String(e).slice(0,60)));
await p.waitForTimeout(1000);
const items = await p.evaluate(() => [...document.querySelectorAll("main button")].map((e)=>(e.textContent||"").trim()).filter((t)=>/csv|quickbooks|gusto|adp|generic/i.test(t)));
console.log("menu items:", JSON.stringify(items));
if (items.length) {
  const dl = p.waitForEvent("download", { timeout: 9000 }).then((x) => "DOWNLOAD " + x.suggestedFilename()).catch(() => "no download");
  await p.getByRole("button", { name: items[0], exact: true }).first().click({ timeout: 5000 });
  console.log("first adapter ->", await dl);
}
await b.close();

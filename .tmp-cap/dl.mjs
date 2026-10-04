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
const cases = [["/time-tracking","Export CSV"],["/reports","Export Payroll"],["/documents","+ Upload File"],["/blueprints","Upload Blueprint"]];
for (const [route, label] of cases) {
  await p.goto("http://localhost:3004" + route, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  await p.evaluate(() => document.querySelectorAll("nextjs-portal, .pwa-banner").forEach((e) => e.remove()));
  let result = "nothing";
  const dl = p.waitForEvent("download", { timeout: 9000 }).then((x) => "DOWNLOAD " + x.suggestedFilename()).catch(() => null);
  const fc = p.waitForEvent("filechooser", { timeout: 9000 }).then(() => "FILE PICKER").catch(() => null);
  try { await p.getByRole("button", { name: label, exact: true }).first().click({ timeout: 5000 }); } catch { result = "CLICK FAILED"; }
  if (result === "nothing") {
    const r = await Promise.race([dl, fc, new Promise((res) => setTimeout(() => res(null), 9500))]);
    result = r ?? "NOTHING — no download, no picker";
  }
  console.log(route.padEnd(16), JSON.stringify(label).padEnd(20), result);
}
await b.close();

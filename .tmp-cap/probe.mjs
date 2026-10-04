// Opens every primary action on every page and checks the dialog behaves:
// it appears, Escape closes it, and the close button closes it.
import { chromium } from "playwright";
import fs from "fs";

const SEED = fs.readFileSync(process.argv[2], "utf8");
const BASE = "http://localhost:3004";
const ROUTES = process.argv[3]
  ? [process.argv[3]]
  : ["/dashboard","/time-tracking","/schedule","/safety","/photos","/projects","/tasks","/punch-list","/rfis","/equipment","/materials","/documents","/crew","/reports","/estimates","/invoices","/budget","/insurance","/blueprints","/daily-reports","/change-orders","/settings"];

const b = await chromium.launch({ channel: "msedge" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark", permissions: ["geolocation"], geolocation: { latitude: 43.6532, longitude: -79.3832 } });
const d = new Date(); d.setHours(15, 10, 0, 0);
await ctx.clock.install({ time: d }); await ctx.clock.resume();
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 100)));
p.on("console", (m) => { if (m.type() === "error" && !/script tag|DevTools|Hydration/.test(m.text())) errs.push(m.text().slice(0, 100)); });

await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3000);
await p.evaluate(SEED);
await p.evaluate(() => { localStorage.setItem("constra_ctab_v1","1"); localStorage.setItem("constra_notif_prompt_dismissed","1"); localStorage.setItem("constra_share_nudge_v1","1"); });

const openCount = () => p.evaluate(() =>
  document.querySelectorAll('[role="dialog"], .sheet, .fixed.inset-0.z-50:not(.mobile-overlay)').length);

for (const route of ROUTES) {
  await p.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelectorAll("nextjs-portal, .pwa-banner").forEach((e) => e.remove()));

  const labels = await p.evaluate(() =>
    [...document.querySelectorAll("main button")]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " "))
      .filter((t) => t && /^(\+ )?(new|add|create|upload|invite|log|record|import|send|export)\b/i.test(t))
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 4));

  if (!labels.length) { console.log(route.padEnd(16), "— no create action found"); continue; }

  for (const label of labels) {
    errs.length = 0;
    const before = await openCount();
    try {
      await p.getByRole("button", { name: label, exact: true }).first().click({ timeout: 4000 });
    } catch { console.log(route.padEnd(16), JSON.stringify(label).padEnd(22), "CLICK FAILED"); continue; }
    await p.waitForTimeout(1200);
    const after = await openCount();
    const opened = after > before;

    let esc = "n/a", closeBtn = "n/a";
    if (opened) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(800);
      esc = (await openCount()) <= before ? "ok" : "IGNORED";
      if (esc === "IGNORED") {
        const x = p.locator('[role="dialog"] button[aria-label="Close"], .sheet button[aria-label="Close"]').first();
        if (await x.count()) { await x.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(700); closeBtn = (await openCount()) <= before ? "ok" : "STUCK"; }
        else closeBtn = "NO CLOSE BUTTON";
      }
    }
    const navigated = p.url().replace(BASE, "") !== route;
    console.log(route.padEnd(16), JSON.stringify(label).padEnd(22),
      opened ? "dialog" : navigated ? "navigated -> " + p.url().replace(BASE, "") : "NOTHING HAPPENED",
      "esc:" + esc, closeBtn !== "n/a" ? "close:" + closeBtn : "", errs.length ? "ERR " + errs[0] : "");
    if (navigated) { await p.goto(BASE + route, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(2500); }
    await p.keyboard.press("Escape").catch(() => {});
    await p.waitForTimeout(400);
  }
}
await b.close();

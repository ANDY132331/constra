// Accessibility scan (axe-core) of every screen in dark and light theme. One-time setup:
//   mkdir .tmp-axe && cd .tmp-axe && echo '{"private":true}' > package.json && npm i axe-core && cd ..
// Then, with constra-offline up:  node .claude/skills/field-testing/scripts/a11y.mjs
// RULES=color-contrast,scrollable-region-focusable node ...   lists every offending node for those rules
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3004";
const SEED = fs.readFileSync(".claude/skills/browser-testing/scripts/seed.js", "utf8");
const PAGES = ["/dashboard", "/time-tracking", "/timesheets", "/projects", "/tasks", "/crew", "/schedule", "/crew-plan", "/time-off", "/safety", "/punch-list", "/rfis", "/equipment", "/materials", "/documents", "/photos", "/daily-reports", "/messages", "/invoices", "/estimates", "/change-orders", "/budget", "/insurance", "/reports", "/settings"];
const browser = await chromium.launch({ channel: "msedge" });
const tally = {};
for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const frozen = new Date(); frozen.setHours(15, 10, 0, 0);
  await ctx.clock.install({ time: frozen }); await ctx.clock.resume();
  const p = await ctx.newPage();
  await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1800);
  await p.evaluate(SEED);
  await p.evaluate((t) => { const st = JSON.parse(localStorage.getItem("constra_v1")); st.theme = t; localStorage.setItem("constra_v1", JSON.stringify(st)); localStorage.setItem("constra_ctab_v1", "1"); localStorage.setItem("constra_notif_prompt_dismissed", "1"); localStorage.setItem("constra_share_nudge_v1", "1"); }, theme);
  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1600);
    await p.addScriptTag({ path: ".tmp-axe/node_modules/axe-core/axe.min.js" });
    const res = await p.evaluate(async (rules) => {
      const r = await axe.run(document, { runOnly: rules, resultTypes: ["violations"] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 12).map((n) => (n.target?.[0] ?? "").toString().slice(0, 70) + " :: " + (n.any?.[0]?.message ?? n.failureSummary ?? "").slice(0, 110)) }));
    }, process.env.RULES ? process.env.RULES.split(",") : ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]);
    const theme_ = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
    for (const v of res) {
      const key = `${v.id}`;
      const t = (tally[key] ??= { impact: v.impact, themes: new Set(), pages: new Set(), n: 0, sample: v.sample, all: [] }); t.all.push(path + " [" + theme + "] " + v.sample.slice(0, 3).join(" || "));
      t.themes.add(theme_ ?? theme); t.pages.add(path); t.n += v.n;
    }
  }
  await ctx.close();
}
await browser.close();
const rows = Object.entries(tally).sort((a, b) => ({ critical: 0, serious: 1, moderate: 2, minor: 3 }[a[1].impact] - { critical: 0, serious: 1, moderate: 2, minor: 3 }[b[1].impact]) || b[1].n - a[1].n);
for (const [id, t] of rows) { if (process.env.RULES) console.log(t.all.join("\n")); console.log(`${t.impact.padEnd(8)} ${id.padEnd(28)} ${String(t.n).padStart(4)} nodes, ${t.pages.size} pages, themes ${[...t.themes].join("+")}\n          e.g. ${t.sample[0]}`); }

// Sweeps every app screen on a phone and lists real problems: sideways scroll,
// controls with no name, small tap targets, clipped text, images without alt, crashes. Run with constra-offline up:
//   node .claude/skills/field-testing/scripts/ui-sweep.mjs [w-aisha|w-marco|w-dev]   (owner, foreman, worker)
// Redirects away from office-only pages are expected for foreman and worker.
import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3004";
const SEED = fs.readFileSync(".claude/skills/browser-testing/scripts/seed.js", "utf8");
const PAGES = ["/dashboard", "/time-tracking", "/timesheets", "/projects", "/tasks", "/crew", "/schedule", "/crew-plan", "/time-off", "/safety", "/punch-list", "/rfis", "/equipment", "/materials", "/documents", "/blueprints", "/photos", "/daily-reports", "/messages", "/invoices", "/estimates", "/change-orders", "/budget", "/insurance", "/reports", "/templates", "/settings"];
const ROLE = process.argv[2] ?? "w-aisha";
const VIEWS = [["phone", { width: 390, height: 844 }, true]];

const browser = await chromium.launch({ channel: "msedge" });
const findings = [];
for (const [vname, viewport, mobile] of VIEWS) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, permissions: ["geolocation"], geolocation: { latitude: 43.65, longitude: -79.39 } });
  const frozen = new Date(); frozen.setHours(15, 10, 0, 0);
  await ctx.clock.install({ time: frozen });
  await ctx.clock.resume();
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("page error: " + e.message.slice(0, 120)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|ERR_|supabase|net::/.test(m.text())) errs.push("console: " + m.text().slice(0, 120)); });
  await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await p.evaluate(SEED);
  await p.evaluate((who) => { const st = JSON.parse(localStorage.getItem("constra_v1")); st.authUserId = who; localStorage.setItem("constra_v1", JSON.stringify(st)); }, ROLE);
  await p.evaluate(() => { localStorage.setItem("constra_ctab_v1", "1"); localStorage.setItem("constra_notif_prompt_dismissed", "1"); localStorage.setItem("constra_share_nudge_v1", "1"); });
  for (const path of PAGES) {
    errs.length = 0;
    await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(1800);
    const landed = new URL(p.url()).pathname;
    const r = await p.evaluate(() => {
      const vis = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none" && b.bottom > 0 && b.top < 20000; };
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth - window.innerWidth;
      const small = [], unnamed = [], noAlt = [];
      for (const el of document.querySelectorAll("button, a[href], [role=button], input, select, textarea")) {
        if (!vis(el)) continue;
        const b = el.getBoundingClientRect();
        const label = (el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText || el.getAttribute("placeholder") || el.getAttribute("alt") || "").trim();
        const hasImgAlt = el.querySelector("img[alt]:not([alt=''])");
        if (!label && !hasImgAlt && !el.labels?.length && el.type !== "hidden") unnamed.push((el.tagName + "." + (el.className || "").toString().slice(0, 40)));
        if (Math.min(b.width, b.height) < 32 && (el.tagName === "BUTTON" || el.tagName === "A") && label) small.push(`${label.slice(0, 24)} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      for (const img of document.querySelectorAll("img")) if (vis(img) && !img.hasAttribute("alt")) noAlt.push(img.src.slice(-40));
      const clipped = [];
      for (const el of document.querySelectorAll("p, span, h1, h2, h3, h4, label, td, th")) {
        if (!vis(el) || !el.innerText?.trim()) continue;
        const s = getComputedStyle(el);
        if ((s.overflow === "hidden" || s.overflowX === "hidden") && s.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) clipped.push(el.innerText.trim().slice(0, 30));
      }
      const wide = [];
      for (const el of document.body.querySelectorAll("*")) { if (!vis(el)) continue; const b = el.getBoundingClientRect(); if (b.right > window.innerWidth + 2 && getComputedStyle(el).position !== "fixed" && !el.closest("[class*=overflow-x], [style*=overflow]")) { wide.push((el.tagName + "." + (el.className || "").toString().slice(0, 30)) + " +" + Math.round(b.right - window.innerWidth)); if (wide.length > 3) break; } }
      return { overflowX, small: [...new Set(small)].slice(0, 5), unnamed: [...new Set(unnamed)].slice(0, 5), noAlt: noAlt.slice(0, 3), clipped: [...new Set(clipped)].slice(0, 4), wide, title: document.title, h1: document.querySelector("h1")?.innerText?.slice(0, 40) };
    });
    const issues = [];
    if (landed !== path) issues.push(`redirected to ${landed}`);
    if (r.overflowX > 2) issues.push(`sideways scroll +${r.overflowX}px`);
    if (r.wide.length && r.overflowX > 2) issues.push("wide: " + r.wide.join("; "));
    if (r.small.length && mobile) issues.push("small tap targets: " + r.small.join(", "));
    if (r.unnamed.length) issues.push("no accessible name: " + r.unnamed.join(", "));
    if (r.noAlt.length) issues.push("images without alt: " + r.noAlt.join(", "));
    if (r.clipped.length) issues.push("clipped text: " + r.clipped.join(" | "));
    if (errs.length) issues.push(...errs.slice(0, 2));
    findings.push({ view: ROLE, path, issues });
  }
  await ctx.close();
}
await browser.close();
for (const f of findings) if (f.issues.length) console.log(`${f.view.padEnd(6)} ${f.path.padEnd(16)} ${f.issues.join("  //  ")}`);
console.log(`\n${findings.filter((f) => !f.issues.length).length}/${findings.length} screen views had no findings`);

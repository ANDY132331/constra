import { chromium } from "playwright";
import fs from "fs";

const SEED = fs.readFileSync(".claude/skills/browser-testing/scripts/seed.js", "utf8");
const BASE = "http://localhost:3004";
const OUT = ".tmp-shots/out";
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ channel: "msedge" });

async function page({ width, height, scale, theme = "dark", as = "w-aisha", textScale }) {
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: scale, geolocation: { latitude: 43.6532, longitude: -79.3832 }, permissions: ["geolocation"] });
  const d = new Date(2026, 10, 12, 14, 20, 0);
  await ctx.clock.install({ time: d });
  await ctx.clock.resume();
  const p = await ctx.newPage();
  await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await p.evaluate(SEED);
  await p.evaluate(({ theme, as }) => {
    for (const k of ["constra_ctab_v1", "constra_notif_prompt_dismissed", "constra_share_nudge_v1", "constra_setup_guide_v1"]) localStorage.setItem(k, "1");
    localStorage.setItem("constra_theme", theme);
    const s = JSON.parse(localStorage.getItem("constra_v1"));
    s.theme = theme;
    s.authUserId = as;
    // A believable plan for tomorrow and one site alert from this morning
    const t = new Date(); t.setDate(t.getDate() + 1);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    s.crewAssignments = [
      { id: "a1", projectId: "p-queen", workerId: "w-marco", workDate: iso, startTime: "7:00 AM", note: "" },
      { id: "a2", projectId: "p-queen", workerId: "w-jen", workDate: iso, startTime: "7:00 AM", note: "" },
      { id: "a3", projectId: "p-dundas", workerId: "w-dev", workDate: iso, startTime: "6:30 AM", note: "" },
      { id: "a4", projectId: "p-harbour", workerId: "w-sam", workDate: iso, startTime: "7:30 AM", note: "" },
      { id: "a5", projectId: "p-harbour", workerId: "w-tyler", workDate: iso, startTime: "7:30 AM", note: "" },
    ];
    s.timeOffRequests = [{ id: "r1", workerId: "w-sam", startDate: iso, endDate: iso, reason: "Dentist", status: "pending", createdAt: new Date().toISOString() }];
    const open = s.clockEntries.find((e) => e.workerId === "w-dev" && !e.clockOut);
    if (open) {
      const left = new Date(); left.setHours(11, 42, 0, 0);
      const back = new Date(); back.setHours(12, 18, 0, 0);
      open.verificationFlags = [
        { type: "left-site", severity: "medium", note: "Left Dundas St Reno at 11:42 AM, 1.8 km from the site", detectedAt: left.toISOString(), metres: 1800 },
        { type: "returned-site", severity: "low", note: "Back at Dundas St Reno at 12:18 PM", detectedAt: back.toISOString() },
      ];
    }
    localStorage.setItem("constra_v1", JSON.stringify(s));
  }, { theme, as });
  await p.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  if (textScale) await p.addStyleTag({ content: `html { font-size: ${textScale * 100}% !important; }` });
  return { ctx, p };
}

const tidy = (p) => p.evaluate(() => {
  document.querySelectorAll("nextjs-portal, .pwa-banner, [data-nextjs-toast], [data-sonner-toaster]").forEach((e) => e.remove());
  document.querySelector("main")?.scrollTo(0, 0);
});

async function shot(p, path, file, { scroll = 0, before } = {}) {
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  await tidy(p);
  if (before) await before(p);
  if (scroll) { await p.evaluate((y) => document.querySelector("main")?.scrollTo(0, y), scroll); await p.waitForTimeout(400); }
  await p.screenshot({ path: `${OUT}/${file}` });
}

const report = {};

// ── Apple 6.9" (1290 × 2796) and Google Play phone (1170 × 2532) ──
for (const [prefix, w, h] of [["apple", 440, 956], ["play", 390, 844]]) {
  const { ctx, p } = await page({ width: w, height: h, scale: 3 });
  await shot(p, "/dashboard", `${prefix}-1-dashboard.png`);
  await shot(p, "/time-tracking", `${prefix}-2-time.png`, { before: async (p) => { await p.evaluate(() => { const el = [...document.querySelectorAll("section[aria-label='Hours by week']")].find((e) => e.getBoundingClientRect().width > 0); const m = document.querySelector("main"); m.scrollTo(0, el.getBoundingClientRect().top + m.scrollTop - m.getBoundingClientRect().top - 12); }); await p.waitForTimeout(300); } });
  await shot(p, "/crew-plan", `${prefix}-3-crew-plan.png`);
  await shot(p, "/timesheets", `${prefix}-4-timesheets.png`, { before: async (p) => { await p.locator("article.ts-paper").scrollIntoViewIfNeeded(); await p.evaluate(() => document.querySelector("main").scrollBy(0, -12)); } });
  await shot(p, "/templates", `${prefix}-5-templates.png`);
  await shot(p, "/invoices", `${prefix}-6-invoices.png`);
  await shot(p, "/crew", `${prefix}-7-crew.png`);
  await shot(p, "/time-off", `${prefix}-8-time-off.png`);
  await ctx.close();
}

await b.close(); process.exit(0);
// ── Step 4: light mode and large text on today's screens ──
const pages = ["/crew-plan", "/time-off", "/timesheets", "/dashboard"];
for (const theme of ["light"]) {
  const { ctx, p } = await page({ width: 390, height: 844, scale: 1, theme });
  for (const path of pages) {
    await shot(p, path, `check-${theme}${path.replace("/", "-")}.png`);
    report[`${theme}${path}`] = await p.evaluate(() => {
      // Any text whose colour is too close to its background (rough WCAG check on solid backgrounds)
      const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !c.startsWith("rgba(0, 0, 0, 0)") && !/,\s*0\)$/.test(c)) return c; } return "rgb(255,255,255)"; };
      const bad = [];
      for (const el of document.querySelectorAll("main *")) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el); if (cs.visibility === "hidden" || Number(cs.opacity) < 0.5) continue;
        const a = lum(cs.color), bb = lum(bgOf(el)); if (a == null || bb == null) continue;
        const ratio = (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05);
        const big = parseFloat(cs.fontSize) >= 18.66 || (parseFloat(cs.fontSize) >= 14 && Number(cs.fontWeight) >= 700);
        if (ratio < (big ? 3 : 4.5)) bad.push(`${el.textContent.trim().slice(0, 30)} (${ratio.toFixed(2)})`);
      }
      return bad.slice(0, 8);
    });
  }
  await ctx.close();
}
{
  const { ctx, p } = await page({ width: 390, height: 844, scale: 1, textScale: 1.3 });
  for (const path of pages) {
    await shot(p, path, `check-bigtext${path.replace("/", "-")}.png`);
    report[`bigtext${path}`] = await p.evaluate(() => ({
      sideways: document.documentElement.scrollWidth > window.innerWidth || [...document.querySelectorAll("main *")].some((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).overflowX !== "auto"),
      unnamedButtons: [...document.querySelectorAll("main button")].filter((x) => !x.textContent.trim() && !x.getAttribute("aria-label")).length,
    }));
  }
  await ctx.close();
}
console.log(JSON.stringify(report, null, 1));
await b.close();

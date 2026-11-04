// Runs the app the way a crew uses it: phone size, real camera and GPS prompts (faked), signal
// dropping mid-shift, then the paperwork. Needs the `constra-offline` preview running.
//   node .claude/skills/field-testing/scripts/field-run.mjs [port]
// Screenshots of any failure go to .tmp-field/ (gitignored).
import { chromium } from "playwright";
import fs from "fs";

const BASE = `http://localhost:${process.argv[2] ?? 3004}`;
const SEED = fs.readFileSync(new URL("../../browser-testing/scripts/seed.js", import.meta.url), "utf8");
const OUT = ".tmp-field";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "msedge",
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  acceptDownloads: true,
  permissions: ["geolocation", "camera", "microphone"],
  geolocation: { latitude: 43.6487, longitude: -79.3964 },
});
// The seed builds shifts around 3:10pm; without this, running shifts can read as negative
const frozen = new Date(); frozen.setHours(15, 10, 0, 0);
await ctx.clock.install({ time: frozen });
await ctx.clock.resume();

const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));

const results = [];
let current = "";
async function step(name, fn) {
  current = name;
  const before = errors.length;
  try {
    const note = await fn();
    const crashed = errors.slice(before);
    if (crashed.length) throw new Error(`page crashed: ${crashed[0]}`);
    results.push({ name, ok: true, note: note ?? "" });
  } catch (e) {
    const shot = `${OUT}/${results.length + 1}-fail.png`;
    await p.screenshot({ path: shot }).catch(() => {});
    results.push({ name, ok: false, note: `${String(e.message).split("\n")[0].slice(0, 200)} (see ${shot})` });
  }
}
const open = async (path) => {
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
};
const toast = (re) => p.locator("[data-sonner-toast]").filter({ hasText: re }).first();
const store = () => p.evaluate(() => JSON.parse(localStorage.getItem("constra_v1")));
const saveDownload = async (trigger) => {
  const [d] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), trigger()]);
  const path = `${OUT}/${d.suggestedFilename()}`;
  await d.saveAs(path);
  return path;
};

// ── Setup ────────────────────────────────────────────────────────────────────
await open("/dashboard");
await p.evaluate(SEED);
await p.evaluate(() => {
  localStorage.setItem("constra_ctab_v1", "1");
  localStorage.setItem("constra_notif_prompt_dismissed", "1");
  localStorage.setItem("constra_share_nudge_v1", "1");
});

let worker = "";

// ── The shift ────────────────────────────────────────────────────────────────
await step("Foreman clocks a worker in: project, GPS, live photo", async () => {
  await open("/time-tracking");
  const row = p.locator("main div:visible").filter({ has: p.locator('button:text-is("Clock In")') }).last();
  worker = (await row.locator("p").first().textContent()).trim();
  await row.locator('button:text-is("Clock In")').click();

  const photo = p.getByRole("button", { name: /Take Photo to Clock In/ });
  const override = p.getByRole("button", { name: /Override & Clock In/ });
  const seeded = await store();
  const names = seeded.projects.filter((x) => x.status === "active").map((x) => x.name);
  const pick = p.locator("button:visible").filter({ hasText: names[0] }).last();
  for (let i = 0; i < 40 && !(await photo.isVisible().catch(() => false)); i++) {
    if (await override.isVisible().catch(() => false)) await override.click();
    else if (i > 1 && await pick.isVisible().catch(() => false)) await pick.click().catch(() => {});
    await p.waitForTimeout(500);
  }
  await photo.click({ timeout: 15000 });
  await p.getByRole("button", { name: /^Confirm$/ }).click({ timeout: 10000 });
  await toast(/clocked in/).waitFor({ timeout: 10000 });

  await p.waitForTimeout(800);
  const s = await store();
  const w = s.workers.find((x) => x.name === worker);
  const open_ = s.clockEntries.filter((e) => e.workerId === w.id && !e.clockOut);
  if (open_.length !== 1) throw new Error(`${worker} has ${open_.length} open shifts, expected 1`);
  // Don't assert on clockInPhoto here: the store leaves data: photos out of localStorage on purpose
  if (!open_[0].gps) throw new Error("clock-in saved without GPS");
  return worker;
});

// The smallest element holding this worker's name and a button of that label: their own row.
// (Without .last() the match is a big wrapper, and its first button belongs to someone else.)
const rowFor = (name, button) => p.locator("main div:visible")
  .filter({ has: p.locator(`p:text-is("${name}")`) })
  .filter({ has: p.locator(`button:text-matches("${button}")`) }).last();

await step("The same worker can't be clocked in twice", async () => {
  if (await p.locator("main div:visible").filter({ has: p.locator(`p:text-is("${worker}")`) }).filter({ has: p.locator('button:text-is("Clock In")') }).filter({ hasNot: p.locator('button:text-matches("^(Out|Clock Out)$")') }).count()) {
    throw new Error(`${worker} is still offered Clock In`);
  }
});

await step("Signal drops: page says so and stays usable", async () => {
  await ctx.setOffline(true);
  await p.getByText(/Offline — changes saved locally/).waitFor({ timeout: 8000 });
  await p.locator("main").getByText(worker).first().waitFor({ timeout: 5000 });
});

await step("Clock out with no signal", async () => {
  await rowFor(worker, "^(Out|Clock Out)$").locator('button:text-matches("^(Out|Clock Out)$")').first().click({ timeout: 8000 });
  const confirm = p.getByRole("button", { name: /^Clock Out$/ }).last();
  await p.waitForTimeout(400);
  if (await toast(/clocked out/).isVisible().catch(() => false) === false && await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});
  await toast(/clocked out/).waitFor({ timeout: 8000 });
  await p.waitForTimeout(800); // the store saves to localStorage just after the state change
  const s = await store();
  const w = s.workers.find((x) => x.name === worker);
  if (s.clockEntries.some((e) => e.workerId === w.id && !e.clockOut)) throw new Error("the shift is still open after clocking out");
});

await step("Signal returns: offline notice clears", async () => {
  await ctx.setOffline(false);
  await p.getByText(/Offline — changes saved locally/).waitFor({ state: "hidden", timeout: 8000 });
});

await step("No negative hours anywhere on Time", async () => {
  await open("/time-tracking");
  const text = await p.locator("main").innerText();
  const bad = text.match(/-\d+(\.\d+)?\s?h/);
  if (bad) throw new Error(`shows "${bad[0]}"`);
});

// ── The paperwork ────────────────────────────────────────────────────────────
await step("Timesheet CSV exports and says what it left out", async () => {
  const running = (await store()).clockEntries.filter((e) => !e.clockOut).length;
  const file = await saveDownload(() => p.locator('main button:visible').filter({ hasText: /CSV/ }).first().click({ timeout: 10000 }));
  const csv = fs.readFileSync(file, "utf8");
  if (!/Worker.*Clock In.*Hours/s.test(csv.split("\n")[0])) throw new Error("no header row");
  if (csv.trim().split("\n").length < 2) throw new Error("no rows");
  if (running) await toast(/still|running|on site|clocked in|not included|skipped/i).waitFor({ timeout: 5000 });
  return `${csv.trim().split("\n").length - 1} rows, ${running} running shifts flagged`;
});

await step("Invoice opens and downloads a real PDF", async () => {
  const id = (await store()).invoices[0].id;
  await open(`/invoices/${id}`);
  // It lives in the ⋮ menu on phones
  const download = p.locator("button:visible").filter({ hasText: /Download PDF/ }).first();
  if (!await download.isVisible().catch(() => false)) await p.locator("button:visible").filter({ has: p.locator("svg.lucide-ellipsis-vertical") }).first().click({ timeout: 8000 });
  const file = await saveDownload(() => download.click({ timeout: 10000 }));
  const head = fs.readFileSync(file).subarray(0, 5).toString();
  if (head !== "%PDF-") throw new Error(`not a PDF: starts with ${head}`);
  return `${Math.round(fs.statSync(file).size / 1024)} KB`;
});

await step("Searching for nothing says so, and the data comes back", async () => {
  await open("/invoices");
  const known = (await store()).invoices[0].clientName;
  const search = p.locator('main input[placeholder*="Search" i]:visible').first();
  await search.fill("zzqqxx-no-such-thing");
  await p.waitForTimeout(500);
  const main = p.locator("main");
  if ((await main.innerText()).includes(known)) throw new Error(`"${known}" still listed`);
  if (!/no .*(match|found|result)/i.test(await main.innerText())) throw new Error("no message saying nothing matched");
  await search.fill("");
  await main.getByText(known).first().waitFor({ timeout: 5000 });
});

// ── Who can see what ─────────────────────────────────────────────────────────
await step("A worker is kept out of money and admin pages", async () => {
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("constra_v1")); s.authUserId = "w-dev"; localStorage.setItem("constra_v1", JSON.stringify(s)); });
  for (const page of ["/invoices", "/budget", "/crew", "/reports"]) {
    await open(page);
    await p.waitForURL(/\/dashboard/, { timeout: 8000 }).catch(() => {});
    if (!p.url().includes("/dashboard")) throw new Error(`worker reached ${page}`);
  }
});

await step("A worker can't clock other people in", async () => {
  await open("/time-tracking");
  if (await p.getByText("Clock In Worker").count()) throw new Error("worker sees the crew clock-in list");
});

await browser.close();

// ── Report ───────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok).length;
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.note ? `  [${r.note}]` : ""}`);
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;

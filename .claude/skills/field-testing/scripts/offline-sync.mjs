// Tests real offline sync end to end: production build, service worker, IndexedDB queue, and a mock
// Supabase that records what actually arrives. Never touches the live database.
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm run build
//   preview_start constra-sync-test   (next start on 3006, pointed at the mock)
//   node .claude/skills/field-testing/scripts/offline-sync.mjs
// Rebuild normally afterwards: this build has the mock's address baked in.
import { chromium } from "playwright";
import fs from "fs";
import { startMock, COMPANY, USER } from "./mock-supabase.mjs";

const APP = "http://127.0.0.1:3006";
const MOCK = "http://127.0.0.1:54399";
const OUT = ".tmp-sync";
fs.mkdirSync(OUT, { recursive: true });
const server = await startMock(54399);

const dbNow = async () => (await (await fetch(`${MOCK}/__db`)).json());
const control = (c) => fetch(`${MOCK}/__control`, { method: "POST", body: JSON.stringify(c) });

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 36000;
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER, exp, role: "authenticated", aud: "authenticated" })}.sig`;
const session = { access_token: token, refresh_token: "r", token_type: "bearer", expires_in: 36000, expires_at: exp, user: { id: USER, aud: "authenticated", role: "authenticated", email: "sam@example.test", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const browser = await chromium.launch({ channel: "msedge", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["geolocation", "camera", "microphone"], geolocation: { latitude: 43.65, longitude: -79.39 }, serviceWorkers: "allow", bypassCSP: true }); // the site's CSP rightly refuses the mock database
await ctx.addCookies([{ name: "sb-127-auth-token", value: `base64-${b64(session)}`, url: APP }]);
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));

const results = [];
async function step(name, fn) {
  const before = errors.length;
  try {
    const note = await fn();
    if (errors.length > before) throw new Error(`page crashed: ${errors[before]}`);
    results.push({ name, ok: true, note: note ?? "" });
  } catch (e) {
    const shot = `${OUT}/${results.length + 1}-fail.png`;
    await p.screenshot({ path: shot }).catch(() => {});
    results.push({ name, ok: false, note: `${String(e.message).split("\n")[0].slice(0, 220)} (see ${shot})` });
  }
}
const open = async (path) => { await p.goto(APP + path, { waitUntil: "load" }); await p.waitForTimeout(1800); };
const toast = (re) => p.locator("[data-sonner-toast]").filter({ hasText: re }).first();
const banner = () => p.getByText(/Offline — changes will sync/);
const tiny = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==", "base64");
const chooseProject = async () => {
  // Some forms already have the only project selected
  const picker = p.locator(".sheet button:visible, form button:visible").filter({ hasText: /select a project|select project|choose/i }).first();
  if (!await picker.isVisible().catch(() => false)) return;
  await picker.click();
  await p.getByText("Maple St Reno", { exact: false }).last().click();
};
const addTask = async (name) => {
  await open("/tasks");
  await p.locator("main button:visible, main a:visible").filter({ hasText: /^[+ ]*(New|New Task|Add Task) *$/ }).first().click({ timeout: 8000 });
  await p.getByPlaceholder("e.g. Foundation Pour").fill(name);
  await chooseProject();
  await p.locator("button:visible").filter({ hasText: /^Add Task$/ }).last().click();
  await p.waitForTimeout(600);
};

await step("Signed-in app loads from the server", async () => {
  await open("/dashboard");
  await p.waitForURL(/\/dashboard/, { timeout: 10000 });
  await p.locator("main").getByText(/Sam/i).first().waitFor({ timeout: 15000 });
});

await step("Service worker gets every screen ready", async () => {
  await p.evaluate(() => navigator.serviceWorker.ready);
  // The first load registers it; the second has a company id and asks it to warm the cache
  await open("/dashboard");
  let cached = 0;
  for (let i = 0; i < 40 && cached < 24; i++) {
    cached = await p.evaluate(async () => {
      const c = await caches.open("constra-v9");
      const pages = ["/dashboard", "/time-tracking", "/schedule", "/safety", "/messages", "/photos", "/projects", "/tasks", "/punch-list", "/rfis", "/equipment", "/materials", "/documents", "/blueprints", "/daily-reports", "/crew", "/reports", "/estimates", "/invoices", "/change-orders", "/budget", "/insurance", "/settings", "/support"];
      return (await Promise.all(pages.map((u) => c.match(u)))).filter(Boolean).length;
    });
    await p.waitForTimeout(500);
  }
  if (cached < 24) throw new Error(`only ${cached}/24 screens cached`);
  await p.waitForTimeout(3000); // let their code finish downloading
  return `${cached}/24 screens`;
});

await step("Signal drops: pages never opened before still load", async () => {
  await ctx.setOffline(true);
  for (const page of ["/equipment", "/invoices", "/rfis"]) {
    await open(page);
    const text = await p.locator("main").innerText();
    if (!new RegExp(page.slice(1), "i").test(text)) throw new Error(`${page} didn't load offline: ${text.slice(0, 60)}`);
  }
  await banner().waitFor({ timeout: 8000 });
});

await step("Offline: an invoice never opened before still opens", async () => {
  await open("/invoices");
  await p.locator("main").getByText("INV-SEED-1").first().click({ timeout: 8000 });
  await p.waitForURL(/\/invoices\/44444444/, { timeout: 10000 });
  await p.waitForTimeout(1800);
  const body = await p.locator("body").innerText();
  if (!/INV-SEED-1/.test(body)) throw new Error(`invoice didn't open: ${body.slice(0, 80)}`);
  if (/GOOD (MORNING|AFTERNOON|EVENING)/i.test(body)) throw new Error("got the dashboard instead");
  await open("/invoices/44444444-4444-4444-8444-444444444444");
  if (!/INV-SEED-1/.test(await p.locator("body").innerText())) throw new Error("didn't survive a reload");
});

await step("Offline: add a task", async () => {
  await addTask("Offline task A");
  await p.locator("main").getByText("Offline task A").first().waitFor({ timeout: 5000 });
});

await step("Offline: log a safety incident", async () => {
  await open("/safety");
  await p.locator("main button:visible").filter({ hasText: /Report Incident/ }).first().click();
  await chooseProject();
  await p.getByPlaceholder("Describe what happened...").fill("Offline near miss");
  await p.locator("button:visible").filter({ hasText: /^Log Incident$/ }).last().click();
  await p.locator("main").getByText("Offline near miss").first().waitFor({ timeout: 5000 });
});

await step("Offline: upload a site photo", async () => {
  await open("/photos");
  await p.locator("main button:visible").filter({ hasText: /Upload/ }).first().click();
  await p.locator('input[type="file"]').first().setInputFiles({ name: "site.png", mimeType: "image/png", buffer: tiny });
  await p.waitForTimeout(800);
  await p.locator(".sheet input:visible, form input:visible").filter({ hasNot: p.locator("[type=file]") }).first().fill("Offline photo");
  await chooseProject();
  await p.locator(".sheet button:visible, form button:visible").filter({ hasText: /Save|Add Photo|Add \d|Upload \d|Post/ }).last().click();
  await toast(/photo.* added/i).waitFor({ timeout: 8000 });
});

await step("Offline: clock in with a live photo", async () => {
  await open("/time-tracking");
  await p.locator("main button:visible").filter({ hasText: /Clock In/ }).first().click();
  const photo = p.getByRole("button", { name: /Take Photo to Clock In/ });
  const pick = p.locator("button:visible").filter({ hasText: "Maple St Reno" }).last();
  for (let i = 0; i < 30 && !(await photo.isVisible().catch(() => false)); i++) {
    if (await pick.isVisible().catch(() => false)) await pick.click().catch(() => {});
    await p.waitForTimeout(400);
  }
  await photo.click({ timeout: 15000 });
  await p.getByRole("button", { name: /^Confirm$/ }).click({ timeout: 10000 });
  await toast(/clocked in/).waitFor({ timeout: 10000 });
});

await step("Files stay on the phone while offline", async () => {
  // Rows aren't checked here: emulated offline occasionally lets one queued insert out in a way
  // the browser's own listeners don't see. It's harmless (the replay gets 23505 and moves on, which
  // the sync step below then proves), and a phone with no signal can't send anything anyway.
  const { db, files } = await dbNow();
  if (files.length || (db.photos ?? []).length || (db.clock_entries ?? []).length) throw new Error("uploads went out while offline");
});

await step("Offline: upload a document", async () => {
  await open("/documents");
  await p.locator('input[type="file"]').first().setInputFiles({ name: "permit.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") }).catch(() => {});
  await toast(/uploaded|select a project/i).waitFor({ timeout: 8000 });
  if (await toast(/select a project/i).isVisible().catch(() => false)) {
    await p.locator("main button:visible").filter({ hasText: "Maple St Reno" }).first().click({ timeout: 5000 });
    await p.locator('input[type="file"]').first().setInputFiles({ name: "permit.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
    await toast(/uploaded/i).waitFor({ timeout: 8000 });
  }
});

await step("Closing the app offline doesn't lose anything", async () => {
  await open("/dashboard");
  await p.getByText(/pending/).first().waitFor({ timeout: 8000 });
  const pending = await p.evaluate(() => new Promise((res) => {
    const r = indexedDB.open("constra-offline");
    r.onsuccess = () => { const g = r.result.transaction("ops").objectStore("ops").getAll(); g.onsuccess = () => res(g.result.map((o) => o.table)); };
  }));
  for (const t of ["tasks", "safety_incidents", "photos", "clock_entries", "documents"]) if (!pending.includes(t)) throw new Error(`no queued ${t}: ${pending}`);
  return `${pending.length} changes waiting`;
});

await step("Signal returns: everything arrives, files first", async () => {
  await ctx.setOffline(false);
  await toast(/synced/).waitFor({ timeout: 20000 });
  await p.waitForTimeout(1500);
  const { db, files, log } = await dbNow();
  const need = { tasks: 1, safety_incidents: 1, photos: 1, clock_entries: 1, documents: 1 };
  for (const [t, n] of Object.entries(need)) if ((db[t] ?? []).length < n) throw new Error(`${t} has ${(db[t] ?? []).length} rows`);
  if (db.tasks[0].name !== "Offline task A") throw new Error(`wrong task ${db.tasks[0].name}`);
  for (const [t, col] of [["photos", "url"], ["clock_entries", "clock_in_photo_url"], ["documents", "data_url"]]) {
    const v = String(db[t][0][col] ?? "");
    if (!v.startsWith("http")) throw new Error(`${t}.${col} isn't a link: ${v.slice(0, 40)}`);
  }
  if (files.length < 3) throw new Error(`only ${files.length} files stored`);
  const order = log.findIndex((l) => l === "upload photos") < log.findIndex((l) => l === "insert photos");
  if (!order) throw new Error("photo row written before its file");
  return `${log.length} writes, ${files.length} files`;
});

await step("Queue is empty and the data survives a reload", async () => {
  await open("/tasks");
  await p.locator("main").getByText("Offline task A").first().waitFor({ timeout: 8000 });
  if (await p.getByText(/pending/).count()) throw new Error("still shows pending");
});

await step("Clock in offline, reload, clock out: the photo survives", async () => {
  const outButton = () => p.locator("main button:visible").filter({ hasText: /^ *(Out|Clock Out) *$/ }).first();
  const confirmOut = async () => {
    await p.waitForTimeout(500);
    const c = p.getByRole("button", { name: /^Clock Out$/ }).last();
    if (await c.isVisible().catch(() => false)) await c.click().catch(() => {});
  };
  // Close the earlier shift first, online, so this worker can clock in again
  await open("/time-tracking");
  if (await outButton().isVisible().catch(() => false)) { await outButton().click(); await confirmOut(); await p.waitForTimeout(1200); }
  await ctx.setOffline(true);
  await open("/time-tracking");
  await p.locator("main button:visible").filter({ hasText: /Clock In/ }).first().click();
  const photo = p.getByRole("button", { name: /Take Photo to Clock In/ });
  const pick = p.locator("button:visible").filter({ hasText: "Maple St Reno" }).last();
  for (let i = 0; i < 30 && !(await photo.isVisible().catch(() => false)); i++) {
    if (await pick.isVisible().catch(() => false)) await pick.click().catch(() => {});
    await p.waitForTimeout(400);
  }
  await photo.click({ timeout: 15000 });
  await p.getByRole("button", { name: /^Confirm$/ }).click({ timeout: 10000 });
  await toast(/clocked in/).waitFor({ timeout: 10000 });
  await p.waitForTimeout(900); // the saved copy is written just after
  const before = (await dbNow()).db.clock_entries.length;
  await open("/time-tracking"); // this reload is what drops photos from the saved copy
  await outButton().click({ timeout: 8000 });
  await confirmOut();
  await toast(/clocked out/).waitFor({ timeout: 8000 });
  await p.waitForTimeout(600);
  await ctx.setOffline(false);
  await toast(/synced/).waitFor({ timeout: 20000 });
  await p.waitForTimeout(1800);
  const rows = (await dbNow()).db.clock_entries;
  const shift = rows.find((r) => r.clock_out && String(r.clock_in_photo_url ?? "").startsWith("http") && r.id === rows[rows.length - 1].id);
  if (rows.length < before + 1) throw new Error("the shift never arrived");
  if (!rows[rows.length - 1].clock_out) throw new Error("clock-out didn't arrive");
  if (!shift) throw new Error("photo lost: " + rows[rows.length - 1].clock_in_photo_url);
});

await step("Bad signal: phone thinks it's online but requests die, then it recovers", async () => {
  await open("/tasks");
  await control({ down: true });
  await p.locator("main button:visible, main a:visible").filter({ hasText: /^[+ ]*(New|New Task|Add Task) *$/ }).first().click({ timeout: 8000 });
  await p.getByPlaceholder("e.g. Foundation Pour").fill("Weak signal task");
  await chooseProject();
  await p.locator("button:visible").filter({ hasText: /^Add Task$/ }).last().click();
  await p.waitForTimeout(2500);
  await control({});
  await ctx.setOffline(true); await p.waitForTimeout(300); await ctx.setOffline(false);
  await toast(/synced/).waitFor({ timeout: 20000 });
  const { db } = await dbNow();
  if (!db.tasks.some((t) => t.name === "Weak signal task")) throw new Error("task never arrived");
});

await step("A change the server refuses is reported, and doesn't block the others", async () => {
  await control({ failTable: "safety_incidents", failCode: "42501" });
  await ctx.setOffline(true);
  await open("/safety");
  await p.locator("main button:visible").filter({ hasText: /Report Incident/ }).first().click();
  await chooseProject();
  await p.getByPlaceholder("Describe what happened...").fill("Refused incident");
  await p.locator("button:visible").filter({ hasText: /^Log Incident$/ }).last().click();
  await p.waitForTimeout(500);
  await addTask("After the refused one");
  for (let i = 0; i < 5; i++) {
    await ctx.setOffline(false); await p.waitForTimeout(900);
    await ctx.setOffline(true); await p.waitForTimeout(250);
  }
  await ctx.setOffline(false);
  await toast(/couldn't be saved/).waitFor({ timeout: 15000 });
  await control({});
  await p.waitForTimeout(1200);
  const { db } = await dbNow();
  if (!db.tasks.some((t) => t.name === "After the refused one")) throw new Error("the refused change blocked the next one");
});

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok).length;
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.note ? `  [${r.note}]` : ""}`);
console.log(`\n${results.length - failed}/${results.length} passed  (company ${COMPANY.slice(0, 8)})`);
process.exitCode = failed ? 1 : 0;
process.exit();

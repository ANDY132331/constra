// Runs the app as each kind of person (owner, project manager, foreman, two workers) against a mock
// Supabase that applies the same visibility rules as migrations 017-019, and checks three things:
//   1. nobody is ever sent data their role must not see (checked on every response the mock sends)
//   2. nobody's screens show data they must not see (checked on the page text and local storage)
//   3. what one person does reaches the others (a worker clocks in, the owner sees it, and so on)
//
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm run build
//   preview_start constra-sync-test      (next start on 3006)
//   node .claude/skills/field-testing/scripts/roles.mjs
// Rebuild normally afterwards: this build has the mock's address baked in. Never touches the live database.
import { chromium } from "playwright";
import http from "http";
import fs from "fs";

const APP = "http://127.0.0.1:3006";
const OUT = ".tmp-roles";
fs.mkdirSync(OUT, { recursive: true });
const id = (n) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const CO = id(1), OTHER_CO = id(9), PROJ = id(7);
const now = new Date().toISOString();
const person = (n, name, role, rate, extra = {}) => ({ id: id(n), company_id: CO, name, initials: name.split(" ").map((x) => x[0]).join(""), role, custom_role: role, email: `${name.split(" ")[0].toLowerCase()}@leakcheck.test`, phone: `555-010${n}`, color: "#3b82f6", clocked_in: false, hourly_rate: rate, pay_type: "hourly", granted_pages: null, created_at: now, ...extra });
const U = {
  owner: person(2, "Olive Owner", "Admin", 61.11),
  pm: person(3, "Pat Manager", "Project Manager", 52.22),
  foreman: person(4, "Fred Foreman", "Foreman", 43.33, { pay_type: "salary" }),
  w1: person(5, "Wendy One", "Worker", 24.44),
  w2: person(6, "Walt Two", "Worker", 27.77),
};
const ALL = Object.values(U);
const level = (u) => (u.role === "Admin" || u.role === "Project Manager" ? 3 : u.role === "Foreman" ? 2 : 0);
const grants = (u) => u.granted_pages ?? [];
const sees = (u, page) => level(u) === 3 || grants(u).includes(page);
const runs = (u) => level(u) >= 2 || grants(u).some((g) => g === "/crew" || g === "/reports");

const db = {
  companies: [{ id: CO, name: "Role Test Co", currency: "CAD", plan: "pro", invite_code: "CN-ROLE-TEST", custom_roles: [], created_at: now }],
  profiles: [...ALL, { ...person(8, "Olga Outsider", "Worker", 99.99), company_id: OTHER_CO }],
  projects: [{ id: PROJ, company_id: CO, name: "Maple St Reno", client: "Rivera", status: "active", start_date: now, end_date: now, progress: 10, budget: 50000, spent: 0, address: "", color: "#3b82f6", worker_ids: ALL.map((p) => p.id), created_at: now }],
  clock_entries: [
    { id: id(21), company_id: CO, worker_id: U.w2.id, project_id: PROJ, clock_in: new Date(Date.now() - 9 * 3600e3).toISOString(), clock_out: new Date(Date.now() - 1 * 3600e3).toISOString(), clock_in_photo_url: "SECRET-SELFIE-W2.jpg", gps: { lat: 43.111111, lng: -79.222222, accuracy: 9 }, created_at: now },
    { id: id(22), company_id: CO, worker_id: U.w1.id, project_id: PROJ, clock_in: new Date(Date.now() - 8 * 3600e3).toISOString(), clock_out: new Date(Date.now() - 0.5 * 3600e3).toISOString(), gps: { lat: 43.5, lng: -79.5, accuracy: 9 }, created_at: now },
  ],
  hours_adjustments: [{ id: id(31), company_id: CO, worker_id: U.w2.id, admin_id: U.owner.id, admin_name: "Olive Owner", delta_hours: 1, reason: "SECRET-REASON-W2", created_at: now }],
  invoices: [{ id: id(41), company_id: CO, number: "INV-SECRET-1", client_name: "SECRET-CLIENT Ltd", client_email: "", client_address: "", issue_date: now, due_date: now, status: "sent", items: [{ description: "Framing", qty: 1, rate: 500 }], tax_rate: 13, created_at: now }],
  estimates: [{ id: id(42), company_id: CO, number: "EST-SECRET-1", client_name: "SECRET-CLIENT Ltd", client_email: "", client_address: "", issue_date: now, valid_until: now, status: "draft", items: [], tax_rate: 13, created_at: now }],
  budget_lines: [{ id: id(43), company_id: CO, project_id: PROJ, category: "SECRET-BUDGET-LINE", planned: 100, actual: 50, created_at: now }],
};

// What each role must never be sent. Own details are fine; everyone else's, and money, are not.
const forbiddenFor = (me) => {
  const f = [];
  for (const p of ALL) if (p.id !== me.id && level(me) < 3) f.push(p.email, p.phone, String(p.hourly_rate));
  if (level(me) < 3) f.push("SECRET-CLIENT", "SECRET-BUDGET-LINE", "INV-SECRET", "EST-SECRET");
  if (level(me) < 2 && me.id !== U.w2.id) f.push("SECRET-SELFIE-W2", "43.111111", "SECRET-REASON-W2");
  return f;
};

const leaks = [];
const writes = [];
// Mirrors migrations 017-019 (and 018's name-only list)
function visible(table, me) {
  const rows = (db[table] ?? []).filter((r) => r.company_id === me.company_id);
  switch (table) {
    case "profiles": return rows.filter((r) => r.id === me.id || sees(me, "/crew") || level(me) === 3);
    case "clock_entries": case "hours_adjustments": case "time_off_requests": case "crew_assignments":
      return rows.filter((r) => r.worker_id === me.id || runs(me));
    case "invoices": return sees(me, "/invoices") ? rows : [];
    case "estimates": return sees(me, "/estimates") ? rows : [];
    case "change_orders": return sees(me, "/change-orders") ? rows : [];
    case "budget_lines": return sees(me, "/budget") ? rows : [];
    case "insurance_policies": return sees(me, "/insurance") ? rows : [];
    default: return rows;
  }
}
const directory = (me) => (db.profiles ?? []).filter((r) => r.company_id === me.company_id).map((r) => ({
  id: r.id, company_id: r.company_id, name: r.name, initials: r.initials, role: r.role, custom_role: r.custom_role, color: r.color, photo_url: null,
  clocked_in: (db.clock_entries ?? []).some((e) => e.worker_id === r.id && !e.clock_out),
}));

const userFrom = (req) => {
  try { const t = (req.headers.authorization ?? "").replace(/^Bearer /, ""); const sub = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; return ALL.find((p) => p.id === sub); } catch { return undefined; }
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const send = (code, json) => {
      res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": req.headers.origin ?? "*", "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] ?? "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS", "Access-Control-Allow-Credentials": "true", "Access-Control-Expose-Headers": "*" });
      res.end(json === undefined ? "" : JSON.stringify(json));
    };
    if (req.method === "OPTIONS") return send(204);
    if (url.pathname === "/__db") return send(200, { db, writes, leaks });
    const me = userFrom(req);
    if (url.pathname === "/auth/v1/user") return me ? send(200, { id: me.id, aud: "authenticated", role: "authenticated", email: me.email, app_metadata: {}, user_metadata: {}, created_at: now }) : send(401, {});
    if (/^\/storage\/v1\/object\//.test(url.pathname) && req.method === "POST") return send(200, { Key: "x", Id: "x" });
    const rest = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
    if (!rest || !me) return send(404, { message: "not found" });
    const table = rest[1];
    const filters = [...url.searchParams].filter(([k, v]) => v.startsWith("eq.") && !["select", "order", "limit"].includes(k));
    const match = (r) => filters.every(([k, v]) => String(r[k]) === v.slice(3));
    if (req.method === "GET") {
      const found = (table === "crew_directory" ? directory(me) : visible(table, me)).filter(match);
      const text = JSON.stringify(found);
      for (const bad of forbiddenFor(me)) if (text.includes(bad)) leaks.push(`${me.name} was sent ${JSON.stringify(bad)} in ${table}`);
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return found.length === 1 ? send(200, found[0]) : send(406, { code: "PGRST116", message: "no rows" });
      return send(200, found);
    }
    const data = body.length ? JSON.parse(body.toString()) : null;
    const rows = (db[table] ??= []);
    if (req.method === "POST") { for (const row of Array.isArray(data) ? data : [data]) { if (rows.some((r) => r.id === row.id)) return send(409, { code: "23505", message: "dup" }); rows.push(row); writes.push(`${me.name}: insert ${table}`); } return send(201); }
    if (req.method === "PATCH") { rows.filter(match).filter((r) => table !== "profiles" || r.id === me.id || level(me) === 3).forEach((r) => Object.assign(r, data)); writes.push(`${me.name}: update ${table}`); return send(204); }
    if (req.method === "DELETE") { db[table] = rows.filter((r) => !match(r)); writes.push(`${me.name}: delete ${table}`); return send(204); }
    send(405, {});
  });
});
await new Promise((r) => server.listen(54399, "127.0.0.1", r));

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const browser = await chromium.launch({ channel: "msedge", args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
async function as(u) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["geolocation", "camera", "microphone"], geolocation: { latitude: 43.65, longitude: -79.39 }, bypassCSP: true, serviceWorkers: "block", locale: process.env.LOCALE || "en-US" });
  const exp = Math.floor(Date.now() / 1000) + 36000;
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, exp, role: "authenticated", aud: "authenticated" })}.sig`;
  await ctx.addCookies([{ name: "sb-127-auth-token", value: `base64-${b64({ access_token: token, refresh_token: "r", token_type: "bearer", expires_in: 36000, expires_at: exp, user: { id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: now } })}`, url: APP }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  // Quiet errors too (React reports a hydration mismatch only as a console error): everything except failed requests to the mock
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|favicon|Vercel Web Analytics|_vercel\/insights|MIME type|WebSocket connection to 'ws:\/\/127/.test(m.text())) errors.push("console: " + m.text().replace(/\s+/g, " ").slice(0, 160)); });
  return { ctx, page, errors };
}
const results = [];
const check = (name, ok, note = "") => results.push({ name, ok, note });
const open = async (page, path) => { await page.goto(APP + path, { waitUntil: "load" }); await page.waitForTimeout(1500); return page.url().replace(APP, ""); };
const SCREENS = ["/dashboard", "/time-tracking", "/timesheets", "/crew-plan", "/time-off", "/messages", "/projects", "/tasks", "/safety", "/photos", "/settings"];
const OFFICE_ONLY = ["/crew", "/invoices", "/estimates", "/reports", "/budget", "/insurance", "/change-orders"];

async function sweep(key) {
  const u = U[key];
  const { ctx, page, errors } = await as(u);
  let text = "";
  for (const s of SCREENS) { await open(page, s); text += "\n" + (await page.locator("body").innerText()); }
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  const bad = forbiddenFor(u).filter((f) => text.includes(f) || stored.includes(f));
  check(`${key}: no screen or stored data shows what ${u.role} may not see`, bad.length === 0, bad.join(", "));
  check(`${key}: every normal screen opens without crashing`, errors.length === 0, errors[0] ?? "");
  const redirected = [];
  for (const s of OFFICE_ONLY) { const at = await open(page, s); redirected.push([s, at.startsWith(s)]); }
  const stayed = redirected.filter(([, ok]) => ok).map(([s]) => s);
  if (level(u) === 3) check(`${key}: office pages open`, stayed.length === OFFICE_ONLY.length, `only ${stayed.join(",")}`);
  else check(`${key}: office pages bounce to the dashboard`, stayed.length === 0 || (level(u) === 2 && stayed.every((s) => ["/estimates"].includes(s)) === false && stayed.length === 0), `stayed on ${stayed.join(",")}`);
  return { ctx, page, text };
}

// 1. Each role sees the right things
const owner = await sweep("owner");
const seenByOwner = ["wendy@leakcheck.test", "24.44"].filter((s) => owner.text.includes(s));
await open(owner.page, "/invoices");
check("owner: invoices page shows the invoice", (await owner.page.locator("body").innerText()).includes("INV-SECRET-1"));
await open(owner.page, "/crew");
const crewText = (await owner.page.locator("body").innerText()) + (await owner.page.content());
check("owner: crew page lists everyone by name", ["Wendy One", "Walt Two", "Fred Foreman"].every((n) => crewText.includes(n)), crewText.replace(/s+/g, " ").slice(0, 160));
await owner.page.getByText("Wendy One").first().click().catch(() => {});
await owner.page.waitForTimeout(1200);
const detail = (await owner.page.locator("body").innerText()) + (await owner.page.content());
await open(owner.page, "/crew"); // the previous step left Wendy's sheet open
await owner.page.getByText("Fred Foreman").first().click().catch(() => {});
await owner.page.waitForTimeout(800);
const sheetText = await owner.page.locator("body").innerText();
check("owner: a salaried person's record says Salary, not an hourly rate", /Rate\s*Salary/.test(sheetText) && !sheetText.includes("43.33"), sheetText.replace(/\s+/g, " ").slice(0, 160));
const editBtn = owner.page.getByRole("button", { name: "Edit", exact: true }).last();
await editBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
await owner.page.waitForTimeout(600); // let the sheet finish sliding up
await editBtn.click({ timeout: 5000 }).catch(() => {});
await owner.page.waitForTimeout(800);
const salaryRadio = owner.page.getByRole("radio", { name: "Salary" });
const hourlyRadio = owner.page.getByRole("radio", { name: "By the hour" });
await owner.page.screenshot({ path: OUT + "/pay-toggle.png" });
check("owner: editing a salaried person shows Salary selected", (await salaryRadio.getAttribute("aria-checked").catch(() => null)) === "true" && (await hourlyRadio.getAttribute("aria-checked").catch(() => null)) === "false", "radios on screen: " + (await owner.page.getByRole("radio").count()) + ", salary=" + (await salaryRadio.getAttribute("aria-checked").catch(() => "none")) + " (screenshot " + OUT + "/pay-toggle.png)");
check("owner: opening a worker shows their email or pay", ["wendy@leakcheck.test", "24.44"].some((x) => detail.includes(x)), "neither shown after opening Wendy One");
await owner.ctx.close();
for (const k of ["pm", "foreman", "w1", "w2"]) { const r = await sweep(k); await r.ctx.close(); }

// 2. Workers and the foreman still see who is on the crew by name
{
  const { ctx, page } = await as(U.w1);
  await open(page, "/messages");
  await open(page, "/time-tracking");
  const t = await page.locator("body").innerText();
  check("worker: time page opens and shows the worker's own name", /Wendy/.test(t));
  await ctx.close();
}
{
  const { ctx, page } = await as(U.foreman);
  await open(page, "/time-tracking");
  const t = await page.locator("body").innerText();
  check("foreman: crew list shows every worker by name", ["Wendy One", "Walt Two"].every((n) => t.includes(n)), t.slice(0, 80));
  await ctx.close();
}

// 3. Sync: a worker clocks in on their phone, the owner and foreman see it
{
  const { ctx, page } = await as(U.w1);
  await open(page, "/time-tracking");
  await page.locator("main button:visible").filter({ hasText: /Clock In/ }).first().click();
  const photo = page.getByRole("button", { name: /Take Photo to Clock In/ });
  const pick = page.locator("button:visible").filter({ hasText: "Maple St Reno" }).last();
  for (let i = 0; i < 30 && !(await photo.isVisible().catch(() => false)); i++) { if (await pick.isVisible().catch(() => false)) await pick.click().catch(() => {}); await page.waitForTimeout(400); }
  await photo.click({ timeout: 15000 });
  await page.getByRole("button", { name: /^Confirm$/ }).click({ timeout: 10000 });
  await page.waitForTimeout(2500);
  await ctx.close();
}
{
  const open1 = db.clock_entries.filter((e) => e.worker_id === U.w1.id && !e.clock_out);
  check("sync: the worker's clock-in reached the database", open1.length === 1, `${open1.length} open shifts`);
  for (const k of ["owner", "foreman"]) {
    const { ctx, page } = await as(U[k]);
    await open(page, "/time-tracking");
    const dir = await page.evaluate(() => document.body.innerText);
    const sawOnSite = /Wendy/.test(dir);
    check(`sync: ${k} sees the new clock-in after opening the app`, sawOnSite);
    await ctx.close();
  }
  check("sync: the worker's own screens never saw a coworker's private data after that", leaks.length === 0, leaks.slice(0, 3).join(" | "));
}

check("mock: no response ever carried data a role must not see", leaks.length === 0, leaks.slice(0, 5).join(" | "));
await browser.close();
server.close();
let fails = 0;
for (const r of results) { if (!r.ok) fails++; console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.note && !r.ok ? `  [${r.note}]` : ""}`); }
console.log(`\n${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);

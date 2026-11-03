// Fills the App Review demo company with realistic sample data so the reviewer
// doesn't land on empty screens. Crew members are real sign-ins, so add those
// in the app (Crew → Add Worker); this script fills everything else.
//
//   node scripts/seed-review-account.mjs <admin-email>            dry run: shows what it would add
//   node scripts/seed-review-account.mjs <admin-email> --apply    writes it
//   node scripts/seed-review-account.mjs <admin-email> --undo     removes exactly what --apply added
//
// Uses the service-role key from .env.local. Every row gets a fixed id from SEED_ID(),
// so --apply is safe to run twice (upsert) and --undo only touches seeded rows.
import fs from "fs";

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/seed-review-account.mjs <admin-email> [--apply|--undo]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local"); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const SEED_ID = (n) => `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const day = 86_400_000;
const now = Date.now();
const at = (offsetDays, hour = 7, min = 0) => {
  const d = new Date(now + offsetDays * day); d.setHours(hour, min, 0, 0); return d.toISOString();
};

class Stop extends Error {}
const stop = (msg) => { throw new Stop(msg); };

try {
const profiles = await rest(`profiles?select=id,company_id,name,role&email=eq.${encodeURIComponent(email)}`);
if (profiles.length !== 1) stop(`Expected one profile for ${email}, found ${profiles.length}. Sign up the review account first.`);
const me = profiles[0];
if (me.role !== "Admin") stop(`${email} is ${me.role}, not Admin — the reviewer needs an admin account.`);
const co = me.company_id;
const [company] = await rest(`companies?select=name&id=eq.${co}`);

let n = 0;
const P = [SEED_ID(++n), SEED_ID(++n), SEED_ID(++n)];
const rows = {
  projects: [
    { id: P[0], company_id: co, name: "Queen St Condo — Level 4 Framing", client: "Harbourview Developments", status: "active", start_date: at(-21), end_date: at(40), progress: 45, budget: 185000, spent: 0, address: "220 Queen St W, Toronto, ON", color: "#f59e0b", manager_id: me.id, worker_ids: [me.id] },
    { id: P[1], company_id: co, name: "Dundas Retail Fit-out", client: "Bayside Retail Co.", status: "active", start_date: at(-9), end_date: at(25), progress: 20, budget: 64000, spent: 0, address: "88 Dundas St E, Toronto, ON", color: "#3b82f6", manager_id: me.id, worker_ids: [me.id] },
    { id: P[2], company_id: co, name: "Rivera Family Basement Reno", client: "Rivera Family", status: "upcoming", start_date: at(6), end_date: at(34), progress: 0, budget: 38500, spent: 0, address: "14 Maple Ave, Toronto, ON", color: "#22c55e", manager_id: me.id, worker_ids: [me.id] },
  ],
  tasks: [
    ["Layout and snap lines, Level 4", P[0], "completed", 100, -14, -10],
    ["Frame exterior walls, Level 4", P[0], "in-progress", 60, -9, 4],
    ["Install blocking for cabinets", P[0], "not-started", 0, 3, 8],
    ["Demo existing storefront", P[1], "completed", 100, -9, -6],
    ["Steel stud partitions", P[1], "in-progress", 35, -5, 6],
  ].map(([name, project_id, status, progress, s, e]) => ({ id: SEED_ID(++n), company_id: co, project_id, name, status, progress, worker_id: me.id, start_date: at(s), end_date: at(e, 16) })),
  clock_entries: [-6, -5, -4, -3, -2].map((d, i) => ({
    id: SEED_ID(++n), company_id: co, worker_id: me.id, project_id: i < 3 ? P[0] : P[1],
    clock_in: at(d, 7, 5 + i * 3), clock_out: at(d, 15, 30 + i * 4), verification_flags: [],
  })),
  invoices: [
    { number: "INV-1001", client_name: "Harbourview Developments", client_email: "ap@example.com", status: "paid", issue: -30, due: -15, items: [{ description: "Level 3 framing — progress draw", qty: 1, rate: 24500 }] },
    { number: "INV-1002", client_name: "Bayside Retail Co.", client_email: "accounts@example.com", status: "sent", issue: -5, due: 25, items: [{ description: "Storefront demolition", qty: 1, rate: 6800 }, { description: "Disposal bin (20 yd)", qty: 2, rate: 450 }] },
    { number: "INV-1003", client_name: "Harbourview Developments", client_email: "ap@example.com", status: "overdue", issue: -40, due: -10, items: [{ description: "Change order #2 — added bulkheads", qty: 1, rate: 3950 }] },
  ].map((i) => ({ id: SEED_ID(++n), company_id: co, number: i.number, client_name: i.client_name, client_email: i.client_email, client_address: "Toronto, ON", issue_date: at(i.issue), due_date: at(i.due), status: i.status, items: i.items, tax_rate: 13, notes: "Thank you for your business." })),
  punch_items: [
    ["Patch drywall at unit 402 entry", "open", "medium", P[0], "Unit 402"],
    ["Missing fire blocking at shaft wall", "in-progress", "high", P[0], "Stair 2"],
    ["Touch up paint on storefront return", "open", "low", P[1], "Front entrance"],
  ].map(([title, status, priority, project_id, location]) => ({ id: SEED_ID(++n), company_id: co, project_id, title, description: "", status, priority, assigned_to_id: me.id, due_date: at(5), location })),
  safety_incidents: [
    { id: SEED_ID(++n), company_id: co, project_id: P[0], type: "near-miss", severity: "medium", description: "Unsecured sheet of plywood lifted by wind on Level 4 deck.", reported_by_id: me.id, date: at(-3, 10, 20), reported_to_osha: false, action_taken: "Toolbox talk on material storage; plywood strapped at end of each day." },
  ],
  equipment: [
    ["Scissor lift 19 ft", "Lift", "in-use", P[0], 180],
    ["Framing nailer kit (x4)", "Tools", "in-use", P[0], 40],
    ["Laser level", "Survey", "available", null, 25],
  ].map(([name, type, status, project_id, daily_rate]) => ({ id: SEED_ID(++n), company_id: co, name, type, status, project_id, last_service: at(-60), next_service: at(30), daily_rate })),
};

const summary = Object.entries(rows).map(([t, r]) => `${r.length} ${t}`).join(", ");
console.log(`Company: ${company?.name ?? co}   Admin: ${me.name} <${email}>`);

if (flag === "--undo") {
  for (const t of Object.keys(rows).reverse()) {
    const ids = rows[t].map((r) => r.id).join(",");
    await rest(`${t}?company_id=eq.${co}&id=in.(${ids})`, { method: "DELETE" });
    console.log(`removed seeded ${t}`);
  }
} else if (flag === "--apply") {
  for (const [t, r] of Object.entries(rows)) {
    await rest(`${t}?on_conflict=id`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(r) });
    console.log(`added ${r.length} ${t}`);
  }
  console.log("Done. Now add 3 crew in the app: Crew → Add Worker.");
} else {
  console.log(`Dry run — would add: ${summary}`);
  console.log("Run again with --apply to write it, or --undo to remove it later.");
}
} catch (err) {
  // exitCode, not process.exit(): exiting mid-fetch trips a libuv assertion on Windows
  console.error(err instanceof Stop ? err.message : err);
  process.exitCode = 1;
}

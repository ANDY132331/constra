// Which migrations are live? Read-only. Run from the repo root:
//   node .claude/skills/database-changes/scripts/status.mjs
// PostgREST can only see tables and columns, so a migration needs a probe here to be checkable.
// Add one line to PROBES for every new migration that adds a table or column.
import fs from "fs";

const PROBES = [
  { migration: "013", what: "schedule_events table", path: "schedule_events?select=id&limit=0" },
  { migration: "014", what: "invoices.last_reminded_at", path: "invoices?select=last_reminded_at&limit=0" },
];

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => /^[A-Z_0-9]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exitCode = 2;
} else {
  let pending = 0;
  for (const p of PROBES) {
    const r = await fetch(`${url}/rest/v1/${p.path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    // 200 = there. 404 = no such table, 400 = no such column. Anything else is not an answer.
    const state = r.ok ? "applied" : r.status === 404 || r.status === 400 ? "NOT APPLIED" : `unknown (${r.status})`;
    if (state !== "applied") pending++;
    console.log(`${p.migration}  ${state.padEnd(12)} ${p.what}`);
  }
  process.exitCode = pending ? 1 : 0;
}

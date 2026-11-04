// Rehearse migrations against a throwaway in-memory Postgres (PGlite), never the live database.
//
//   mkdir -p .tmp-db && cd .tmp-db && echo '{"private":true,"type":"module"}' > package.json
//   npm i @electric-sql/pglite     # kept out of the app's own package.json
//   cp ../.claude/skills/database-changes/scripts/test-migration.mjs .
//   node test-migration.mjs 014          # everything up to 013, then 014 twice
//
// Loads a stub of Supabase's auth schema, supabase/schema.sql and every older migration, then runs
// the target twice: the second run proves it's safe to re-run. To test role rules, add cases to
// CASES (or a copy) — as(uid) makes auth.uid() return that user, as RLS and triggers would see it.
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";

const repo = path.resolve(import.meta.dirname, "..");
const target = process.argv[2];
if (!/^\d{3}$/.test(target ?? "")) {
  console.error("Usage: node test-migration.mjs <3-digit migration number>");
  process.exit(2);
}

const db = new PGlite();
await db.exec(`
  -- Supabase has uuid-ossp installed; old migrations call it
  create function uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
  create role anon; create role authenticated; create role service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select string_to_array(name, '/') $$;
`);

const run = async (label, file) => {
  try {
    await db.exec(fs.readFileSync(path.join(repo, file), "utf8"));
    console.log(`ok    ${label}`);
    return true;
  } catch (e) {
    console.log(`FAIL  ${label}\n      ${e.message}`);
    return false;
  }
};

await run("base schema", "supabase/schema.sql");
const files = fs.readdirSync(repo).filter((f) => /^supabase-migration-\d{3}\.sql$/.test(f)).sort();
let baseOk = true;
for (const f of files) {
  const n = f.match(/\d{3}/)[0];
  if (n < target) baseOk = (await run(`older ${n}`, f)) && baseOk;
}
const name = `supabase-migration-${target}.sql`;
if (!files.includes(name)) {
  console.error(`${name} not found`);
  process.exitCode = 2;
} else {
  const first = await run(`${target} first run`, name);
  const second = first && await run(`${target} second run (re-run safety)`, name);

  const as = (uid) => db.exec(`select set_config('test.uid', '${uid ?? ""}', false)`);
  // [description, async () => {...}] — throw to fail. Add rules specific to the migration here.
  const CASES = [
    ["database still answers after the migration", async () => { await as(null); await db.query("select 1"); }],
  ];
  let caseFails = 0;
  for (const [desc, fn] of first ? CASES : []) {
    try { await fn(); console.log(`ok    ${desc}`); }
    catch (e) { caseFails++; console.log(`FAIL  ${desc}\n      ${e.message}`); }
  }
  if (!baseOk) console.log("\nNote: an older migration failed above. If it fails on the stub only, say so; don't hide it.");
  process.exitCode = first && second && !caseFails ? 0 : 1;
}

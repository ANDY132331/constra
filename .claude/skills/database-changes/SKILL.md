---
name: database-changes
description: How to change Constra's live Supabase database safely — writing a migration that can run twice, rehearsing it on a throwaway Postgres, getting it applied, confirming it's live, and keeping the app in step. Use this whenever a change needs a new table, column, index, constraint, trigger, RLS policy or storage rule, whenever a feature fails because something is missing from the database, whenever migrations 013 or 014 or "run the migrations" come up, and before writing any SQL or any code that reads a column that may not exist yet, even if the user only describes the feature.
---

# Database changes

The database holds real crews' hours and invoices, and it has no staging copy. So every change is
rehearsed somewhere disposable first, and nothing reaches it without the owner's go-ahead.

## See what's live

```bash
node .claude/skills/database-changes/scripts/status.mjs
```

Read-only. Run it first, because memory and notes go stale and the database doesn't. It can only see
tables and columns, so add a line to `PROBES` for every new migration that adds one.

## Write the migration

Migrations are loose files in the repo root: `supabase-migration-NNN.sql`, next number up, starting
with a comment saying what it does and why. Read 013 and 014 for the house style.

**It has to be safe to run twice.** It gets pasted by hand, and a paste can be repeated or half fail.
Use `if not exists`, `create or replace`, and `drop trigger if exists` before `create trigger`.
Wrap `create policy` in a check or a `do` block, since it has no `if not exists`.

**It can't break data that's already there.** Add new checks as `not valid` so old rows aren't
rejected. A new `not null` column needs a default. A unique index should skip itself with a notice if
duplicates exist, as 013 does for open shifts, rather than failing the whole file.

**Server routes must keep working.** They use the service role, where `auth.uid()` is null. That's
why `caller_level()` returns 99 for a null uid. A trigger that doesn't allow for this breaks every
cron job and webhook.

**RLS keeps companies apart, triggers enforce roles.** A new table holding company data needs
`company_id`, row-level security turned on, and policies built on `my_company_id()`. Without them
it's readable across companies, or by nobody.

**Destructive changes wait.** Dropping or renaming a column, or anything that rewrites data, needs
the owner to understand exactly what goes away, and a plan for phones still running old code. Prefer
adding the new thing, moving over, and removing the old one in a later migration.

## Rehearse it

```bash
mkdir -p .tmp-db && cd .tmp-db && echo '{"private":true,"type":"module"}' > package.json
npm i @electric-sql/pglite
cp ../.claude/skills/database-changes/scripts/test-migration.mjs .
node test-migration.mjs 015
```

This builds a real Postgres in memory from `supabase/schema.sql` and all older migrations, then runs
yours twice. `.tmp-db` is gitignored; delete it when done.

**Older 001 fails here, and that's known:** `supabase/schema.sql` defines `documents.id` as text while
001 declares a uuid foreign key to it. The `blueprint_pins` table it creates does exist on the live
database, so this is drift between the repo's files. Any other failure needs explaining.

For role rules or RLS, add cases to `CASES` in your copy: insert a company and users, call `as(uid)`,
then attempt the write and assert it's allowed or refused. Migration 013 was checked this way, across
37 cases. Test the refusals as well as the successes, since a rule that blocks everyone also "works".

PGlite doesn't run Supabase's real `auth` or `storage`, only stubs. Say so when reporting, and don't
claim a storage policy is proven by this.

## Get it applied

Changes to the live database need the owner's approval each time, even though code fixes don't. Tell
them in plain words what it changes and what could go wrong, then:

1. **Supabase connector connected:** check for its tools (ToolSearch `+supabase`) and apply it there.
2. **Not connected:** the owner opens the SQL editor for project `twusgbelcyocbwnvricz` and pastes the
   file's **contents**, then clicks Run. Pasting the filename gives `syntax error at or near "supabase"`,
   which happened once. Copy it to their clipboard so they only paste:
   `Get-Content -Raw supabase-migration-NNN.sql | Set-Clipboard`

Claude can't sign in to Supabase or type a password. The service-role key in `.env.local` can read
and write rows but can't run DDL, and shouldn't be used to attempt it.

Then run `status.mjs` again. "Applied" means it says so, not that the paste looked fine.

## Keep the app in step

- **Order:** apply the migration before pushing code that needs it. A deploy reading a missing column
  fails right away, which is how the invoice-reminder cron breaks without 014.
- **Mappers:** a new column usually needs its row type and `dbToX` / `xToDb` in `lib/supabase/db.ts`,
  and the load in `lib/store.tsx`. Writes queued offline replay later, so they need to survive the
  old shape too.
- **Privacy:** new personal data means updating the privacy policy and store answers (see `store-release`).
- **Base schema:** also add new tables to `supabase/schema.sql`, so rehearsals and fresh setups match.
- **Memory:** when 013 and 014 are confirmed live, delete `pending_migration_013.md` and its
  `MEMORY.md` line. The owner asked to be reminded until then.

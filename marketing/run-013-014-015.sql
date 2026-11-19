-- Constra: migrations 013 + 014 + 015 + 016 + 017 + 018 + 019 combined. Paste into Supabase SQL Editor (project twusgbelcyocbwnvricz) and Run.

-- ===== supabase-migration-013.sql =====
-- Migration 013: role-based write rules + missing schedule_events table
--
-- Safe to run more than once, and safe whether or not 012 was run (it supersedes it).
--
-- RLS already keeps every company's data separate. These triggers add the missing
-- role checks so the database enforces the same rules the app shows:
--   Admin / Project Manager : everything
--   Foreman                 : field operations (projects, tasks, RFIs, punch list, ...)
--   Everyone else           : own clock-ins, safety reports, photos, messages
-- A non-admin also passes the money/admin checks for any page an admin granted them.
-- Server routes use the service role (auth.uid() is null) and are never blocked.

-- ── Helpers ───────────────────────────────────────────────────────────────────
create or replace function public.caller_level()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 99
    else coalesce((
      select case role when 'Admin' then 3 when 'Project Manager' then 3 when 'Foreman' then 2 else 0 end
      from profiles where id = auth.uid()
    ), 0)
  end;
$$;

create or replace function public.caller_has_page(page text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select page = any(granted_pages) from profiles where id = auth.uid()), false);
$$;

-- TG_ARGV[0] = minimum level, TG_ARGV[1] = page that also grants access ('' for none)
create or replace function public.require_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.caller_level() >= TG_ARGV[0]::int
     or (TG_ARGV[1] <> '' and public.caller_has_page(TG_ARGV[1])) then
    return coalesce(new, old);
  end if;
  raise exception 'You don''t have permission to change %', replace(TG_TABLE_NAME, '_', ' ')
    using errcode = '42501';
end;
$$;

-- ── Admin-level tables ────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('invoices',           3, '/invoices'),
      ('estimates',          3, '/estimates'),
      ('change_orders',      3, '/change-orders'),
      ('budget_lines',       3, '/budget'),
      ('insurance_policies', 3, '/insurance'),
      ('hours_adjustments',  3, '/crew'),
      ('projects',           2, '/projects'),
      ('tasks',              2, '/tasks'),
      ('rfis',               2, '/rfis'),
      ('punch_items',        2, '/punch-list'),
      ('equipment',          2, '/equipment'),
      ('material_types',     2, '/materials'),
      ('material_entries',   2, '/materials'),
      ('documents',          2, '/documents'),
      ('blueprint_pins',     2, '/blueprints'),
      ('daily_reports',      2, '/daily-reports')
    ) as t(tbl, lvl, page)
  loop
    if to_regclass('public.' || r.tbl) is not null then
      execute format('drop trigger if exists role_guard on public.%I', r.tbl);
      execute format(
        'create trigger role_guard before insert or update or delete on public.%I
           for each row execute function public.require_level(%L, %L)',
        r.tbl, r.lvl, r.page);
    end if;
  end loop;
end $$;

-- Company settings (name, invite code, overtime, custom roles): admins only
drop trigger if exists role_guard on public.companies;
create trigger role_guard before update or delete on public.companies
  for each row execute function public.require_level('3', '/settings');

-- ── Safety incidents: anyone can report, only foreman+ can edit or delete ─────
drop trigger if exists role_guard on public.safety_incidents;
create trigger role_guard before update or delete on public.safety_incidents
  for each row execute function public.require_level('2', '/safety');

-- ── Clock entries ─────────────────────────────────────────────────────────────
-- Workers create their own entries and clock themselves out. They can't move their
-- clock-in time, reassign an entry, or delete it. Foreman+ can do anything.
create or replace function public.guard_clock_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.caller_level() >= 2 then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.worker_id = auth.uid() then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.worker_id = auth.uid()
     and new.worker_id = old.worker_id
     and new.clock_in = old.clock_in then
    return new;
  end if;
  raise exception 'Only a foreman or admin can change this time entry' using errcode = '42501';
end;
$$;

drop trigger if exists role_guard on public.clock_entries;
create trigger role_guard before insert or update or delete on public.clock_entries
  for each row execute function public.guard_clock_entry();

-- ── Photos & messages: authors or admins can edit/delete ──────────────────────
create or replace function public.guard_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
begin
  if public.caller_level() >= 3 then
    return coalesce(new, old);
  end if;
  author := (to_jsonb(old) ->> TG_ARGV[0])::uuid;
  if author = auth.uid() then
    return coalesce(new, old);
  end if;
  raise exception 'You can only change your own %', replace(TG_TABLE_NAME, '_', ' ')
    using errcode = '42501';
end;
$$;

drop trigger if exists role_guard on public.photos;
create trigger role_guard before update or delete on public.photos
  for each row execute function public.guard_author('uploaded_by_id');

drop trigger if exists role_guard on public.crew_messages;
create trigger role_guard before update or delete on public.crew_messages
  for each row execute function public.guard_author('sender_id');

-- ── Profiles (supersedes migration 012) ───────────────────────────────────────
-- Admins and Project Managers manage crew; only an Admin can create another Admin.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lvl int := public.caller_level();
begin
  if lvl = 99 then
    return new;
  end if;
  if new.role = 'Admin' and old.role is distinct from 'Admin'
     and (select role from profiles where id = auth.uid()) <> 'Admin' then
    raise exception 'Only an Admin can make someone an Admin' using errcode = '42501';
  end if;
  if lvl >= 3 then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.company_id is distinct from old.company_id
     or new.hourly_rate is distinct from old.hourly_rate
     or new.granted_pages is distinct from old.granted_pages then
    raise exception 'Only an admin can change roles, pay rates or page access'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_privileges on profiles;
create trigger guard_profile_privileges
  before update on profiles
  for each row execute function public.guard_profile_privileges();

create or replace function public.guard_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.caller_level() >= 3 then
    return old;
  end if;
  raise exception 'Only an admin can remove crew members' using errcode = '42501';
end;
$$;

drop trigger if exists guard_profile_delete on profiles;
create trigger guard_profile_delete
  before delete on profiles
  for each row execute function public.guard_profile_delete();

-- ── Missing table: schedule events (the Schedule page saved to it but it never existed) ──
create table if not exists public.schedule_events (
  id          uuid primary key,
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null,
  date        text not null,
  type        text not null default 'meeting',
  description text not null default '',
  color       text not null default '#F5C400',
  created_at  timestamptz not null default now()
);
create index if not exists schedule_events_company_idx on public.schedule_events (company_id);

alter table public.schedule_events enable row level security;
drop policy if exists "schedule_events_company" on public.schedule_events;
create policy "schedule_events_company" on public.schedule_events
  for all using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'schedule_events'
     ) then
    alter publication supabase_realtime add table public.schedule_events;
  end if;
end $$;

-- ── Size limits (stop anyone bloating the database by calling the API directly) ──
-- NOT VALID: existing rows aren't checked, only new writes.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('crew_messages',  'attachment_data',    12000000),
      ('crew_messages',  'text',                  10000),
      ('clock_entries',  'clock_in_photo_url',  3000000),
      ('profiles',       'photo_url',           1500000),
      ('companies',      'logo',                1500000),
      ('safety_incidents','description',         20000),
      ('rfis',           'question',              20000),
      ('daily_reports',  'notes',                 20000),
      ('projects',       'name',                    300)
    ) as t(tbl, col, max_len)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = r.tbl and column_name = r.col
    ) then
      execute format('alter table public.%I drop constraint if exists %I', r.tbl, r.tbl || '_' || r.col || '_size');
      execute format('alter table public.%I add constraint %I check (char_length(%I) <= %s) not valid',
        r.tbl, r.tbl || '_' || r.col || '_size', r.col, r.max_len);
    end if;
  end loop;
end $$;

-- ── Shared rate limiter ──────────────────────────────────────────────────────
-- Serverless instances don't share memory, so in-process limits are easy to get around.
-- Only the service role (server routes) can call this.
create table if not exists public.rate_limits (
  key      text primary key,
  count    int not null,
  reset_at timestamptz not null
);
alter table public.rate_limits enable row level security;  -- no policies: invisible to app users

create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c int;
begin
  insert into rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count    = case when r.reset_at < now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at < now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into c;
  if random() < 0.01 then
    delete from rate_limits where reset_at < now() - interval '1 day';
  end if;
  return c <= p_max;
end;
$$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;

-- ── One open shift per worker ─────────────────────────────────────────────────
-- Two open clock entries for the same person would both be closed at clock-out and paid twice.
-- Skipped (with a notice) if existing data already has duplicates, so this file still runs cleanly.
do $$
begin
  if exists (
    select 1 from clock_entries where clock_out is null group by worker_id having count(*) > 1
  ) then
    raise notice 'clock_entries has workers with several open shifts; close them, then re-run this file to add the guard';
  else
    create unique index if not exists clock_entries_one_open_shift
      on clock_entries (worker_id) where clock_out is null;
  end if;
end $$;

-- ===== supabase-migration-014.sql =====
-- Migration 014: Add last_reminded_at to invoices for reminder throttling
--
-- Without this column the invoice-reminders cron sends a payment reminder for every
-- overdue invoice on every run. With it, reminders are capped to once per 7 days.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

-- ===== supabase-migration-015.sql =====
-- Migration 015: clock-out reminders, payroll email, saved certifications, time off, crew plan
--
-- Run AFTER 013 (it uses 013's caller_level() and my_company_id()). Safe to run more than once.
-- Adds only; nothing existing is changed or removed.
--
--   clock_entries.reminder_sent_at                when a long open shift was last nudged, so it's once
--   companies.payroll_email / payroll_email_on    where the weekly timesheet goes, and whether to send it
--   profiles.certifications                       tickets and expiry dates (they only lived on one phone before)
--   time_off_requests                             a worker asks, a foreman or admin decides
--   crew_assignments                              who works where on which day

-- ── Company settings ──────────────────────────────────────────────────────────
alter table public.companies add column if not exists payroll_email text;
alter table public.companies add column if not exists payroll_email_on boolean not null default false;

-- The hourly reminder job marks a shift once it has nudged about it, so nobody is told twice
alter table public.clock_entries add column if not exists reminder_sent_at timestamptz;

-- ── Certifications, saved with the person ─────────────────────────────────────
alter table public.profiles add column if not exists certifications jsonb not null default '[]'::jsonb;

-- Same rules as 013, plus: only an admin can change someone's certifications, so a ticket
-- can't be quietly extended by the person holding it.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lvl int := public.caller_level();
begin
  if lvl = 99 then
    return new;
  end if;
  if new.role = 'Admin' and old.role is distinct from 'Admin'
     and (select role from profiles where id = auth.uid()) <> 'Admin' then
    raise exception 'Only an Admin can make someone an Admin' using errcode = '42501';
  end if;
  if lvl >= 3 then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.company_id is distinct from old.company_id
     or new.hourly_rate is distinct from old.hourly_rate
     or new.granted_pages is distinct from old.granted_pages
     or new.certifications is distinct from old.certifications then
    raise exception 'Only an admin can change roles, pay rates, page access or certifications'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── Time off requests ─────────────────────────────────────────────────────────
create table if not exists public.time_off_requests (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  worker_id   uuid not null references public.profiles(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text not null default '',
  status      text not null default 'pending',
  decided_by  uuid references public.profiles(id) on delete set null,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint time_off_status check (status in ('pending', 'approved', 'declined')),
  constraint time_off_dates check (end_date >= start_date),
  constraint time_off_reason_size check (char_length(reason) <= 500)
);
create index if not exists time_off_company_idx on public.time_off_requests (company_id, start_date);

alter table public.time_off_requests enable row level security;
drop policy if exists "time_off_company" on public.time_off_requests;
create policy "time_off_company" on public.time_off_requests
  for all using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Anyone asks for themselves. Only foreman and up approve, decline, or ask for someone else.
-- The asker can withdraw their own request while it's still pending.
create or replace function public.guard_time_off()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.caller_level() >= 2 then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' and new.worker_id = auth.uid() and new.status = 'pending' then
    return new;
  end if;
  if tg_op = 'DELETE' and old.worker_id = auth.uid() and old.status = 'pending' then
    return old;
  end if;
  raise exception 'Only a foreman or admin can approve or change time off' using errcode = '42501';
end;
$$;

drop trigger if exists role_guard on public.time_off_requests;
create trigger role_guard before insert or update or delete on public.time_off_requests
  for each row execute function public.guard_time_off();

-- ── Crew plan: who works where, which day ─────────────────────────────────────
create table if not exists public.crew_assignments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  worker_id   uuid not null references public.profiles(id) on delete cascade,
  work_date   date not null,
  start_time  text not null default '',
  note        text not null default '',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint crew_assignment_note_size check (char_length(note) <= 300),
  constraint crew_assignment_time_size check (char_length(start_time) <= 10)
);
create unique index if not exists crew_assignments_one_job_a_day
  on public.crew_assignments (worker_id, work_date);
create index if not exists crew_assignments_company_idx on public.crew_assignments (company_id, work_date);

alter table public.crew_assignments enable row level security;
drop policy if exists "crew_assignments_company" on public.crew_assignments;
create policy "crew_assignments_company" on public.crew_assignments
  for all using (company_id = public.my_company_id())
  with check (company_id = public.my_company_id());

-- Everyone sees the plan; foreman and up make it
drop trigger if exists role_guard on public.crew_assignments;
create trigger role_guard before insert or update or delete on public.crew_assignments
  for each row execute function public.require_level('2', '/schedule');

-- ── Live updates for the two new tables ───────────────────────────────────────
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['time_off_requests', 'crew_assignments'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ===== supabase-migration-016.sql =====
-- Migration 016: custom overtime rules
--
-- Safe to run more than once. Adds one column; nothing existing is changed or removed.
--   companies.overtime_rules   a list of rules such as
--     [{"kind":"after","per":"day","after":8,"multiplier":1.5},
--      {"kind":"days","days":[0,6],"multiplier":2}]
--   Null means the company uses the daily / weekly / multiplier columns it already has.
--   Companies whose rules fit those columns never need this column at all.

alter table public.companies add column if not exists overtime_rules jsonb;




-- ===== supabase-migration-017.sql =====
-- Migration 017: finance data is readable only by people who may see those pages
--
-- Until now every table was locked to the caller's COMPANY but not to their ROLE. The app hid the
-- Invoices, Estimates, Change orders, Budget and Insurance pages from Workers and Foremen, yet a
-- Worker's login could still read every one of those rows straight from the database API.
--
-- This adds RESTRICTIVE select policies. A restrictive policy is ANDed with whatever policies are
-- already there, so it works whatever those are called and can only ever remove access. A person
-- passes when they are an Admin or Project Manager, or when an Admin granted them that page in
-- Settings (profiles.granted_pages) - the same rule the app's route guard uses.
-- Server routes use the service role, which bypasses RLS, so emailed invoices, client share links
-- and payment pages are not affected.

create or replace function public.can_see_page(page text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (me.role in ('Admin', 'Project Manager') or page = any (coalesce(me.granted_pages, '{}')))
  )
$$;

revoke all on function public.can_see_page(text) from public, anon;
grant execute on function public.can_see_page(text) to authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('invoices',           '/invoices'),
      ('estimates',          '/estimates'),
      ('change_orders',      '/change-orders'),
      ('budget_lines',       '/budget'),
      ('insurance_policies', '/insurance')
    ) as v(tbl, page)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop policy if exists %I on public.%I', t.tbl || '_role_gate', t.tbl);
      execute format(
        'create policy %I on public.%I as restrictive for select to authenticated using ((select public.can_see_page(%L)))',
        t.tbl || '_role_gate', t.tbl, t.page
      );
    end if;
  end loop;
end $$;


-- ===== supabase-migration-018.sql =====
-- Migration 018: workers no longer see each other's pay rate, email or phone
--
-- Until now any member of a company could read every profile row in it, so a Worker's login could
-- read coworkers' hourly rates, emails and phone numbers straight from the database API even though
-- the app never showed them.
--
-- 1. A RESTRICTIVE select policy limits full profile rows to: your own row, or Admins, Project Managers
--    and anyone an Admin granted the Crew page. Foremen get the name-only list like Workers do, so
--    pay rates are visible to the office only. Restrictive policies are ANDed with the existing ones,
--    so this works whatever they are called and can only remove access.
-- 2. crew_directory is a name-only view of the same company (no pay, email, phone, device history or
--    page grants) so a Worker's app can still show who is on the crew in chat, tasks and schedules.
--
-- Requires nothing but the earlier schema. Safe to run more than once. Server routes use the service
-- role and are not affected. Foremen can still run the day (clock people in, see hours) because that
-- uses clock_entries, not the profile row.

create or replace function public.can_see_crew()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (me.role in ('Admin', 'Project Manager') or '/crew' = any (coalesce(me.granted_pages, '{}')))
  )
$$;

revoke all on function public.can_see_crew() from public, anon;
grant execute on function public.can_see_crew() to authenticated;

drop policy if exists profiles_crew_gate on public.profiles;
create policy profiles_crew_gate on public.profiles
  as restrictive for select to authenticated
  using (id = (select auth.uid()) or (select public.can_see_crew()));

-- Owner-rights view (the default), so it reads profiles past the policy above, but only for the
-- caller's own company and only these columns.
drop view if exists public.crew_directory;
create view public.crew_directory as
  select id, company_id, name, initials, role, custom_role, color, photo_url
  from public.profiles
  where company_id = public.my_company_id();

revoke all on public.crew_directory from public, anon;
grant select on public.crew_directory to authenticated;


-- ===== supabase-migration-019.sql =====
-- Migration 019: Workers see only their own clock-ins, hour adjustments, time off and crew plan
--
-- Clock entries carry GPS positions and clock-in selfie links, hour adjustments carry the reason an
-- Admin changed someone's hours, and time-off requests are personal. Until now every member of a
-- company could read all of them for every coworker straight from the database API.
--
-- A RESTRICTIVE select policy (ANDed with the existing ones, so it only ever removes access) now lets
-- a person read these rows when they are their own, or when they run the day: Admin, Project Manager,
-- Foreman, or someone an Admin granted the Crew or Reports page. Foremen keep the hours they need.
--
-- Workers still need to know who is on site, so crew_directory (migration 018) gains a clocked_in
-- flag worked out from open clock entries. It carries no times, places or photos.
--
-- Requires 018. Safe to run more than once. Server routes use the service role and are not affected.

create or replace function public.can_see_hours()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (me.role in ('Admin', 'Project Manager', 'Foreman')
           or coalesce(me.granted_pages, '{}') && array['/crew', '/reports'])
  )
$$;

revoke all on function public.can_see_hours() from public, anon;
grant execute on function public.can_see_hours() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['clock_entries', 'hours_adjustments', 'time_off_requests', 'crew_assignments']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_own_or_manager', t);
      execute format(
        'create policy %I on public.%I as restrictive for select to authenticated using (worker_id = (select auth.uid()) or (select public.can_see_hours()))',
        t || '_own_or_manager', t
      );
    end if;
  end loop;
end $$;

-- Dropped and recreated (not CREATE OR REPLACE) so running this again, or running 018 again
-- afterwards, never fails on the column list
drop view if exists public.crew_directory;
create view public.crew_directory as
  select p.id, p.company_id, p.name, p.initials, p.role, p.custom_role, p.color, p.photo_url,
         exists (select 1 from public.clock_entries ce where ce.worker_id = p.id and ce.clock_out is null) as clocked_in
  from public.profiles p
  where p.company_id = public.my_company_id();

revoke all on public.crew_directory from public, anon;
grant select on public.crew_directory to authenticated;

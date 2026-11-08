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

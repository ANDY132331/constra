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

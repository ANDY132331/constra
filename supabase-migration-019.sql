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
        'create policy %I on public.%I as restrictive for select to authenticated using (worker_id = auth.uid() or public.can_see_hours())',
        t || '_own_or_manager', t
      );
    end if;
  end loop;
end $$;

-- New columns may only be added at the end of a view, so clocked_in goes last
create or replace view public.crew_directory as
  select p.id, p.company_id, p.name, p.initials, p.role, p.custom_role, p.color, p.photo_url,
         exists (select 1 from public.clock_entries ce where ce.worker_id = p.id and ce.clock_out is null) as clocked_in
  from public.profiles p
  where p.company_id = public.my_company_id();

revoke all on public.crew_directory from public, anon;
grant select on public.crew_directory to authenticated;

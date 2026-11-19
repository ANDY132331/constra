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

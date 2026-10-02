-- Migration 012: stop non-admins escalating privileges through profile updates
--
-- The profiles RLS update policy lets any member of a company update any profile in
-- that company. Without this trigger a Worker could call the API directly and set their
-- own role to 'Admin', change pay rates, or grant themselves pages.
-- Server routes use the service role (auth.uid() is null) and are not affected.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into caller_role from profiles where id = auth.uid();
  if caller_role = 'Admin' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.company_id is distinct from old.company_id
     or new.hourly_rate is distinct from old.hourly_rate
     or new.granted_pages is distinct from old.granted_pages then
    raise exception 'Only an Admin can change roles, pay rates or page access'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_privileges on profiles;
create trigger guard_profile_privileges
  before update on profiles
  for each row execute function public.guard_profile_privileges();

-- Only Admins may delete profiles directly. A trigger (rather than a policy change) works
-- whichever RLS policy set is live. The app removes crew via /api/delete-worker, which
-- uses the service role.
create or replace function public.guard_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return old;
  end if;
  if not exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'Admin') then
    raise exception 'Only an Admin can remove crew members' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists guard_profile_delete on profiles;
create trigger guard_profile_delete
  before delete on profiles
  for each row execute function public.guard_profile_delete();

-- Migration 020: salaried crew members
--
-- Some companies pay a salary instead of by the hour. A person marked 'salary' still clocks in and
-- out and their hours are still tracked, but the app treats them as overtime-exempt and does not work
-- out pay from their hours (payroll exports show "Salary" instead of a rate and gross). Their
-- hourly_rate, if set, is only used as a cost per hour for job costing.
--
-- Only Admins and Project Managers can change a person's pay type, same as pay rates and roles.
-- Safe to run more than once. Requires 015 (replaces the profile guard it created).

alter table public.profiles add column if not exists pay_type text not null default 'hourly';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pay_type_check') then
    alter table public.profiles add constraint profiles_pay_type_check check (pay_type in ('hourly', 'salary'));
  end if;
end $$;

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
     or new.pay_type is distinct from old.pay_type
     or new.granted_pages is distinct from old.granted_pages
     or new.certifications is distinct from old.certifications then
    raise exception 'Only an admin can change roles, pay, page access or certifications'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Migration 021: close the two other ways a Worker could learn a coworker's clock-in times
--
-- 019 limits clock_entries to your own rows unless you run the day. Two side doors were left open:
--   1. activity_feed is readable by the whole company and can hold "Name clocked out" with a time.
--   2. Clock-in selfies are stored as {companyId}/{workerId}/{milliseconds}.jpg and any company
--      member could list the bucket, so the file names alone gave away times, plus the photos.
--
-- Both get a RESTRICTIVE select policy (ANDed with what is there, so it only ever removes access):
-- your own, or Admin / Project Manager / Foreman / granted Crew or Reports (can_see_hours()).
-- Server routes use the service role and are not affected. Requires 019. Safe to run more than once.

drop policy if exists activity_clock_own_or_manager on public.activity_feed;
create policy activity_clock_own_or_manager on public.activity_feed
  as restrictive for select to authenticated
  using (
    coalesce(type, '') not like 'clock%'
    or worker_id = (select auth.uid())
    or (select public.can_see_hours())
  );

-- Applies only to the clock-photos bucket; every other bucket passes straight through
drop policy if exists clock_photos_own_or_manager on storage.objects;
create policy clock_photos_own_or_manager on storage.objects
  as restrictive for select to authenticated
  using (
    bucket_id <> 'clock-photos'
    or split_part(name, '/', 2) = (select auth.uid())::text
    or (select public.can_see_hours())
  );

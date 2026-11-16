-- Migration 016: custom overtime rules
--
-- Safe to run more than once. Adds one column; nothing existing is changed or removed.
--   companies.overtime_rules   a list of rules such as
--     [{"kind":"after","per":"day","after":8,"multiplier":1.5},
--      {"kind":"days","days":[0,6],"multiplier":2}]
--   Null means the company uses the daily / weekly / multiplier columns it already has.
--   Companies whose rules fit those columns never need this column at all.

alter table public.companies add column if not exists overtime_rules jsonb;

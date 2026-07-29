-- BuildFlow / Constra — PostgreSQL schema for Supabase
-- Run this in the Supabase SQL editor: Dashboard → SQL Editor → New query

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Companies ─────────────────────────────────────────────────────────────────

create table if not exists companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  invite_code     text unique not null,
  plan            text not null default 'free' check (plan in ('free', 'pro')),
  currency        text not null default 'USD',
  language        text not null default 'en',
  industry        text not null default 'Construction',
  address         text not null default '',
  business_number text not null default '',
  created_at      timestamptz default now()
);

alter table companies enable row level security;

-- ── Profiles (one row per auth.users member) ──────────────────────────────────

create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  company_id     uuid not null references companies(id) on delete cascade,
  name           text not null,
  initials       text not null default '',
  role           text not null default 'Worker'
                   check (role in ('Admin', 'Project Manager', 'Foreman', 'Worker')),
  custom_role    text not null default '',
  email          text not null default '',
  phone          text not null default '',
  color          text not null default '#3b82f6',
  photo_url      text,
  clocked_in     boolean not null default false,
  clock_in_time  timestamptz,
  hourly_rate    numeric(10,2) not null default 0,
  device_history jsonb default '[]'::jsonb,
  created_at     timestamptz default now()
);

alter table profiles enable row level security;

-- Helper: resolve company_id for the current user.
-- Used in every RLS policy — queries once per statement.
create or replace function public.my_company_id() returns uuid
  language sql stable security definer as $$
    select company_id from profiles where id = auth.uid()
  $$;

-- ── Projects ──────────────────────────────────────────────────────────────────

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  client      text not null default '',
  status      text not null default 'active'
                check (status in ('active', 'upcoming', 'completed')),
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  progress    integer not null default 0 check (progress between 0 and 100),
  budget      numeric(12,2) not null default 0,
  spent       numeric(12,2) not null default 0,
  address     text not null default '',
  gps         jsonb,
  color       text not null default '#f59e0b',
  manager_id  uuid references profiles(id),
  worker_ids  uuid[] not null default '{}',
  created_at  timestamptz default now()
);

alter table projects enable row level security;

-- ── Tasks ─────────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  name        text not null,
  progress    integer not null default 0 check (progress between 0 and 100),
  worker_id   uuid references profiles(id),
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  status      text not null default 'not-started'
                check (status in ('not-started', 'in-progress', 'completed', 'delayed')),
  created_at  timestamptz default now()
);

alter table tasks enable row level security;

-- ── Clock entries ─────────────────────────────────────────────────────────────

create table if not exists clock_entries (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies(id) on delete cascade,
  worker_id          uuid not null references profiles(id) on delete cascade,
  project_id         uuid references projects(id) on delete set null,
  clock_in           timestamptz not null,
  clock_out          timestamptz,
  clock_in_photo_url text,
  gps                jsonb,
  device_info        text,
  verification_flags jsonb default '[]'::jsonb,
  created_at         timestamptz default now()
);

alter table clock_entries enable row level security;

-- ── Punch items ───────────────────────────────────────────────────────────────

create table if not exists punch_items (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  project_id     uuid references projects(id) on delete cascade,
  title          text not null,
  description    text not null default '',
  status         text not null default 'open'
                   check (status in ('open', 'in-progress', 'resolved')),
  priority       text not null default 'medium'
                   check (priority in ('low', 'medium', 'high')),
  assigned_to_id uuid references profiles(id),
  created_at     timestamptz not null default now(),
  due_date       timestamptz,
  location       text
);

alter table punch_items enable row level security;

-- ── Safety incidents ──────────────────────────────────────────────────────────

create table if not exists safety_incidents (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  project_id       uuid references projects(id) on delete cascade,
  type             text not null
                     check (type in ('near-miss', 'injury', 'property-damage', 'environmental')),
  severity         text not null default 'low'
                     check (severity in ('low', 'medium', 'high', 'critical')),
  description      text not null,
  reported_by_id   uuid references profiles(id),
  date             timestamptz not null,
  injured_id       uuid references profiles(id),
  reported_to_osha boolean not null default false,
  action_taken     text not null default '',
  created_at       timestamptz default now()
);

alter table safety_incidents enable row level security;

-- ── Equipment ─────────────────────────────────────────────────────────────────

create table if not exists equipment (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  name         text not null,
  type         text not null,
  status       text not null default 'available'
                 check (status in ('available', 'in-use', 'maintenance', 'off-site')),
  project_id   uuid references projects(id),
  last_service timestamptz not null,
  next_service timestamptz not null,
  cert_expiry  timestamptz,
  daily_rate   numeric(10,2) not null default 0,
  created_at   timestamptz default now()
);

alter table equipment enable row level security;

-- ── RFIs ──────────────────────────────────────────────────────────────────────

create table if not exists rfis (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies(id) on delete cascade,
  project_id      uuid references projects(id) on delete cascade,
  number          text not null,
  subject         text not null,
  question        text not null,
  submitted_by_id uuid references profiles(id),
  assigned_to_id  uuid references profiles(id),
  status          text not null default 'open'
                    check (status in ('open', 'answered', 'closed')),
  priority        text not null default 'routine'
                    check (priority in ('routine', 'urgent', 'critical')),
  created_at      timestamptz not null default now(),
  due_date        timestamptz not null,
  answer          text
);

alter table rfis enable row level security;

-- ── Invoices ──────────────────────────────────────────────────────────────────

create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  number         text not null,
  client_name    text not null default '',
  client_email   text not null default '',
  client_address text not null default '',
  issue_date     timestamptz not null,
  due_date       timestamptz not null,
  status         text not null default 'draft'
                   check (status in ('draft', 'sent', 'paid', 'overdue')),
  items          jsonb not null default '[]'::jsonb,
  tax_rate       numeric(5,2) not null default 0,
  notes          text,
  created_at     timestamptz default now()
);

alter table invoices enable row level security;

-- ── Estimates ─────────────────────────────────────────────────────────────────

create table if not exists estimates (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  number       text not null,
  project_name text not null default '',
  client_name  text not null default '',
  client_email text not null default '',
  issue_date   timestamptz not null,
  valid_until  timestamptz not null,
  status       text not null default 'draft'
                 check (status in ('draft', 'sent', 'accepted', 'declined')),
  items        jsonb not null default '[]'::jsonb,
  tax_rate     numeric(5,2) not null default 0,
  notes        text,
  created_at   timestamptz default now()
);

alter table estimates enable row level security;

-- ── Photos ────────────────────────────────────────────────────────────────────

create table if not exists photos (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies(id) on delete cascade,
  project_id     uuid references projects(id) on delete set null,
  caption        text not null,
  uploaded_by_id uuid references profiles(id),
  uploaded_at    timestamptz not null default now(),
  tags           text[] not null default '{}',
  url            text,
  gps            jsonb,
  gradient       text not null default '',
  created_at     timestamptz default now()
);

alter table photos enable row level security;

-- ── Activity feed ─────────────────────────────────────────────────────────────

create table if not exists activity_feed (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  type        text not null,
  description text not null,
  worker_id   uuid references profiles(id),
  timestamp   timestamptz not null default now(),
  created_at  timestamptz default now()
);

alter table activity_feed enable row level security;

-- ── Hours adjustments ─────────────────────────────────────────────────────────

create table if not exists hours_adjustments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  worker_id   uuid not null references profiles(id) on delete cascade,
  admin_id    uuid not null references profiles(id),
  admin_name  text not null,
  delta_hours numeric(8,2) not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

alter table hours_adjustments enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- Every member can only read/write rows for their own company.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy "companies_own"            on companies         for select using (id = public.my_company_id());
create policy "profiles_tenant"          on profiles          for all    using (company_id = public.my_company_id());
create policy "profiles_self"            on profiles          for select using (id = auth.uid());
create policy "projects_tenant"          on projects          for all    using (company_id = public.my_company_id());
create policy "tasks_tenant"             on tasks             for all    using (company_id = public.my_company_id());
create policy "clock_entries_tenant"     on clock_entries     for all    using (company_id = public.my_company_id());
create policy "punch_items_tenant"       on punch_items       for all    using (company_id = public.my_company_id());
create policy "safety_incidents_tenant"  on safety_incidents  for all    using (company_id = public.my_company_id());
create policy "equipment_tenant"         on equipment         for all    using (company_id = public.my_company_id());
create policy "rfis_tenant"              on rfis              for all    using (company_id = public.my_company_id());
create policy "invoices_tenant"          on invoices          for all    using (company_id = public.my_company_id());
create policy "estimates_tenant"         on estimates         for all    using (company_id = public.my_company_id());
create policy "photos_tenant"            on photos            for all    using (company_id = public.my_company_id());
create policy "activity_feed_tenant"     on activity_feed     for all    using (company_id = public.my_company_id());
create policy "hours_adjustments_tenant" on hours_adjustments for all    using (company_id = public.my_company_id());

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard → Storage, or run via CLI:
--   supabase storage buckets create clock-photos --private
--   supabase storage buckets create project-photos --private
--
-- Then add storage policies (substitute BUCKET_NAME):
--
-- CREATE POLICY "tenant_select" ON storage.objects FOR SELECT USING (
--   bucket_id = 'BUCKET_NAME'
--   AND (storage.foldername(name))[1] = public.my_company_id()::text
-- );
-- CREATE POLICY "tenant_insert" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'BUCKET_NAME'
--   AND (storage.foldername(name))[1] = public.my_company_id()::text
-- );
-- CREATE POLICY "tenant_delete" ON storage.objects FOR DELETE USING (
--   bucket_id = 'BUCKET_NAME'
--   AND (storage.foldername(name))[1] = public.my_company_id()::text
-- );
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Material types ────────────────────────────────────────────────────────────
create table if not exists material_types (
  id          text        primary key,
  company_id  uuid        not null references companies(id) on delete cascade,
  name        text        not null,
  unit        text        not null,
  trade       text        not null,
  use_count   integer     not null default 0,
  is_custom   boolean     not null default false,
  created_at  timestamptz default now()
);
alter table material_types enable row level security;
create index if not exists material_types_company on material_types(company_id);
create policy "material_types_tenant" on material_types for all using (company_id = public.my_company_id());

-- ── Material entries ──────────────────────────────────────────────────────────
create table if not exists material_entries (
  id               text        primary key,
  company_id       uuid        not null references companies(id) on delete cascade,
  project_id       text        not null default '',
  material_type_id text        not null,
  material_name    text        not null,
  unit             text        not null,
  trade            text        not null,
  quantity         numeric(10,3) not null,
  type             text        not null check (type in ('delivery', 'usage')),
  date             timestamptz not null,
  note             text,
  created_at       timestamptz default now()
);
alter table material_entries enable row level security;
create index if not exists material_entries_company on material_entries(company_id);
create policy "material_entries_tenant" on material_entries for all using (company_id = public.my_company_id());

-- ── Documents ─────────────────────────────────────────────────────────────────
create table if not exists documents (
  id              text        primary key,
  company_id      uuid        not null references companies(id) on delete cascade,
  project_id      text        not null default '',
  name            text        not null,
  category        text        not null check (category in ('blueprint','permit','contract','inspection','safety','other')),
  uploaded_at     timestamptz not null,
  uploaded_by_id  text        not null,
  size_bytes      integer     not null default 0,
  data_url        text,
  versions        jsonb       not null default '[]'::jsonb,
  created_at      timestamptz default now()
);
alter table documents enable row level security;
create index if not exists documents_company on documents(company_id);
create policy "documents_tenant" on documents for all using (company_id = public.my_company_id());

-- ── Crew Messages ─────────────────────────────────────────────────────────────
create table if not exists crew_messages (
  id            text        primary key,
  company_id    uuid        not null references companies(id) on delete cascade,
  project_id    text        not null,
  sender_id     text        not null,
  sender_name   text        not null,
  sender_initials text      not null,
  sender_color  text        not null,
  text          text        not null default '',
  timestamp     timestamptz not null default now(),
  attachment_name text,
  attachment_data text      -- base64; omit for large files (use storage instead)
);

alter table crew_messages enable row level security;

create index if not exists crew_messages_company_project
  on crew_messages(company_id, project_id, timestamp);

create policy "crew_messages_tenant" on crew_messages
  for all using (company_id = public.my_company_id());

-- Enable Realtime on this table (run once in Supabase Dashboard > Database > Replication
-- or via SQL editor):
-- alter publication supabase_realtime add table crew_messages;

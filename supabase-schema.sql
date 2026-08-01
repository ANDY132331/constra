-- ============================================================
-- Constra — Full Database Schema
-- Run this once in: Supabase → SQL Editor → New query
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Companies ────────────────────────────────────────────────
create table if not exists companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  invite_code text unique,
  plan        text not null default 'free',
  currency    text not null default 'CAD',
  language    text not null default 'en',
  industry    text,
  address     text,
  business_number text,
  logo        text,
  subscription_status text,
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at  timestamptz default now()
);

-- ── Profiles (one row per user) ───────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  company_id    uuid not null references companies on delete cascade,
  name          text not null,
  initials      text not null default '',
  role          text not null default 'Worker',
  custom_role   text not null default '',
  email         text not null default '',
  phone         text not null default '',
  color         text not null default '#f59e0b',
  photo_url     text,
  clocked_in    boolean not null default false,
  clock_in_time timestamptz,
  hourly_rate   numeric not null default 0,
  device_history jsonb,
  granted_pages text[],
  created_at    timestamptz default now()
);

-- ── Projects ─────────────────────────────────────────────────
create table if not exists projects (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies on delete cascade,
  name            text not null,
  client          text not null default '',
  status          text not null default 'upcoming',
  start_date      timestamptz not null,
  end_date        timestamptz not null,
  progress        integer not null default 0,
  budget          numeric not null default 0,
  spent           numeric not null default 0,
  committed       numeric,
  forecast        numeric,
  address         text not null default '',
  gps             jsonb,
  color           text not null default '#f59e0b',
  manager_id      uuid references profiles,
  worker_ids      uuid[] not null default '{}',
  pending_approval boolean not null default false,
  created_by      uuid references profiles,
  created_at      timestamptz default now()
);

-- ── Tasks ─────────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects on delete cascade,
  company_id  uuid not null references companies on delete cascade,
  name        text not null,
  progress    integer not null default 0,
  worker_id   uuid references profiles,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  status      text not null default 'not-started',
  created_at  timestamptz default now()
);

-- ── Clock Entries ─────────────────────────────────────────────
create table if not exists clock_entries (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references companies on delete cascade,
  worker_id           uuid not null references profiles on delete cascade,
  project_id          uuid references projects,
  clock_in            timestamptz not null default now(),
  clock_out           timestamptz,
  clock_in_photo_url  text,
  gps                 jsonb,
  device_info         text,
  verification_flags  jsonb,
  created_at          timestamptz default now()
);

-- ── Punch Items ───────────────────────────────────────────────
create table if not exists punch_items (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references companies on delete cascade,
  project_id     uuid references projects,
  title          text not null,
  description    text not null default '',
  status         text not null default 'open',
  priority       text not null default 'medium',
  assigned_to_id uuid references profiles,
  due_date       timestamptz,
  location       text,
  created_at     timestamptz default now()
);

-- ── Safety Incidents ──────────────────────────────────────────
create table if not exists safety_incidents (
  id                 uuid primary key default uuid_generate_v4(),
  company_id         uuid not null references companies on delete cascade,
  project_id         uuid references projects,
  type               text not null,
  severity           text not null default 'low',
  description        text not null default '',
  reported_by_id     uuid references profiles,
  date               timestamptz not null default now(),
  injured_id         uuid references profiles,
  reported_to_osha   boolean not null default false,
  action_taken       text not null default '',
  created_at         timestamptz default now()
);

-- ── Equipment ─────────────────────────────────────────────────
create table if not exists equipment (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies on delete cascade,
  name         text not null,
  type         text not null default '',
  status       text not null default 'available',
  project_id   uuid references projects,
  last_service timestamptz not null,
  next_service timestamptz not null,
  cert_expiry  timestamptz,
  daily_rate   numeric not null default 0,
  created_at   timestamptz default now()
);

-- ── RFIs ──────────────────────────────────────────────────────
create table if not exists rfis (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies on delete cascade,
  project_id      uuid references projects,
  number          text not null,
  subject         text not null,
  question        text not null default '',
  submitted_by_id uuid references profiles,
  assigned_to_id  uuid references profiles,
  status          text not null default 'open',
  priority        text not null default 'routine',
  due_date        timestamptz not null,
  answer          text,
  created_at      timestamptz default now()
);

-- ── Invoices ──────────────────────────────────────────────────
create table if not exists invoices (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies on delete cascade,
  number          text not null,
  client_name     text not null default '',
  client_email    text not null default '',
  client_address  text not null default '',
  issue_date      timestamptz not null,
  due_date        timestamptz not null,
  status          text not null default 'draft',
  items           jsonb not null default '[]',
  tax_rate        numeric not null default 0,
  notes           text,
  created_at      timestamptz default now()
);

-- ── Estimates ─────────────────────────────────────────────────
create table if not exists estimates (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies on delete cascade,
  number       text not null,
  project_name text not null default '',
  client_name  text not null default '',
  client_email text not null default '',
  issue_date   timestamptz not null,
  valid_until  timestamptz not null,
  status       text not null default 'draft',
  items        jsonb not null default '[]',
  tax_rate     numeric not null default 0,
  notes        text,
  created_at   timestamptz default now()
);

-- ── Photos ────────────────────────────────────────────────────
create table if not exists photos (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references companies on delete cascade,
  project_id     uuid references projects,
  caption        text not null default '',
  uploaded_by_id uuid references profiles,
  uploaded_at    timestamptz not null default now(),
  tags           text[] not null default '{}',
  url            text,
  gps            jsonb,
  gradient       text not null default 'from-gray-800 to-gray-900',
  created_at     timestamptz default now()
);

-- ── Activity Feed ─────────────────────────────────────────────
create table if not exists activity_feed (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies on delete cascade,
  type        text not null,
  description text not null,
  worker_id   uuid references profiles,
  timestamp   timestamptz not null default now(),
  created_at  timestamptz default now()
);

-- ── Hours Adjustments ─────────────────────────────────────────
create table if not exists hours_adjustments (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies on delete cascade,
  worker_id   uuid not null references profiles on delete cascade,
  admin_id    uuid not null references profiles,
  admin_name  text not null,
  delta_hours numeric not null,
  reason      text not null default '',
  created_at  timestamptz default now()
);

-- ── Crew Messages ─────────────────────────────────────────────
create table if not exists crew_messages (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references companies on delete cascade,
  project_id       uuid not null references projects on delete cascade,
  sender_id        uuid not null references profiles,
  sender_name      text not null,
  sender_initials  text not null,
  sender_color     text not null,
  text             text not null,
  timestamp        timestamptz not null default now(),
  attachment_name  text,
  attachment_data  text
);

-- ── Material Types ────────────────────────────────────────────
create table if not exists material_types (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies on delete cascade,
  name        text not null,
  unit        text not null,
  trade       text not null,
  use_count   integer not null default 0,
  is_custom   boolean not null default false,
  created_at  timestamptz default now()
);

-- ── Material Entries ──────────────────────────────────────────
create table if not exists material_entries (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references companies on delete cascade,
  project_id        uuid not null references projects on delete cascade,
  material_type_id  uuid references material_types,
  material_name     text not null,
  unit              text not null,
  trade             text not null,
  quantity          numeric not null,
  type              text not null default 'delivery',
  date              timestamptz not null,
  note              text,
  created_at        timestamptz default now()
);

-- ── Documents ─────────────────────────────────────────────────
create table if not exists documents (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies on delete cascade,
  project_id      uuid not null references projects on delete cascade,
  name            text not null,
  category        text not null default 'other',
  uploaded_at     timestamptz not null default now(),
  uploaded_by_id  uuid references profiles,
  size_bytes      integer not null default 0,
  data_url        text,
  versions        jsonb not null default '[]',
  created_at      timestamptz default now()
);

-- ── Daily Reports ─────────────────────────────────────────────
create table if not exists daily_reports (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies on delete cascade,
  project_id      uuid not null references projects on delete cascade,
  date            date not null,
  weather         text,
  temperature_f   numeric,
  crew_count      integer not null default 0,
  crew_on_site    text[] not null default '{}',
  work_completed  text not null default '',
  delays          text not null default '',
  materials_used  text not null default '',
  visitor_log     text not null default '',
  notes           text not null default '',
  submitted_by_id uuid references profiles,
  created_at      timestamptz default now()
);

-- ── Change Orders ─────────────────────────────────────────────
create table if not exists change_orders (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references companies on delete cascade,
  project_id       uuid not null references projects on delete cascade,
  number           text not null,
  title            text not null,
  description      text not null default '',
  reason           text not null default '',
  amount           numeric not null default 0,
  status           text not null default 'pending',
  submitted_at     timestamptz not null default now(),
  approved_at      timestamptz,
  approved_by      text,
  submitted_by_id  uuid references profiles,
  created_at       timestamptz default now()
);

-- ── Push Subscriptions ────────────────────────────────────────
create table if not exists push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies on delete cascade,
  user_id     uuid not null references profiles on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- Every table is locked to the authenticated user's company.
-- ============================================================

alter table companies        enable row level security;
alter table profiles         enable row level security;
alter table projects         enable row level security;
alter table tasks            enable row level security;
alter table clock_entries    enable row level security;
alter table punch_items      enable row level security;
alter table safety_incidents enable row level security;
alter table equipment        enable row level security;
alter table rfis             enable row level security;
alter table invoices         enable row level security;
alter table estimates        enable row level security;
alter table photos           enable row level security;
alter table activity_feed    enable row level security;
alter table hours_adjustments enable row level security;
alter table crew_messages    enable row level security;
alter table material_types   enable row level security;
alter table material_entries enable row level security;
alter table documents        enable row level security;
alter table daily_reports    enable row level security;
alter table change_orders    enable row level security;
alter table push_subscriptions enable row level security;

-- Helper: return the caller's company_id from their profile row
create or replace function my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from profiles where id = auth.uid()
$$;

-- Companies: user can read/update their own company
create policy "company_select" on companies for select using (id = my_company_id());
create policy "company_update" on companies for update using (id = my_company_id());

-- Profiles
create policy "profiles_select" on profiles for select using (company_id = my_company_id());
create policy "profiles_insert" on profiles for insert with check (company_id = my_company_id());
create policy "profiles_update" on profiles for update using (company_id = my_company_id());
create policy "profiles_delete" on profiles for delete using (company_id = my_company_id());

-- Projects
create policy "projects_select" on projects for select using (company_id = my_company_id());
create policy "projects_insert" on projects for insert with check (company_id = my_company_id());
create policy "projects_update" on projects for update using (company_id = my_company_id());
create policy "projects_delete" on projects for delete using (company_id = my_company_id());

-- Tasks
create policy "tasks_select" on tasks for select using (company_id = my_company_id());
create policy "tasks_insert" on tasks for insert with check (company_id = my_company_id());
create policy "tasks_update" on tasks for update using (company_id = my_company_id());
create policy "tasks_delete" on tasks for delete using (company_id = my_company_id());

-- Clock entries
create policy "clock_select" on clock_entries for select using (company_id = my_company_id());
create policy "clock_insert" on clock_entries for insert with check (company_id = my_company_id());
create policy "clock_update" on clock_entries for update using (company_id = my_company_id());
create policy "clock_delete" on clock_entries for delete using (company_id = my_company_id());

-- Punch items
create policy "punch_select" on punch_items for select using (company_id = my_company_id());
create policy "punch_insert" on punch_items for insert with check (company_id = my_company_id());
create policy "punch_update" on punch_items for update using (company_id = my_company_id());
create policy "punch_delete" on punch_items for delete using (company_id = my_company_id());

-- Safety incidents
create policy "safety_select" on safety_incidents for select using (company_id = my_company_id());
create policy "safety_insert" on safety_incidents for insert with check (company_id = my_company_id());
create policy "safety_update" on safety_incidents for update using (company_id = my_company_id());
create policy "safety_delete" on safety_incidents for delete using (company_id = my_company_id());

-- Equipment
create policy "equip_select" on equipment for select using (company_id = my_company_id());
create policy "equip_insert" on equipment for insert with check (company_id = my_company_id());
create policy "equip_update" on equipment for update using (company_id = my_company_id());
create policy "equip_delete" on equipment for delete using (company_id = my_company_id());

-- RFIs
create policy "rfi_select" on rfis for select using (company_id = my_company_id());
create policy "rfi_insert" on rfis for insert with check (company_id = my_company_id());
create policy "rfi_update" on rfis for update using (company_id = my_company_id());
create policy "rfi_delete" on rfis for delete using (company_id = my_company_id());

-- Invoices
create policy "inv_select" on invoices for select using (company_id = my_company_id());
create policy "inv_insert" on invoices for insert with check (company_id = my_company_id());
create policy "inv_update" on invoices for update using (company_id = my_company_id());
create policy "inv_delete" on invoices for delete using (company_id = my_company_id());

-- Estimates
create policy "est_select" on estimates for select using (company_id = my_company_id());
create policy "est_insert" on estimates for insert with check (company_id = my_company_id());
create policy "est_update" on estimates for update using (company_id = my_company_id());
create policy "est_delete" on estimates for delete using (company_id = my_company_id());

-- Photos
create policy "photo_select" on photos for select using (company_id = my_company_id());
create policy "photo_insert" on photos for insert with check (company_id = my_company_id());
create policy "photo_delete" on photos for delete using (company_id = my_company_id());

-- Activity feed
create policy "activity_select" on activity_feed for select using (company_id = my_company_id());
create policy "activity_insert" on activity_feed for insert with check (company_id = my_company_id());

-- Hours adjustments
create policy "adj_select" on hours_adjustments for select using (company_id = my_company_id());
create policy "adj_insert" on hours_adjustments for insert with check (company_id = my_company_id());

-- Crew messages
create policy "msg_select" on crew_messages for select using (company_id = my_company_id());
create policy "msg_insert" on crew_messages for insert with check (company_id = my_company_id());

-- Material types
create policy "mattype_select" on material_types for select using (company_id = my_company_id());
create policy "mattype_insert" on material_types for insert with check (company_id = my_company_id());
create policy "mattype_update" on material_types for update using (company_id = my_company_id());
create policy "mattype_delete" on material_types for delete using (company_id = my_company_id());

-- Material entries
create policy "matentry_select" on material_entries for select using (company_id = my_company_id());
create policy "matentry_insert" on material_entries for insert with check (company_id = my_company_id());
create policy "matentry_delete" on material_entries for delete using (company_id = my_company_id());

-- Documents
create policy "doc_select" on documents for select using (company_id = my_company_id());
create policy "doc_insert" on documents for insert with check (company_id = my_company_id());
create policy "doc_delete" on documents for delete using (company_id = my_company_id());

-- Daily reports
create policy "dr_select" on daily_reports for select using (company_id = my_company_id());
create policy "dr_insert" on daily_reports for insert with check (company_id = my_company_id());
create policy "dr_update" on daily_reports for update using (company_id = my_company_id());
create policy "dr_delete" on daily_reports for delete using (company_id = my_company_id());

-- Change orders
create policy "co_select" on change_orders for select using (company_id = my_company_id());
create policy "co_insert" on change_orders for insert with check (company_id = my_company_id());
create policy "co_update" on change_orders for update using (company_id = my_company_id());
create policy "co_delete" on change_orders for delete using (company_id = my_company_id());

-- Push subscriptions
create policy "push_select" on push_subscriptions for select using (company_id = my_company_id());
create policy "push_insert" on push_subscriptions for insert with check (company_id = my_company_id());
create policy "push_delete" on push_subscriptions for delete using (company_id = my_company_id());

-- ============================================================
-- Realtime: enable for all tables that need live updates
-- ============================================================
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table clock_entries;
alter publication supabase_realtime add table punch_items;
alter publication supabase_realtime add table safety_incidents;
alter publication supabase_realtime add table equipment;
alter publication supabase_realtime add table rfis;
alter publication supabase_realtime add table invoices;
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table activity_feed;
alter publication supabase_realtime add table hours_adjustments;
alter publication supabase_realtime add table crew_messages;
alter publication supabase_realtime add table daily_reports;
alter publication supabase_realtime add table change_orders;

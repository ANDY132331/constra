-- Migration 009: insurance_policies table + company custom_roles + permissions_pin
-- Safe to re-run. Paste into:
-- https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

-- 1. Add custom_roles and permissions_pin to companies (local-only before this migration)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'custom_roles'
  ) THEN
    ALTER TABLE companies ADD COLUMN custom_roles TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'permissions_pin'
  ) THEN
    ALTER TABLE companies ADD COLUMN permissions_pin TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- 2. Insurance policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  holder_name     TEXT NOT NULL DEFAULT '',
  holder_type     TEXT NOT NULL DEFAULT 'company'
                    CHECK (holder_type IN ('company', 'subcontractor', 'worker')),
  worker_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  coverage_type   TEXT NOT NULL,
  insurer         TEXT NOT NULL DEFAULT '',
  policy_number   TEXT NOT NULL DEFAULT '',
  coverage_amount NUMERIC NOT NULL DEFAULT 0,
  issue_date      DATE NOT NULL,
  expiry_date     DATE NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'insurance_policies' AND policyname = 'ip_select'
  ) THEN
    EXECUTE 'CREATE POLICY "ip_select" ON insurance_policies FOR SELECT USING (company_id = my_company_id())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'insurance_policies' AND policyname = 'ip_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "ip_insert" ON insurance_policies FOR INSERT WITH CHECK (company_id = my_company_id())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'insurance_policies' AND policyname = 'ip_update'
  ) THEN
    EXECUTE 'CREATE POLICY "ip_update" ON insurance_policies FOR UPDATE USING (company_id = my_company_id())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'insurance_policies' AND policyname = 'ip_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "ip_delete" ON insurance_policies FOR DELETE USING (company_id = my_company_id())';
  END IF;
END $$;

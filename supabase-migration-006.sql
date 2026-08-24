-- Migration 006: account deletion (7-day recovery window) + default tax rate
-- Safe to re-run. Paste into:
-- https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

-- 1. Worker-level deletion request (deletes just that person's own account)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deletion_requested_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deletion_requested_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deletion_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deletion_token UUID;
  END IF;
END $$;

-- 2. Company-level deletion request (Admin deleting their account deletes
--    the entire company workspace — cascades to every table via existing
--    "on delete cascade" foreign keys once the row is actually removed)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'deletion_requested_at'
  ) THEN
    ALTER TABLE companies ADD COLUMN deletion_requested_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'deletion_token'
  ) THEN
    ALTER TABLE companies ADD COLUMN deletion_token UUID;
  END IF;
END $$;

-- 3. Indexes so the daily purge cron can find expired requests cheaply
CREATE INDEX IF NOT EXISTS profiles_deletion_pending
  ON profiles (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS companies_deletion_pending
  ON companies (deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;

-- 4. Default tax rate — pre-fills new invoices/estimates instead of a
--    hardcoded 13% (Ontario HST), editable per-document as before.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'default_tax_rate'
  ) THEN
    ALTER TABLE companies ADD COLUMN default_tax_rate NUMERIC NOT NULL DEFAULT 13;
  END IF;
END $$;

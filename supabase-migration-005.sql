-- Migration 005: add logo column to companies + UPDATE policy
-- Safe to re-run. Paste into:
-- https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

-- 1. Add logo column (TEXT — stores base64 data URL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'logo'
  ) THEN
    ALTER TABLE companies ADD COLUMN logo TEXT;
  END IF;
END $$;

-- 2. Add UPDATE policy so admins can save company settings (name, logo, etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies' AND policyname = 'company_update'
  ) THEN
    CREATE POLICY "company_update" ON companies
      FOR UPDATE USING (id = public.my_company_id());
  END IF;
END $$;

-- Migration 010: add theme preference to companies
-- Safe to re-run. Paste into:
-- https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'theme'
  ) THEN
    ALTER TABLE companies ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark';
  END IF;
END $$;

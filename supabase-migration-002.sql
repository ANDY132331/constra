-- Migration 002: add missing columns that were added to the schema but not applied to the live DB
-- Safe to re-run. Paste into: https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

-- 1. Add committed / forecast to projects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'committed'
  ) THEN
    ALTER TABLE projects ADD COLUMN committed numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'forecast'
  ) THEN
    ALTER TABLE projects ADD COLUMN forecast numeric;
  END IF;
END $$;

-- 2. Add granted_pages to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'granted_pages'
  ) THEN
    ALTER TABLE profiles ADD COLUMN granted_pages text[];
  END IF;
END $$;

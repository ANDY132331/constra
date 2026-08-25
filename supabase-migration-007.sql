-- Migration 007: configurable overtime rules
-- Safe to re-run. Paste into:
-- https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'overtime_enabled'
  ) THEN
    ALTER TABLE companies ADD COLUMN overtime_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Hours/day beyond which extra hours count as overtime. NULL = daily rule unused.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'overtime_daily_threshold'
  ) THEN
    ALTER TABLE companies ADD COLUMN overtime_daily_threshold NUMERIC;
  END IF;
END $$;

-- Hours/week (after any daily-OT hours are already set aside) beyond which
-- extra hours count as overtime. NULL = weekly rule unused. Defaults to 40,
-- the most broadly applicable starting point (US federal FLSA and several
-- Canadian provinces) -- fully editable in Settings per company.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'overtime_weekly_threshold'
  ) THEN
    ALTER TABLE companies ADD COLUMN overtime_weekly_threshold NUMERIC DEFAULT 40;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'overtime_multiplier'
  ) THEN
    ALTER TABLE companies ADD COLUMN overtime_multiplier NUMERIC NOT NULL DEFAULT 1.5;
  END IF;
END $$;

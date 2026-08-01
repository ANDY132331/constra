-- Migration 001: blueprint_pins table + documents UPDATE policy
-- Safe to re-run. Paste into: https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

-- 1. Add UPDATE policy for documents (needed by addDocumentVersion)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'documents' AND policyname = 'update_own_company_documents'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "update_own_company_documents" ON documents
        FOR UPDATE USING (company_id = my_company_id())
        WITH CHECK (company_id = my_company_id())
    $p$;
  END IF;
END $$;

-- 2. Create blueprint_pins table (no-op if already exists)
CREATE TABLE IF NOT EXISTS blueprint_pins (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_id uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page        integer     NOT NULL DEFAULT 0,
  x           numeric     NOT NULL,
  y           numeric     NOT NULL,
  type        text        NOT NULL CHECK (type IN ('issue','info','safety','rfi')),
  note        text        NOT NULL DEFAULT '',
  resolved    boolean     NOT NULL DEFAULT false,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blueprint_pins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blueprint_pins' AND policyname = 'select_own_company_blueprint_pins') THEN
    EXECUTE $p$ CREATE POLICY "select_own_company_blueprint_pins" ON blueprint_pins FOR SELECT USING (company_id = my_company_id()) $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blueprint_pins' AND policyname = 'insert_own_company_blueprint_pins') THEN
    EXECUTE $p$ CREATE POLICY "insert_own_company_blueprint_pins" ON blueprint_pins FOR INSERT WITH CHECK (company_id = my_company_id()) $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blueprint_pins' AND policyname = 'update_own_company_blueprint_pins') THEN
    EXECUTE $p$ CREATE POLICY "update_own_company_blueprint_pins" ON blueprint_pins FOR UPDATE USING (company_id = my_company_id()) WITH CHECK (company_id = my_company_id()) $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'blueprint_pins' AND policyname = 'delete_own_company_blueprint_pins') THEN
    EXECUTE $p$ CREATE POLICY "delete_own_company_blueprint_pins" ON blueprint_pins FOR DELETE USING (company_id = my_company_id()) $p$;
  END IF;
END $$;

-- 3. Add blueprint_pins to realtime (skip if already a member)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'blueprint_pins'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE blueprint_pins';
  END IF;
END $$;

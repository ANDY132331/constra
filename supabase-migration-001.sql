-- Migration 001: blueprint_pins table + documents UPDATE policy
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql

-- 1. Add UPDATE policy for documents (needed by addDocumentVersion)
CREATE POLICY "update_own_company_documents" ON documents
  FOR UPDATE USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- 2. Create blueprint_pins table
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

CREATE POLICY "select_own_company_blueprint_pins" ON blueprint_pins
  FOR SELECT USING (company_id = my_company_id());
CREATE POLICY "insert_own_company_blueprint_pins" ON blueprint_pins
  FOR INSERT WITH CHECK (company_id = my_company_id());
CREATE POLICY "update_own_company_blueprint_pins" ON blueprint_pins
  FOR UPDATE USING (company_id = my_company_id()) WITH CHECK (company_id = my_company_id());
CREATE POLICY "delete_own_company_blueprint_pins" ON blueprint_pins
  FOR DELETE USING (company_id = my_company_id());

-- 3. Add blueprint_pins to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE blueprint_pins;

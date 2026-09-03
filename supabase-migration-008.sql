-- Migration 008: missing RLS policies for crew_messages delete
-- Safe to re-run. Paste into:
-- https://supabase.com/dashboard/project/twusgbelcyocbwnvricz/sql/new

-- Allow company members to delete their own company's messages.
-- Without this, deleteMessage() writes to local state but Supabase silently
-- rejects the DELETE → the message reappears on next load (sync bug).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crew_messages' AND policyname = 'msg_delete'
  ) THEN
    EXECUTE 'CREATE POLICY "msg_delete" ON crew_messages FOR DELETE USING (company_id = my_company_id())';
  END IF;
END $$;

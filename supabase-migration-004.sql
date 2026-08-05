-- Migration 004: Budget line items (cost codes)

CREATE TABLE IF NOT EXISTS public.budget_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code         text NOT NULL,
  description  text NOT NULL,
  category     text NOT NULL DEFAULT 'other',
  budgeted     numeric(12, 2) NOT NULL DEFAULT 0,
  actual       numeric(12, 2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast project-level lookups
CREATE INDEX IF NOT EXISTS budget_lines_company_id_idx ON public.budget_lines(company_id);
CREATE INDEX IF NOT EXISTS budget_lines_project_id_idx ON public.budget_lines(project_id);

-- Row-level security
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'budget_lines' AND policyname = 'budget_lines_company'
  ) THEN
    CREATE POLICY "budget_lines_company" ON public.budget_lines
      USING (company_id = public.my_company_id())
      WITH CHECK (company_id = public.my_company_id());
  END IF;
END $$;

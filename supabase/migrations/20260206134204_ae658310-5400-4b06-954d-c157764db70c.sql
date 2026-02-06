
-- Kanban columns table per company
CREATE TABLE public.kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  position INTEGER NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_kanban_columns_company ON public.kanban_columns(company_id);

-- Admin and members can manage columns
CREATE POLICY "Admin and members can view all kanban columns"
  ON public.kanban_columns FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Clients can view kanban columns of their companies"
  ON public.kanban_columns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_companies
      WHERE client_companies.user_id = auth.uid()
      AND client_companies.company_id = kanban_columns.company_id
    )
  );

CREATE POLICY "Admin and members can insert kanban columns"
  ON public.kanban_columns FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can update kanban columns"
  ON public.kanban_columns FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

CREATE POLICY "Admin and members can delete kanban columns"
  ON public.kanban_columns FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'member')
  );

-- Add kanban_column_id to leads (nullable for backwards compat)
ALTER TABLE public.leads ADD COLUMN kanban_column_id UUID REFERENCES public.kanban_columns(id) ON DELETE SET NULL;

CREATE INDEX idx_leads_kanban_column ON public.leads(kanban_column_id);


-- Adicionar campos de classificação automática do caso no lead
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS case_area text,
  ADD COLUMN IF NOT EXISTS case_subtype text,
  ADD COLUMN IF NOT EXISTS case_urgency text,
  ADD COLUMN IF NOT EXISTS case_estimated_value numeric,
  ADD COLUMN IF NOT EXISTS case_keywords text[],
  ADD COLUMN IF NOT EXISTS case_summary_short text,
  ADD COLUMN IF NOT EXISTS case_next_action text,
  ADD COLUMN IF NOT EXISTS case_confidence numeric,
  ADD COLUMN IF NOT EXISTS case_classified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS case_classified_by text;

CREATE INDEX IF NOT EXISTS idx_leads_case_area ON public.leads(case_area);
CREATE INDEX IF NOT EXISTS idx_leads_case_urgency ON public.leads(case_urgency);

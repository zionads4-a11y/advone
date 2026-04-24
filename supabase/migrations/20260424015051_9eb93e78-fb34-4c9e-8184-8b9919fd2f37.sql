ALTER TABLE public.company_bot_flows
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS case_type text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE UNIQUE INDEX IF NOT EXISTS company_bot_flows_unique_key
  ON public.company_bot_flows (company_id, niche, flow_key);
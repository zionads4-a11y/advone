ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS pending_data_warning text;

COMMENT ON COLUMN public.leads.pending_data_warning IS 'Aviso quando o bot agendou reunião sem dados completos (CPF ou nome completo). NULL = sem pendências.';
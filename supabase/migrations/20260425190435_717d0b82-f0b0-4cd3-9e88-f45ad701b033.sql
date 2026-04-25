-- Add service_mode to companies (full = CRM completo, ai_only = só IA + áreas de atuação)
ALTER TABLE public.companies
  ADD COLUMN service_mode text NOT NULL DEFAULT 'full';

ALTER TABLE public.companies
  ADD CONSTRAINT companies_service_mode_check
  CHECK (service_mode IN ('full', 'ai_only'));

COMMENT ON COLUMN public.companies.service_mode IS 'full = CRM completo, ai_only = apenas IA/secretária virtual + áreas de atuação';
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

COMMENT ON COLUMN public.companies.timezone IS 'Fuso horário do escritório (ex: America/Sao_Paulo, America/Manaus, America/Cuiaba)';
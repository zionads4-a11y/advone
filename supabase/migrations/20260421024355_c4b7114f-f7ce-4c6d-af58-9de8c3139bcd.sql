-- Add practice_specialty to companies (área de atuação do escritório)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS practice_specialty text NOT NULL DEFAULT 'previdenciario';

COMMENT ON COLUMN public.companies.practice_specialty IS 'Área de atuação do escritório: previdenciario | trabalhista | hibrido. Filtra templates de bot disponíveis.';

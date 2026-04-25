ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS job_title text;

COMMENT ON COLUMN public.profiles.job_title IS 'Cargo/função no escritório: advogado, estagiario, secretaria, financeiro, outro. Apenas rótulo visual — não controla permissões.';
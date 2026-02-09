
-- Add new fields to leads table
ALTER TABLE public.leads
ADD COLUMN processo_numero text NULL,
ADD COLUMN cpf text NULL,
ADD COLUMN processo_valor numeric NULL DEFAULT 0;

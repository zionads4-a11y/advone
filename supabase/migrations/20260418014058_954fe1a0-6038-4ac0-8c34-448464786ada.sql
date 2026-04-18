-- Adiciona o tipo de parceria por empresa
CREATE TYPE public.partnership_type AS ENUM ('exito', 'mensalidade_zionads');

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS partnership_type public.partnership_type NOT NULL DEFAULT 'mensalidade_zionads';

COMMENT ON COLUMN public.companies.partnership_type IS 'Tipo de parceria comercial da empresa: exito (comissão por contrato fechado) ou mensalidade_zionads (cliente da agência ZionAds com mensalidade fixa).';
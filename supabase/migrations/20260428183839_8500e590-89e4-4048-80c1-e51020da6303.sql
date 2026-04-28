-- Dados do(a) advogado(a) para contratos: no escritório (compartilhado) e no perfil (override individual)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS lawyer_name text,
  ADD COLUMN IF NOT EXISTS lawyer_oab text,
  ADD COLUMN IF NOT EXISTS lawyer_oab_uf text,
  ADD COLUMN IF NOT EXISTS lawyer_cpf text,
  ADD COLUMN IF NOT EXISTS lawyer_nationality text DEFAULT 'brasileiro(a)',
  ADD COLUMN IF NOT EXISTS lawyer_marital_status text,
  ADD COLUMN IF NOT EXISTS lawyer_email text,
  ADD COLUMN IF NOT EXISTS lawyer_phone text,
  ADD COLUMN IF NOT EXISTS office_legal_name text,
  ADD COLUMN IF NOT EXISTS office_cnpj text,
  ADD COLUMN IF NOT EXISTS office_address text,
  ADD COLUMN IF NOT EXISTS office_city text,
  ADD COLUMN IF NOT EXISTS office_state text,
  ADD COLUMN IF NOT EXISTS office_cep text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lawyer_name text,
  ADD COLUMN IF NOT EXISTS lawyer_oab text,
  ADD COLUMN IF NOT EXISTS lawyer_oab_uf text,
  ADD COLUMN IF NOT EXISTS lawyer_cpf text,
  ADD COLUMN IF NOT EXISTS lawyer_nationality text,
  ADD COLUMN IF NOT EXISTS lawyer_marital_status text;
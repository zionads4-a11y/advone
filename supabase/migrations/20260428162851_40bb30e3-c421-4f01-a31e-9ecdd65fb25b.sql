-- ============================================
-- FASE 1: Pasta Digital do Cliente
-- Expande leads com campos jurídicos + flag is_client
-- ============================================

-- 1. Adicionar campos jurídicos na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS nacionalidade TEXT DEFAULT 'Brasileira',
  ADD COLUMN IF NOT EXISTS endereco_rua TEXT,
  ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
  ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
  ADD COLUMN IF NOT EXISTS endereco_bairro TEXT,
  ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
  ADD COLUMN IF NOT EXISTS endereco_estado TEXT,
  ADD COLUMN IF NOT EXISTS endereco_cep TEXT,
  ADD COLUMN IF NOT EXISTS banco_nome TEXT,
  ADD COLUMN IF NOT EXISTS banco_agencia TEXT,
  ADD COLUMN IF NOT EXISTS banco_conta TEXT,
  ADD COLUMN IF NOT EXISTS banco_tipo_conta TEXT,
  ADD COLUMN IF NOT EXISTS banco_pix TEXT,
  ADD COLUMN IF NOT EXISTS area_direito TEXT,
  ADD COLUMN IF NOT EXISTS tipo_caso_detalhado TEXT,
  ADD COLUMN IF NOT EXISTS is_client BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS became_client_at TIMESTAMPTZ;

-- 2. Índice para busca rápida de clientes
CREATE INDEX IF NOT EXISTS idx_leads_is_client ON public.leads(company_id, is_client) WHERE is_client = true;

-- 3. Função: marcar lead como cliente quando entra em coluna "Ganho"
CREATE OR REPLACE FUNCTION public.auto_mark_lead_as_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_won_column BOOLEAN;
BEGIN
  -- Só processa se mudou de coluna
  IF NEW.kanban_column_id IS NULL OR NEW.kanban_column_id IS NOT DISTINCT FROM OLD.kanban_column_id THEN
    RETURN NEW;
  END IF;

  -- Verifica se a nova coluna é "Ganho"
  SELECT is_won INTO is_won_column
  FROM public.kanban_columns
  WHERE id = NEW.kanban_column_id;

  -- Se entrou em "Ganho" e ainda não é cliente → marca como cliente
  IF COALESCE(is_won_column, false) AND NOT COALESCE(NEW.is_client, false) THEN
    NEW.is_client := true;
    NEW.became_client_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger BEFORE UPDATE em leads
DROP TRIGGER IF EXISTS trg_auto_mark_lead_as_client ON public.leads;
CREATE TRIGGER trg_auto_mark_lead_as_client
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mark_lead_as_client();

-- 5. Backfill: leads que já estão em colunas "Ganho" viram clientes
UPDATE public.leads l
SET is_client = true,
    became_client_at = COALESCE(l.updated_at, now())
FROM public.kanban_columns kc
WHERE l.kanban_column_id = kc.id
  AND kc.is_won = true
  AND COALESCE(l.is_client, false) = false;
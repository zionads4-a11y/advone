-- ============================================
-- 1. COMMISSION SETTINGS (configuração por empresa)
-- ============================================
CREATE TABLE public.commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  commission_percentage NUMERIC NOT NULL DEFAULT 30.00,
  monthly_fee NUMERIC NOT NULL DEFAULT 397.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contract_terms_accepted BOOLEAN NOT NULL DEFAULT false,
  contract_terms_accepted_at TIMESTAMPTZ,
  contract_terms_accepted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commission settings"
ON public.commission_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage commission settings"
ON public.commission_settings FOR ALL
USING (has_role(auth.uid(), 'member'::app_role))
WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes view their commission settings"
ON public.commission_settings FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_commission_settings_updated_at
BEFORE UPDATE ON public.commission_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. CLOSED CONTRACTS (registro imutável)
-- ============================================
CREATE TABLE public.closed_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  zapsign_document_id UUID REFERENCES public.zapsign_documents(id),
  
  -- Dados do cliente final (críticos para rastreio)
  client_name TEXT NOT NULL,
  client_cpf TEXT NOT NULL,
  client_phone TEXT,
  
  -- Dados do processo (para Escavador)
  processo_cnj TEXT,
  processo_tipo TEXT, -- ex: "trabalhista", "previdenciario"
  
  -- Valores
  honorarios_estimados NUMERIC NOT NULL DEFAULT 0,
  honorarios_recebidos NUMERIC DEFAULT 0,
  commission_percentage NUMERIC NOT NULL DEFAULT 30.00,
  commission_due NUMERIC GENERATED ALWAYS AS (honorarios_recebidos * commission_percentage / 100) STORED,
  
  -- Status do processo (atualizado via Escavador)
  process_status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (process_status IN ('em_andamento', 'ganho', 'perdido', 'acordo', 'arquivado')),
  process_concluded_at TIMESTAMPTZ,
  
  -- Status do pagamento da comissão
  commission_status TEXT NOT NULL DEFAULT 'aguardando_exito' CHECK (commission_status IN ('aguardando_exito', 'cobranca_gerada', 'pago', 'inadimplente')),
  
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

CREATE INDEX idx_closed_contracts_company ON public.closed_contracts(company_id);
CREATE INDEX idx_closed_contracts_cpf ON public.closed_contracts(client_cpf);
CREATE INDEX idx_closed_contracts_processo ON public.closed_contracts(processo_cnj) WHERE processo_cnj IS NOT NULL;
CREATE INDEX idx_closed_contracts_status ON public.closed_contracts(process_status, commission_status);

ALTER TABLE public.closed_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access closed contracts"
ON public.closed_contracts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members full access closed contracts"
ON public.closed_contracts FOR ALL
USING (has_role(auth.uid(), 'member'::app_role))
WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes view their closed contracts"
ON public.closed_contracts FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Gerentes insert their closed contracts"
ON public.closed_contracts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- IMPORTANT: Gerentes NUNCA podem editar/deletar contratos (registro imutável)
-- Apenas admins/members podem alterar status do processo

CREATE TRIGGER update_closed_contracts_updated_at
BEFORE UPDATE ON public.closed_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. COMMISSION CHARGES (cobranças no Asaas)
-- ============================================
CREATE TABLE public.commission_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  closed_contract_id UUID NOT NULL REFERENCES public.closed_contracts(id) ON DELETE RESTRICT,
  
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  asaas_payment_id TEXT,
  asaas_invoice_url TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_charges_company ON public.commission_charges(company_id);
CREATE INDEX idx_commission_charges_status ON public.commission_charges(status);

ALTER TABLE public.commission_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commission charges"
ON public.commission_charges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage commission charges"
ON public.commission_charges FOR ALL
USING (has_role(auth.uid(), 'member'::app_role))
WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes view their commission charges"
ON public.commission_charges FOR SELECT
USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_commission_charges_updated_at
BEFORE UPDATE ON public.commission_charges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. FRAUD ALERTS (detecção de fechamento por fora)
-- ============================================
CREATE TABLE public.fraud_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN ('hot_lead_lost', 'cpf_match_external', 'long_conversation_lost', 'manual_review')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'confirmed_fraud', 'false_positive', 'resolved')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_alerts_company ON public.fraud_alerts(company_id);
CREATE INDEX idx_fraud_alerts_status ON public.fraud_alerts(status, severity);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- APENAS admins/members veem alertas (clientes NÃO podem ver)
CREATE POLICY "Admins manage fraud alerts"
ON public.fraud_alerts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage fraud alerts"
ON public.fraud_alerts FOR ALL
USING (has_role(auth.uid(), 'member'::app_role))
WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE TRIGGER update_fraud_alerts_updated_at
BEFORE UPDATE ON public.fraud_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5. ATUALIZAÇÕES NA TABELA LEADS
-- ============================================
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS cpf_cliente_final TEXT,
ADD COLUMN IF NOT EXISTS honorarios_estimados NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_cpf_cliente_final ON public.leads(cpf_cliente_final) WHERE cpf_cliente_final IS NOT NULL;

-- ============================================
-- 6. TRIGGER: BLOQUEIA MOVER LEAD PARA "GANHO" SEM CONTRATO
-- ============================================
CREATE OR REPLACE FUNCTION public.enforce_won_requires_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_won_column BOOLEAN;
  has_contract BOOLEAN;
  is_admin_or_member BOOLEAN;
BEGIN
  -- Admins e members ignoram a trava
  is_admin_or_member := has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role);
  IF is_admin_or_member THEN
    RETURN NEW;
  END IF;

  -- Só valida se mudou de coluna
  IF NEW.kanban_column_id IS NULL OR NEW.kanban_column_id = COALESCE(OLD.kanban_column_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  -- Verifica se a nova coluna é uma coluna de "Ganho"
  SELECT is_won INTO is_won_column
  FROM public.kanban_columns
  WHERE id = NEW.kanban_column_id;

  IF is_won_column IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Validação 1: precisa ter CPF do cliente final
  IF NEW.cpf_cliente_final IS NULL OR length(trim(NEW.cpf_cliente_final)) < 11 THEN
    RAISE EXCEPTION 'CPF_REQUIRED: Para mover este lead para "Ganho", é obrigatório cadastrar o CPF do cliente final.';
  END IF;

  -- Validação 2: precisa ter contrato fechado registrado
  SELECT EXISTS (
    SELECT 1 FROM public.closed_contracts
    WHERE lead_id = NEW.id
  ) INTO has_contract;

  IF NOT has_contract THEN
    RAISE EXCEPTION 'CONTRACT_REQUIRED: Para mover este lead para "Ganho", é obrigatório registrar o contrato assinado primeiro.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_won_requires_contract
BEFORE UPDATE OF kanban_column_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_won_requires_contract();

-- ============================================
-- 7. TRIGGER: DETECTA "HOT LEAD LOST" (alerta de fraude)
-- ============================================
CREATE OR REPLACE FUNCTION public.detect_hot_lead_lost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_lost_column BOOLEAN;
  msg_count INTEGER;
BEGIN
  -- Só dispara se mudou de coluna
  IF NEW.kanban_column_id IS NULL OR NEW.kanban_column_id = COALESCE(OLD.kanban_column_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN NEW;
  END IF;

  -- Verifica se a nova coluna é "Perdido"
  SELECT is_lost INTO is_lost_column
  FROM public.kanban_columns
  WHERE id = NEW.kanban_column_id;

  IF is_lost_column IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Conta mensagens trocadas
  SELECT COUNT(*) INTO msg_count
  FROM public.whatsapp_messages
  WHERE lead_id = NEW.id;

  -- Lead "quente" + mais de 5 mensagens = suspeito
  IF NEW.lead_score = 'quente' OR msg_count > 5 THEN
    INSERT INTO public.fraud_alerts (
      company_id, lead_id, alert_type, severity, title, description, evidence
    ) VALUES (
      NEW.company_id,
      NEW.id,
      'hot_lead_lost',
      CASE WHEN NEW.lead_score = 'quente' AND msg_count > 5 THEN 'high' ELSE 'medium' END,
      'Lead promissor marcado como Perdido',
      format('Lead "%s" foi marcado como perdido após %s mensagens trocadas. Score: %s. Investigar possível fechamento por fora.', NEW.name, msg_count, COALESCE(NEW.lead_score, 'n/d')),
      jsonb_build_object(
        'lead_score', NEW.lead_score,
        'message_count', msg_count,
        'lead_name', NEW.name,
        'lead_phone', NEW.phone,
        'lead_cpf', NEW.cpf_cliente_final,
        'previous_column_id', OLD.kanban_column_id,
        'new_column_id', NEW.kanban_column_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_hot_lead_lost
AFTER UPDATE OF kanban_column_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.detect_hot_lead_lost();

-- ============================================
-- 8. SEED: Cria settings padrão para empresas existentes
-- ============================================
INSERT INTO public.commission_settings (company_id, commission_percentage, monthly_fee)
SELECT id, 30.00, 397.00
FROM public.companies
ON CONFLICT (company_id) DO NOTHING;
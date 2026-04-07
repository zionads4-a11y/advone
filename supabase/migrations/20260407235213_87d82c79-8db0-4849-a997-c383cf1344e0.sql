
-- Tabela de configuração Asaas por empresa
CREATE TABLE public.asaas_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.asaas_configs ENABLE ROW LEVEL SECURITY;

-- Apenas gerentes da empresa podem gerenciar
CREATE POLICY "Gerentes can manage asaas configs" ON public.asaas_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can manage asaas configs" ON public.asaas_configs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de transações financeiras
CREATE TABLE public.financial_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payable', 'receivable')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  category TEXT,
  asaas_payment_id TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gerentes can manage financial transactions" ON public.financial_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins can manage financial transactions" ON public.financial_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asaas_configs_updated_at
  BEFORE UPDATE ON public.asaas_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

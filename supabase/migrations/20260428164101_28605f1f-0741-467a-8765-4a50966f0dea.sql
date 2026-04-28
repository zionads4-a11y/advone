-- Acordos do cliente
CREATE TABLE public.client_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Acordo',
  description TEXT,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  fee_percentage NUMERIC(6,2) NOT NULL DEFAULT 30,
  fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  client_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'avista', -- avista | parcelado
  installments_count INTEGER NOT NULL DEFAULT 1,
  first_due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active | completed | canceled
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agreements"
  ON public.client_agreements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage agreements"
  ON public.client_agreements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their agreements"
  ON public.client_agreements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users view agreements"
  ON public.client_agreements FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_client_agreements_updated_at
  BEFORE UPDATE ON public.client_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agreements_company ON public.client_agreements(company_id);
CREATE INDEX idx_agreements_lead ON public.client_agreements(lead_id);

-- Parcelas do acordo
CREATE TABLE public.agreement_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  agreement_id UUID NOT NULL REFERENCES public.client_agreements(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | overdue | canceled
  paid_at TIMESTAMPTZ,
  asaas_payment_id TEXT,
  asaas_invoice_url TEXT,
  financial_transaction_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agreement_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage installments"
  ON public.agreement_installments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage installments"
  ON public.agreement_installments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their installments"
  ON public.agreement_installments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users view installments"
  ON public.agreement_installments FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_agreement_installments_updated_at
  BEFORE UPDATE ON public.agreement_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_installments_agreement ON public.agreement_installments(agreement_id);
CREATE INDEX idx_installments_company ON public.agreement_installments(company_id);
CREATE INDEX idx_installments_status ON public.agreement_installments(status);

-- Quando uma parcela é marcada como paga, registra receita no financeiro
CREATE OR REPLACE FUNCTION public.handle_installment_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_agreement_title TEXT;
  v_tx_id UUID;
BEGIN
  IF NEW.status = 'paid' AND COALESCE(OLD.status,'') <> 'paid' THEN
    -- evita duplicar
    IF NEW.financial_transaction_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    SELECT lead_id, title INTO v_lead_id, v_agreement_title
      FROM public.client_agreements WHERE id = NEW.agreement_id;

    INSERT INTO public.financial_transactions (
      company_id, type, description, amount, due_date, paid_date,
      status, category, lead_id, asaas_payment_id, created_by
    ) VALUES (
      NEW.company_id, 'income',
      COALESCE(v_agreement_title,'Honorários') || ' — Parcela ' || NEW.installment_number,
      NEW.amount, NEW.due_date,
      COALESCE(NEW.paid_at::date, CURRENT_DATE),
      'paid', 'honorarios_acordo', v_lead_id, NEW.asaas_payment_id,
      COALESCE(auth.uid(), (SELECT created_by FROM public.client_agreements WHERE id = NEW.agreement_id))
    ) RETURNING id INTO v_tx_id;

    NEW.financial_transaction_id := v_tx_id;
    IF NEW.paid_at IS NULL THEN NEW.paid_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_installment_paid
  BEFORE UPDATE ON public.agreement_installments
  FOR EACH ROW EXECUTE FUNCTION public.handle_installment_paid();

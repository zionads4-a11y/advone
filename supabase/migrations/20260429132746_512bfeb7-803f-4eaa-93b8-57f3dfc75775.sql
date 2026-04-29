CREATE TABLE IF NOT EXISTS public.process_monitoring_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  invoice_month TEXT NOT NULL,
  process_count INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 3.50,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  asaas_payment_id TEXT,
  asaas_invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT process_monitoring_charges_unique UNIQUE (company_id, invoice_month)
);

ALTER TABLE public.process_monitoring_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage process monitoring charges"
  ON public.process_monitoring_charges
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage process monitoring charges"
  ON public.process_monitoring_charges
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes view their process monitoring charges"
  ON public.process_monitoring_charges
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER set_process_monitoring_charges_updated_at
  BEFORE UPDATE ON public.process_monitoring_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pmc_company_month ON public.process_monitoring_charges (company_id, invoice_month);
CREATE TABLE IF NOT EXISTS public.process_billing_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  company_id UUID,
  invoice_month TEXT NOT NULL,
  total_processes INTEGER,
  total_amount NUMERIC(10,2),
  status TEXT NOT NULL,
  asaas_payment_id TEXT,
  error_message TEXT,
  details JSONB,
  triggered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pba_logs_run ON public.process_billing_audit_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_pba_logs_company_month ON public.process_billing_audit_logs(company_id, invoice_month);
CREATE INDEX IF NOT EXISTS idx_pba_logs_created ON public.process_billing_audit_logs(created_at DESC);

ALTER TABLE public.process_billing_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all process billing audit logs"
ON public.process_billing_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Managers can view their company audit logs"
ON public.process_billing_audit_logs
FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL
  AND public.has_role(auth.uid(), 'gerente'::app_role)
  AND public.user_belongs_to_company(auth.uid(), company_id)
);
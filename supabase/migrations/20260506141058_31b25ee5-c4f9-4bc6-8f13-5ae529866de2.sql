
CREATE TABLE public.lead_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  value numeric(12,2) NOT NULL DEFAULT 697,
  cycle text NOT NULL DEFAULT 'MONTHLY',
  billing_type text NOT NULL DEFAULT 'UNDEFINED',
  status text NOT NULL DEFAULT 'pending',
  asaas_customer_id text,
  asaas_subscription_id text,
  invoice_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_subscriptions_lead ON public.lead_subscriptions(lead_id);
CREATE INDEX idx_lead_subscriptions_company ON public.lead_subscriptions(company_id);
CREATE INDEX idx_lead_subscriptions_asaas_sub ON public.lead_subscriptions(asaas_subscription_id);

ALTER TABLE public.lead_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_subs read by company"
  ON public.lead_subscriptions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "lead_subs insert by company"
  ON public.lead_subscriptions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "lead_subs update by company"
  ON public.lead_subscriptions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_lead_subscriptions_updated_at
  BEFORE UPDATE ON public.lead_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

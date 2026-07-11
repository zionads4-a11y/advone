CREATE TABLE public.subscription_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approver_role TEXT NOT NULL,
  plan TEXT NOT NULL,
  original_value NUMERIC(10,2) NOT NULL,
  discounted_value NUMERIC(10,2) NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(6,2) NOT NULL,
  reason TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.subscription_discounts TO authenticated;
GRANT ALL ON public.subscription_discounts TO service_role;

ALTER TABLE public.subscription_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and members can view all discounts"
  ON public.subscription_discounts FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'member'::app_role)
  );

CREATE POLICY "Requester can view own discount records"
  ON public.subscription_discounts FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid() OR approver_user_id = auth.uid());

CREATE INDEX idx_subscription_discounts_company ON public.subscription_discounts(company_id);
CREATE INDEX idx_subscription_discounts_approver ON public.subscription_discounts(approver_user_id);
CREATE INDEX idx_subscription_discounts_created ON public.subscription_discounts(created_at DESC);
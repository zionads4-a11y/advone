
CREATE TABLE public.monitoring_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  processes_per_package INTEGER NOT NULL DEFAULT 20,
  value NUMERIC NOT NULL DEFAULT 97,
  status TEXT NOT NULL DEFAULT 'pending',
  asaas_payment_id TEXT,
  asaas_subscription_id TEXT,
  asaas_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all monitoring packages"
ON public.monitoring_packages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes can view their company packages"
ON public.monitoring_packages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Gerentes can insert packages for their company"
ON public.monitoring_packages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_monitoring_packages_updated_at
BEFORE UPDATE ON public.monitoring_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

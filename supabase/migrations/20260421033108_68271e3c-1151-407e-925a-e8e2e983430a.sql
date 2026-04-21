-- Tabela de endereços físicos por empresa
CREATE TABLE public.company_offices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  complement TEXT,
  reference_point TEXT,
  maps_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_offices_company ON public.company_offices(company_id);

ALTER TABLE public.company_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage company offices"
ON public.company_offices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage company offices"
ON public.company_offices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'member'::app_role))
WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their company offices"
ON public.company_offices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members view offices"
ON public.company_offices FOR SELECT TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_company_offices_updated_at
BEFORE UPDATE ON public.company_offices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
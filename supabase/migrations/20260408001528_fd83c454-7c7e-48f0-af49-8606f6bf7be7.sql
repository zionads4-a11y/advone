
-- Create cases table
CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  case_number text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage cases" ON public.cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gerentes can manage cases" ON public.cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') AND public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') AND public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Operadores can view cases" ON public.cases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'operador') AND public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Operadores can insert cases" ON public.cases
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'operador') AND public.user_belongs_to_company(auth.uid(), company_id));

-- Add case_id to documents table
ALTER TABLE public.documents ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

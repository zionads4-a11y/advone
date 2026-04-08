
CREATE TABLE public.case_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  movement_type TEXT NOT NULL DEFAULT 'update',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.case_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage case movements"
  ON public.case_movements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes can manage case movements"
  ON public.case_movements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Operadores can view case movements"
  ON public.case_movements FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Operadores can insert case movements"
  ON public.case_movements FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

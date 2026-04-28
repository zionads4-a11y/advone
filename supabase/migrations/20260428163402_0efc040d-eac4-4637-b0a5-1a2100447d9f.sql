-- Tabela de templates de documentos
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  content TEXT NOT NULL DEFAULT '',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage document templates"
  ON public.document_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage document templates"
  ON public.document_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their document templates"
  ON public.document_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users view document templates"
  ON public.document_templates FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_document_templates_company ON public.document_templates(company_id);

-- Tabela de documentos gerados
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  template_id UUID,
  lead_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  variables_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage generated documents"
  ON public.generated_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage generated documents"
  ON public.generated_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their generated documents"
  ON public.generated_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Operadores manage their generated documents"
  ON public.generated_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE INDEX idx_generated_documents_company ON public.generated_documents(company_id);
CREATE INDEX idx_generated_documents_lead ON public.generated_documents(lead_id);

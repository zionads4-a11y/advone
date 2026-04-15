
-- ZapSign configuration per company
CREATE TABLE public.zapsign_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  api_token TEXT NOT NULL,
  sandbox BOOLEAN NOT NULL DEFAULT false,
  default_template_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.zapsign_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zapsign configs" ON public.zapsign_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes can manage their company zapsign configs" ON public.zapsign_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members can manage zapsign configs" ON public.zapsign_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

-- ZapSign documents tracking
CREATE TABLE public.zapsign_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  zapsign_doc_id TEXT NOT NULL,
  zapsign_doc_token TEXT,
  document_name TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_phone TEXT,
  sign_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMP WITH TIME ZONE,
  sent_via_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.zapsign_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zapsign documents" ON public.zapsign_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes can manage their company zapsign documents" ON public.zapsign_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Operadores can view their company zapsign documents" ON public.zapsign_documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operador'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members can manage zapsign documents" ON public.zapsign_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_zapsign_configs_updated_at BEFORE UPDATE ON public.zapsign_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zapsign_documents_updated_at BEFORE UPDATE ON public.zapsign_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

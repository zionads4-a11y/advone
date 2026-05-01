-- Fix 1: zapsign_documents — escopo por company_id para members
DROP POLICY IF EXISTS "Members can manage zapsign documents" ON public.zapsign_documents;
CREATE POLICY "Members manage zapsign documents (company scoped)"
ON public.zapsign_documents
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  OR (public.has_role(auth.uid(), 'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  OR (public.has_role(auth.uid(), 'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
);

-- Fix 2: company_bot_agents — escopo por company_id para members
DROP POLICY IF EXISTS "Members can manage bot agents" ON public.company_bot_agents;
CREATE POLICY "Members manage bot agents (company scoped)"
ON public.company_bot_agents
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  OR (public.has_role(auth.uid(), 'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'member'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  OR (public.has_role(auth.uid(), 'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
);

-- Fix 3: process_billing_audit_logs — separar admin (global) de member/gerente (escopo)
DROP POLICY IF EXISTS "Admins can view all process billing audit logs" ON public.process_billing_audit_logs;
CREATE POLICY "Admins view all process billing audit logs"
ON public.process_billing_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members view their company process billing audit logs"
ON public.process_billing_audit_logs
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'member'::app_role) OR public.has_role(auth.uid(), 'gerente'::app_role))
  AND public.user_belongs_to_company(auth.uid(), company_id)
);

-- Fix 4: storage.documents — remover policy duplicada de gerente sem escopo
DROP POLICY IF EXISTS "Admins and gerentes can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents (any company)"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 5: whatsapp-media — adicionar policy UPDATE com escopo por company
CREATE POLICY "whatsapp-media company scoped update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whatsapp-media' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
)
WITH CHECK (
  bucket_id = 'whatsapp-media' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);
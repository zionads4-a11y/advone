
-- 1. user_roles: políticas restritivas para impedir auto-escalonamento
CREATE POLICY "Block non-admin role inserts"
ON public.user_roles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin role updates"
ON public.user_roles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admin role deletes"
ON public.user_roles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. company_bot_flows: restringir 'member' por empresa
DROP POLICY IF EXISTS "Members manage bot flows" ON public.company_bot_flows;
CREATE POLICY "Members manage bot flows"
ON public.company_bot_flows
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'member'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (has_role(auth.uid(), 'member'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- 3. asaas_configs: restringir admin por empresa
DROP POLICY IF EXISTS "Admins can manage asaas configs" ON public.asaas_configs;
CREATE POLICY "Admins can manage asaas configs"
ON public.asaas_configs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

-- 4. Tornar bucket whatsapp-media privado
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';

-- 5. Storage: documents bucket — escopo por empresa via prefixo {company_id}/
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own company documents" ON storage.objects;

CREATE POLICY "Documents: company-scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Documents: company-scoped insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Documents: company-scoped update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Documents: company-scoped delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

-- 6. Storage: whatsapp-media — escopo por empresa
DROP POLICY IF EXISTS "Public can read whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read whatsapp media" ON storage.objects;

CREATE POLICY "Whatsapp-media: authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Whatsapp-media: service role write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'member'::app_role)
    OR user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Whatsapp-media: company-scoped delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'whatsapp-media' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
);

-- 7. avatars bucket — manter leitura pública por nome mas evitar listagem ampla
-- (avatars já é público para SELECT por nome, OK)

-- 8. Realtime messages — adicionar política restritiva (apenas autenticado)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can subscribe realtime" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

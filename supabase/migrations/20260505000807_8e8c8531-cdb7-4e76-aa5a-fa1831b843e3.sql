
-- Lock down asaas_configs: API key is server-side only
DROP POLICY IF EXISTS "asaas_configs admin only" ON public.asaas_configs;

-- Read non-secret fields: company members (managers/operators) + admins
CREATE POLICY "asaas_configs read by company members"
ON public.asaas_configs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR user_belongs_to_company(auth.uid(), company_id)
);

-- No client-side writes; only service_role (edge functions) can write
-- (no INSERT/UPDATE/DELETE policies = denied for authenticated/anon)

-- Revoke direct column access to the secret api_key from clients
REVOKE SELECT (api_key) ON public.asaas_configs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.asaas_configs FROM anon, authenticated;

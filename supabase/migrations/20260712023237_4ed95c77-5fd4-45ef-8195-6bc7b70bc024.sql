
-- 1) Fix cross-tenant exposure on google_calendar_webhook_logs
DROP POLICY IF EXISTS "Admins and managers can view webhook logs" ON public.google_calendar_webhook_logs;

CREATE POLICY "Admins and managers can view webhook logs"
ON public.google_calendar_webhook_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'member'::app_role)
  OR (
    public.has_role(auth.uid(), 'gerente'::app_role)
    AND EXISTS (
      SELECT 1
      FROM public.client_companies cc_gerente
      JOIN public.client_companies cc_owner
        ON cc_owner.company_id = cc_gerente.company_id
      WHERE cc_gerente.user_id = auth.uid()
        AND cc_owner.user_id = google_calendar_webhook_logs.user_id
    )
  )
);

-- 2) Revoke EXECUTE from anon/PUBLIC on all SECURITY DEFINER functions in public schema.
--    Keep authenticated + service_role able to call them (RLS / in-function checks still apply).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',   r.nspname, r.proname, r.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %I.%I(%s) TO service_role',  r.nspname, r.proname, r.args);
  END LOOP;
END $$;

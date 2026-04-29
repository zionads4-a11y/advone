
-- 1) Revogar EXECUTE público de TODAS as funções SECURITY DEFINER
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated;',
                   fn.nspname, fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role;',
                   fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- Re-conceder EXECUTE para funções usadas em RLS por usuários logados
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_has_module(uuid, uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.company_has_legal_ai_access(uuid) TO authenticated, anon;

-- 2) Fixar search_path
ALTER FUNCTION public.handle_calendar_sync_trigger() SET search_path = public;

-- 3) Endurecer policies permissivas
DROP POLICY IF EXISTS "Anyone can submit landing IA lead" ON public.landing_ia_leads;
CREATE POLICY "Anyone can submit landing IA lead"
ON public.landing_ia_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL AND length(trim(name)) > 0 AND length(name) <= 200
  AND (email IS NULL OR length(email) <= 320)
  AND (whatsapp IS NULL OR length(whatsapp) <= 30)
  AND (message IS NULL OR length(message) <= 2000)
);

DROP POLICY IF EXISTS "Company users can update process movements" ON public.process_movements;
CREATE POLICY "Company users can update process movements"
ON public.process_movements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.monitored_processes mp
    WHERE mp.id = process_movements.monitored_process_id
      AND public.user_belongs_to_company(auth.uid(), mp.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.monitored_processes mp
    WHERE mp.id = process_movements.monitored_process_id
      AND public.user_belongs_to_company(auth.uid(), mp.company_id)
  )
);

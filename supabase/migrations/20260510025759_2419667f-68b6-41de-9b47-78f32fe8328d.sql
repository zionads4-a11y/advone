CREATE OR REPLACE FUNCTION public.company_has_legal_ai_access(_company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _company_id
      AND (partnership_type = 'mensalidade_zionads' OR billing_model = 'plan_free')
  )
$function$;
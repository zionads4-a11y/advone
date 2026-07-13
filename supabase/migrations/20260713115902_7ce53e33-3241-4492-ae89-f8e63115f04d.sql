
-- Fix 1: Restrict kanban_columns write access to admin/member/gerente only (cliente/operador read-only)
DROP POLICY IF EXISTS "Users can insert kanban columns for their companies" ON public.kanban_columns;
DROP POLICY IF EXISTS "Users can update kanban columns of their companies" ON public.kanban_columns;

CREATE POLICY "Gerentes can insert kanban columns for their companies"
ON public.kanban_columns
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'gerente'::app_role) OR public.has_role(auth.uid(), 'member'::app_role))
  AND public.user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "Gerentes can update kanban columns of their companies"
ON public.kanban_columns
FOR UPDATE
TO authenticated
USING (
  (public.has_role(auth.uid(), 'gerente'::app_role) OR public.has_role(auth.uid(), 'member'::app_role))
  AND public.user_belongs_to_company(auth.uid(), company_id)
)
WITH CHECK (
  (public.has_role(auth.uid(), 'gerente'::app_role) OR public.has_role(auth.uid(), 'member'::app_role))
  AND public.user_belongs_to_company(auth.uid(), company_id)
);

-- Fix 2: Prevent users from self-modifying sensitive profile fields
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change anything
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block self-changes to sensitive access-control fields
  IF NEW.operator_profile IS DISTINCT FROM OLD.operator_profile THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administradores podem alterar operator_profile';
  END IF;

  IF NEW.is_internal_staff IS DISTINCT FROM OLD.is_internal_staff THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administradores podem alterar is_internal_staff';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_sensitive_self_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();

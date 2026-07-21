
DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();

CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.operator_profile IS NOT NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administradores podem definir operator_profile';
  END IF;
  IF COALESCE(NEW.is_internal_staff, false) = true THEN
    RAISE EXCEPTION 'FORBIDDEN: apenas administradores podem definir is_internal_staff';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_insert ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (current_setting('role', true) <> 'supabase_admin')
EXECUTE FUNCTION public.prevent_profile_sensitive_self_insert();

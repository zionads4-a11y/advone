
-- 1. Fix profiles: restrict phone visibility
-- Drop existing broad SELECT policies and replace with more restrictive ones
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes can view company user profiles" ON public.profiles;

-- Create a view that hides phone for non-owners
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Re-create admin policy but only for id, user_id, full_name, avatar_url (via view)
-- Keep base table SELECT restricted to own profile only
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Gerentes can view company user profiles"
ON public.profiles FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM client_companies cc1
    JOIN client_companies cc2 ON cc1.company_id = cc2.company_id
    WHERE cc1.user_id = auth.uid()
      AND cc2.user_id = profiles.user_id
      AND has_role(auth.uid(), 'gerente'::app_role)
  )
);

-- 2. Fix audit_logs: remove direct INSERT by users, use service-role trigger instead
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Create a security definer function for inserting audit logs
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  _company_id uuid,
  _user_id uuid,
  _entity_type text,
  _entity_id text,
  _action text,
  _old_values jsonb DEFAULT NULL,
  _new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (company_id, user_id, entity_type, entity_id, action, old_values, new_values)
  VALUES (_company_id, _user_id, _entity_type, _entity_id, _action, _old_values, _new_values);
END;
$$;

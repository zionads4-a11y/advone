-- Create a security definer function to check if a user belongs to a company
-- This avoids RLS recursion when used in policies on client_companies itself
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_companies
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Gerentes can view their company users" ON public.client_companies;

-- Recreate it using the security definer function (no recursion)
CREATE POLICY "Gerentes can view their company users"
ON public.client_companies
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gerente'::app_role)
  AND user_belongs_to_company(auth.uid(), company_id)
);
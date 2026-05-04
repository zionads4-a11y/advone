-- Revoke anon EXECUTE on SECURITY DEFINER helper functions used in RLS
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_module(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.company_has_legal_ai_access(uuid) FROM anon;
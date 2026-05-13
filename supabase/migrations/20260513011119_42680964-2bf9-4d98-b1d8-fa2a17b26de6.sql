CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.find_client_by_name(_company_id UUID, _search_name TEXT)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, name
  FROM public.leads
  WHERE company_id = _company_id
    AND is_client = true
    -- Remove acentos, espaços extras e busca parcial
    AND (
      unaccent(lower(name)) ILIKE unaccent(lower('%' || trim(regexp_replace(_search_name, '\s+', ' ', 'g')) || '%'))
      OR
      unaccent(lower('%' || trim(regexp_replace(_search_name, '\s+', ' ', 'g')) || '%')) ILIKE unaccent(lower(name))
    )
  ORDER BY created_at DESC
  LIMIT 1;
$$;
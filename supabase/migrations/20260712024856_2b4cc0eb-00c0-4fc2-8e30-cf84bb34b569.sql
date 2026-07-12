-- Marca no profile quem é do time interno AdvOne
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_internal_staff boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS internal_job_title text;

-- Permissões granulares do time interno
CREATE TABLE IF NOT EXISTS public.internal_staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_staff_permissions TO authenticated;
GRANT ALL ON public.internal_staff_permissions TO service_role;

ALTER TABLE public.internal_staff_permissions ENABLE ROW LEVEL SECURITY;

-- Só admins gerenciam; cada usuário pode ler as próprias permissões
CREATE POLICY "Admins manage internal staff permissions"
ON public.internal_staff_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own internal permissions"
ON public.internal_staff_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_internal_staff_permissions_updated_at
BEFORE UPDATE ON public.internal_staff_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função auxiliar para checar permissão interna
CREATE OR REPLACE FUNCTION public.user_has_internal_module(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.internal_staff_permissions
    WHERE user_id = _user_id AND module = _module AND granted = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_has_internal_module(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_internal_module(uuid, text) TO authenticated, service_role;
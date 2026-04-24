
CREATE TABLE IF NOT EXISTS public.google_oauth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  redirect_uri text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_oauth_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members and admins view gcal credentials"
  ON public.google_oauth_credentials FOR SELECT
  USING (user_belongs_to_company(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company members and admins insert gcal credentials"
  ON public.google_oauth_credentials FOR INSERT
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company members and admins update gcal credentials"
  ON public.google_oauth_credentials FOR UPDATE
  USING (user_belongs_to_company(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company members and admins delete gcal credentials"
  ON public.google_oauth_credentials FOR DELETE
  USING (user_belongs_to_company(auth.uid(), company_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_gcal_credentials_updated_at
  BEFORE UPDATE ON public.google_oauth_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

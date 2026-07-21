
ALTER TABLE public.whatsapp_configs 
  ADD COLUMN IF NOT EXISTS meta_onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_business_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_quality_rating TEXT,
  ADD COLUMN IF NOT EXISTS meta_messaging_limit TEXT,
  ADD COLUMN IF NOT EXISTS meta_health_checked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.meta_phone_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT,
  quality_rating TEXT,
  messaging_limit TEXT,
  name_status TEXT,
  verified_name TEXT,
  raw JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_phone_health_company ON public.meta_phone_health(company_id, checked_at DESC);

GRANT SELECT ON public.meta_phone_health TO authenticated;
GRANT ALL ON public.meta_phone_health TO service_role;

ALTER TABLE public.meta_phone_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and company members view meta health"
  ON public.meta_phone_health FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'member'::app_role)
    OR public.user_belongs_to_company(auth.uid(), company_id)
  );

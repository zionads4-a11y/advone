
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'uazapi',
  ADD COLUMN IF NOT EXISTS meta_phone_number_id text,
  ADD COLUMN IF NOT EXISTS meta_waba_id text,
  ADD COLUMN IF NOT EXISTS meta_access_token text,
  ADD COLUMN IF NOT EXISTS meta_app_id text,
  ADD COLUMN IF NOT EXISTS meta_app_secret text,
  ADD COLUMN IF NOT EXISTS meta_verify_token text,
  ADD COLUMN IF NOT EXISTS meta_business_id text;

ALTER TABLE public.whatsapp_configs
  DROP CONSTRAINT IF EXISTS whatsapp_configs_provider_check;
ALTER TABLE public.whatsapp_configs
  ADD CONSTRAINT whatsapp_configs_provider_check
  CHECK (provider IN ('uazapi','meta_cloud'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_provider
  ON public.whatsapp_configs (provider);

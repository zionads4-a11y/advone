ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS watch_channel_id text,
  ADD COLUMN IF NOT EXISTS watch_resource_id text,
  ADD COLUMN IF NOT EXISTS watch_expiration timestamptz,
  ADD COLUMN IF NOT EXISTS watch_token text,
  ADD COLUMN IF NOT EXISTS sync_token text;

CREATE INDEX IF NOT EXISTS idx_user_integrations_watch_channel ON public.user_integrations(watch_channel_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_watch_expiration ON public.user_integrations(watch_expiration) WHERE watch_expiration IS NOT NULL;
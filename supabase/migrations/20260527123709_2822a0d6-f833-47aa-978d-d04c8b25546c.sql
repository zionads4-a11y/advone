ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ai_disabled BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS ai_disabled BOOLEAN DEFAULT false;

-- No new tables, so no new grants needed for the columns themselves if standard grants exist.
-- But ensuring roles can access them:
GRANT SELECT, UPDATE ON public.companies TO authenticated;
GRANT SELECT, UPDATE ON public.whatsapp_configs TO authenticated;

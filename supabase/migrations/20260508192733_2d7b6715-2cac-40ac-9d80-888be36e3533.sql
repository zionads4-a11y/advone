ALTER TABLE public.whatsapp_configs 
ADD COLUMN IF NOT EXISTS check_client_status BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.whatsapp_configs.check_client_status IS 'Whether the AI should try to identify existing clients and handle process status requests.';
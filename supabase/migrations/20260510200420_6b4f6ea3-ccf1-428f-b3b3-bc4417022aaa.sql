
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS shared_whatsapp_number boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_support_responsible_phone text;

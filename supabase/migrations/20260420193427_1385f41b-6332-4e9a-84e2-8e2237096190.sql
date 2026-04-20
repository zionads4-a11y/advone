
-- Auto-fill alert_whatsapp from company.whatsapp when WhatsApp config is created/updated
CREATE OR REPLACE FUNCTION public.set_default_alert_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_phone text;
BEGIN
  -- Only set when alert_whatsapp is empty/null
  IF NEW.alert_whatsapp IS NULL OR length(trim(NEW.alert_whatsapp)) = 0 THEN
    SELECT whatsapp INTO company_phone FROM public.companies WHERE id = NEW.company_id;
    IF company_phone IS NOT NULL AND length(trim(company_phone)) > 0 THEN
      NEW.alert_whatsapp := company_phone;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_default_alert_whatsapp ON public.whatsapp_configs;
CREATE TRIGGER trg_set_default_alert_whatsapp
BEFORE INSERT OR UPDATE ON public.whatsapp_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_default_alert_whatsapp();

-- Also: when a company's whatsapp changes and config has no alert, sync it
CREATE OR REPLACE FUNCTION public.sync_company_whatsapp_to_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.whatsapp IS NOT NULL AND length(trim(NEW.whatsapp)) > 0 
     AND (OLD.whatsapp IS DISTINCT FROM NEW.whatsapp) THEN
    UPDATE public.whatsapp_configs
      SET alert_whatsapp = NEW.whatsapp
      WHERE company_id = NEW.id
        AND (alert_whatsapp IS NULL OR length(trim(alert_whatsapp)) = 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_whatsapp_to_alert ON public.companies;
CREATE TRIGGER trg_sync_company_whatsapp_to_alert
AFTER UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_whatsapp_to_alert();

-- Backfill existing configs with empty alert_whatsapp
UPDATE public.whatsapp_configs w
SET alert_whatsapp = c.whatsapp
FROM public.companies c
WHERE w.company_id = c.id
  AND (w.alert_whatsapp IS NULL OR length(trim(w.alert_whatsapp)) = 0)
  AND c.whatsapp IS NOT NULL
  AND length(trim(c.whatsapp)) > 0;

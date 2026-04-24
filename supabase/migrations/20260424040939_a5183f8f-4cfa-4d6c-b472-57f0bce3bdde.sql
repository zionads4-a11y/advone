-- Drop trigger first
DROP TRIGGER IF EXISTS trg_lead_reminders_gcal_push ON public.lead_reminders;

-- Drop trigger function
DROP FUNCTION IF EXISTS public.trigger_google_calendar_push() CASCADE;

-- Drop tables (order matters because of FKs)
DROP TABLE IF EXISTS public.google_calendar_event_links CASCADE;
DROP TABLE IF EXISTS public.google_calendar_sync_state CASCADE;
DROP TABLE IF EXISTS public.google_calendar_connections CASCADE;
DROP TABLE IF EXISTS public.google_oauth_credentials CASCADE;
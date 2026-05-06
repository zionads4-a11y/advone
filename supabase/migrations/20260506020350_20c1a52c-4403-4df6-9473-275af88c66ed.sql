-- Remove cobrança automática de R$97 por reunião realizada
DROP TRIGGER IF EXISTS trg_handle_meeting_held_column ON public.leads;
DROP FUNCTION IF EXISTS public.handle_meeting_held_column_change() CASCADE;
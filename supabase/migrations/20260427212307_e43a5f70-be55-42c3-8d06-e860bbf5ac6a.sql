-- Function to call the edge function for sync
CREATE OR REPLACE FUNCTION public.handle_calendar_sync_trigger()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  service_role_key TEXT;
BEGIN
  -- We don't want to trigger sync if the change came from Google itself (to avoid loops)
  -- But since we don't have a reliable way to check that here, we let the Edge Function handle it
  -- or check if google_event_id is the only thing that changed.
  
  -- Call the edge function asynchronously
  -- Note: This requires the net extension to be enabled in some environments, 
  -- but for Supabase Edge Functions we usually use triggers that notify a queue or just handle logic in the app.
  -- However, since I want "everything scheduled in the system to reflect in Google", 
  -- the most reliable way is a trigger that calls the sync logic.
  
  -- Since we cannot easily call external URLs from pure PL/pgSQL without extensions,
  -- and we want to avoid complex setups, we will rely on the app calling the sync
  -- OR we can set up a "dirty" flag or a sync queue table.
  
  -- Let's check if we have the sync queue table. If not, let's create it.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

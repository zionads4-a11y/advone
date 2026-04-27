-- Update trigger function to call the edge function immediately if pg_net is available
CREATE OR REPLACE FUNCTION public.handle_reminder_sync_enqueue()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
    -- Only enqueue if the user has a Google integration
    IF EXISTS (
        SELECT 1 FROM public.user_integrations 
        WHERE user_id = COALESCE(NEW.created_by, OLD.created_by) 
        AND provider = 'google' 
        AND sync_enabled = true
    ) THEN
        -- Insert into queue for reliability
        INSERT INTO public.google_calendar_sync_queue (user_id, reminder_id, action)
        VALUES (
            COALESCE(NEW.created_by, OLD.created_by),
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END
        );

        -- Optional: If pg_net is installed, we can trigger the function immediately
        -- This is what makes it "instant"
        BEGIN
          PERFORM
            net.http_post(
              url := current_setting('request.headers', true)::jsonb->>'x-supabase-url' || '/functions/v1/google-calendar-background-sync',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('request.headers', true)::jsonb->>'apikey'
              ),
              body := '{}'::jsonb
            );
        EXCEPTION WHEN OTHERS THEN
          -- If pg_net is not available or fails, the background sync will still pick it up
          -- during the next periodic run or user interaction.
        END;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

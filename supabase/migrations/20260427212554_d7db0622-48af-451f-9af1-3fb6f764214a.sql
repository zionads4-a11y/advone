-- Create a queue table for calendar synchronization
CREATE TABLE IF NOT EXISTS public.google_calendar_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_id UUID, -- Removed FK to allow record keeping after deletion if needed, or handle deletion sync
    action TEXT NOT NULL, -- 'upsert', 'delete'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_sync_queue ENABLE ROW LEVEL SECURITY;

-- Simple RLS: users can see their own sync status
CREATE POLICY "Users can view their own sync queue" ON public.google_calendar_sync_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Trigger function to enqueue sync requests
CREATE OR REPLACE FUNCTION public.handle_reminder_sync_enqueue()
RETURNS TRIGGER AS $$
BEGIN
    -- Only enqueue if the user has a Google integration
    IF EXISTS (
        SELECT 1 FROM public.user_integrations 
        WHERE user_id = COALESCE(NEW.created_by, OLD.created_by) 
        AND provider = 'google' 
        AND sync_enabled = true
    ) THEN
        INSERT INTO public.google_calendar_sync_queue (user_id, reminder_id, action)
        VALUES (
            COALESCE(NEW.created_by, OLD.created_by),
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END
        );
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_enqueue_calendar_sync ON public.lead_reminders;
CREATE TRIGGER trigger_enqueue_calendar_sync
AFTER INSERT OR UPDATE OR DELETE ON public.lead_reminders
FOR EACH ROW EXECUTE FUNCTION public.handle_reminder_sync_enqueue();

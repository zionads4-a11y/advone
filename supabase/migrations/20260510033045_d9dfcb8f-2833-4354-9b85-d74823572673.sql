-- Create a table to store webhook logs
CREATE TABLE IF NOT EXISTS public.google_calendar_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    channel_id TEXT,
    resource_id TEXT,
    resource_state TEXT,
    payload JSONB,
    status_code INTEGER,
    error_message TEXT,
    processing_time_ms INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.google_calendar_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and managers can view logs
CREATE POLICY "Admins and managers can view webhook logs"
ON public.google_calendar_webhook_logs
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'member') OR
    public.has_role(auth.uid(), 'gerente')
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.google_calendar_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_channel_id ON public.google_calendar_webhook_logs(channel_id);

-- Cleanup function to prevent table bloat (keep 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.google_calendar_webhook_logs
    WHERE created_at < now() - interval '7 days';
END;
$$;


ALTER TABLE public.monitored_processes
  ADD COLUMN IF NOT EXISTS datajud_data jsonb,
  ADD COLUMN IF NOT EXISTS datajud_tribunal_alias text;

ALTER TABLE public.process_movements
  ADD COLUMN IF NOT EXISTS datajud_hash text,
  ADD COLUMN IF NOT EXISTS source_provider text NOT NULL DEFAULT 'escavador';

CREATE UNIQUE INDEX IF NOT EXISTS uq_process_movements_datajud
  ON public.process_movements (monitored_process_id, datajud_hash)
  WHERE datajud_hash IS NOT NULL;

-- Cron diário 07:00 UTC (04h BRT) chamando datajud-sync
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'datajud-daily-sync') THEN
    PERFORM cron.schedule(
      'datajud-daily-sync',
      '0 7 * * *',
      $cmd$
      SELECT net.http_post(
        url:='https://oonteavjxzkovrzktnie.supabase.co/functions/v1/datajud-sync',
        headers:='{"Content-Type":"application/json"}'::jsonb,
        body:='{"source":"cron"}'::jsonb
      );
      $cmd$
    );
  END IF;
END $$;

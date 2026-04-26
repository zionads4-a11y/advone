SELECT cron.unschedule('process-cadence-every-hour');
SELECT cron.schedule(
  'process-cadence-every-5min',
  '*/5 * * * *',
  $$ SELECT net.http_post(
    url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/process-cadence',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.settings.service_role_key', true))
  ); $$
);
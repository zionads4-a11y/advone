-- Reagendar disparos de cadência e lembretes para cada 10 minutos, com timeout maior
select cron.unschedule('process-reminders-every-5min');
select cron.unschedule('process-cadence-every-5min');

select cron.schedule(
  'process-reminders-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbnRlYXZqeHprb3Zyemt0bmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODEwODIsImV4cCI6MjA4NTk1NzA4Mn0.dAmVYZUJSpQN4QGoVQeffJxQ83T6Pw8c5ETNr_mh6YI"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  WHERE EXISTS (
    SELECT 1 FROM public.lead_reminders
     WHERE completed = false
       AND due_at BETWEEN now() - interval '30 days' AND now() + interval '7 days'
  );
  $$
);

select cron.schedule(
  'process-cadence-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/process-cadence',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbnRlYXZqeHprb3Zyemt0bmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODEwODIsImV4cCI6MjA4NTk1NzA4Mn0.dAmVYZUJSpQN4QGoVQeffJxQ83T6Pw8c5ETNr_mh6YI"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  WHERE EXISTS (
    SELECT 1 FROM public.leads
     WHERE status NOT IN ('won')
       AND updated_at > now() - interval '30 days'
  );
  $$
);
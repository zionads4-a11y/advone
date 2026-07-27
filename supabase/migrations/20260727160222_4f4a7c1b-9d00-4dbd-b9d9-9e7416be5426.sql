
SELECT cron.alter_job(2, schedule := '*/30 * * * *');
SELECT cron.alter_job(3, schedule := '*/30 * * * *');
SELECT cron.alter_job(6, schedule := '0 */2 * * *');
SELECT cron.alter_job(8, schedule := '0 * * * *');
SELECT cron.alter_job(12, schedule := '0 */12 * * *');
SELECT cron.alter_job(14, command := $$
  DELETE FROM net._http_response WHERE created < now() - interval '12 hours';
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';
$$, schedule := '15 */6 * * *');

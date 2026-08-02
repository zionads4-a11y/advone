ALTER TABLE public.companies
  ALTER COLUMN message_quota_monthly SET DEFAULT 5000;

UPDATE public.companies
   SET message_quota_monthly = 5000,
       quota_exceeded_at = NULL,
       quota_alert_80_sent_at = NULL,
       quota_alert_100_sent_at = NULL
 WHERE COALESCE(billing_model::text, '') <> 'plan_enterprise';
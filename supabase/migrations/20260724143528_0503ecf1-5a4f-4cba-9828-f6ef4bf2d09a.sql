
-- 1) Novos campos na companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS message_quota_monthly integer,
  ADD COLUMN IF NOT EXISTS messages_used_current_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  ADD COLUMN IF NOT EXISTS quota_exceeded_at timestamptz,
  ADD COLUMN IF NOT EXISTS quota_alert_80_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS quota_alert_100_sent_at timestamptz;

COMMENT ON COLUMN public.companies.message_quota_monthly IS 'NULL = ilimitado. Caso contrário, teto de mensagens IA por mês.';

-- 2) Backfill de cotas com base no billing_model
UPDATE public.companies SET message_quota_monthly = 10000
 WHERE message_quota_monthly IS NULL
   AND billing_model IN ('plan_ia','ia_only','plan_ia_monthly','plan_ia_6m','plan_ia_12m','plan_ia_zionads');

UPDATE public.companies SET message_quota_monthly = 25000
 WHERE message_quota_monthly IS NULL
   AND billing_model IN ('plan_complete','plan_completo','crm_full','plan_gestao');

-- Enterprise, exito, plan_free, plan_zionads permanecem NULL (ilimitado)

-- 3) Função: verifica se a empresa pode consumir IA
CREATE OR REPLACE FUNCTION public.company_can_use_ai(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN c.message_quota_monthly IS NULL THEN true
      WHEN c.messages_used_current_period < c.message_quota_monthly THEN true
      ELSE false
    END
  FROM public.companies c
  WHERE c.id = _company_id;
$$;

-- 4) Função: incrementa uso de mensagem (chamada pelas edge functions)
CREATE OR REPLACE FUNCTION public.increment_message_usage(_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota integer;
  v_used integer;
  v_exceeded_before timestamptz;
  v_alert_80 timestamptz;
  v_alert_100 timestamptz;
  v_pct numeric;
  v_alert text := NULL;
BEGIN
  UPDATE public.companies
     SET messages_used_current_period = messages_used_current_period + 1
   WHERE id = _company_id
   RETURNING message_quota_monthly, messages_used_current_period,
             quota_exceeded_at, quota_alert_80_sent_at, quota_alert_100_sent_at
        INTO v_quota, v_used, v_exceeded_before, v_alert_80, v_alert_100;

  IF v_quota IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'used', v_used);
  END IF;

  v_pct := (v_used::numeric / NULLIF(v_quota,0)::numeric) * 100.0;

  IF v_used >= v_quota AND v_exceeded_before IS NULL THEN
    UPDATE public.companies SET quota_exceeded_at = now() WHERE id = _company_id;
    v_alert := '100';
  ELSIF v_pct >= 80 AND v_alert_80 IS NULL THEN
    v_alert := '80';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_used <= v_quota,
    'unlimited', false,
    'used', v_used,
    'quota', v_quota,
    'percentage', round(v_pct, 1),
    'alert_needed', v_alert
  );
END;
$$;

-- 5) Função: reset mensal (chamada pelo cron do dia 1)
CREATE OR REPLACE FUNCTION public.reset_all_message_quotas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.companies
     SET messages_used_current_period = 0,
         quota_period_start = date_trunc('month', now()),
         quota_exceeded_at = NULL,
         quota_alert_80_sent_at = NULL,
         quota_alert_100_sent_at = NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 6) Revoga execute público (segurança)
REVOKE ALL ON FUNCTION public.company_can_use_ai(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_message_usage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_all_message_quotas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.company_can_use_ai(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_message_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_all_message_quotas() TO service_role;

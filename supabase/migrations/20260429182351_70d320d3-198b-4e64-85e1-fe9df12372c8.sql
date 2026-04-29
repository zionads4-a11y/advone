CREATE TABLE IF NOT EXISTS public.escavador_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed | invalid
  payload JSONB NOT NULL,
  numero_cnj TEXT,
  monitoramento_id BIGINT,
  movements_inserted INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_esc_webhook_status ON public.escavador_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_esc_webhook_retry ON public.escavador_webhook_events(next_retry_at) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_esc_webhook_cnj ON public.escavador_webhook_events(numero_cnj);

ALTER TABLE public.escavador_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhook events"
  ON public.escavador_webhook_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage webhook events"
  ON public.escavador_webhook_events FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
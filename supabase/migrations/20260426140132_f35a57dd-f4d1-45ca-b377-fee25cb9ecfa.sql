-- Tabela única que serve TANTO como estado da conversa (linha mais recente por lead)
-- QUANTO como auditoria histórica (todas as linhas por lead).
-- Estado = SELECT * FROM ai_followup_audit WHERE lead_id = X ORDER BY created_at DESC LIMIT 1
CREATE TABLE public.ai_followup_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone text NOT NULL,
  -- tópico detectado: schedule_time | modality | personal_data | scheduling_link | greeting | other
  open_topic text,
  -- pergunta exata em aberto detectada (curta, ex: "manhã ou tarde?")
  open_question text,
  -- texto do follow-up enviado
  message_sent text NOT NULL,
  -- origem: ai | template_fallback_topic | template_fallback_default
  source text NOT NULL DEFAULT 'ai',
  -- contexto: nudge_30m | nudge_90m | nudge_150m | nudge_180m | cadence_day_1..5
  trigger_kind text NOT NULL,
  -- minutos desde a última mensagem do lead
  inactive_minutes integer,
  -- bloqueio de repetição: 'allowed' | 'blocked_similar' | 'blocked_identical'
  repetition_check text NOT NULL DEFAULT 'allowed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_followup_audit_lead ON public.ai_followup_audit(lead_id, created_at DESC);
CREATE INDEX idx_ai_followup_audit_company ON public.ai_followup_audit(company_id, created_at DESC);

ALTER TABLE public.ai_followup_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai followup audit"
  ON public.ai_followup_audit FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage ai followup audit"
  ON public.ai_followup_audit FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Company users view their ai followup audit"
  ON public.ai_followup_audit FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Gerentes manage their ai followup audit"
  ON public.ai_followup_audit FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));
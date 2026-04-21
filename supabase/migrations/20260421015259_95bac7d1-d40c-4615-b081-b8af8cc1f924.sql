-- ============================================
-- DECISION ENGINE — Schema
-- ============================================

-- 1. Tabela de regras de decisão (default global + override por empresa)
CREATE TABLE public.decision_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = regra global default
  niche TEXT NOT NULL,                  -- ex: 'previdenciario'
  case_type TEXT,                        -- ex: 'desconto_indevido' (NULL = aplica a qualquer caso do nicho)
  rule_name TEXT NOT NULL,               -- nome legível
  priority INTEGER NOT NULL DEFAULT 100, -- menor = avaliada primeiro
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{field, op, value}]
  output JSONB NOT NULL DEFAULT '{}'::jsonb,      -- {score, classification, action, priority, reason}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_decision_rules_lookup
  ON public.decision_rules (niche, case_type, is_active, priority);

ALTER TABLE public.decision_rules ENABLE ROW LEVEL SECURITY;

-- Visualização: defaults globais visíveis a todos autenticados
CREATE POLICY "Anyone authenticated can view global rules"
  ON public.decision_rules FOR SELECT TO authenticated
  USING (company_id IS NULL);

-- Visualização de regras da empresa
CREATE POLICY "Company members can view their rules"
  ON public.decision_rules FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND user_belongs_to_company(auth.uid(), company_id));

-- Admins veem todas
CREATE POLICY "Admins view all rules"
  ON public.decision_rules FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem gerenciar tudo (defaults globais incluso)
CREATE POLICY "Admins manage all rules"
  ON public.decision_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Gerentes podem gerenciar regras da própria empresa
CREATE POLICY "Gerentes manage own company rules"
  ON public.decision_rules FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'gerente'::app_role)
    AND company_id IS NOT NULL
    AND user_belongs_to_company(auth.uid(), company_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'gerente'::app_role)
    AND company_id IS NOT NULL
    AND user_belongs_to_company(auth.uid(), company_id)
  );

CREATE TRIGGER trg_decision_rules_updated_at
  BEFORE UPDATE ON public.decision_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de respostas + decisão por lead
CREATE TABLE public.lead_qualification_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  case_type TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_result JSONB,                 -- {score, classification, action, priority, reason, matched_rule_id}
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_qual_answers_lead ON public.lead_qualification_answers (lead_id, created_at DESC);
CREATE INDEX idx_lead_qual_answers_company ON public.lead_qualification_answers (company_id);

ALTER TABLE public.lead_qualification_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage qualification answers"
  ON public.lead_qualification_answers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company members view qualification answers"
  ON public.lead_qualification_answers FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members insert qualification answers"
  ON public.lead_qualification_answers FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members update qualification answers"
  ON public.lead_qualification_answers FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_lead_qual_answers_updated_at
  BEFORE UPDATE ON public.lead_qualification_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seeds: regras DEFAULT GLOBAIS para nicho previdenciário
-- Conditions format: [{field: "answers.benefit_type", op: "in", value: ["aposentado","pensionista"]}, ...]
-- Operators: eq, neq, in, not_in, gt, gte, lt, lte, exists

-- Regra 1: Desconto indevido (quente)
INSERT INTO public.decision_rules (company_id, niche, case_type, rule_name, priority, conditions, output) VALUES
(NULL, 'previdenciario', 'desconto_indevido', 'Desconto indevido confirmado', 10,
 '[
   {"field":"answers.benefit_type","op":"in","value":["aposentado","pensionista"]},
   {"field":"answers.requested_card","op":"in","value":["nao","nao_tenho_certeza"]},
   {"field":"answers.received_money","op":"eq","value":"nao"}
 ]'::jsonb,
 '{"score":90,"classification":"quente","action":"agendar","priority":"alta","reason":"Indícios fortes de desconto indevido sem autorização"}'::jsonb),

-- Regra 2: BPC / LOAS
(NULL, 'previdenciario', 'bpc_loas', 'BPC/LOAS — perfil elegível', 10,
 '[
   {"field":"answers.profile","op":"in","value":["idoso","deficiente"]},
   {"field":"answers.low_income","op":"eq","value":"sim"},
   {"field":"answers.benefit_status","op":"in","value":["negado","nao_pediu"]}
 ]'::jsonb,
 '{"score":85,"classification":"quente","action":"agendar","priority":"alta","reason":"Perfil elegível ao BPC/LOAS com pedido pendente ou negado"}'::jsonb),

-- Regra 3: Demora INSS
(NULL, 'previdenciario', 'demora_inss', 'Demora INSS > 60 dias', 15,
 '[
   {"field":"answers.days_waiting","op":"gt","value":60},
   {"field":"answers.status","op":"eq","value":"em_analise"}
 ]'::jsonb,
 '{"score":80,"classification":"quente","action":"agendar","priority":"alta","reason":"Processo INSS em demora superior a 60 dias"}'::jsonb),

-- Regra 4: Aposentadoria
(NULL, 'previdenciario', 'aposentadoria', 'Aposentadoria — tempo elegível', 20,
 '[
   {"field":"answers.contribution_years","op":"gt","value":15},
   {"field":"answers.intent","op":"in","value":["pedir","revisar"]}
 ]'::jsonb,
 '{"score":75,"classification":"quente","action":"agendar","priority":"alta","reason":"Tempo de contribuição elegível para aposentadoria/revisão"}'::jsonb),

-- Regra 5: Auxílio-doença
(NULL, 'previdenciario', 'auxilio_doenca', 'Auxílio-doença com documentação', 15,
 '[
   {"field":"answers.has_medical_docs","op":"eq","value":"sim"},
   {"field":"answers.benefit_status","op":"in","value":["negado","cortado"]}
 ]'::jsonb,
 '{"score":80,"classification":"quente","action":"agendar","priority":"alta","reason":"Auxílio-doença negado/cortado com laudos disponíveis"}'::jsonb),

-- Regra 6: Pensão por morte
(NULL, 'previdenciario', 'pensao_morte', 'Pensão por morte — vínculo válido', 15,
 '[
   {"field":"answers.relationship","op":"in","value":["conjuge","filho","companheiro"]},
   {"field":"answers.benefit_status","op":"in","value":["negado","em_analise"]}
 ]'::jsonb,
 '{"score":85,"classification":"quente","action":"agendar","priority":"alta","reason":"Pensão por morte com vínculo válido pendente"}'::jsonb),

-- Regra 7: Revisão de benefício
(NULL, 'previdenciario', 'revisao_beneficio', 'Revisão de benefício', 25,
 '[
   {"field":"answers.receives_benefit","op":"eq","value":"sim"},
   {"field":"answers.suspects_error","op":"eq","value":"sim"}
 ]'::jsonb,
 '{"score":70,"classification":"morno","action":"pedir_documentos","priority":"media","reason":"Suspeita de erro em benefício — revisar documentação"}'::jsonb),

-- Regra 8: Caso médio (genérica do nicho)
(NULL, 'previdenciario', NULL, 'Caso médio — qualificação parcial', 80,
 '[
   {"field":"answers.has_problem","op":"eq","value":"sim"},
   {"field":"answers.clarity","op":"in","value":["baixa","media"]}
 ]'::jsonb,
 '{"score":60,"classification":"morno","action":"continuar_qualificacao","priority":"media","reason":"Lead com indício de problema mas resposta inconclusiva"}'::jsonb),

-- Regra 9: Caso fraco / encerrar (fallback do nicho)
(NULL, 'previdenciario', NULL, 'Dúvida genérica sem problema', 90,
 '[
   {"field":"answers.has_problem","op":"in","value":["nao","nao_sei"]}
 ]'::jsonb,
 '{"score":30,"classification":"frio","action":"encerrar","priority":"baixa","reason":"Apenas dúvida genérica sem problema concreto"}'::jsonb),

-- Regra 10: Fallback final universal (qualquer nicho)
(NULL, 'previdenciario', NULL, 'Fallback — continuar qualificação', 999,
 '[]'::jsonb,
 '{"score":50,"classification":"morno","action":"continuar_qualificacao","priority":"media","reason":"Dados insuficientes para classificação definitiva"}'::jsonb);

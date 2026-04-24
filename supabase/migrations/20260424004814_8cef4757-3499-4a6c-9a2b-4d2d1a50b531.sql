-- Tabela de configuração de provider de IA por empresa
CREATE TABLE IF NOT EXISTS public.company_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable', 'openai')),
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  -- prompts customizados podem ser injetados sem mexer no código:
  custom_system_prompt text,
  -- bandeira para A/B test interno: se true, usa OpenAI mesmo sem provider='openai'
  use_openai_for_testing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai config" ON public.company_ai_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members manage ai config" ON public.company_ai_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role));

CREATE POLICY "Gerentes manage their ai config" ON public.company_ai_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company members view ai config" ON public.company_ai_config
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER update_company_ai_config_updated_at
  BEFORE UPDATE ON public.company_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
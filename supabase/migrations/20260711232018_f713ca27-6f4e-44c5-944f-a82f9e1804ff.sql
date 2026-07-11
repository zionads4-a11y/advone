
-- ============================================================
-- Fase 1: Kanban de Processos - Gestão Jurídica Full Service
-- ============================================================

-- 1) legal_areas
CREATE TABLE public.legal_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0ea5a4',
  icon TEXT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_areas TO authenticated;
GRANT ALL ON public.legal_areas TO service_role;
ALTER TABLE public.legal_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_areas company members read"
  ON public.legal_areas FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

CREATE POLICY "legal_areas managers write"
  ON public.legal_areas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role)
      OR (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role)
      OR (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id)));

CREATE TRIGGER trg_legal_areas_updated_at BEFORE UPDATE ON public.legal_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) process_boards
CREATE TABLE public.process_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  legal_area_id UUID NOT NULL REFERENCES public.legal_areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#0ea5a4',
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_boards TO authenticated;
GRANT ALL ON public.process_boards TO service_role;
ALTER TABLE public.process_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_boards company members read"
  ON public.process_boards FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

CREATE POLICY "process_boards managers write"
  ON public.process_boards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role)
      OR (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role)
      OR (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id)));

CREATE TRIGGER trg_process_boards_updated_at BEFORE UPDATE ON public.process_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) process_board_columns
CREATE TABLE public.process_board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.process_boards(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  position INT NOT NULL DEFAULT 0,
  stage_type TEXT NOT NULL DEFAULT 'andamento', -- inicial|andamento|final|arquivo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_board_columns TO authenticated;
GRANT ALL ON public.process_board_columns TO service_role;
ALTER TABLE public.process_board_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_board_columns company members read"
  ON public.process_board_columns FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

CREATE POLICY "process_board_columns managers write"
  ON public.process_board_columns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role)
      OR (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role)
      OR (public.has_role(auth.uid(),'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id)));

CREATE TRIGGER trg_process_board_columns_updated_at BEFORE UPDATE ON public.process_board_columns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) process_cards
CREATE TABLE public.process_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.process_boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES public.process_board_columns(id) ON DELETE SET NULL,
  monitored_process_id UUID REFERENCES public.monitored_processes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cnj_number TEXT,
  client_name TEXT,
  court TEXT,
  title TEXT,
  description TEXT,
  responsible_id UUID REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'normal', -- baixa|normal|alta|urgente
  next_deadline_at TIMESTAMPTZ,
  next_deadline_label TEXT,
  last_movement_at TIMESTAMPTZ,
  last_movement_text TEXT,
  position INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_process_cards_board ON public.process_cards(board_id);
CREATE INDEX idx_process_cards_column ON public.process_cards(column_id);
CREATE INDEX idx_process_cards_cnj ON public.process_cards(cnj_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_cards TO authenticated;
GRANT ALL ON public.process_cards TO service_role;
ALTER TABLE public.process_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_cards company members all"
  ON public.process_cards FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

CREATE TRIGGER trg_process_cards_updated_at BEFORE UPDATE ON public.process_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) process_card_team
CREATE TABLE public.process_card_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.process_cards(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_on_card TEXT NOT NULL DEFAULT 'coautor', -- responsavel|coautor|estagiario|revisor|paralegal
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);
CREATE INDEX idx_process_card_team_user ON public.process_card_team(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_card_team TO authenticated;
GRANT ALL ON public.process_card_team TO service_role;
ALTER TABLE public.process_card_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_card_team company members all"
  ON public.process_card_team FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

-- 6) process_card_activity
CREATE TABLE public.process_card_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.process_cards(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  activity_type TEXT NOT NULL, -- moved|comment|team_add|team_remove|movement|document|created|priority
  from_column_id UUID,
  to_column_id UUID,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_process_card_activity_card ON public.process_card_activity(card_id, created_at DESC);
GRANT SELECT, INSERT ON public.process_card_activity TO authenticated;
GRANT ALL ON public.process_card_activity TO service_role;
ALTER TABLE public.process_card_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_card_activity company members read"
  ON public.process_card_activity FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

CREATE POLICY "process_card_activity company members insert"
  ON public.process_card_activity FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'member'::app_role));

-- 7) Trigger de log de movimentação entre colunas
CREATE OR REPLACE FUNCTION public.log_process_card_move()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    INSERT INTO public.process_card_activity (card_id, company_id, actor_id, activity_type, from_column_id, to_column_id)
    VALUES (NEW.id, NEW.company_id, auth.uid(), 'moved', OLD.column_id, NEW.column_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_process_card_move
  AFTER UPDATE ON public.process_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_process_card_move();

-- 8) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.process_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.process_card_activity;

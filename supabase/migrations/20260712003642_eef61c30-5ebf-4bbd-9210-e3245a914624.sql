
-- 1) Novo enum de perfil
DO $$ BEGIN
  CREATE TYPE public.operator_profile AS ENUM (
    'master','advogado_responsavel','estagiario','sdr_closer','financeiro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Coluna no profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS operator_profile public.operator_profile;

-- 3) Tabela user_legal_areas
CREATE TABLE IF NOT EXISTS public.user_legal_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.legal_areas(id) ON DELETE CASCADE,
  role_in_area TEXT NOT NULL CHECK (role_in_area IN ('responsavel','estagiario')),
  sees_all_area_cards BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, area_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_legal_areas TO authenticated;
GRANT ALL ON public.user_legal_areas TO service_role;

ALTER TABLE public.user_legal_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master/gerente/admin manage user_legal_areas"
  ON public.user_legal_areas FOR ALL
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  );

CREATE POLICY "Users see their own areas"
  ON public.user_legal_areas FOR SELECT
  USING (user_id = auth.uid());

CREATE TRIGGER trg_user_legal_areas_updated_at
  BEFORE UPDATE ON public.user_legal_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_user_legal_areas_user ON public.user_legal_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_legal_areas_area ON public.user_legal_areas(area_id);
CREATE INDEX IF NOT EXISTS idx_user_legal_areas_company ON public.user_legal_areas(company_id);

-- 4) Helpers SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_operator_profile(_user_id UUID)
RETURNS public.operator_profile
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT operator_profile FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.user_has_area_access(_user_id UUID, _area_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_legal_areas
     WHERE user_id = _user_id AND area_id = _area_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_process_card(_user_id UUID, _card_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company UUID; v_board UUID; v_area UUID;
  v_profile public.operator_profile;
  v_sees_all BOOLEAN;
BEGIN
  SELECT c.company_id, c.board_id, b.legal_area_id
    INTO v_company, v_board, v_area
    FROM public.process_cards c
    JOIN public.process_boards b ON b.id = c.board_id
   WHERE c.id = _card_id;

  IF v_company IS NULL THEN RETURN false; END IF;

  IF public.has_role(_user_id,'admin'::app_role)
     OR public.has_role(_user_id,'member'::app_role) THEN
    RETURN true;
  END IF;

  IF NOT public.user_belongs_to_company(_user_id, v_company) THEN
    RETURN false;
  END IF;

  IF public.has_role(_user_id,'gerente'::app_role) THEN
    RETURN true;
  END IF;

  v_profile := public.get_operator_profile(_user_id);

  IF v_profile IN ('sdr_closer','financeiro') THEN
    RETURN false;
  END IF;

  IF v_profile = 'advogado_responsavel' THEN
    RETURN public.user_has_area_access(_user_id, v_area);
  END IF;

  IF v_profile = 'estagiario' THEN
    SELECT sees_all_area_cards INTO v_sees_all
      FROM public.user_legal_areas
     WHERE user_id = _user_id AND area_id = v_area
     LIMIT 1;
    IF v_sees_all IS NULL THEN RETURN false; END IF;
    IF v_sees_all THEN RETURN true; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.process_card_team
       WHERE card_id = _card_id AND user_id = _user_id
    );
  END IF;

  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.user_can_see_process_board(_user_id UUID, _board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company UUID; v_area UUID;
  v_profile public.operator_profile;
BEGIN
  SELECT company_id, legal_area_id INTO v_company, v_area
    FROM public.process_boards WHERE id = _board_id;
  IF v_company IS NULL THEN RETURN false; END IF;

  IF public.has_role(_user_id,'admin'::app_role)
     OR public.has_role(_user_id,'member'::app_role) THEN
    RETURN true;
  END IF;
  IF NOT public.user_belongs_to_company(_user_id, v_company) THEN
    RETURN false;
  END IF;
  IF public.has_role(_user_id,'gerente'::app_role) THEN
    RETURN true;
  END IF;

  v_profile := public.get_operator_profile(_user_id);
  IF v_profile IN ('sdr_closer','financeiro') THEN RETURN false; END IF;
  IF v_profile IN ('advogado_responsavel','estagiario') THEN
    RETURN public.user_has_area_access(_user_id, v_area);
  END IF;
  RETURN false;
END $$;

-- 5) Substituir policies do Kanban de processos
DROP POLICY IF EXISTS "process_cards_company_access" ON public.process_cards;
DROP POLICY IF EXISTS "process_cards_all" ON public.process_cards;

CREATE POLICY "process_cards_select"
  ON public.process_cards FOR SELECT
  USING (public.user_can_see_process_card(auth.uid(), id));

CREATE POLICY "process_cards_write"
  ON public.process_cards FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
    OR (
      public.user_belongs_to_company(auth.uid(), company_id)
      AND public.user_has_area_access(
        auth.uid(),
        (SELECT legal_area_id FROM public.process_boards WHERE id = board_id)
      )
    )
  );

CREATE POLICY "process_cards_update"
  ON public.process_cards FOR UPDATE
  USING (public.user_can_see_process_card(auth.uid(), id))
  WITH CHECK (public.user_can_see_process_card(auth.uid(), id));

CREATE POLICY "process_cards_delete"
  ON public.process_cards FOR DELETE
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "process_boards_company_access" ON public.process_boards;
DROP POLICY IF EXISTS "process_boards_all" ON public.process_boards;
CREATE POLICY "process_boards_select"
  ON public.process_boards FOR SELECT
  USING (public.user_can_see_process_board(auth.uid(), id));
CREATE POLICY "process_boards_manage"
  ON public.process_boards FOR ALL
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "process_board_columns_company_access" ON public.process_board_columns;
DROP POLICY IF EXISTS "process_board_columns_all" ON public.process_board_columns;
CREATE POLICY "process_board_columns_select"
  ON public.process_board_columns FOR SELECT
  USING (public.user_can_see_process_board(auth.uid(), board_id));
CREATE POLICY "process_board_columns_manage"
  ON public.process_board_columns FOR ALL
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'member'::app_role)
    OR (public.has_role(auth.uid(),'gerente'::app_role)
        AND public.user_belongs_to_company(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "process_card_activity_company_access" ON public.process_card_activity;
DROP POLICY IF EXISTS "process_card_activity_all" ON public.process_card_activity;
CREATE POLICY "process_card_activity_select"
  ON public.process_card_activity FOR SELECT
  USING (public.user_can_see_process_card(auth.uid(), card_id));
CREATE POLICY "process_card_activity_insert"
  ON public.process_card_activity FOR INSERT
  WITH CHECK (public.user_can_see_process_card(auth.uid(), card_id));

-- 6) SDR/Closer não enxerga leads que já viraram cliente
DROP POLICY IF EXISTS "sdr_hides_client_leads" ON public.leads;
CREATE POLICY "sdr_hides_client_leads"
  ON public.leads AS RESTRICTIVE FOR SELECT
  USING (
    NOT (
      public.get_operator_profile(auth.uid()) = 'sdr_closer'
      AND COALESCE(is_client,false) = true
    )
  );

-- 7) Remover o trigger de auto-criação (será substituído pelo modal explícito)
DROP TRIGGER IF EXISTS trg_auto_create_process_card_on_won ON public.leads;
DROP TRIGGER IF EXISTS auto_create_process_card_on_won_trigger ON public.leads;

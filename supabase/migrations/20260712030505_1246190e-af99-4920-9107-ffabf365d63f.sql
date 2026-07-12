
-- Fix: remove broad company-wide RLS policies that bypass area-based restrictions.
-- The granular *_select/_update policies (using user_can_see_process_card / user_can_see_process_board)
-- must be the sole SELECT/UPDATE gate so that sdr_closer / financeiro / advogado_responsavel / estagiario
-- profiles are correctly restricted by legal area.

DROP POLICY IF EXISTS "process_cards company members all" ON public.process_cards;
DROP POLICY IF EXISTS "process_boards company members read" ON public.process_boards;
DROP POLICY IF EXISTS "process_board_columns company members read" ON public.process_board_columns;
DROP POLICY IF EXISTS "process_card_activity company members read" ON public.process_card_activity;
DROP POLICY IF EXISTS "process_card_activity company members insert" ON public.process_card_activity;
DROP POLICY IF EXISTS "process_card_team company members all" ON public.process_card_team;

-- Replacement for process_card_team: gate by the card visibility helper so only users
-- authorized to see the card can read/manage its team.
CREATE POLICY "process_card_team_select"
  ON public.process_card_team FOR SELECT
  USING (public.user_can_see_process_card(auth.uid(), card_id));

CREATE POLICY "process_card_team_manage"
  ON public.process_card_team FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'member'::app_role)
    OR (public.has_role(auth.uid(), 'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'member'::app_role)
    OR (public.has_role(auth.uid(), 'gerente'::app_role) AND public.user_belongs_to_company(auth.uid(), company_id))
  );

-- Fix: revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER trigger functions.
-- These are meant to be invoked only by row-level triggers, never by API callers.
REVOKE EXECUTE ON FUNCTION public.enforce_gestao_area_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_gestao_user_per_area_limit() FROM PUBLIC, anon, authenticated;

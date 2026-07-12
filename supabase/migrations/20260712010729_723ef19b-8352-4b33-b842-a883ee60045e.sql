
DROP POLICY IF EXISTS "asaas_configs read by company members" ON public.asaas_configs;
CREATE POLICY "asaas_configs read by staff only"
  ON public.asaas_configs
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'member'::app_role)
    OR (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  );

REVOKE EXECUTE ON FUNCTION public.log_process_card_move() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_process_card_last_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_process_card_on_won() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_operator_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_area_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_see_process_card(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_see_process_board(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_card_weekly_activity_count(uuid) FROM PUBLIC, anon;

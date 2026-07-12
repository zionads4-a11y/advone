
-- Function: can the user see this reminder given the "advogado_responsavel sees only own" rule?
CREATE OR REPLACE FUNCTION public.reminder_visible_to_advogado(_user_id uuid, _reminder_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_created_by uuid;
  v_lead_id uuid;
  v_assigned_to uuid;
BEGIN
  SELECT created_by, lead_id INTO v_created_by, v_lead_id
    FROM public.lead_reminders WHERE id = _reminder_id;

  IF v_created_by = _user_id THEN
    RETURN true;
  END IF;

  IF v_lead_id IS NOT NULL THEN
    SELECT assigned_to INTO v_assigned_to FROM public.leads WHERE id = v_lead_id;
    IF v_assigned_to = _user_id THEN
      RETURN true;
    END IF;

    -- Responsible on any process_card linked to this lead
    IF EXISTS (
      SELECT 1 FROM public.process_cards
       WHERE lead_id = v_lead_id AND responsible_id = _user_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Restrictive policy: if user's operator_profile is 'advogado_responsavel', restrict SELECT
-- to reminders where they are creator, lead-assignee, or process-card responsible.
-- Admins/members/gerentes/master/other profiles are unaffected.
DROP POLICY IF EXISTS "Advogado responsavel sees only own reminders" ON public.lead_reminders;
CREATE POLICY "Advogado responsavel sees only own reminders"
ON public.lead_reminders
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  public.get_operator_profile(auth.uid()) IS DISTINCT FROM 'advogado_responsavel'::public.operator_profile
  OR public.reminder_visible_to_advogado(auth.uid(), id)
);

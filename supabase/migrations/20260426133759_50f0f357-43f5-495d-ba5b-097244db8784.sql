CREATE OR REPLACE FUNCTION public.handle_meeting_held_column_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_held BOOLEAN := false;
  is_held BOOLEAN := false;
  new_is_won BOOLEAN := false;
  meeting_at_ts TIMESTAMPTZ;
  existing_charge_id UUID;
BEGIN
  IF NEW.kanban_column_id IS NOT DISTINCT FROM OLD.kanban_column_id THEN
    RETURN NEW;
  END IF;

  IF OLD.kanban_column_id IS NOT NULL THEN
    SELECT is_meeting_held INTO was_held FROM public.kanban_columns WHERE id = OLD.kanban_column_id;
  END IF;
  IF NEW.kanban_column_id IS NOT NULL THEN
    SELECT is_meeting_held, is_won INTO is_held, new_is_won
      FROM public.kanban_columns WHERE id = NEW.kanban_column_id;
  END IF;

  was_held := COALESCE(was_held, false);
  is_held  := COALESCE(is_held, false);
  new_is_won := COALESCE(new_is_won, false);

  -- ENTROU em Reunião Realizada → cria cobrança
  IF is_held AND NOT was_held THEN
    SELECT id INTO existing_charge_id
      FROM public.meeting_charges
      WHERE lead_id = NEW.id
        AND status IN ('pending','invoiced','paid')
      ORDER BY created_at DESC
      LIMIT 1;

    IF existing_charge_id IS NULL THEN
      SELECT due_at INTO meeting_at_ts
        FROM public.lead_reminders
        WHERE lead_id = NEW.id AND reminder_type = 'meeting'
        ORDER BY due_at DESC LIMIT 1;
      meeting_at_ts := COALESCE(meeting_at_ts, now());

      INSERT INTO public.meeting_charges (
        company_id, lead_id, lead_name,
        meeting_at, confirmed_at, confirmed_by,
        amount, status, invoice_month
      ) VALUES (
        NEW.company_id, NEW.id, NEW.name,
        meeting_at_ts, now(), auth.uid(),
        97.00, 'pending',
        to_char(now(), 'YYYY-MM')
      );
    END IF;
  END IF;

  -- SAIU de Reunião Realizada → estorna SOMENTE se não estiver indo para "Ganho"
  -- (Ganho mantém cobrança porque a reunião realmente aconteceu)
  IF was_held AND NOT is_held AND NOT new_is_won THEN
    UPDATE public.meeting_charges
       SET status = 'canceled',
           notes = COALESCE(notes,'') || ' [estornado: lead saiu de Reunião Realizada em ' || to_char(now(),'DD/MM/YYYY HH24:MI') || ']',
           updated_at = now()
     WHERE lead_id = NEW.id
       AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.process_cards
  ADD COLUMN IF NOT EXISTS unread_movements_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_unread_movements boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_court_movement_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_court_movement_text text;

CREATE INDEX IF NOT EXISTS idx_process_cards_cnj_company
  ON public.process_cards (company_id, cnj_number)
  WHERE cnj_number IS NOT NULL;

-- Função que propaga movimentação do Escavador para cards do Kanban
CREATE OR REPLACE FUNCTION public.propagate_movement_to_process_cards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero_cnj text;
  v_card record;
  v_snippet text;
  v_fn_url text;
BEGIN
  SELECT numero_cnj INTO v_numero_cnj
    FROM public.monitored_processes
   WHERE id = NEW.monitored_process_id;

  IF v_numero_cnj IS NULL THEN
    RETURN NEW;
  END IF;

  v_snippet := left(coalesce(NEW.content, NEW.movement_type, 'Nova movimentação'), 180);

  FOR v_card IN
    SELECT id, company_id, responsible_id, title, client_name
      FROM public.process_cards
     WHERE company_id = NEW.company_id
       AND cnj_number IS NOT NULL
       AND regexp_replace(cnj_number, '\D', '', 'g')
           = regexp_replace(v_numero_cnj, '\D', '', 'g')
  LOOP
    UPDATE public.process_cards
       SET unread_movements_count = unread_movements_count + 1,
           has_unread_movements = true,
           last_court_movement_at = coalesce(NEW.movement_date::timestamptz, now()),
           last_court_movement_text = v_snippet,
           last_activity_at = now(),
           last_activity_type = 'court_movement',
           last_movement_at = coalesce(NEW.movement_date::timestamptz, now()),
           last_movement_text = v_snippet
     WHERE id = v_card.id;

    INSERT INTO public.process_card_activity
      (card_id, company_id, actor_id, activity_type, message, metadata)
    VALUES
      (v_card.id, v_card.company_id, NULL, 'court_movement', v_snippet,
       jsonb_build_object(
         'movement_id', NEW.id,
         'movement_date', NEW.movement_date,
         'movement_type', NEW.movement_type,
         'source_sigla', NEW.source_sigla,
         'source_name', NEW.source_name
       ));

    -- Cria tarefa para o responsável (se houver) analisar a movimentação
    IF v_card.responsible_id IS NOT NULL THEN
      INSERT INTO public.lead_reminders
        (company_id, created_by, title, description, reminder_type, due_at)
      VALUES
        (v_card.company_id, v_card.responsible_id,
         'Analisar movimentação: ' || coalesce(v_card.title, v_card.client_name, 'Processo'),
         v_snippet,
         'task',
         now() + interval '1 day');
    END IF;

    -- Dispara notificação WhatsApp assíncrona
    BEGIN
      v_fn_url := 'https://oonteavjxzkovrzktnie.supabase.co/functions/v1/notify-process-movement';
      PERFORM net.http_post(
        url := v_fn_url,
        headers := jsonb_build_object('Content-Type','application/json'),
        body := jsonb_build_object(
          'card_id', v_card.id,
          'company_id', v_card.company_id,
          'movement_id', NEW.id,
          'snippet', v_snippet
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- silencia falha de rede; alerta visual já foi gravado
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_movement_to_process_cards ON public.process_movements;
CREATE TRIGGER trg_propagate_movement_to_process_cards
AFTER INSERT ON public.process_movements
FOR EACH ROW
EXECUTE FUNCTION public.propagate_movement_to_process_cards();

-- Função para marcar movimentações como lidas quando o advogado abre o card
CREATE OR REPLACE FUNCTION public.mark_process_card_movements_read(_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_can_see_process_card(auth.uid(), _card_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.process_cards
     SET unread_movements_count = 0,
         has_unread_movements = false
   WHERE id = _card_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_process_card_movements_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_process_card_movements_read(uuid) TO authenticated;

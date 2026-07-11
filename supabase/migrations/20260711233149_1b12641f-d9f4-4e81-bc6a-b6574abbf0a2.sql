
-- Auto-create process card when lead is moved to a "won" column
CREATE OR REPLACE FUNCTION public.auto_create_process_card_on_won()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  is_won_col BOOLEAN;
  v_area_id UUID;
  v_board_id UUID;
  v_column_id UUID;
  v_area_hint TEXT;
BEGIN
  IF NEW.kanban_column_id IS NULL OR NEW.kanban_column_id IS NOT DISTINCT FROM OLD.kanban_column_id THEN
    RETURN NEW;
  END IF;

  SELECT is_won INTO is_won_col FROM public.kanban_columns WHERE id = NEW.kanban_column_id;
  IF is_won_col IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- avoid duplicate if a card already exists for this lead
  IF EXISTS (SELECT 1 FROM public.process_cards WHERE lead_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_area_hint := COALESCE(NULLIF(trim(NEW.area_direito), ''), NULLIF(trim(NEW.case_area), ''));

  -- Try to match legal_area by name (accent/case insensitive, partial match either direction)
  IF v_area_hint IS NOT NULL THEN
    SELECT id INTO v_area_id
      FROM public.legal_areas
     WHERE company_id = NEW.company_id
       AND is_active = true
       AND (
         unaccent(lower(name)) ILIKE '%' || unaccent(lower(v_area_hint)) || '%'
         OR unaccent(lower(v_area_hint)) ILIKE '%' || unaccent(lower(name)) || '%'
       )
     ORDER BY position ASC
     LIMIT 1;
  END IF;

  -- fallback: first active area of the company
  IF v_area_id IS NULL THEN
    SELECT id INTO v_area_id
      FROM public.legal_areas
     WHERE company_id = NEW.company_id AND is_active = true
     ORDER BY position ASC LIMIT 1;
  END IF;

  IF v_area_id IS NULL THEN
    RETURN NEW; -- no legal area configured, nothing to do
  END IF;

  SELECT id INTO v_board_id
    FROM public.process_boards
   WHERE company_id = NEW.company_id AND legal_area_id = v_area_id
   ORDER BY is_default DESC, position ASC
   LIMIT 1;

  IF v_board_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_column_id
    FROM public.process_board_columns
   WHERE company_id = NEW.company_id AND board_id = v_board_id
   ORDER BY position ASC LIMIT 1;

  INSERT INTO public.process_cards (
    company_id, board_id, column_id, lead_id,
    client_name, cnj_number, title, responsible_id, priority, created_by, position
  ) VALUES (
    NEW.company_id, v_board_id, v_column_id, NEW.id,
    NEW.name, NULLIF(trim(NEW.processo_numero), ''),
    COALESCE(NULLIF(trim(NEW.tipo_caso_detalhado), ''), NEW.name),
    NEW.assigned_to, 'normal', COALESCE(NEW.assigned_to, auth.uid()), 0
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_process_card_on_won ON public.leads;
CREATE TRIGGER trg_auto_create_process_card_on_won
AFTER UPDATE OF kanban_column_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_process_card_on_won();

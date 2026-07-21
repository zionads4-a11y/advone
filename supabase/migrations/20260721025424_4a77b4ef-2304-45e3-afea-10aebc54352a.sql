
-- Shift Agendado/Ganho/Perdido one slot to the right, put Urgente in position 6
UPDATE public.kanban_columns SET position = 9 WHERE is_lost = true;
UPDATE public.kanban_columns SET position = 8 WHERE is_won  = true;
UPDATE public.kanban_columns SET position = 7 WHERE name ILIKE 'Agendado' AND is_won = false AND is_lost = false;
UPDATE public.kanban_columns SET position = 6 WHERE is_urgent = true;

CREATE OR REPLACE FUNCTION public.create_default_kanban_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_board_id uuid;
BEGIN
  INSERT INTO public.kanban_boards (company_id, name, description, color, is_default, position)
  VALUES (NEW.id, 'Pipeline Comercial', 'Funil principal de leads', '#0ea5a4', true, 0)
  RETURNING id INTO v_board_id;

  INSERT INTO public.kanban_columns (company_id, board_id, name, color, position, is_won, is_lost, is_urgent) VALUES
    (NEW.id, v_board_id, 'Em Atendimento', '#f59e0b', 0, false, false, false),
    (NEW.id, v_board_id, '1º Follow-UP',   '#60a5fa', 1, false, false, false),
    (NEW.id, v_board_id, '2º Follow-UP',   '#93c5fd', 2, false, false, false),
    (NEW.id, v_board_id, '3º Follow-UP',   '#a78bfa', 3, false, false, false),
    (NEW.id, v_board_id, '4º Follow-UP',   '#c084fc', 4, false, false, false),
    (NEW.id, v_board_id, '5º Follow-UP',   '#d8b4fe', 5, false, false, false),
    (NEW.id, v_board_id, 'Urgente',        '#dc2626', 6, false, false, true),
    (NEW.id, v_board_id, 'Agendado',       '#10b981', 7, false, false, false),
    (NEW.id, v_board_id, 'Ganho',          '#22c55e', 8, true,  false, false),
    (NEW.id, v_board_id, 'Perdido',        '#ef4444', 9, false, true,  false);
  RETURN NEW;
END;
$function$;

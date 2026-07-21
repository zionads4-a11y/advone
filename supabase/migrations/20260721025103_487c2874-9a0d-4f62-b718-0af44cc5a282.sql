
ALTER TABLE public.kanban_columns ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

INSERT INTO public.kanban_columns (company_id, board_id, name, color, position, is_won, is_lost, is_urgent)
SELECT b.company_id, b.id, 'Urgente', '#dc2626', -1, false, false, true
  FROM public.kanban_boards b
  JOIN public.companies co ON co.id = b.company_id
 WHERE b.is_default = true
   AND NOT EXISTS (
     SELECT 1 FROM public.kanban_columns c
      WHERE c.board_id = b.id AND c.is_urgent = true
   );

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
    (NEW.id, v_board_id, 'Urgente',        '#dc2626', -1, false, false, true),
    (NEW.id, v_board_id, 'Em Atendimento', '#f59e0b', 0, false, false, false),
    (NEW.id, v_board_id, '1º Follow-UP',   '#60a5fa', 1, false, false, false),
    (NEW.id, v_board_id, '2º Follow-UP',   '#93c5fd', 2, false, false, false),
    (NEW.id, v_board_id, '3º Follow-UP',   '#a78bfa', 3, false, false, false),
    (NEW.id, v_board_id, '4º Follow-UP',   '#c084fc', 4, false, false, false),
    (NEW.id, v_board_id, '5º Follow-UP',   '#d8b4fe', 5, false, false, false),
    (NEW.id, v_board_id, 'Agendado',       '#10b981', 6, false, false, false),
    (NEW.id, v_board_id, 'Ganho',          '#22c55e', 7, true,  false, false),
    (NEW.id, v_board_id, 'Perdido',        '#ef4444', 8, false, true,  false);
  RETURN NEW;
END;
$function$;

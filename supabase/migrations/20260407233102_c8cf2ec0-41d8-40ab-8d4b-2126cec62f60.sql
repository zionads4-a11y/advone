
-- Reset leads
UPDATE public.leads SET kanban_column_id = NULL;
DELETE FROM public.kanban_columns;

-- Recreate for all companies
INSERT INTO public.kanban_columns (company_id, name, color, position, is_won, is_lost)
SELECT c.id, col.name, col.color, col.position, col.is_won, col.is_lost
FROM public.companies c
CROSS JOIN (VALUES
  ('1º Contato', '#3b82f6', 0, false, false),
  ('2º Contato', '#60a5fa', 1, false, false),
  ('3º Contato', '#93c5fd', 2, false, false),
  ('4º Contato', '#a78bfa', 3, false, false),
  ('5º Contato', '#c084fc', 4, false, false),
  ('Em Atendimento', '#f59e0b', 5, false, false),
  ('Agendado', '#10b981', 6, true, false),
  ('Ganho', '#22c55e', 7, true, false),
  ('Perdido', '#ef4444', 8, false, true)
) AS col(name, color, position, is_won, is_lost);

-- Reassign leads to 1º Contato
UPDATE public.leads l SET kanban_column_id = (
  SELECT kc.id FROM public.kanban_columns kc WHERE kc.company_id = l.company_id AND kc.position = 0 LIMIT 1
);

-- Update trigger function
CREATE OR REPLACE FUNCTION public.setup_default_company_structure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.kanban_columns (company_id, name, color, position, is_won, is_lost) VALUES
    (NEW.id, '1º Contato', '#3b82f6', 0, false, false),
    (NEW.id, '2º Contato', '#60a5fa', 1, false, false),
    (NEW.id, '3º Contato', '#93c5fd', 2, false, false),
    (NEW.id, '4º Contato', '#a78bfa', 3, false, false),
    (NEW.id, '5º Contato', '#c084fc', 4, false, false),
    (NEW.id, 'Em Atendimento', '#f59e0b', 5, false, false),
    (NEW.id, 'Agendado', '#10b981', 6, true, false),
    (NEW.id, 'Ganho', '#22c55e', 7, true, false),
    (NEW.id, 'Perdido', '#ef4444', 8, false, true);

  IF NEW.business_hours IS NULL THEN
    NEW.business_hours := '{
      "monday": [{"open": "08:00", "close": "12:00"}, {"open": "13:00", "close": "18:00"}],
      "tuesday": [{"open": "08:00", "close": "12:00"}, {"open": "13:00", "close": "18:00"}],
      "wednesday": [{"open": "08:00", "close": "12:00"}, {"open": "13:00", "close": "18:00"}],
      "thursday": [{"open": "08:00", "close": "12:00"}, {"open": "13:00", "close": "18:00"}],
      "friday": [{"open": "08:00", "close": "12:00"}, {"open": "13:00", "close": "18:00"}],
      "saturday": [],
      "sunday": []
    }'::jsonb;
  END IF;
  RETURN NEW;
END;
$function$;

-- Separar a função em duas: BEFORE (defaults) e AFTER (FKs)
CREATE OR REPLACE FUNCTION public.set_default_business_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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

CREATE OR REPLACE FUNCTION public.create_default_kanban_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  RETURN NEW;
END;
$function$;

-- Remover trigger antigo e criar os dois novos
DROP TRIGGER IF EXISTS on_company_created ON public.companies;

CREATE TRIGGER set_company_defaults
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_default_business_hours();

CREATE TRIGGER create_company_kanban
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.create_default_kanban_columns();
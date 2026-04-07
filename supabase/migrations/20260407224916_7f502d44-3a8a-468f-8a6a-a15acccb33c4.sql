
CREATE OR REPLACE FUNCTION public.setup_default_company_structure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create default Kanban columns
  INSERT INTO public.kanban_columns (company_id, name, color, position, is_won, is_lost) VALUES
    (NEW.id, 'Novo Lead', '#3b82f6', 0, false, false),
    (NEW.id, 'Em Atendimento', '#f59e0b', 1, false, false),
    (NEW.id, 'Interessado', '#8b5cf6', 2, false, false),
    (NEW.id, 'Agendado', '#10b981', 3, true, false),
    (NEW.id, 'Não respondeu', '#6b7280', 4, false, false),
    (NEW.id, 'Perdido', '#ef4444', 5, false, true);

  -- Set default business hours if not provided
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

CREATE TRIGGER on_company_created
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.setup_default_company_structure();

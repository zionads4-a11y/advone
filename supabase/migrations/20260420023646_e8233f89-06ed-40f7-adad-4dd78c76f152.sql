
-- 1) Atualiza a função de provisionamento para novas empresas
CREATE OR REPLACE FUNCTION public.setup_default_company_structure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.kanban_columns (company_id, name, color, position, is_won, is_lost) VALUES
    (NEW.id, 'Em Atendimento', '#f59e0b', 0, false, false),
    (NEW.id, '1º Follow-UP',   '#60a5fa', 1, false, false),
    (NEW.id, '2º Follow-UP',   '#93c5fd', 2, false, false),
    (NEW.id, '3º Follow-UP',   '#a78bfa', 3, false, false),
    (NEW.id, '4º Follow-UP',   '#c084fc', 4, false, false),
    (NEW.id, '5º Follow-UP',   '#d8b4fe', 5, false, false),
    (NEW.id, 'Agendado',       '#10b981', 6, false, false),
    (NEW.id, 'Ganho',          '#22c55e', 7, true,  false),
    (NEW.id, 'Perdido',        '#ef4444', 8, false, true);

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
    (NEW.id, 'Em Atendimento', '#f59e0b', 0, false, false),
    (NEW.id, '1º Follow-UP',   '#60a5fa', 1, false, false),
    (NEW.id, '2º Follow-UP',   '#93c5fd', 2, false, false),
    (NEW.id, '3º Follow-UP',   '#a78bfa', 3, false, false),
    (NEW.id, '4º Follow-UP',   '#c084fc', 4, false, false),
    (NEW.id, '5º Follow-UP',   '#d8b4fe', 5, false, false),
    (NEW.id, 'Agendado',       '#10b981', 6, false, false),
    (NEW.id, 'Ganho',          '#22c55e', 7, true,  false),
    (NEW.id, 'Perdido',        '#ef4444', 8, false, true);
  RETURN NEW;
END;
$function$;

-- 2) Migra empresas existentes: recria as colunas e remapeia leads
DO $$
DECLARE
  comp RECORD;
  new_em_atendimento_id uuid;
  new_agendado_id uuid;
  new_ganho_id uuid;
  new_perdido_id uuid;
BEGIN
  FOR comp IN SELECT id FROM public.companies LOOP
    -- Captura ids antigos relevantes para preservar Agendado/Ganho/Perdido
    DECLARE
      old_agendado_ids uuid[];
      old_ganho_ids    uuid[];
      old_perdido_ids  uuid[];
    BEGIN
      SELECT array_agg(id) INTO old_agendado_ids
        FROM public.kanban_columns
        WHERE company_id = comp.id AND name ILIKE 'Agendado';
      SELECT array_agg(id) INTO old_ganho_ids
        FROM public.kanban_columns
        WHERE company_id = comp.id AND (is_won = true AND name NOT ILIKE 'Agendado');
      SELECT array_agg(id) INTO old_perdido_ids
        FROM public.kanban_columns
        WHERE company_id = comp.id AND is_lost = true;

      -- Solta a FK temporariamente seria complexo; em vez disso vamos:
      -- (a) inserir as novas colunas com sufixo temporário,
      -- (b) remapear leads pra essas novas,
      -- (c) deletar as antigas,
      -- (d) renomear as novas.

      INSERT INTO public.kanban_columns (company_id, name, color, position, is_won, is_lost)
      VALUES
        (comp.id, '__NEW_Em Atendimento', '#f59e0b', 100, false, false),
        (comp.id, '__NEW_1º Follow-UP',   '#60a5fa', 101, false, false),
        (comp.id, '__NEW_2º Follow-UP',   '#93c5fd', 102, false, false),
        (comp.id, '__NEW_3º Follow-UP',   '#a78bfa', 103, false, false),
        (comp.id, '__NEW_4º Follow-UP',   '#c084fc', 104, false, false),
        (comp.id, '__NEW_5º Follow-UP',   '#d8b4fe', 105, false, false),
        (comp.id, '__NEW_Agendado',       '#10b981', 106, false, false),
        (comp.id, '__NEW_Ganho',          '#22c55e', 107, true,  false),
        (comp.id, '__NEW_Perdido',        '#ef4444', 108, false, true);

      SELECT id INTO new_em_atendimento_id FROM public.kanban_columns WHERE company_id = comp.id AND name = '__NEW_Em Atendimento';
      SELECT id INTO new_agendado_id       FROM public.kanban_columns WHERE company_id = comp.id AND name = '__NEW_Agendado';
      SELECT id INTO new_ganho_id          FROM public.kanban_columns WHERE company_id = comp.id AND name = '__NEW_Ganho';
      SELECT id INTO new_perdido_id        FROM public.kanban_columns WHERE company_id = comp.id AND name = '__NEW_Perdido';

      -- Remapeia leads
      IF old_agendado_ids IS NOT NULL THEN
        UPDATE public.leads SET kanban_column_id = new_agendado_id
          WHERE company_id = comp.id AND kanban_column_id = ANY(old_agendado_ids);
      END IF;
      IF old_ganho_ids IS NOT NULL THEN
        UPDATE public.leads SET kanban_column_id = new_ganho_id
          WHERE company_id = comp.id AND kanban_column_id = ANY(old_ganho_ids);
      END IF;
      IF old_perdido_ids IS NOT NULL THEN
        UPDATE public.leads SET kanban_column_id = new_perdido_id
          WHERE company_id = comp.id AND kanban_column_id = ANY(old_perdido_ids);
      END IF;

      -- Demais leads vão para "Em Atendimento"
      UPDATE public.leads
        SET kanban_column_id = new_em_atendimento_id
        WHERE company_id = comp.id
          AND kanban_column_id IN (
            SELECT id FROM public.kanban_columns
            WHERE company_id = comp.id AND name NOT LIKE '__NEW_%'
          );

      -- Remove colunas antigas
      DELETE FROM public.kanban_columns
        WHERE company_id = comp.id AND name NOT LIKE '__NEW_%';

      -- Renomeia as novas (remove prefixo) e ajusta posição
      UPDATE public.kanban_columns SET name = replace(name, '__NEW_', ''), position = position - 100
        WHERE company_id = comp.id AND name LIKE '__NEW_%';
    END;
  END LOOP;
END $$;

-- 3) Trigger: ao preencher processo_numero, mover lead para a coluna "Ganho" (is_won)
CREATE OR REPLACE FUNCTION public.move_to_won_on_processo_numero()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  won_col_id uuid;
BEGIN
  IF NEW.processo_numero IS NOT NULL
     AND length(trim(NEW.processo_numero)) > 0
     AND (OLD.processo_numero IS NULL OR length(trim(OLD.processo_numero)) = 0) THEN
    SELECT id INTO won_col_id
      FROM public.kanban_columns
      WHERE company_id = NEW.company_id AND is_won = true
      ORDER BY position DESC
      LIMIT 1;
    IF won_col_id IS NOT NULL THEN
      NEW.kanban_column_id := won_col_id;
      NEW.status := 'won';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_move_to_won_on_processo_numero ON public.leads;
CREATE TRIGGER trg_move_to_won_on_processo_numero
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.move_to_won_on_processo_numero();

-- 4) Trigger: ao criar lembrete do tipo "meeting", mover lead para "Agendado"
CREATE OR REPLACE FUNCTION public.move_to_agendado_on_meeting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  agendado_col_id uuid;
BEGIN
  IF NEW.reminder_type = 'meeting' AND NEW.lead_id IS NOT NULL THEN
    SELECT id INTO agendado_col_id
      FROM public.kanban_columns
      WHERE company_id = NEW.company_id AND name ILIKE 'Agendado'
      LIMIT 1;
    IF agendado_col_id IS NOT NULL THEN
      UPDATE public.leads
        SET kanban_column_id = agendado_col_id, status = 'qualified'
        WHERE id = NEW.lead_id
          AND (kanban_column_id IS NULL OR kanban_column_id != agendado_col_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_move_to_agendado_on_meeting ON public.lead_reminders;
CREATE TRIGGER trg_move_to_agendado_on_meeting
  AFTER INSERT ON public.lead_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.move_to_agendado_on_meeting();

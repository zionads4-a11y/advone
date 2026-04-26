-- 1) Adiciona flag na tabela de colunas
ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS is_meeting_held BOOLEAN NOT NULL DEFAULT false;

-- 2) Marca colunas existentes "Reunião Realizada"
UPDATE public.kanban_columns
SET is_meeting_held = true
WHERE name ILIKE 'Reuni%o Realizada%';

-- 3) Função de gatilho: cria/cancela meeting_charges conforme movimentação
CREATE OR REPLACE FUNCTION public.handle_meeting_held_column_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_held BOOLEAN := false;
  is_held BOOLEAN := false;
  meeting_at_ts TIMESTAMPTZ;
  existing_charge_id UUID;
BEGIN
  -- Só age quando muda de coluna
  IF NEW.kanban_column_id IS NOT DISTINCT FROM OLD.kanban_column_id THEN
    RETURN NEW;
  END IF;

  -- Identifica se origem/destino são "Reunião Realizada"
  IF OLD.kanban_column_id IS NOT NULL THEN
    SELECT is_meeting_held INTO was_held FROM public.kanban_columns WHERE id = OLD.kanban_column_id;
  END IF;
  IF NEW.kanban_column_id IS NOT NULL THEN
    SELECT is_meeting_held INTO is_held FROM public.kanban_columns WHERE id = NEW.kanban_column_id;
  END IF;

  was_held := COALESCE(was_held, false);
  is_held  := COALESCE(is_held, false);

  -- ENTROU na coluna Reunião Realizada → cria cobrança (se não houver pendente/faturada)
  IF is_held AND NOT was_held THEN
    -- evita duplicar se já existe cobrança ativa para o lead
    SELECT id INTO existing_charge_id
      FROM public.meeting_charges
      WHERE lead_id = NEW.id
        AND status IN ('pending','invoiced','paid')
      ORDER BY created_at DESC
      LIMIT 1;

    IF existing_charge_id IS NULL THEN
      -- usa a data da reunião agendada mais recente, senão agora()
      SELECT due_at INTO meeting_at_ts
        FROM public.lead_reminders
        WHERE lead_id = NEW.id AND reminder_type = 'meeting'
        ORDER BY due_at DESC
        LIMIT 1;
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

  -- SAIU da coluna Reunião Realizada → cancela cobranças pendentes (estorno)
  -- (não cancela se já foi faturada/paga — nesse caso fica histórico)
  IF was_held AND NOT is_held THEN
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

DROP TRIGGER IF EXISTS trg_handle_meeting_held_column ON public.leads;
CREATE TRIGGER trg_handle_meeting_held_column
AFTER UPDATE OF kanban_column_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_meeting_held_column_change();
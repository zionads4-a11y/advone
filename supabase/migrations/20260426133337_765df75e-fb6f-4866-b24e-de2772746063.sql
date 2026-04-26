-- Tabela de histórico de movimentações no Kanban
CREATE TABLE public.lead_kanban_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  company_id UUID NOT NULL,
  from_column_id UUID,
  from_column_name TEXT,
  to_column_id UUID,
  to_column_name TEXT,
  moved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_kanban_history_lead ON public.lead_kanban_history(lead_id, created_at DESC);
CREATE INDEX idx_lead_kanban_history_company ON public.lead_kanban_history(company_id, created_at DESC);

ALTER TABLE public.lead_kanban_history ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "Admins view all kanban history"
ON public.lead_kanban_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'member'::app_role));

-- Usuários da empresa veem o histórico da própria empresa
CREATE POLICY "Company users view their kanban history"
ON public.lead_kanban_history
FOR SELECT
TO authenticated
USING (user_belongs_to_company(auth.uid(), company_id));

-- Trigger function: registra movimentações
CREATE OR REPLACE FUNCTION public.log_lead_kanban_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_name TEXT;
  to_name TEXT;
BEGIN
  -- Só registra se mudou de coluna
  IF NEW.kanban_column_id IS DISTINCT FROM OLD.kanban_column_id THEN
    SELECT name INTO from_name FROM public.kanban_columns WHERE id = OLD.kanban_column_id;
    SELECT name INTO to_name FROM public.kanban_columns WHERE id = NEW.kanban_column_id;

    INSERT INTO public.lead_kanban_history (
      lead_id, company_id,
      from_column_id, from_column_name,
      to_column_id, to_column_name,
      moved_by
    ) VALUES (
      NEW.id, NEW.company_id,
      OLD.kanban_column_id, from_name,
      NEW.kanban_column_id, to_name,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_lead_kanban_move
AFTER UPDATE OF kanban_column_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_kanban_move();
-- ============== PERSONAL TASKS ==============
CREATE TABLE public.personal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  assigned_to UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa','media','alta')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','cancelada')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personal_tasks_assigned ON public.personal_tasks(assigned_to, status);
CREATE INDEX idx_personal_tasks_company ON public.personal_tasks(company_id, status);

ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all tasks" ON public.personal_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes manage company tasks" ON public.personal_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Users see their own or assigned tasks" ON public.personal_tasks
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_company(auth.uid(), company_id)
    AND (created_by = auth.uid() OR assigned_to = auth.uid())
  );

CREATE POLICY "Users create own tasks in their company" ON public.personal_tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Users update own or assigned tasks" ON public.personal_tasks
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id) AND (created_by = auth.uid() OR assigned_to = auth.uid()))
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Users delete own tasks" ON public.personal_tasks
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER trg_personal_tasks_updated
  BEFORE UPDATE ON public.personal_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== KANBAN BOARDS ==============
CREATE TABLE public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#0ea5a4',
  icon TEXT NOT NULL DEFAULT 'Kanban',
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE INDEX idx_kanban_boards_company ON public.kanban_boards(company_id);

ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage boards" ON public.kanban_boards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gerentes manage company boards" ON public.kanban_boards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'gerente'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Members manage company boards" ON public.kanban_boards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role) AND user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (has_role(auth.uid(), 'member'::app_role) AND user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users view boards" ON public.kanban_boards
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE TRIGGER trg_kanban_boards_updated
  BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== KANBAN COLUMNS link ==============
ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS board_id UUID;

CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON public.kanban_columns(board_id);

-- ============== Backfill: cria board padrão para empresas existentes ==============
INSERT INTO public.kanban_boards (company_id, name, description, color, is_default, position)
SELECT DISTINCT c.id, 'Pipeline Comercial', 'Funil principal de leads', '#0ea5a4', true, 0
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.kanban_boards b WHERE b.company_id = c.id AND b.is_default = true
);

UPDATE public.kanban_columns kc
SET board_id = b.id
FROM public.kanban_boards b
WHERE kc.company_id = b.company_id
  AND b.is_default = true
  AND kc.board_id IS NULL;

-- ============== ENUM update ==============
-- Atualiza trigger de provisionamento para criar board default ao criar empresa nova
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

  INSERT INTO public.kanban_columns (company_id, board_id, name, color, position, is_won, is_lost) VALUES
    (NEW.id, v_board_id, 'Em Atendimento', '#f59e0b', 0, false, false),
    (NEW.id, v_board_id, '1º Follow-UP',   '#60a5fa', 1, false, false),
    (NEW.id, v_board_id, '2º Follow-UP',   '#93c5fd', 2, false, false),
    (NEW.id, v_board_id, '3º Follow-UP',   '#a78bfa', 3, false, false),
    (NEW.id, v_board_id, '4º Follow-UP',   '#c084fc', 4, false, false),
    (NEW.id, v_board_id, '5º Follow-UP',   '#d8b4fe', 5, false, false),
    (NEW.id, v_board_id, 'Agendado',       '#10b981', 6, false, false),
    (NEW.id, v_board_id, 'Ganho',          '#22c55e', 7, true,  false),
    (NEW.id, v_board_id, 'Perdido',        '#ef4444', 8, false, true);
  RETURN NEW;
END;
$function$;
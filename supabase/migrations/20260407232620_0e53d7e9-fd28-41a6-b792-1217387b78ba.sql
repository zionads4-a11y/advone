
-- Reset all existing kanban columns to match cadence structure
-- First, remove kanban_column_id from leads to avoid FK issues
UPDATE public.leads SET kanban_column_id = NULL;

-- Delete all existing kanban columns
DELETE FROM public.kanban_columns;

-- Recreate standard columns for all existing companies
INSERT INTO public.kanban_columns (company_id, name, color, position, is_won, is_lost)
SELECT 
  c.id,
  col.name,
  col.color,
  col.position,
  col.is_won,
  col.is_lost
FROM public.companies c
CROSS JOIN (VALUES
  ('Novo Lead', '#3b82f6', 0, false, false),
  ('Em Atendimento', '#f59e0b', 1, false, false),
  ('Interessado', '#8b5cf6', 2, false, false),
  ('Agendado', '#10b981', 3, true, false),
  ('Não respondeu', '#6b7280', 4, false, false),
  ('Perdido', '#ef4444', 5, false, true)
) AS col(name, color, position, is_won, is_lost);

-- Reassign all leads to "Novo Lead" (position 0) of their company
UPDATE public.leads l
SET kanban_column_id = (
  SELECT kc.id FROM public.kanban_columns kc 
  WHERE kc.company_id = l.company_id AND kc.position = 0
  LIMIT 1
);

ALTER TABLE public.personal_tasks DROP CONSTRAINT personal_tasks_status_check;
ALTER TABLE public.personal_tasks ADD CONSTRAINT personal_tasks_status_check CHECK (status = ANY (ARRAY['aguardando_aceite'::text,'pendente'::text,'em_andamento'::text,'concluida'::text,'cancelada'::text,'recusada'::text]));
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE public.personal_tasks ADD COLUMN IF NOT EXISTS rejection_reason text;
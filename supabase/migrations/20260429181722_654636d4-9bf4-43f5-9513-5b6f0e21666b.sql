ALTER TABLE public.monitored_processes 
ADD COLUMN IF NOT EXISTS escavador_monitoring_id BIGINT,
ADD COLUMN IF NOT EXISTS callback_registered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_monitored_processes_escavador_monitoring_id 
ON public.monitored_processes(escavador_monitoring_id);

CREATE INDEX IF NOT EXISTS idx_monitored_processes_numero_cnj 
ON public.monitored_processes(numero_cnj);

-- Permitir que TODOS os usuários da empresa (member, operador, cliente) cadastrem
-- e atualizem processos monitorados e cases vinculados ao seu lead/empresa.

-- monitored_processes: INSERT e UPDATE para qualquer usuário pertencente à empresa
DROP POLICY IF EXISTS "Company users can insert monitored processes" ON public.monitored_processes;
CREATE POLICY "Company users can insert monitored processes"
ON public.monitored_processes
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company users can update monitored processes" ON public.monitored_processes;
CREATE POLICY "Company users can update monitored processes"
ON public.monitored_processes
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company users can view monitored processes" ON public.monitored_processes;
CREATE POLICY "Company users can view monitored processes"
ON public.monitored_processes
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(auth.uid(), company_id));

-- cases: permitir UPDATE para operador e qualquer usuário da empresa
DROP POLICY IF EXISTS "Company users can update cases" ON public.cases;
CREATE POLICY "Company users can update cases"
ON public.cases
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(auth.uid(), company_id))
WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- process_movements: garantir leitura para qualquer usuário da empresa
DROP POLICY IF EXISTS "Company users can view process movements" ON public.process_movements;
CREATE POLICY "Company users can view process movements"
ON public.process_movements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.monitored_processes mp
    WHERE mp.id = process_movements.monitored_process_id
      AND public.user_belongs_to_company(auth.uid(), mp.company_id)
  )
);

DROP POLICY IF EXISTS "Company users can update process movements" ON public.process_movements;
CREATE POLICY "Company users can update process movements"
ON public.process_movements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.monitored_processes mp
    WHERE mp.id = process_movements.monitored_process_id
      AND public.user_belongs_to_company(auth.uid(), mp.company_id)
  )
)
WITH CHECK (true);

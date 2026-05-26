-- Alterar restrições para cascata para permitir exclusão
ALTER TABLE public.closed_contracts 
DROP CONSTRAINT IF EXISTS closed_contracts_company_id_fkey,
ADD CONSTRAINT closed_contracts_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.commission_charges 
DROP CONSTRAINT IF EXISTS commission_charges_company_id_fkey,
ADD CONSTRAINT commission_charges_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.fraud_alerts 
DROP CONSTRAINT IF EXISTS fraud_alerts_company_id_fkey,
ADD CONSTRAINT fraud_alerts_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Enforce plan_gestao limits: max 3 active legal areas per company; max 3 operators per area
CREATE OR REPLACE FUNCTION public.enforce_gestao_area_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_count int;
BEGIN
  SELECT billing_model INTO v_plan FROM public.companies WHERE id = NEW.company_id;
  IF v_plan = 'plan_gestao' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.legal_areas
     WHERE company_id = NEW.company_id
       AND is_active = true
       AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF v_count >= 3 AND COALESCE(NEW.is_active, true) THEN
      RAISE EXCEPTION 'GESTAO_AREA_LIMIT: O plano AdvOne Gestão permite até 3 áreas de atuação. Faça upgrade para o plano Enterprise para cadastrar áreas ilimitadas.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_gestao_area_limits ON public.legal_areas;
CREATE TRIGGER trg_enforce_gestao_area_limits
BEFORE INSERT OR UPDATE OF is_active ON public.legal_areas
FOR EACH ROW EXECUTE FUNCTION public.enforce_gestao_area_limits();


CREATE OR REPLACE FUNCTION public.enforce_gestao_user_per_area_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company uuid;
  v_plan text;
  v_count int;
BEGIN
  SELECT company_id INTO v_company FROM public.legal_areas WHERE id = NEW.area_id;
  IF v_company IS NULL THEN RETURN NEW; END IF;

  SELECT billing_model INTO v_plan FROM public.companies WHERE id = v_company;
  IF v_plan = 'plan_gestao' THEN
    SELECT COUNT(DISTINCT user_id) INTO v_count
      FROM public.user_legal_areas
     WHERE area_id = NEW.area_id
       AND user_id <> NEW.user_id;
    IF v_count >= 3 THEN
      RAISE EXCEPTION 'GESTAO_USER_PER_AREA_LIMIT: O plano AdvOne Gestão permite até 3 advogados por área. Faça upgrade para o plano Enterprise para adicionar equipe ilimitada.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_gestao_user_per_area_limit ON public.user_legal_areas;
CREATE TRIGGER trg_enforce_gestao_user_per_area_limit
BEFORE INSERT ON public.user_legal_areas
FOR EACH ROW EXECUTE FUNCTION public.enforce_gestao_user_per_area_limit();
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyOffice {
  id: string;
  company_id: string;
  name: string;
  address: string;
  complement: string | null;
  reference_point: string | null;
  maps_url: string | null;
  is_active: boolean;
  position: number;
}

export function useCompanyOffices(companyId: string | undefined) {
  const [offices, setOffices] = useState<CompanyOffice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setOffices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("company_offices")
      .select("*")
      .eq("company_id", companyId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (!error && data) setOffices(data as CompanyOffice[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { offices, loading, reload: load };
}

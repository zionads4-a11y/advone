import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ClientCompany {
  company_id: string;
}

export function useUserCompanies() {
  const { user, userRole } = useAuth();
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isClient = userRole === "client" || userRole === "gerente" || userRole === "operador";

  useEffect(() => {
    if (!user) {
      setCompanyIds([]);
      setLoading(false);
      return;
    }

    if (!isClient) {
      setCompanyIds([]);
      setLoading(false);
      return;
    }

    const fetchCompanies = async () => {
      const { data } = await supabase
        .from("client_companies")
        .select("company_id")
        .eq("user_id", user.id);

      if (data) {
        setCompanyIds(data.map((d: ClientCompany) => d.company_id));
      }
      setLoading(false);
    };

    fetchCompanies();
  }, [user, isClient]);

  const filterByCompany = useCallback(
    (query: any) => {
      if (isClient && companyIds.length > 0) {
        return query.in("company_id", companyIds);
      }
      return query;
    },
    [isClient, companyIds]
  );

  return { companyIds, isClient, loading, filterByCompany };
}

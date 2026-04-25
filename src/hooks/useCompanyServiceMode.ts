import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useAuth } from "@/hooks/useAuth";

export type ServiceMode = "full" | "ai_only";

/**
 * Returns the service_mode of the user's primary company.
 * For admin/member (agency staff) returns "full" (they see everything).
 * For gerente/operador/client returns the mode of their first linked company.
 */
export function useCompanyServiceMode() {
  const { userRole } = useAuth();
  const { companyIds, loading: companiesLoading } = useUserCompanies();
  const [serviceMode, setServiceMode] = useState<ServiceMode>("full");
  const [loading, setLoading] = useState(true);

  const isAgencyStaff = userRole === "admin" || userRole === "member";

  useEffect(() => {
    if (isAgencyStaff) {
      setServiceMode("full");
      setLoading(false);
      return;
    }

    if (companiesLoading) return;

    if (companyIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchMode = async () => {
      const { data } = await supabase
        .from("companies")
        .select("service_mode")
        .eq("id", companyIds[0])
        .maybeSingle();

      if (data?.service_mode === "ai_only") {
        setServiceMode("ai_only");
      } else {
        setServiceMode("full");
      }
      setLoading(false);
    };

    fetchMode();
  }, [companyIds, companiesLoading, isAgencyStaff]);

  return { serviceMode, isAiOnly: serviceMode === "ai_only", loading };
}

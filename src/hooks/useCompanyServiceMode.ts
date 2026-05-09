import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useAuth } from "@/hooks/useAuth";
import { type BillingModel } from "@/lib/billingModels";

export type ServiceMode = "full" | "ai_only";

/**
 * Returns the service_mode and billing_model of the user's primary company.
 * For admin/member (agency staff) returns "full" (they see everything).
 * For gerente/operador/client returns the mode of their first linked company.
 */
export function useCompanyServiceMode() {
  const { userRole } = useAuth();
  const { companyIds, loading: companiesLoading } = useUserCompanies();
  const [serviceMode, setServiceMode] = useState<ServiceMode>("full");
  const [billingModel, setBillingModel] = useState<BillingModel | null>(null);
  const [loading, setLoading] = useState(true);

  const isAgencyStaff = userRole === "admin" || userRole === "member";

  useEffect(() => {
    let mounted = true;

    if (isAgencyStaff) {
      setServiceMode("full");
      setBillingModel("plan_completo"); // Admins see everything
      setLoading(false);
      return;
    }

    if (companiesLoading) return;

    if (companyIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchMode = async () => {
      try {
        const { data } = await supabase
          .from("companies")
          .select("service_mode, billing_model")
          .eq("id", companyIds[0])
          .maybeSingle();

        if (!mounted) return;
        
        if (data) {
          setServiceMode(data.service_mode as ServiceMode);
          setBillingModel(data.billing_model as BillingModel);
        }
      } catch (err) {
        console.error("Service mode fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMode();

    return () => {
      mounted = false;
    };
  }, [companyIds, companiesLoading, isAgencyStaff]);

  return { 
    serviceMode, 
    isAiOnly: serviceMode === "ai_only", 
    billingModel,
    isPlanCompleto: billingModel === "plan_completo" || billingModel === "plan_zionads",
    loading 
  };
}

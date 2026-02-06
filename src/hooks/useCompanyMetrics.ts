import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompanyMetrics {
  leads: number;
  campaigns: number;
  trackingLinks: number;
}

export function useCompanyMetrics(companyIds: string[]) {
  const [metrics, setMetrics] = useState<Record<string, CompanyMetrics>>({});

  useEffect(() => {
    if (companyIds.length === 0) {
      setMetrics({});
      return;
    }

    const fetchMetrics = async () => {
      const [leadsRes, campaignsRes, linksRes] = await Promise.all([
        supabase.from("leads").select("company_id", { count: "exact", head: false }).in("company_id", companyIds),
        supabase.from("campaigns").select("company_id", { count: "exact", head: false }).in("company_id", companyIds),
        supabase.from("tracking_links").select("company_id", { count: "exact", head: false }).in("company_id", companyIds),
      ]);

      const result: Record<string, CompanyMetrics> = {};

      // Initialize all companies with 0
      companyIds.forEach((id) => {
        result[id] = { leads: 0, campaigns: 0, trackingLinks: 0 };
      });

      // Count leads per company
      leadsRes.data?.forEach((row) => {
        if (result[row.company_id]) result[row.company_id].leads++;
      });

      // Count campaigns per company
      campaignsRes.data?.forEach((row) => {
        if (result[row.company_id]) result[row.company_id].campaigns++;
      });

      // Count tracking links per company
      linksRes.data?.forEach((row) => {
        if (result[row.company_id]) result[row.company_id].trackingLinks++;
      });

      setMetrics(result);
    };

    fetchMetrics();
  }, [companyIds.join(",")]);

  return metrics;
}

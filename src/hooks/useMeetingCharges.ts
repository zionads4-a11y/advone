import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MeetingCharge {
  id: string;
  company_id: string;
  lead_id: string | null;
  reminder_id: string | null;
  lead_name: string;
  meeting_at: string;
  confirmed_at: string;
  amount: number;
  status: "pending" | "invoiced" | "paid" | "canceled";
  asaas_payment_id: string | null;
  asaas_invoice_url: string | null;
  invoice_month: string | null;
  invoiced_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useMeetingCharges() {
  const { userRole } = useAuth();
  const [charges, setCharges] = useState<MeetingCharge[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  // Faturamento por reunião é EXCLUSIVO do super admin (admin/member)
  const isAdmin = userRole === "admin" || userRole === "member";
  const canView = isAdmin;

  const fetchData = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [chargesRes, companiesRes] = await Promise.all([
      supabase
        .from("meeting_charges")
        .select("*")
        .order("meeting_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
    ]);

    setCharges((chargesRes.data || []) as MeetingCharge[]);
    const map: Record<string, string> = {};
    (companiesRes.data || []).forEach((c) => {
      map[c.id] = c.name;
    });
    setCompanyNames(map);
    setLoading(false);
  }, [canView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCharges = companyFilter === "all"
    ? charges
    : charges.filter((c) => c.company_id === companyFilter);

  const totalMeetings = filteredCharges.length;
  const totalRevenue = filteredCharges.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const totalPending = filteredCharges
    .filter((c) => c.status === "pending")
    .reduce((acc, c) => acc + Number(c.amount), 0);
  const totalInvoiced = filteredCharges
    .filter((c) => c.status === "invoiced")
    .reduce((acc, c) => acc + Number(c.amount), 0);
  const totalPaid = filteredCharges
    .filter((c) => c.status === "paid")
    .reduce((acc, c) => acc + Number(c.amount), 0);

  const availableCompanies = Array.from(new Set(charges.map((c) => c.company_id)))
    .map((id) => ({ id, name: companyNames[id] || "Empresa" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    charges: filteredCharges,
    allCharges: charges,
    companyNames,
    availableCompanies,
    companyFilter,
    setCompanyFilter,
    loading,
    isAdmin,
    canView,
    refetch: fetchData,
    metrics: {
      totalMeetings,
      totalRevenue,
      totalPending,
      totalInvoiced,
      totalPaid,
    },
  };
}

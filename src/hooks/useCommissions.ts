import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ClosedContract {
  id: string;
  company_id: string;
  lead_id: string;
  client_name: string;
  client_cpf: string;
  client_phone: string | null;
  processo_cnj: string | null;
  processo_tipo: string | null;
  honorarios_estimados: number;
  honorarios_recebidos: number;
  commission_percentage: number;
  commission_due: number;
  process_status: string;
  process_concluded_at: string | null;
  commission_status: string;
  signed_at: string;
  created_at: string;
}

export interface CommissionCharge {
  id: string;
  company_id: string;
  closed_contract_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  asaas_payment_id: string | null;
  created_at: string;
}

export function useCommissions() {
  const { userRole } = useAuth();
  const [contracts, setContracts] = useState<ClosedContract[]>([]);
  const [charges, setCharges] = useState<CommissionCharge[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === "admin" || userRole === "member";

  const fetchData = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [contractsRes, chargesRes, companiesRes] = await Promise.all([
      supabase.from("closed_contracts").select("*").order("signed_at", { ascending: false }),
      supabase.from("commission_charges").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
    ]);

    setContracts(contractsRes.data || []);
    setCharges(chargesRes.data || []);
    const map: Record<string, string> = {};
    (companiesRes.data || []).forEach((c) => { map[c.id] = c.name; });
    setCompanyNames(map);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Métricas
  const totalCommissionDue = contracts.reduce((acc, c) => acc + Number(c.commission_due || 0), 0);
  const totalCommissionPending = contracts
    .filter((c) => c.commission_status === "aguardando_exito")
    .reduce((acc, c) => acc + (Number(c.honorarios_estimados) * Number(c.commission_percentage) / 100), 0);
  const totalPaid = charges
    .filter((c) => c.status === "paid")
    .reduce((acc, c) => acc + Number(c.amount), 0);

  return {
    contracts,
    charges,
    companyNames,
    loading,
    isAdmin,
    refetch: fetchData,
    metrics: {
      totalContracts: contracts.length,
      totalCommissionDue,
      totalCommissionPending,
      totalPaid,
      contractsWaiting: contracts.filter((c) => c.process_status === "em_andamento").length,
      contractsWon: contracts.filter((c) => c.process_status === "ganho").length,
    },
  };
}

export function useFraudAlerts() {
  const { userRole } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === "admin" || userRole === "member";

  const fetchAlerts = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [alertsRes, companiesRes] = await Promise.all([
      supabase.from("fraud_alerts").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name"),
    ]);
    setAlerts(alertsRes.data || []);
    const map: Record<string, string> = {};
    (companiesRes.data || []).forEach((c) => { map[c.id] = c.name; });
    setCompanyNames(map);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, companyNames, loading, isAdmin, refetch: fetchAlerts };
}

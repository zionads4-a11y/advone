import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { toast } from "sonner";
import { isBefore, addMinutes, differenceInMinutes, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReminderAlert {
  id: string;
  title: string;
  reminder_type: string;
  due_at: string;
  lead_id: string;
  company_id: string;
  completed: boolean;
  lead_name?: string;
}

interface FinancialAlert {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  company_id: string;
  days_until: number;
}

interface ReminderAlertContextType {
  alerts: ReminderAlert[];
  financialAlerts: FinancialAlert[];
  alertCount: number;
  dismissAlert: (id: string) => void;
  dismissFinancialAlert: (id: string) => void;
  clearAlerts: () => void;
}

const ReminderAlertContext = createContext<ReminderAlertContextType | undefined>(undefined);

export function ReminderAlertProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const { companyIds, isClient, loading } = useUserCompanies();
  const [alerts, setAlerts] = useState<ReminderAlert[]>([]);
  const [financialAlerts, setFinancialAlerts] = useState<FinancialAlert[]>([]);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const financialToastedRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isGerente = userRole === "gerente";

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const soon = addMinutes(now, 30);

    let query = supabase
      .from("lead_reminders")
      .select("id, title, reminder_type, due_at, lead_id, company_id, completed, leads!lead_reminders_lead_id_fkey(name)")
      .eq("completed", false)
      .lte("due_at", soon.toISOString())
      .order("due_at", { ascending: true });

    if (isClient && companyIds.length > 0) {
      query = query.in("company_id", companyIds);
    }

    const { data } = await query;
    if (data) {
      const mapped = data.map((r: any) => ({
        ...r,
        lead_name: r.leads?.name || "Lead",
      }));
      setAlerts(mapped);

      mapped.forEach((alert) => {
        if (!toastedIdsRef.current.has(alert.id)) {
          toastedIdsRef.current.add(alert.id);
          const isOverdue = isBefore(new Date(alert.due_at), now);
          const minutesUntil = differenceInMinutes(new Date(alert.due_at), now);

          const icon = alert.reminder_type === "meeting" ? "📅" : "🔔";
          const urgency = isOverdue
            ? "⚠️ Atrasado"
            : minutesUntil <= 5
            ? "🚨 Em breve"
            : `⏰ Em ${minutesUntil} min`;

          toast.warning(`${icon} ${alert.title}`, {
            description: `${urgency} — ${alert.lead_name}`,
            duration: 8000,
          });
        }
      });
    }
  }, [user, isClient, companyIds]);

  const fetchFinancialAlerts = useCallback(async () => {
    if (!user || !isGerente || companyIds.length === 0) return;

    const now = new Date();
    const threeDaysFromNow = addDays(now, 3);
    const todayStr = format(now, "yyyy-MM-dd");
    const futureStr = format(threeDaysFromNow, "yyyy-MM-dd");

    const { data } = await supabase
      .from("financial_transactions")
      .select("id, description, amount, due_date, status, company_id")
      .eq("type", "payable")
      .in("status", ["pending", "overdue"])
      .lte("due_date", futureStr)
      .in("company_id", companyIds)
      .order("due_date", { ascending: true });

    if (data) {
      const mapped = data.map((tx: any) => {
        const dueDate = new Date(tx.due_date + "T23:59:59");
        const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...tx, days_until: daysUntil };
      });

      setFinancialAlerts(mapped);

      mapped.forEach((alert) => {
        if (!financialToastedRef.current.has(alert.id)) {
          financialToastedRef.current.add(alert.id);
          const amount = Number(alert.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const isOverdue = alert.days_until < 0;
          const isToday = alert.days_until === 0;

          if (isOverdue) {
            toast.error(`💸 Conta vencida: ${alert.description}`, {
              description: `${amount} — venceu em ${format(new Date(alert.due_date + "T12:00:00"), "dd/MM", { locale: ptBR })}`,
              duration: 10000,
            });
          } else if (isToday) {
            toast.warning(`💰 Vence hoje: ${alert.description}`, {
              description: `${amount}`,
              duration: 8000,
            });
          } else {
            toast.info(`📋 Vence em ${alert.days_until} dia${alert.days_until > 1 ? "s" : ""}: ${alert.description}`, {
              description: `${amount} — ${format(new Date(alert.due_date + "T12:00:00"), "dd/MM", { locale: ptBR })}`,
              duration: 6000,
            });
          }
        }
      });
    }
  }, [user, isGerente, companyIds]);

  useEffect(() => {
    if (!user || loading) return;

    fetchAlerts();
    fetchFinancialAlerts();
    intervalRef.current = setInterval(() => {
      fetchAlerts();
      fetchFinancialAlerts();
    }, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, loading, fetchAlerts, fetchFinancialAlerts]);

  useEffect(() => {
    if (!user || loading) return;

    const channel = supabase
      .channel("reminder-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_reminders" },
        () => {
          fetchAlerts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "financial_transactions" },
        () => {
          fetchFinancialAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loading, fetchAlerts, fetchFinancialAlerts]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissFinancialAlert = useCallback((id: string) => {
    setFinancialAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setFinancialAlerts([]);
  }, []);

  const totalCount = alerts.length + financialAlerts.length;

  return (
    <ReminderAlertContext.Provider value={{ alerts, financialAlerts, alertCount: totalCount, dismissAlert, dismissFinancialAlert, clearAlerts }}>
      {children}
    </ReminderAlertContext.Provider>
  );
}

export function useReminderAlerts() {
  const context = useContext(ReminderAlertContext);
  if (!context) {
    throw new Error("useReminderAlerts must be used within ReminderAlertProvider");
  }
  return context;
}

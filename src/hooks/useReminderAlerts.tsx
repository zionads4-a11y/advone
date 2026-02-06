import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { toast } from "sonner";
import { isBefore, addMinutes, differenceInMinutes } from "date-fns";

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

interface ReminderAlertContextType {
  alerts: ReminderAlert[];
  alertCount: number;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
}

const ReminderAlertContext = createContext<ReminderAlertContextType | undefined>(undefined);

export function ReminderAlertProvider({ children }: { children: ReactNode }) {
  const { user, userRole } = useAuth();
  const { companyIds, isClient, loading } = useUserCompanies();
  const [alerts, setAlerts] = useState<ReminderAlert[]>([]);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const soon = addMinutes(now, 30); // Show alerts for next 30 min + overdue

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

      // Fire toasts for new alerts
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

  // Poll every 60 seconds
  useEffect(() => {
    if (!user || loading) return;

    fetchAlerts();
    intervalRef.current = setInterval(fetchAlerts, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, loading, fetchAlerts]);

  // Also subscribe to realtime changes on lead_reminders
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loading, fetchAlerts]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <ReminderAlertContext.Provider value={{ alerts, alertCount: alerts.length, dismissAlert, clearAlerts }}>
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

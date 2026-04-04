import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CalendarClock, Check, Clock, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateEventDialog } from "@/components/agenda/CreateEventDialog";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  due_at: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  lead_id: string;
  company_id: string;
  lead_name?: string;
  company_name?: string;
}

export default function Agenda() {
  const { user, userRole } = useAuth();
  const { companyIds, isClient, loading: companiesLoading } = useUserCompanies();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch companies for filter
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) return;
      let query = supabase.from("companies").select("id, name").order("name");
      if (isClient && companyIds.length > 0) {
        query = query.in("id", companyIds);
      }
      const { data } = await query;
      if (data) {
        setCompanies(data);
        if (data.length === 1) {
          setSelectedCompany(data[0].id);
        }
      }
    };
    if (!companiesLoading) fetchCompanies();
  }, [user, isClient, companyIds, companiesLoading]);

  // Fetch reminders
  useEffect(() => {
    const fetchReminders = async () => {
      if (!user) return;
      setLoading(true);

      let query = supabase
        .from("lead_reminders")
        .select("*, leads!lead_reminders_lead_id_fkey(name, company_id), companies:company_id(name)")
        .order("due_at", { ascending: true });

      if (selectedCompany !== "all") {
        query = query.eq("company_id", selectedCompany);
      } else if (isClient && companyIds.length > 0) {
        query = query.in("company_id", companyIds);
      }

      const { data } = await query;
      if (data) {
        setReminders(
          data.map((r: any) => ({
            ...r,
            lead_name: r.leads?.name || "Lead",
            company_name: r.companies?.name || "",
          }))
        );
      }
      setLoading(false);
    };
    if (!companiesLoading) fetchReminders();
  }, [user, selectedCompany, isClient, companyIds, companiesLoading, refreshKey]);

  // Days with events for calendar styling
  const eventDays = useMemo(() => {
    const days = new Map<string, { hasOverdue: boolean; hasPending: boolean; hasCompleted: boolean }>();
    const now = new Date();
    reminders.forEach((r) => {
      const dayKey = format(new Date(r.due_at), "yyyy-MM-dd");
      const existing = days.get(dayKey) || { hasOverdue: false, hasPending: false, hasCompleted: false };
      if (r.completed) {
        existing.hasCompleted = true;
      } else if (isBefore(new Date(r.due_at), now)) {
        existing.hasOverdue = true;
      } else {
        existing.hasPending = true;
      }
      days.set(dayKey, existing);
    });
    return days;
  }, [reminders]);

  // Reminders for the selected date
  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    return reminders.filter((r) => isSameDay(new Date(r.due_at), selectedDate));
  }, [reminders, selectedDate]);

  // Upcoming reminders (next 7 days, not completed)
  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    return reminders
      .filter((r) => !r.completed && isAfter(new Date(r.due_at), now) && isBefore(new Date(r.due_at), weekLater))
      .slice(0, 10);
  }, [reminders]);

  // Overdue reminders
  const overdueReminders = useMemo(() => {
    const now = new Date();
    return reminders.filter((r) => !r.completed && isBefore(new Date(r.due_at), now));
  }, [reminders]);

  const handleToggleComplete = useCallback(async (id: string, newCompleted: boolean) => {
    const { error } = await supabase
      .from("lead_reminders")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
            : r
        )
      );
      toast.success(newCompleted ? "Marcado como ocorrido!" : "Marcado como pendente!");
    }
  }, []);

  const isAdmin = userRole === "admin" || userRole === "member";

  if (loading || companiesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Lembretes e reuniões agendadas</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              {(isAdmin || companies.length > 1) && <SelectItem value="all">Todas as empresas</SelectItem>}
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={ptBR}
            modifiers={{
              hasOverdue: (date) => eventDays.get(format(date, "yyyy-MM-dd"))?.hasOverdue || false,
              hasPending: (date) => eventDays.get(format(date, "yyyy-MM-dd"))?.hasPending || false,
              hasCompleted: (date) => eventDays.get(format(date, "yyyy-MM-dd"))?.hasCompleted || false,
            }}
            modifiersClassNames={{
              hasOverdue: "bg-destructive/20 text-destructive font-bold",
              hasPending: "bg-primary/20 text-primary font-semibold",
              hasCompleted: "bg-success/20 text-success",
            }}
            className="pointer-events-auto"
          />
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive/40" /> Atrasado</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary/40" /> Pendente</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success/40" /> Concluído</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Selected date events */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarClock className="h-4 w-4 text-primary" />
                {selectedDate ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {selectedDateReminders.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <CalendarClock className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhum evento nesta data</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 text-xs"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Criar evento
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateReminders.map((r) => (
                  <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete} />
                ))}
              </div>
            )}
          </div>

          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Atrasados ({overdueReminders.length})
              </h3>
              <div className="space-y-2">
                {overdueReminders.map((r) => (
                  <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingReminders.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Próximos 7 dias
              </h3>
              <div className="space-y-2">
                {upcomingReminders.map((r) => (
                  <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={() => setRefreshKey((k) => k + 1)}
        defaultDate={selectedDate}
        companies={companies}
        preselectedCompanyId={selectedCompany !== "all" ? selectedCompany : undefined}
      />
    </div>
  );
}

function ReminderItem({ reminder, onToggle }: { reminder: Reminder; onToggle?: (id: string, completed: boolean) => void }) {
  const isOverdue = !reminder.completed && isBefore(new Date(reminder.due_at), new Date());

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        reminder.completed
          ? "border-border/50 bg-muted/20 opacity-60"
          : isOverdue
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-background"
      }`}
    >
      <button
        onClick={() => onToggle?.(reminder.id, !reminder.completed)}
        title={reminder.completed ? "Marcar como pendente" : "Marcar como ocorrido"}
        className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium cursor-pointer transition-colors ${
          reminder.completed
            ? "bg-success/20 text-success hover:bg-success/30 border border-success/30"
            : isOverdue
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
            : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
        }`}
      >
        {reminder.completed ? <Check className="h-3 w-3" /> : isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
        {reminder.completed ? "Concluído" : isOverdue ? "Atrasado" : "Pendente"}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${reminder.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {reminder.title}
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {reminder.reminder_type === "meeting" ? "📅 Reunião" : "🔔 Lembrete"}
          </Badge>
        </div>
        {reminder.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{reminder.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          <span>
            {format(new Date(reminder.due_at), "dd/MM/yy HH:mm", { locale: ptBR })}
          </span>
          {reminder.lead_name && (
            <span className="text-primary/70">• {reminder.lead_name}</span>
          )}
          {reminder.company_name && (
            <span className="text-muted-foreground/70">• {reminder.company_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

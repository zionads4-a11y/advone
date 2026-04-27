import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useAuth } from "@/hooks/useAuth";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CalendarClock, Check, Clock, AlertTriangle, Plus, Repeat, Pencil, Trash2, ChevronLeft, ChevronRight, PartyPopper, Info, Settings2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, isAfter, isBefore, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateEventDialog } from "@/components/agenda/CreateEventDialog";
import { WeeklyView } from "@/components/agenda/WeeklyView";
import { DailyView } from "@/components/agenda/DailyView";
import { getHolidayForDate, isBrazilianHoliday } from "@/lib/brazilianHolidays";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  recurrence_rule?: string | null;
  recurrence_end?: string | null;
  parent_event_id?: string | null;
}

export default function Agenda() {
  const { user, userRole } = useAuth();
  const { companyIds, isClient, loading: companiesLoading } = useUserCompanies();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const handleSync = useCallback(async () => {
    if (!isGoogleConnected) return;
    setSyncLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync");
      if (error) throw error;
      toast.success(`${data.count} eventos sincronizados com sucesso!`);
      setRefreshKey(k => k + 1);
    } catch (error: any) {
      console.error("Erro ao sincronizar Google Agenda:", error);
      toast.error("Erro ao sincronizar eventos");
    } finally {
      setSyncLoading(false);
    }
  }, [isGoogleConnected]);

  useEffect(() => {
    if (isGoogleConnected) {
      handleSync();
    }
  }, [isGoogleConnected]);

  useEffect(() => {
    const checkGoogleConnection = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .maybeSingle();
      setIsGoogleConnected(!!data);
    };
    checkGoogleConnection();
  }, [user, refreshKey]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      const handleGoogleCallback = async () => {
        try {
          // Here we would call an edge function to exchange the code for tokens
          // and store them in the database.
          // For now, let's just show a toast and clear the URL.
          const { error } = await supabase.functions.invoke("google-calendar-auth", {
            body: { code, redirectUri: `${window.location.origin}/agenda` }
          });
          
          if (error) throw error;
          
          toast.success("Google Agenda conectado com sucesso!");
          window.history.replaceState({}, document.title, window.location.pathname);
          setRefreshKey(k => k + 1);
        } catch (error: any) {
          console.error("Erro ao conectar Google Agenda:", error);
          const errorMsg = error.message || (typeof error === 'string' ? error : "Erro desconhecido");
          toast.error(`Erro ao conectar Google Agenda: ${errorMsg}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      handleGoogleCallback();
    }
  }, []);

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
        if (data.length === 1) setSelectedCompany(data[0].id);
      }
    };
    if (!companiesLoading) fetchCompanies();
  }, [user, isClient, companyIds, companiesLoading]);

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

  const eventDays = useMemo(() => {
    const days = new Map<string, { hasOverdue: boolean; hasPending: boolean; hasCompleted: boolean }>();
    const now = new Date();
    reminders.forEach((r) => {
      const dayKey = format(new Date(r.due_at), "yyyy-MM-dd");
      const existing = days.get(dayKey) || { hasOverdue: false, hasPending: false, hasCompleted: false };
      if (r.completed) existing.hasCompleted = true;
      else if (isBefore(new Date(r.due_at), now)) existing.hasOverdue = true;
      else existing.hasPending = true;
      days.set(dayKey, existing);
    });
    return days;
  }, [reminders]);

  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    return reminders.filter((r) => isSameDay(new Date(r.due_at), selectedDate));
  }, [reminders, selectedDate]);

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    return reminders
      .filter((r) => !r.completed && isAfter(new Date(r.due_at), now) && isBefore(new Date(r.due_at), weekLater))
      .slice(0, 10);
  }, [reminders]);

  const overdueReminders = useMemo(() => {
    const now = new Date();
    return reminders.filter((r) => !r.completed && isBefore(new Date(r.due_at), now));
  }, [reminders]);

  const handleToggleComplete = useCallback(async (id: string, newCompleted: boolean) => {
    const { error } = await supabase
      .from("lead_reminders")
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : r
        )
      );
      toast.success(newCompleted ? "Marcado como ocorrido!" : "Marcado como pendente!");
    }
  }, []);

  const handleEdit = (reminder: Reminder) => {
    setEditEvent({
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      reminder_type: reminder.reminder_type,
      due_at: reminder.due_at,
      company_id: reminder.company_id,
      lead_id: reminder.lead_id,
      recurrence_rule: reminder.recurrence_rule,
      recurrence_end: reminder.recurrence_end,
    });
    setCreateDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("lead_reminders").delete().eq("id", deleteTarget.id);
    if (!error && !deleteTarget.parent_event_id) {
      await supabase.from("lead_reminders").delete().eq("parent_event_id", deleteTarget.id);
    }
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Evento excluído!");
      setRefreshKey((k) => k + 1);
    }
    setDeleteTarget(null);
  };

  const navigateDate = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      if (viewMode === "day") return direction === "next" ? addDays(prev, 1) : subDays(prev, 1);
      if (viewMode === "week") return direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1);
      const newMonth = direction === "next" ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
      setCurrentMonth(newMonth);
      return prev;
    });
  };
  
  const handleSelectDateTime = (date: Date, hour?: number) => {
    setSelectedDate(date);
    if (hour !== undefined) {
      setSelectedTime(`${String(hour).padStart(2, "0")}:00`);
    } else {
      setSelectedTime(undefined);
    }
    setEditEvent(null);
    setCreateDialogOpen(true);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  const getNavigationLabel = () => {
    if (viewMode === "day") return format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(ws, "dd MMM", { locale: ptBR })} – ${format(we, "dd MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentMonth, "MMMM yyyy", { locale: ptBR });
  };

  const isAdmin = userRole === "admin" || userRole === "member";

  if (loading || companiesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Lembretes e reuniões agendadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              {(isAdmin || companies.length > 1) && <SelectItem value="all">Todas as empresas</SelectItem>}
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGoogleConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncLoading ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          )}
          <Button 
            variant={isGoogleConnected ? "secondary" : "outline"}
            className={`gap-2 ${isGoogleConnected ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}`}
            onClick={() => {
              if (isGoogleConnected) return;
              // Using the provided client_id and scopes for the OAuth flow
              const clientId = "181481259367-kqbftmnd121er1dmpvss7l4bjfpt5c3n.apps.googleusercontent.com";
              const redirectUri = `${window.location.origin}/agenda`;
              console.log("Iniciando OAuth com redirectUri:", redirectUri);
              const scopes = [
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events"
              ].join(" ");
              
              const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
              authUrl.searchParams.set("client_id", clientId);
              authUrl.searchParams.set("redirect_uri", redirectUri);
              authUrl.searchParams.set("response_type", "code");
              authUrl.searchParams.set("scope", scopes);
              authUrl.searchParams.set("access_type", "offline");
              authUrl.searchParams.set("prompt", "consent");


              window.location.href = authUrl.toString();
            }}
          >
            {isGoogleConnected ? (
              <>
                <Check className="h-4 w-4" />
                Google Conectado
              </>
            ) : (
              <>
                <Settings2 className="h-4 w-4" />
                Conectar Google
              </>
            )}
          </Button>
          <Button onClick={() => { setEditEvent(null); setCreateDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Reminder banner */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="text-foreground/90">
          <span className="font-medium text-primary">Lembrete:</span> Confira as agendas regularmente e bloqueie horários indisponíveis. Os <span className="font-medium">feriados nacionais</span> já estão automaticamente bloqueados — nenhum agendamento poderá ser criado nessas datas.
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>Hoje</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground capitalize ml-1">
            {getNavigationLabel()}
          </span>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Views */}
      {viewMode === "month" && (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="rounded-xl border border-border bg-card p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              modifiers={{
                hasOverdue: (date) => eventDays.get(format(date, "yyyy-MM-dd"))?.hasOverdue || false,
                hasPending: (date) => eventDays.get(format(date, "yyyy-MM-dd"))?.hasPending || false,
                hasCompleted: (date) => eventDays.get(format(date, "yyyy-MM-dd"))?.hasCompleted || false,
                isHoliday: (date) => isBrazilianHoliday(date),
              }}
              modifiersClassNames={{
                hasOverdue: "bg-destructive/20 text-destructive font-bold",
                hasPending: "bg-primary/20 text-primary font-semibold",
                hasCompleted: "bg-success/20 text-success",
                isHoliday: "bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold line-through opacity-80",
              }}
              disabled={(date) => isBrazilianHoliday(date)}
              className="pointer-events-auto"
            />
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-destructive/40" /> Atrasado</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary/40" /> Pendente</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success/40" /> Concluído</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" /> Feriado</span>
            </div>
          </div>

          <div className="space-y-6">
            {(() => {
              const holiday = getHolidayForDate(selectedDate);
              if (!holiday) return null;
              return (
                <div className={`flex items-start gap-3 rounded-xl border p-4 ${
                  holiday.type === "national"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                }`}>
                  <PartyPopper className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold">{holiday.name}</p>
                    <p className="opacity-80 mt-0.5">
                      {holiday.type === "national"
                        ? "Feriado nacional — agendamentos bloqueados nesta data."
                        : "Ponto facultativo — confirme com a equipe se haverá expediente."}
                    </p>
                  </div>
                </div>
              );
            })()}
            <MonthDayDetail
              selectedDate={selectedDate}
              reminders={selectedDateReminders}
              onToggle={handleToggleComplete}
              onEdit={handleEdit}
              onDelete={(r) => setDeleteTarget(r)}
              onCreateNew={() => { setEditEvent(null); setCreateDialogOpen(true); }}
            />
            {overdueReminders.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Atrasados ({overdueReminders.length})
                </h3>
                <div className="space-y-2">
                  {overdueReminders.map((r) => (
                    <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete}
                      onEdit={handleEdit} onDelete={(r) => setDeleteTarget(r)} />
                  ))}
                </div>
              </div>
            )}
            {upcomingReminders.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  Próximos 7 dias
                </h3>
                <div className="space-y-2">
                  {upcomingReminders.map((r) => (
                    <ReminderItem key={r.id} reminder={r} onToggle={handleToggleComplete}
                      onEdit={handleEdit} onDelete={(r) => setDeleteTarget(r)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <WeeklyView
          currentDate={selectedDate}
          reminders={reminders}
          onToggle={handleToggleComplete}
          onEdit={handleEdit}
          onDelete={(r) => setDeleteTarget(r)}
          onSelectDate={(d) => { setSelectedDate(d); setViewMode("day"); }}
        />
      )}

      {viewMode === "day" && (
        <DailyView
          currentDate={selectedDate}
          reminders={reminders}
          onToggle={handleToggleComplete}
          onEdit={handleEdit}
          onDelete={(r) => setDeleteTarget(r)}
        />
      )}

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) setEditEvent(null); }}
        onCreated={() => setRefreshKey((k) => k + 1)}
        defaultDate={selectedDate}
        companies={companies}
        preselectedCompanyId={selectedCompany !== "all" ? selectedCompany : undefined}
        editEvent={editEvent}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.recurrence_rule || deleteTarget?.parent_event_id
                ? "Este evento e todas as suas ocorrências serão excluídos permanentemente."
                : "Este evento será excluído permanentemente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-components ---

function MonthDayDetail({
  selectedDate,
  reminders,
  onToggle,
  onEdit,
  onDelete,
  onCreateNew,
}: {
  selectedDate: Date;
  reminders: Reminder[];
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" />
          {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onCreateNew}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {reminders.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <CalendarClock className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">Nenhum evento nesta data</p>
          <Button variant="link" size="sm" className="mt-1 text-xs" onClick={onCreateNew}>
            Criar evento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <ReminderItem key={r.id} reminder={r} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function getRecurrenceLabel(rule: string): string {
  const labels: Record<string, string> = {
    daily: "Diário", weekly: "Semanal", biweekly: "Quinzenal",
    monthly: "Mensal", yearly: "Anual", weekdays: "Dias úteis",
  };
  if (rule.startsWith("custom:")) {
    const parts = rule.split(":");
    const unitMap: Record<string, string> = { days: "dia(s)", weeks: "sem.", months: "mês(es)" };
    return `A cada ${parts[1]} ${unitMap[parts[2]] || parts[2]}`;
  }
  return labels[rule] || rule;
}

function ReminderItem({
  reminder,
  onToggle,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  onToggle?: (id: string, completed: boolean) => void;
  onEdit?: (r: Reminder) => void;
  onDelete?: (r: Reminder) => void;
}) {
  const isOverdue = !reminder.completed && isBefore(new Date(reminder.due_at), new Date());

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors group ${
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
          {reminder.recurrence_rule && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1">
              <Repeat className="h-2.5 w-2.5" />
              {getRecurrenceLabel(reminder.recurrence_rule)}
            </Badge>
          )}
        </div>
        {reminder.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{reminder.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          <span>{format(new Date(reminder.due_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
          {reminder.lead_name && <span className="text-primary/70">• {reminder.lead_name}</span>}
          {reminder.company_name && <span className="text-muted-foreground/70">• {reminder.company_name}</span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit?.(reminder)} className="p-1 rounded hover:bg-muted" title="Editar">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => onDelete?.(reminder)} className="p-1 rounded hover:bg-destructive/10" title="Excluir">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}

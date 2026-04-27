import { useMemo } from "react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, AlertTriangle, Repeat, Pencil, Trash2, PartyPopper, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getHolidayForDate } from "@/lib/brazilianHolidays";

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
  end_at?: string | null;
  parent_event_id?: string | null;
}

interface DailyViewProps {
  currentDate: Date;
  reminders: Reminder[];
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
  onSelectTime?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5:00 to 22:00

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

export function DailyView({ currentDate, reminders, onToggle, onEdit, onDelete, onSelectTime }: DailyViewProps) {
  const dayStr = format(currentDate, "yyyy-MM-dd");
  const now = new Date();

  const eventsByHour = useMemo(() => {
    const map = new Map<number, Reminder[]>();
    reminders.forEach((r) => {
      const d = new Date(r.due_at);
      if (format(d, "yyyy-MM-dd") !== dayStr) return;
      const hour = d.getHours();
      const arr = map.get(hour) || [];
      arr.push(r);
      map.set(hour, arr);
    });
    return map;
  }, [reminders, dayStr]);

  const currentTimeLinePos = useMemo(() => {
    const isToday = format(now, "yyyy-MM-dd") === dayStr;
    if (!isToday) return null;

    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    if (currentHour < HOURS[0] || currentHour >= HOURS[HOURS.length - 1] + 1) return null;

    const hourIndex = HOURS.indexOf(currentHour);
    if (hourIndex === -1) return null;

    // Each row is 56px in DailyView
    return (hourIndex * 56) + (currentMinutes / 60 * 56);
  }, [now, dayStr]);

  const holiday = getHolidayForDate(currentDate);
  const isNationalHoliday = holiday?.type === "national";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border sticky top-0 z-20 backdrop-blur-sm",
        isNationalHoliday ? "bg-amber-500/10" : "bg-muted/30"
      )}>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          {isNationalHoliday && <PartyPopper className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        </h3>
        {holiday && (
          <p className={cn(
            "text-xs mt-1 font-medium",
            isNationalHoliday ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
          )}>
            {holiday.type === "national" ? "🚫 Feriado Nacional" : "ℹ️ Ponto Facultativo"}: {holiday.name}
            {isNationalHoliday && " — agendamentos bloqueados"}
          </p>
        )}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto relative">
        {currentTimeLinePos !== null && (
          <div 
            className="absolute left-[60px] right-0 z-10 flex items-center pointer-events-none"
            style={{ top: `${currentTimeLinePos}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
            <div className="flex-1 h-[2px] bg-red-500" />
          </div>
        )}
        {HOURS.map((hour) => {
          const events = eventsByHour.get(hour) || [];
          const isCurrentHour = now.getHours() === hour && format(now, "yyyy-MM-dd") === dayStr;
          return (
            <div
              key={hour}
              className={cn(
                "grid grid-cols-[60px_1fr] border-b border-border/50 min-h-[56px] hover:bg-muted/10 transition-colors cursor-pointer",
                isCurrentHour && "bg-primary/5"
              )}
              onClick={() => onSelectTime?.(currentDate, hour)}
            >
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 pt-2 font-mono">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="border-l border-border/30 p-1.5 space-y-1">
                {events.map((ev) => (
                  <DayEventCard key={ev.id} event={ev} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayEventCard({
  event,
  onToggle,
  onEdit,
  onDelete,
}: {
  event: Reminder;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
}) {
  const isOverdue = !event.completed && isBefore(new Date(event.due_at), new Date());

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded-lg p-2 transition-colors cursor-pointer",
        event.completed
          ? "bg-muted/30 opacity-60"
          : isOverdue
          ? "bg-destructive/10 border border-destructive/20"
          : event.reminder_type === "meeting"
          ? "bg-primary/10 border border-primary/20"
          : event.reminder_type === "block"
          ? "bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700"
          : "bg-accent/30 border border-accent/40"
      )}
      onClick={() => onEdit(event)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(event.id, !event.completed); }}
        className={cn(
          "mt-0.5 shrink-0 rounded-full p-1 transition-colors",
          event.completed
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : isOverdue
            ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
            : "bg-primary/20 text-primary hover:bg-primary/30"
        )}
      >
        {event.completed ? <Check className="h-3 w-3" /> : isOverdue ? <AlertTriangle className="h-3 w-3" /> : event.reminder_type === 'block' ? <Ban className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-medium", event.completed && "line-through text-muted-foreground")}>
            {event.title.replace(/^(📅|🔔)\s*/, "")}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {format(new Date(event.due_at), "HH:mm")}
          </span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {event.reminder_type === "meeting" ? "📅 Reunião" : event.reminder_type === "block" ? "🚫 Bloqueio" : "🔔 Tarefa"}
          </Badge>
          {event.recurrence_rule && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1">
              <Repeat className="h-2.5 w-2.5" />
              {getRecurrenceLabel(event.recurrence_rule)}
            </Badge>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
          {event.lead_name && event.lead_name !== "Agenda Geral" && <span className="text-primary/70">{event.lead_name}</span>}
          {event.company_name && <span>• {event.company_name}</span>}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(event); }} className="p-1 rounded hover:bg-muted" title="Editar">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(event); }} className="p-1 rounded hover:bg-destructive/10" title="Excluir">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}

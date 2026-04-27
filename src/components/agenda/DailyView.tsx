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
        "group flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer shadow-sm hover:shadow-md",
        event.completed
          ? "bg-muted/30 border-border opacity-60"
          : isOverdue
          ? "bg-destructive/5 border-destructive/30"
          : event.reminder_type === "meeting"
          ? "bg-primary/5 border-primary/20"
          : event.reminder_type === "block"
          ? "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
          : "bg-background border-border"
      )}
      onClick={() => onEdit(event)}
    >
      <div 
        className={cn(
          "w-1 self-stretch rounded-full",
          event.completed ? "bg-muted-foreground/30" :
          isOverdue ? "bg-destructive" :
          event.reminder_type === "meeting" ? "bg-primary" :
          event.reminder_type === "block" ? "bg-slate-500" :
          "bg-accent"
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-semibold", 
              event.completed ? "line-through text-muted-foreground" : "text-foreground"
            )}>
              {event.title.replace(/^(📅|🔔)\s*/, "")}
            </span>
            {event.recurrence_rule && (
              <span title={getRecurrenceLabel(event.recurrence_rule)}>
                <Repeat className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {format(new Date(event.due_at), "HH:mm")}
              {event.reminder_type === "meeting" && event.end_at && ` - ${format(new Date(event.end_at), "HH:mm")}`}
            </span>
          </div>
        </div>

        {event.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{event.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {event.lead_name && event.lead_name !== "Agenda Geral" && (
              <Badge variant="secondary" className="px-1 py-0 h-4 font-normal bg-primary/10 text-primary border-none">
                {event.lead_name}
              </Badge>
            )}
            {event.company_name && <span className="opacity-70">{event.company_name}</span>}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(event.id, !event.completed); }}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                event.completed ? "bg-success/20 text-success" : "bg-muted text-muted-foreground hover:bg-success/10 hover:text-success"
              )}
              title={event.completed ? "Marcar como pendente" : "Concluir"}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(event); }} className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { format, startOfWeek, addDays, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Trash2, PartyPopper } from "lucide-react";
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

interface WeeklyViewProps {
  currentDate: Date;
  reminders: Reminder[];
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
  onSelectDate: (date: Date, hour?: number) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00

export function WeeklyView({ currentDate, reminders, onToggle, onEdit, onDelete, onSelectDate }: WeeklyViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const eventsByDayHour = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    reminders.forEach((r) => {
      const d = new Date(r.due_at);
      const dayKey = format(d, "yyyy-MM-dd");
      const hour = d.getHours();
      const key = `${dayKey}-${hour}`;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    });
    return map;
  }, [reminders]);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  const currentTimeLinePos = useMemo(() => {
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    if (currentHour < HOURS[0] || currentHour >= HOURS[HOURS.length - 1] + 1) return null;
    
    const hourIndex = HOURS.indexOf(currentHour);
    if (hourIndex === -1) return null;
    
    // Each row is 52px
    return (hourIndex * 52) + (currentMinutes / 60 * 52);
  }, [now]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30 sticky top-0 z-20">
        <div className="p-2 text-xs text-muted-foreground text-center">Hora</div>
        {weekDays.map((day) => {
          const isToday = format(day, "yyyy-MM-dd") === today;
          const holiday = getHolidayForDate(day);
          const isNationalHoliday = holiday?.type === "national";
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "p-2 text-center transition-colors hover:bg-muted/50 relative",
                isToday && "bg-primary/10",
                isNationalHoliday && "bg-amber-500/10"
              )}
              title={holiday ? holiday.name : undefined}
            >
              <div className="text-[10px] uppercase text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div className={cn(
                "text-lg font-medium mt-1 w-9 h-9 flex items-center justify-center rounded-full mx-auto transition-colors",
                isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                isNationalHoliday && !isToday && "text-amber-700 dark:text-amber-400"
              )}>
                {format(day, "dd")}
                {isNationalHoliday && !isToday && <PartyPopper className="ml-1 h-3 w-3" />}
              </div>
              {holiday && (
                <div className="text-[8px] truncate text-amber-600 dark:text-amber-500 mt-0.5 leading-tight">
                  {holiday.name}
                </div>
              )}
            </button>
          );
        })}
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
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[52px]">
            <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 pt-1">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const events = eventsByDayHour.get(`${dayKey}-${hour}`) || [];
              const isNationalHoliday = getHolidayForDate(day)?.type === "national";
              return (
                <div
                  key={`${dayKey}-${hour}`}
                  className={cn(
                    "border-l border-border/30 p-0.5 min-h-[52px] hover:bg-muted/20 transition-colors cursor-pointer",
                    isNationalHoliday && "bg-amber-500/5 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,hsl(var(--muted))_8px,hsl(var(--muted))_9px)]"
                  )}
                  onClick={() => onSelectDate(day, hour)}
                >
                  {events.map((ev) => (
                    <WeekEventChip key={ev.id} event={ev} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekEventChip({
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
        "group relative rounded-md border p-1 text-[10px] leading-tight mb-1 cursor-pointer transition-all hover:shadow-sm",
        event.completed
          ? "bg-muted/40 border-border/50 text-muted-foreground line-through"
          : isOverdue
          ? "bg-destructive/5 border-destructive/30 text-destructive"
          : event.reminder_type === "meeting"
          ? "bg-primary/5 border-primary/20 text-primary"
          : event.reminder_type === "block"
          ? "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
          : "bg-background border-border text-foreground"
      )}
      onClick={(e) => { e.stopPropagation(); onEdit(event); }}
    >
      <div className="flex items-center gap-1 font-bold mb-0.5">
        <span className="shrink-0">{format(new Date(event.due_at), "HH:mm")}</span>
        <div 
          className={cn(
            "w-1 h-2 rounded-full",
            event.completed ? "bg-muted-foreground/30" :
            isOverdue ? "bg-destructive" :
            event.reminder_type === "meeting" ? "bg-primary" :
            event.reminder_type === "block" ? "bg-slate-500" :
            "bg-accent"
          )}
        />
      </div>
      
      <div className="font-semibold truncate">
        {event.title.replace(/^(📅|🔔)\s*/, "")}
      </div>

      {event.lead_name && event.lead_name !== "Agenda Geral" && (
        <div className="truncate text-[9px] mt-0.5 opacity-80 font-medium">
          {event.lead_name}
        </div>
      )}

      <div className="absolute top-0 right-0 p-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 bg-inherit rounded-bl-md">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(event.id, !event.completed); }}
          className="p-0.5 rounded hover:bg-success/20 transition-colors"
        >
          <Check className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}

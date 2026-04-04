import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, Repeat, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  due_at: string;
  completed: boolean;
  completed_at: string | null;
  lead_name?: string;
  company_name?: string;
  recurrence_rule?: string | null;
  parent_event_id?: string | null;
}

interface WeeklyViewProps {
  currentDate: Date;
  reminders: Reminder[];
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
  onSelectDate: (date: Date) => void;
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

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
        <div className="p-2 text-xs text-muted-foreground text-center">Hora</div>
        {weekDays.map((day) => {
          const isToday = format(day, "yyyy-MM-dd") === today;
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "p-2 text-center transition-colors hover:bg-muted/50",
                isToday && "bg-primary/10"
              )}
            >
              <div className="text-[10px] uppercase text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div className={cn(
                "text-sm font-semibold mt-0.5",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {format(day, "dd")}
              </div>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[52px]">
            <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 pt-1">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const events = eventsByDayHour.get(`${dayKey}-${hour}`) || [];
              return (
                <div
                  key={`${dayKey}-${hour}`}
                  className="border-l border-border/30 p-0.5 min-h-[52px] hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => onSelectDate(day)}
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
        "group relative rounded px-1.5 py-0.5 text-[10px] leading-tight mb-0.5 cursor-pointer transition-colors",
        event.completed
          ? "bg-muted/40 text-muted-foreground line-through"
          : isOverdue
          ? "bg-destructive/15 text-destructive border-l-2 border-destructive"
          : event.reminder_type === "meeting"
          ? "bg-primary/15 text-primary border-l-2 border-primary"
          : "bg-accent/50 text-foreground border-l-2 border-accent"
      )}
      onClick={(e) => { e.stopPropagation(); onEdit(event); }}
    >
      <div className="font-medium truncate pr-8">
        {format(new Date(event.due_at), "HH:mm")} {event.title.replace(/^(📅|🔔)\s*/, "")}
      </div>
      {event.lead_name && event.lead_name !== "Agenda Geral" && (
        <div className="truncate text-[9px] opacity-70">{event.lead_name}</div>
      )}
      <div className="absolute right-0 top-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggle(event.id, !event.completed); }}
          className="p-0.5 rounded hover:bg-muted" title={event.completed ? "Pendente" : "Concluir"}>
          <Check className="h-2.5 w-2.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(event); }}
          className="p-0.5 rounded hover:bg-destructive/10" title="Excluir">
          <Trash2 className="h-2.5 w-2.5 text-destructive" />
        </button>
      </div>
    </div>
  );
}

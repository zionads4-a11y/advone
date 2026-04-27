import { useEffect, useState } from "react";
import { addHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, CalendarClock, Plus, Check, Trash2, Loader2, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { brtLocalInputToIso } from "@/lib/utils";

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_type: string;
  due_at: string;
  completed: boolean;
  completed_at: string | null;
  end_at?: string | null;
  created_at: string;
  meeting_held?: boolean;
  meeting_held_at?: string | null;
}

interface LeadRemindersProps {
  leadId: string;
  companyId: string;
  leadName?: string;
}

export function LeadReminders({ leadId, companyId, leadName }: LeadRemindersProps) {
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === "admin" || userRole === "member";
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderType, setReminderType] = useState("reminder");
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    fetchReminders();
  }, [leadId]);

  const fetchReminders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lead_reminders")
      .select("*")
      .eq("lead_id", leadId)
      .order("due_at", { ascending: true });
    if (data) setReminders(data as Reminder[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!title.trim() || !dueAt || !user) return;
    setAdding(true);
    const dueAtIso = brtLocalInputToIso(dueAt);
    const endAt = reminderType === "meeting" 
      ? addHours(new Date(dueAtIso), 1).toISOString() 
      : null;
    
    const { error } = await supabase.from("lead_reminders").insert({
      lead_id: leadId,
      company_id: companyId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      reminder_type: reminderType,
      due_at: dueAtIso,
      end_at: endAt,
    });
    if (error) {
      toast.error("Erro ao criar lembrete");
    } else {
      toast.success(reminderType === "meeting" ? "Reunião agendada!" : "Lembrete criado!");
      setTitle("");
      setDescription("");
      setDueAt("");
      setReminderType("reminder");
      setShowForm(false);
      fetchReminders();
    }
    setAdding(false);
  };

  const toggleComplete = async (reminder: Reminder) => {
    const newCompleted = !reminder.completed;
    const { error } = await supabase
      .from("lead_reminders")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", reminder.id);
    if (!error) {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id
            ? { ...r, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
            : r
        )
      );
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("lead_reminders").delete().eq("id", id);
    if (!error) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success("Removido!");
    }
  };

  const markMeetingHeld = async (reminder: Reminder) => {
    if (!user) return;
    if (reminder.meeting_held) {
      toast.info("Esta reunião já foi marcada como realizada");
      return;
    }
    const nowIso = new Date().toISOString();
    const { error: errUpdate } = await supabase
      .from("lead_reminders")
      .update({
        meeting_held: true,
        meeting_held_at: nowIso,
        completed: true,
        completed_at: nowIso,
      })
      .eq("id", reminder.id);
    if (errUpdate) {
      toast.error("Erro ao confirmar reunião");
      return;
    }

    const ym = new Date(reminder.due_at).toISOString().slice(0, 7);
    const { error: errCharge } = await supabase.from("meeting_charges").insert({
      company_id: companyId,
      lead_id: leadId,
      reminder_id: reminder.id,
      lead_name: leadName || reminder.title || "Lead",
      meeting_at: reminder.due_at,
      confirmed_at: nowIso,
      confirmed_by: user.id,
      amount: 97.00,
      status: "pending",
      invoice_month: ym,
    });

    if (errCharge) {
      console.error("Charge insert error", errCharge);
      toast.warning("Reunião marcada — mas cobrança já existia");
    } else {
      toast.success("Reunião confirmada — cobrança de R$ 97,00 registrada");
    }
    fetchReminders();
  };

  const isOverdue = (dueAt: string, completed: boolean) => {
    return !completed && new Date(dueAt) < new Date();
  };

  const formatDueAt = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarClock className="h-4 w-4 text-primary" />
          Lembretes & Reuniões
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" />
          Novo
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <Select value={reminderType} onValueChange={setReminderType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reminder">🔔 Lembrete</SelectItem>
              <SelectItem value="meeting">📅 Reunião</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Título..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
          />
          <Textarea
            placeholder="Descrição (opcional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={adding || !title.trim() || !dueAt} className="flex-1">
              {adding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum lembrete</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className={`flex items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                r.completed
                  ? "border-border/50 bg-muted/20 opacity-60"
                  : isOverdue(r.due_at, r.completed)
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border bg-card"
              }`}
            >
              <button
                onClick={() => toggleComplete(r)}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  r.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 hover:border-primary"
                }`}
              >
                {r.completed && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-medium ${r.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {r.title}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {r.reminder_type === "meeting" ? "📅 Reunião" : "🔔 Lembrete"}
                  </Badge>
                  {r.meeting_held && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-accent/20 text-accent-foreground border-accent/30">
                      ✓ Realizada
                    </Badge>
                  )}
                </div>
                {r.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{r.description}</p>
                )}
                <p className={`text-[10px] mt-0.5 ${
                  isOverdue(r.due_at, r.completed) ? "text-destructive font-medium" : "text-muted-foreground"
                }`}>
                  {isOverdue(r.due_at, r.completed) ? "⚠️ Atrasado — " : ""}
                  {formatDueAt(r.due_at)}
                  {r.reminder_type === "meeting" && r.end_at && ` - ${new Date(r.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
                {isSuperAdmin && r.reminder_type === "meeting" && !r.meeting_held && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markMeetingHeld(r)}
                    className="mt-2 h-6 text-[10px] px-2 gap-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Reunião realizada (R$ 97)
                  </Button>
                )}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

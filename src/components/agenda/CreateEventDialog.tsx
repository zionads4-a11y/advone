import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CalendarPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, addWeeks, addMonths, addYears, addHours } from "date-fns";
import { brtDateTimeToIso } from "@/lib/utils";
import { RecurrenceSelector, type RecurrenceConfig } from "./RecurrenceSelector";
import { getHolidayForDate } from "@/lib/brazilianHolidays";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultDate?: Date;
  defaultTime?: string;
  companies: { id: string; name: string }[];
  leads?: { id: string; name: string; company_id: string }[];
  preselectedCompanyId?: string;
  editEvent?: {
    id: string;
    title: string;
    description: string | null;
    reminder_type: string;
    due_at: string;
    company_id: string;
    lead_id: string;
    recurrence_rule: string | null;
    recurrence_end: string | null;
    end_at?: string | null;
  } | null;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
  defaultDate,
  defaultTime,
  companies,
  leads,
  preselectedCompanyId,
  editEvent,
}: CreateEventDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<"meeting" | "reminder" | "block">("reminder");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("10:00");
  const [companyId, setCompanyId] = useState("");
  const [leadId, setLeadId] = useState("none");
  const [availableLeads, setAvailableLeads] = useState<{ id: string; name: string }[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: "none" });

  useEffect(() => {
    if (open) {
      if (editEvent) {
        const cleanTitle = editEvent.title.replace(/^(📅|🔔)\s*/, "");
        setTitle(cleanTitle);
        setDescription(editEvent.description || "");
        setEventType(
          editEvent.reminder_type === "meeting" ? "meeting" : 
          editEvent.reminder_type === "block" ? "block" : "reminder"
        );
        setDueDate(format(new Date(editEvent.due_at), "yyyy-MM-dd"));
        setDueTime(format(new Date(editEvent.due_at), "HH:mm"));
        setCompanyId(editEvent.company_id);
        setLeadId(editEvent.lead_id || "none");
        if (editEvent.recurrence_rule) {
          setRecurrence(parseRecurrenceRule(editEvent.recurrence_rule, editEvent.recurrence_end));
        } else {
          setRecurrence({ type: "none" });
        }
      } else {
        setTitle("");
        setDescription("");
        setEventType("reminder");
        setDueDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
        setDueTime(defaultTime || "10:00");
        setCompanyId(preselectedCompanyId || (companies.length === 1 ? companies[0].id : ""));
        setLeadId("none");
        setRecurrence({ type: "none" });
      }
    }
  }, [open, defaultDate, defaultTime, companies, preselectedCompanyId, editEvent]);

  useEffect(() => {
    if (!companyId || leads) return;
    const fetchLeads = async () => {
      setLoadingLeads(true);
      const { data } = await supabase
        .from("leads")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name")
        .limit(100);
      setAvailableLeads(data || []);
      setLoadingLeads(false);
    };
    fetchLeads();
  }, [companyId, leads]);

  const filteredLeads = leads
    ? leads.filter((l) => l.company_id === companyId)
    : availableLeads;

  const selectedHoliday = dueDate ? getHolidayForDate(new Date(`${dueDate}T12:00:00`)) : null;
  const isHolidayBlocked = selectedHoliday?.type === "national";

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Título é obrigatório"); return; }
    if (!companyId) { toast.error("Selecione uma empresa"); return; }
    if (!dueDate) { toast.error("Selecione uma data"); return; }
    if (isHolidayBlocked) {
      toast.error(`Não é possível agendar em feriado nacional (${selectedHoliday?.name}).`);
      return;
    }

    setSaving(true);
    // SEMPRE assume horário de Brasília (UTC-3) — independente do fuso do navegador do operador.
    const dueAt = brtDateTimeToIso(dueDate, dueTime);
    const endAt = eventType === "meeting" 
      ? addHours(new Date(dueAt), 1).toISOString() 
      : null;

    let finalLeadId = leadId !== "none" ? leadId : null;
    if (!finalLeadId) {
      const { data: existingLead } = await supabase
        .from("leads").select("id").eq("company_id", companyId).eq("name", "Agenda Geral").maybeSingle();
      if (existingLead) {
        finalLeadId = existingLead.id;
      } else {
        const { data: newLead, error: leadError } = await supabase
          .from("leads").insert({ company_id: companyId, name: "Agenda Geral", status: "new", phone: "" }).select("id").single();
        if (leadError) { toast.error("Erro ao criar evento: " + leadError.message); setSaving(false); return; }
        finalLeadId = newLead.id;
      }
    }

    const recurrenceRule = buildRecurrenceRule(recurrence);
    const recurrenceEnd = recurrence.type !== "none" && recurrence.endDate
      ? brtDateTimeToIso(recurrence.endDate, "23:59") : null;

    const eventData = {
      lead_id: finalLeadId,
      company_id: companyId,
      created_by: user?.id || "00000000-0000-0000-0000-000000000000",
      title: `${eventType === "meeting" ? "📅" : eventType === "block" ? "🚫" : "🔔"} ${title}`,
      description: description || null,
      reminder_type: eventType,
      due_at: dueAt,
      recurrence_rule: recurrenceRule,
      recurrence_end: recurrenceEnd,
    };

    if (editEvent) {
      const { error } = await supabase.from("lead_reminders").update(eventData).eq("id", editEvent.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); }
      else { toast.success("Evento atualizado!"); onCreated(); onOpenChange(false); }
    } else {
      // Create the main event
      const { data: mainEvent, error } = await supabase
        .from("lead_reminders").insert(eventData).select("id").single();

      if (error) {
        toast.error("Erro ao criar: " + error.message);
      } else if (recurrence.type !== "none") {
        // Generate recurring instances
        await generateRecurringInstances(mainEvent.id, eventData, recurrence);
        toast.success("Evento recorrente criado!");
        onCreated();
        onOpenChange(false);
      } else {
        toast.success(eventType === "meeting" ? "Reunião criada!" : "Tarefa criada!");
        onCreated();
        onOpenChange(false);
      }
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            {editEvent ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
          <DialogDescription>
            {editEvent ? "Edite as informações do evento" : "Crie uma tarefa ou agende uma reunião"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Event Type */}
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={eventType === "reminder" ? "default" : "outline"} size="sm"
              onClick={() => { setEventType("reminder"); if (title === "BLOQUEADO") setTitle(""); }} className="gap-2 px-1">
              🔔 Tarefa
            </Button>
            <Button type="button" variant={eventType === "meeting" ? "default" : "outline"} size="sm"
              onClick={() => { setEventType("meeting"); if (title === "BLOQUEADO") setTitle(""); }} className="gap-2 px-1">
              📅 Reunião
            </Button>
            <Button type="button" variant={eventType === "block" ? "default" : "outline"} size="sm"
              onClick={() => { setEventType("block"); setTitle("BLOQUEADO"); }} className="gap-2 px-1">
              🚫 Bloqueio
            </Button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === "meeting" ? "Reunião com cliente" : "Ligar para lead"} />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
          </div>

          {/* Holiday warning */}
          {selectedHoliday && (
            <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
              isHolidayBlocked
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  {isHolidayBlocked ? "Feriado Nacional" : "Ponto Facultativo"}: {selectedHoliday.name}
                </p>
                <p className="opacity-80 mt-0.5">
                  {isHolidayBlocked
                    ? "Não é possível agendar nesta data. Escolha outro dia."
                    : "Esta data é ponto facultativo — confirme com a equipe se haverá expediente."}
                </p>
              </div>
            </div>
          )}

          {/* Recurrence */}
          <RecurrenceSelector value={recurrence} onChange={setRecurrence} />

          {/* Company */}
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setLeadId("none"); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead */}
          {companyId && (
            <div className="space-y-1.5">
              <Label>Lead (opcional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger><SelectValue placeholder="Sem lead específico" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lead específico</SelectItem>
                  {loadingLeads ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : (
                    filteredLeads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento..." rows={3} />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || isHolidayBlocked} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editEvent ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildRecurrenceRule(config: RecurrenceConfig): string | null {
  if (config.type === "none") return null;
  if (config.type === "custom" && config.customInterval && config.customUnit) {
    return `custom:${config.customInterval}:${config.customUnit}`;
  }
  return config.type;
}

function parseRecurrenceRule(rule: string, endDate: string | null): RecurrenceConfig {
  if (rule.startsWith("custom:")) {
    const parts = rule.split(":");
    return {
      type: "custom",
      customInterval: parseInt(parts[1]) || 1,
      customUnit: (parts[2] as "days" | "weeks" | "months") || "days",
      endDate: endDate ? format(new Date(endDate), "yyyy-MM-dd") : undefined,
    };
  }
  return {
    type: rule as RecurrenceConfig["type"],
    endDate: endDate ? format(new Date(endDate), "yyyy-MM-dd") : undefined,
  };
}

async function generateRecurringInstances(
  parentId: string,
  baseData: any,
  config: RecurrenceConfig
) {
  const instances: any[] = [];
  const startDate = new Date(baseData.due_at);
  const maxInstances = 52; // max 1 year of weekly or 52 instances
  const endLimit = config.endDate
    ? new Date(`${config.endDate}T23:59:59`)
    : addMonths(startDate, 3); // default 3 months

  let currentDate = startDate;

  for (let i = 0; i < maxInstances; i++) {
    currentDate = getNextDate(currentDate, config);
    if (currentDate > endLimit) break;

    instances.push({
      ...baseData,
      due_at: currentDate.toISOString(),
      parent_event_id: parentId,
    });
  }

  if (instances.length > 0) {
    // Insert in batches of 20
    for (let i = 0; i < instances.length; i += 20) {
      const batch = instances.slice(i, i + 20);
      await supabase.from("lead_reminders").insert(batch);
    }
  }
}

function getNextDate(current: Date, config: RecurrenceConfig): Date {
  switch (config.type) {
    case "daily": return addDays(current, 1);
    case "weekly": return addWeeks(current, 1);
    case "biweekly": return addWeeks(current, 2);
    case "monthly": return addMonths(current, 1);
    case "yearly": return addYears(current, 1);
    case "weekdays": {
      let next = addDays(current, 1);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next = addDays(next, 1);
      }
      return next;
    }
    case "custom": {
      const interval = config.customInterval || 1;
      const unit = config.customUnit || "days";
      if (unit === "days") return addDays(current, interval);
      if (unit === "weeks") return addWeeks(current, interval);
      return addMonths(current, interval);
    }
    default: return addDays(current, 1);
  }
}

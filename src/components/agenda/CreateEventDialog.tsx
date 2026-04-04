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
import { Loader2, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  defaultDate?: Date;
  companies: { id: string; name: string }[];
  leads?: { id: string; name: string; company_id: string }[];
  preselectedCompanyId?: string;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onCreated,
  defaultDate,
  companies,
  leads,
  preselectedCompanyId,
}: CreateEventDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<"meeting" | "reminder">("reminder");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("10:00");
  const [companyId, setCompanyId] = useState("");
  const [leadId, setLeadId] = useState("none");
  const [availableLeads, setAvailableLeads] = useState<{ id: string; name: string }[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setEventType("reminder");
      setDueDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
      setDueTime("10:00");
      setCompanyId(preselectedCompanyId || (companies.length === 1 ? companies[0].id : ""));
      setLeadId("none");
    }
  }, [open, defaultDate, companies, preselectedCompanyId]);

  // Fetch leads when company changes
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

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!companyId) {
      toast.error("Selecione uma empresa");
      return;
    }
    if (!dueDate) {
      toast.error("Selecione uma data");
      return;
    }

    setSaving(true);
    const dueAt = `${dueDate}T${dueTime}:00`;

    // If no lead selected, we need a lead_id. Create a placeholder or use the first lead.
    let finalLeadId = leadId !== "none" ? leadId : null;

    if (!finalLeadId) {
      // Get or create a generic lead for this company
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", companyId)
        .eq("name", "Agenda Geral")
        .maybeSingle();

      if (existingLead) {
        finalLeadId = existingLead.id;
      } else {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            company_id: companyId,
            name: "Agenda Geral",
            status: "new",
            phone: "",
          })
          .select("id")
          .single();

        if (leadError) {
          toast.error("Erro ao criar evento: " + leadError.message);
          setSaving(false);
          return;
        }
        finalLeadId = newLead.id;
      }
    }

    const { error } = await supabase.from("lead_reminders").insert({
      lead_id: finalLeadId,
      company_id: companyId,
      created_by: user?.id || "00000000-0000-0000-0000-000000000000",
      title: `${eventType === "meeting" ? "📅" : "🔔"} ${title}`,
      description: description || null,
      reminder_type: eventType,
      due_at: dueAt,
    });

    if (error) {
      toast.error("Erro ao criar: " + error.message);
    } else {
      toast.success(eventType === "meeting" ? "Reunião criada!" : "Tarefa criada!");
      onCreated();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Novo Evento
          </DialogTitle>
          <DialogDescription>
            Crie uma tarefa ou agende uma reunião
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Event Type */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={eventType === "reminder" ? "default" : "outline"}
              size="sm"
              onClick={() => setEventType("reminder")}
              className="gap-2"
            >
              🔔 Tarefa
            </Button>
            <Button
              type="button"
              variant={eventType === "meeting" ? "default" : "outline"}
              size="sm"
              onClick={() => setEventType("meeting")}
              className="gap-2"
            >
              📅 Reunião
            </Button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === "meeting" ? "Reunião com cliente" : "Ligar para lead"}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <Label>Empresa *</Label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setLeadId("none"); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead (optional) */}
          {companyId && (
            <div className="space-y-1.5">
              <Label>Lead (opcional)</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem lead específico" />
                </SelectTrigger>
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
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, DollarSign, Pencil, Check, X, MessageCircle, AlertTriangle, CalendarCheck } from "lucide-react";
import { LeadScoreBadge } from "@/components/leads/LeadScoreBadge";
import { SourceBadge } from "@/components/leads/SourceBadge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DraggableLeadCardProps {
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    value: number;
    source: string | null;
    lead_score?: string | null;
    pending_data_warning?: string | null;
    case_area?: string | null;
    case_subtype?: string | null;
    case_urgency?: string | null;
    case_summary_short?: string | null;
  };
  onClick?: () => void;
  isDragOverlay?: boolean;
  onValueUpdate?: (leadId: string, newValue: number) => void;
  isInMeetingHeld?: boolean;
}

export function DraggableLeadCard({ lead, onClick, isDragOverlay, onValueUpdate, isInMeetingHeld }: DraggableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (isDragOverlay) {
    return (
      <Card className="glass-card border-primary/50 shadow-xl rotate-2 w-[260px]">
        <CardContent className="p-3">
          <LeadCardContent lead={lead} isInMeetingHeld={isInMeetingHeld} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <Card className="glass-card cursor-grab transition-all hover:border-primary/30 hover:shadow-md active:cursor-grabbing">
        <CardContent className="p-3">
          <LeadCardContent lead={lead} onValueUpdate={onValueUpdate} isInMeetingHeld={isInMeetingHeld} />
        </CardContent>
      </Card>
    </div>
  );
}

function LeadCardContent({ lead, onValueUpdate, isInMeetingHeld }: { lead: DraggableLeadCardProps["lead"]; onValueUpdate?: (leadId: string, newValue: number) => void; isInMeetingHeld?: boolean }) {
  const navigate = useNavigate();
  const [editingValue, setEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTempValue(lead.value > 0 ? String(lead.value) : "");
    setEditingValue(true);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingValue(false);
  };

  const saveValue = async (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newValue = parseFloat(tempValue.replace(",", ".")) || 0;
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({ value: newValue })
      .eq("id", lead.id);
    if (error) {
      toast.error("Erro ao salvar valor");
    } else {
      lead.value = newValue;
      onValueUpdate?.(lead.id, newValue);
      toast.success("Valor atualizado!");
    }
    setSaving(false);
    setEditingValue(false);
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!lead.phone) return;
    navigate("/conversations");
  };

  return (
    <>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
          {lead.pending_data_warning && (
            <span
              title={`⚠️ ${lead.pending_data_warning} — solicitar na reunião`}
              className="inline-flex items-center gap-0.5 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning border border-warning/30 shrink-0"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Pendente
            </span>
          )}
          {isInMeetingHeld && (
            <span
              title="Reunião realizada — cobrança de R$ 97 gerada"
              className="inline-flex items-center gap-0.5 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/30 shrink-0"
            >
              <CalendarCheck className="h-2.5 w-2.5" />
              R$ 97
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {lead.phone && (
            <button
              onClick={openWhatsApp}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-success hover:text-success/80 transition-colors shrink-0"
              title="Enviar WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          <SourceBadge source={lead.source} />
          {lead.lead_score && <LeadScoreBadge score={lead.lead_score} />}
        </div>
      </div>
      <div className="space-y-1">
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {lead.phone}
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" /> {lead.email}
          </div>
        )}

        {editingValue ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DollarSign className="h-3 w-3 text-success shrink-0" />
            <Input
              type="text"
              inputMode="decimal"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveValue(e);
                if (e.key === "Escape") setEditingValue(false);
              }}
              className="h-6 w-24 text-xs px-1.5 py-0"
              autoFocus
              placeholder="0,00"
            />
            <button
              onClick={saveValue}
              disabled={saving}
              className="text-success hover:text-success/80 shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={cancelEditing}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div
            className="group flex items-center gap-1.5 text-xs font-medium text-success cursor-pointer hover:text-success/80"
            onClick={startEditing}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DollarSign className="h-3 w-3" />
            {lead.value > 0
              ? `R$ ${Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : <span className="text-muted-foreground font-normal">Adicionar valor</span>
            }
            <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
          </div>
        )}
      </div>
    </>
  );
}

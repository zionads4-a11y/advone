import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Mail, DollarSign, Calendar, FileText, User, Scale } from "lucide-react";
import { SourceBadge } from "@/components/leads/SourceBadge";
import { LeadReminders } from "@/components/leads/LeadReminders";
import { LeadSummary } from "@/components/leads/LeadSummary";
import { LeadAssignment } from "@/components/leads/LeadAssignment";

type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-warning/15 text-warning border-warning/30" },
  contacted: { label: "Contatado", className: "bg-info/15 text-info border-info/30" },
  qualified: { label: "Qualificado", className: "bg-primary/15 text-primary border-primary/30" },
  negotiating: { label: "Negociando", className: "bg-info/15 text-info border-info/30" },
  won: { label: "Vendido", className: "bg-success/15 text-success border-success/30" },
  lost: { label: "Perdido", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface LeadData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: LeadStatus;
  value: number;
  source: string | null;
  created_at: string;
  assigned_to: string | null;
  company_id: string;
  processo_numero: string | null;
  cpf: string | null;
  processo_valor: number | null;
}

interface LeadDetailDrawerProps {
  lead: LeadData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdate?: () => void;
}

export function LeadDetailDrawer({ lead, open, onOpenChange, onLeadUpdate }: LeadDetailDrawerProps) {
  const [assignedTo, setAssignedTo] = useState<string | null>(lead?.assigned_to || null);

  // Keep assignedTo in sync when lead changes
  if (lead && lead.assigned_to !== assignedTo && !open) {
    setAssignedTo(lead.assigned_to);
  }

  if (!lead) return null;

  const statusInfo = statusConfig[lead.status] || statusConfig.new;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[440px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-display text-foreground truncate">
                {lead.name}
              </SheetTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={statusInfo.className}>
                  {statusInfo.label}
                </Badge>
                {lead.source && <SourceBadge source={lead.source} size="md" />}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">
            {/* Contact Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contato
              </h4>
              <div className="space-y-1.5">
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {lead.phone}
                  </div>
                )}
                {lead.whatsapp && lead.whatsapp !== lead.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {lead.whatsapp} (WhatsApp)
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {lead.email}
                  </div>
                )}
                {lead.value > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <DollarSign className="h-3.5 w-3.5" />
                    R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Criado em {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados do Processo */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dados do Processo
              </h4>
              <div className="space-y-1.5">
                {lead.cpf && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    CPF: {lead.cpf}
                  </div>
                )}
                {lead.processo_numero && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Processo: {lead.processo_numero}
                  </div>
                )}
                {(lead.processo_valor ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <Scale className="h-3.5 w-3.5" />
                    Valor do Processo: R$ {Number(lead.processo_valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                )}
                {!lead.cpf && !lead.processo_numero && !(lead.processo_valor ?? 0) && (
                  <p className="text-xs text-muted-foreground">Nenhum dado de processo informado</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Assignment */}
            <LeadAssignment
              leadId={lead.id}
              companyId={lead.company_id}
              currentAssignedTo={assignedTo}
              onUpdate={(newAssigned) => {
                setAssignedTo(newAssigned);
                onLeadUpdate?.();
              }}
            />

            <Separator />

            {/* Summary */}
            <LeadSummary leadId={lead.id} companyId={lead.company_id} />

            <Separator />

            {/* Reminders */}
            <LeadReminders leadId={lead.id} companyId={lead.company_id} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

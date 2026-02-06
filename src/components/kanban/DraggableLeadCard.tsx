import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, DollarSign } from "lucide-react";
import { SourceBadge } from "@/components/leads/SourceBadge";

interface DraggableLeadCardProps {
  lead: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    value: number;
    source: string | null;
  };
  onClick?: () => void;
  isDragOverlay?: boolean;
}

export function DraggableLeadCard({ lead, onClick, isDragOverlay }: DraggableLeadCardProps) {
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
          <LeadCardContent lead={lead} />
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
          <LeadCardContent lead={lead} />
        </CardContent>
      </Card>
    </div>
  );
}

function LeadCardContent({ lead }: { lead: DraggableLeadCardProps["lead"] }) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between">
        <p className="text-sm font-medium text-foreground">{lead.name}</p>
        <SourceBadge source={lead.source} />
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
        {lead.value > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
            <DollarSign className="h-3 w-3" />
            R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </>
  );
}

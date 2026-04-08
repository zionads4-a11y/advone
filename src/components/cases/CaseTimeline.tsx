import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Clock, FileText, Scale, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Movement {
  id: string;
  title: string;
  description: string | null;
  movement_type: string;
  created_at: string;
  created_by: string;
}

const MOVEMENT_TYPES = [
  { value: "update", label: "Atualização", icon: ArrowRight, color: "bg-primary" },
  { value: "audiencia", label: "Audiência", icon: Scale, color: "bg-warning" },
  { value: "peticao", label: "Petição", icon: FileText, color: "bg-info" },
  { value: "despacho", label: "Despacho", icon: MessageSquare, color: "bg-accent" },
  { value: "sentenca", label: "Sentença / Decisão", icon: Scale, color: "bg-success" },
  { value: "prazo", label: "Prazo", icon: Clock, color: "bg-destructive" },
];

function getTypeConfig(type: string) {
  return MOVEMENT_TYPES.find((t) => t.value === type) || MOVEMENT_TYPES[0];
}

interface CaseTimelineProps {
  caseId: string;
  companyId: string;
}

export function CaseTimeline({ caseId, companyId }: CaseTimelineProps) {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("update");

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("case_movements" as any)
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    setMovements((data || []) as any as Movement[]);
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleAdd = async () => {
    if (!user || !formTitle.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("case_movements" as any).insert({
      case_id: caseId,
      company_id: companyId,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      movement_type: formType,
      created_by: user.id,
    } as any);

    if (error) {
      toast.error("Erro ao adicionar movimentação");
    } else {
      toast.success("Movimentação adicionada!");
      setFormTitle("");
      setFormDescription("");
      setFormType("update");
      setDialogOpen(false);
      fetchMovements();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Linha do Tempo
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título *</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Petição inicial protocolada"
                />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes da movimentação..."
                />
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!formTitle.trim() || saving}>
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando...
        </div>
      ) : movements.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Nenhuma movimentação registrada
        </p>
      ) : (
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {movements.map((m) => {
              const config = getTypeConfig(m.movement_type);
              const Icon = config.icon;
              return (
                <div key={m.id} className="relative flex gap-3">
                  {/* Dot */}
                  <div className={`absolute -left-6 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full ${config.color} shrink-0`}>
                    <Icon className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{m.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

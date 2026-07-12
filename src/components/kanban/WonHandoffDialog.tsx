import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ArrowRightCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  companyId: string;
  targetColumnId: string; // coluna "Ganho" no Kanban Comercial
  onCompleted: () => void;
}

interface LegalArea {
  id: string;
  name: string;
  color: string | null;
}

interface LawyerOption {
  user_id: string;
  full_name: string;
  role_in_area: "responsavel" | "estagiario";
}

/**
 * Modal obrigatório ao mover um lead para a coluna "Ganho".
 * O usuário escolhe:
 *  - Para qual área jurídica encaminhar
 *  - Responsável principal
 *  - Estagiários adicionais (opcional)
 *
 * Ao confirmar, cria o process_card na área escolhida, adiciona o time
 * e marca o lead como cliente (para SDR perder acesso).
 */
export function WonHandoffDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  companyId,
  targetColumnId,
  onCompleted,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [lawyersByArea, setLawyersByArea] = useState<Record<string, LawyerOption[]>>({});
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedArea("");
    setResponsibleId("");
    setTeamIds(new Set());

    (async () => {
      const [areasRes, ulaRes] = await Promise.all([
        supabase
          .from("legal_areas")
          .select("id, name, color")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("position"),
        supabase
          .from("user_legal_areas")
          .select("user_id, area_id, role_in_area")
          .eq("company_id", companyId),
      ]);

      const areaList = (areasRes.data as LegalArea[]) || [];
      setAreas(areaList);

      const userIds = Array.from(new Set((ulaRes.data || []).map((r: any) => r.user_id)));
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profs || []).forEach((p: any) => (nameMap[p.user_id] = p.full_name || "Sem nome"));
      }

      const byArea: Record<string, LawyerOption[]> = {};
      (ulaRes.data || []).forEach((r: any) => {
        if (!byArea[r.area_id]) byArea[r.area_id] = [];
        byArea[r.area_id].push({
          user_id: r.user_id,
          full_name: nameMap[r.user_id] || "Sem nome",
          role_in_area: r.role_in_area,
        });
      });
      setLawyersByArea(byArea);
      setLoading(false);
    })();
  }, [open, companyId]);

  const currentLawyers = selectedArea ? lawyersByArea[selectedArea] || [] : [];
  const responsaveis = currentLawyers.filter((l) => l.role_in_area === "responsavel");
  const estagiarios = currentLawyers.filter((l) => l.role_in_area === "estagiario");

  const toggleTeam = (uid: string) => {
    setTeamIds((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  };

  const handleConfirm = async () => {
    if (!selectedArea) {
      toast.error("Escolha a área jurídica.");
      return;
    }
    if (!responsibleId) {
      toast.error("Escolha o advogado responsável.");
      return;
    }
    setSaving(true);
    try {
      // 1) busca o board da área
      const { data: board, error: boardErr } = await supabase
        .from("process_boards")
        .select("id")
        .eq("company_id", companyId)
        .eq("legal_area_id", selectedArea)
        .order("is_default", { ascending: false })
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (boardErr || !board) {
        toast.error(
          "Nenhum quadro cadastrado para essa área. Peça ao Master criar em Processos (Kanban)."
        );
        setSaving(false);
        return;
      }

      // 2) primeira coluna do board
      const { data: firstCol } = await supabase
        .from("process_board_columns")
        .select("id")
        .eq("board_id", board.id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!firstCol) {
        toast.error("Quadro sem colunas configuradas.");
        setSaving(false);
        return;
      }

      // 3) buscar dados do lead para carimbar no card
      const { data: leadData } = await supabase
        .from("leads")
        .select("cpf_cliente_final, processo_numero, tipo_caso_detalhado, phone")
        .eq("id", leadId)
        .maybeSingle();

      // 4) criar process_card
      const { data: newCard, error: cardErr } = await supabase
        .from("process_cards")
        .insert({
          company_id: companyId,
          board_id: board.id,
          column_id: firstCol.id,
          lead_id: leadId,
          client_name: leadName,
          cnj_number: (leadData as any)?.processo_numero || null,
          title:
            (leadData as any)?.tipo_caso_detalhado || leadName,
          responsible_id: responsibleId,
          priority: "normal",
          created_by: user?.id,
          position: 0,
        })
        .select("id")
        .single();

      if (cardErr || !newCard) {
        toast.error(cardErr?.message || "Erro ao criar card no quadro da área");
        setSaving(false);
        return;
      }

      // 5) time (estagiários)
      if (teamIds.size > 0) {
        const rows = Array.from(teamIds).map((uid) => ({
          card_id: newCard.id,
          company_id: companyId,
          user_id: uid,
          role_on_card: "estagiario",
          added_by: user?.id,
        }));
        await supabase.from("process_card_team").insert(rows);
      }

      // 6) mover lead para coluna Ganho + marcar como cliente
      const { error: leadErr } = await supabase
        .from("leads")
        .update({
          kanban_column_id: targetColumnId,
          status: "won",
          is_client: true,
          became_client_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadErr) {
        const msg = leadErr.message || "";
        if (msg.includes("CPF_REQUIRED")) {
          toast.error("Cadastre o CPF do cliente antes de mover para Ganho.");
        } else if (msg.includes("CONTRACT_REQUIRED")) {
          toast.error("Registre o contrato assinado antes de mover para Ganho.");
        } else {
          toast.error(msg || "Erro ao atualizar lead");
        }
        setSaving(false);
        return;
      }

      toast.success("Cliente encaminhado para o quadro da área!");
      onOpenChange(false);
      onCompleted();
    } catch (e: any) {
      toast.error(e?.message || "Erro inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="bg-card text-foreground max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowRightCircle className="h-5 w-5 text-primary" />
            Cliente fechou! Encaminhar para área
          </DialogTitle>
          <DialogDescription>
            Escolha a área jurídica que vai atender <strong>{leadName}</strong> e o time responsável.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando áreas...
          </div>
        ) : areas.length === 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
            Nenhuma área jurídica cadastrada. Peça ao Master criar áreas em Processos (Kanban).
          </div>
        ) : (
          <div className="space-y-4">
            {/* Área */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Área jurídica *
              </Label>
              <RadioGroup value={selectedArea} onValueChange={(v) => { setSelectedArea(v); setResponsibleId(""); setTeamIds(new Set()); }}>
                {areas.map((a) => {
                  const lawyerCount = (lawyersByArea[a.id] || []).length;
                  return (
                    <label
                      key={a.id}
                      htmlFor={`area-${a.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 transition-colors hover:bg-secondary/70"
                    >
                      <RadioGroupItem value={a.id} id={`area-${a.id}`} />
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ background: a.color || "#0ea5a4" }}
                      />
                      <span className="flex-1 text-sm font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {lawyerCount} {lawyerCount === 1 ? "pessoa" : "pessoas"}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Responsável */}
            {selectedArea && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Advogado responsável *
                </Label>
                {responsaveis.length === 0 ? (
                  <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                    Nenhum advogado responsável nessa área. Peça ao Master cadastrar em Equipe.
                  </p>
                ) : (
                  <Select value={responsibleId} onValueChange={setResponsibleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsaveis.map((l) => (
                        <SelectItem key={l.user_id} value={l.user_id}>
                          {l.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Time (estagiários) */}
            {selectedArea && estagiarios.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Adicionar ao time (opcional)
                </Label>
                <div className="space-y-1.5">
                  {estagiarios.map((l) => (
                    <label
                      key={l.user_id}
                      htmlFor={`team-${l.user_id}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary/30 p-2 text-sm hover:bg-secondary/60"
                    >
                      <Checkbox
                        id={`team-${l.user_id}`}
                        checked={teamIds.has(l.user_id)}
                        onCheckedChange={() => toggleTeam(l.user_id)}
                      />
                      <span className="flex-1">{l.full_name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Estagiário
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || loading || !selectedArea || !responsibleId}
            className="gradient-primary text-primary-foreground"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

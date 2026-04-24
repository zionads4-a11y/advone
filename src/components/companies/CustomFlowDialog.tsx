import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Niche } from "./botFlowsCatalog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  niche: Niche;
  onCreate: (input: {
    label: string;
    description: string;
    niche: "previdenciario" | "trabalhista";
    icon_emoji?: string;
    case_type?: string;
  }) => Promise<unknown>;
}

const EMOJI_PRESETS = ["✨", "⚖️", "📋", "🎯", "💼", "🏛️", "🛡️", "📚", "🔍", "💰"];

export function CustomFlowDialog({ open, onOpenChange, niche, onCreate }: Props) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("✨");
  const [caseType, setCaseType] = useState("");
  const [flowNiche, setFlowNiche] = useState<"previdenciario" | "trabalhista">(
    niche === "trabalhista" ? "trabalhista" : "previdenciario"
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Dê um nome curto pro fluxo (ex: 'FGTS Professor Contratado').");
      return;
    }
    if (!description.trim() || description.trim().length < 30) {
      toast.error("Descreva a tese com pelo menos 30 caracteres pra Julia/Laura entender.");
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        label: label.trim(),
        description: description.trim(),
        niche: flowNiche,
        icon_emoji: icon,
        case_type: caseType.trim() || undefined,
      });
      toast.success("Fluxo personalizado adicionado! Lembre-se de clicar em \"Gerar prompt\" pra aplicar.");
      setLabel("");
      setDescription("");
      setCaseType("");
      setIcon("✨");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar fluxo";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Adicionar Fluxo Personalizado
          </DialogTitle>
          <DialogDescription>
            Cadastre uma tese específica do seu escritório (ex: "FGTS para professor contratado pela prefeitura há mais de 3 anos sem concurso").
            O bot vai usar essa descrição pra qualificar leads que se encaixam nesse perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 px-6 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2">
            <Label htmlFor="custom-label">Nome curto do fluxo *</Label>
            <Input
              id="custom-label"
              placeholder="Ex: FGTS Professor Contratado"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
            />
            <p className="text-[11px] text-muted-foreground">
              Aparece no menu interno do bot e nos relatórios.
            </p>
          </div>

          {niche === "hibrido" && (
            <div className="space-y-2">
              <Label>Área *</Label>
              <Select value={flowNiche} onValueChange={(v) => setFlowNiche(v as "previdenciario" | "trabalhista")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previdenciario">Previdenciário (INSS)</SelectItem>
                  <SelectItem value="trabalhista">Trabalhista (CLT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="custom-description">Tese / descrição completa *</Label>
            <Textarea
              id="custom-description"
              placeholder="Ex: Professores que trabalham contratados pela prefeitura há mais de 3 anos e não são concursados têm direito a receber FGTS retroativo. O bot deve identificar tempo de contratação, tipo de vínculo e se já buscou esse direito."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={1500}
            />
            <p className="text-[11px] text-muted-foreground">
              Descreva quem se encaixa, o que o bot precisa perguntar e qual o direito em jogo. Quanto mais clara a tese, melhor a qualificação. ({description.length}/1500)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setIcon(e)}
                    className={`text-lg w-8 h-8 rounded-md border transition-colors ${
                      icon === e ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-case-type">case_type (opcional)</Label>
              <Input
                id="custom-case-type"
                placeholder="auto"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                maxLength={40}
              />
              <p className="text-[10px] text-muted-foreground">
                Identificador técnico pro motor de decisão. Deixe em branco pra gerar automático.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Sparkles className="h-4 w-4" />
            Adicionar fluxo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

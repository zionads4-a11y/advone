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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CompanyBotFlow } from "@/hooks/useCompanyBotFlows";
import { getFlowBlock } from "./botFlowBlocks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: CompanyBotFlow | null;
  onSave: (
    flowId: string,
    customPromptBlock: string | null,
  ) => Promise<void>;
}

/**
 * Diálogo de edição do prompt de UM fluxo específico.
 *
 * - Carrega o bloco padrão (do catálogo) ou o custom já salvo no banco
 * - Permite editar livremente
 * - "Restaurar padrão" volta ao texto do código
 * - Salva direto no banco (column custom_prompt_block)
 *
 * Após salvar, o usuário ainda precisa clicar em "Gerar prompt com os fluxos
 * selecionados" pro novo bloco entrar no ai_prompt do whatsapp_configs.
 */
export function EditFlowPromptDialog({ open, onOpenChange, flow, onSave }: Props) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  // Bloco padrão do código (referência pra "Restaurar padrão")
  const defaultBlock = (() => {
    if (!flow) return "";
    if (flow.is_custom) {
      return [
        `▸ ${flow.label.toUpperCase()} (case_type: ${flow.case_type || flow.flow_key}) — FLUXO PERSONALIZADO`,
        flow.description ? `Contexto/tese deste escritório: ${flow.description}` : "",
        "",
        "Conduza por TEXTO LIVRE, UMA pergunta por vez. Identifique se o lead se encaixa nessa tese.",
        "Empatia ao longo da conversa.",
        "",
        "wants_help (texto natural): \"Posso encaixar uma conversa rápida com a equipe pra olharem isso pra você?\"",
        "",
        `Use case_type "${flow.case_type || flow.flow_key}" no decide_lead.`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    const block = getFlowBlock(
      flow.niche as "previdenciario" | "trabalhista",
      flow.flow_key,
    );
    return block?.block || "";
  })();

  useEffect(() => {
    if (!flow) return;
    // Se já tem custom salvo, abre com ele. Senão, abre com o padrão.
    setText(flow.custom_prompt_block?.trim() || defaultBlock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow?.id, open]);

  const isUsingCustom = !!flow?.custom_prompt_block?.trim();
  const isDirty = text.trim() !== (flow?.custom_prompt_block?.trim() || defaultBlock).trim();

  const handleSave = async () => {
    if (!flow) return;
    if (text.trim().length < 30) {
      toast.error("O prompt está muito curto. Descreva o fluxo com mais detalhes.");
      return;
    }
    setSaving(true);
    try {
      // Se o texto for IGUAL ao default, salva null (volta a usar o do código)
      const payload = text.trim() === defaultBlock.trim() ? null : text.trim();
      await onSave(flow.id, payload);
      toast.success(
        payload
          ? "Prompt do fluxo salvo. Clique em \"Gerar prompt com os fluxos selecionados\" pra aplicar no bot."
          : "Voltou ao prompt padrão do sistema.",
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    setText(defaultBlock);
    toast.info("Texto restaurado para o padrão do sistema. Clique em \"Salvar\" pra confirmar.");
  };

  if (!flow) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">{flow.icon_emoji}</span>
            Editar prompt — {flow.label}
            {isUsingCustom && (
              <Badge className="bg-primary/15 text-primary border-primary/30">
                Customizado
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Edite livremente o trecho de prompt deste fluxo. O que você salvar aqui
            substitui o texto padrão do sistema na hora de gerar o prompt do bot.
            Depois de salvar, clique em <strong>&quot;Gerar prompt com os fluxos selecionados&quot;</strong> para
            aplicar a alteração no atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          <div className="rounded-md bg-muted/40 border border-border p-3 text-xs space-y-1">
            <p>
              <strong>Niche:</strong> {flow.niche} · <strong>case_type:</strong>{" "}
              <code className="font-mono">{flow.case_type || flow.flow_key}</code>
            </p>
            <p className="text-muted-foreground">
              💡 Dica: mantenha a estrutura — comece com{" "}
              <code className="font-mono">▸ TÍTULO (case_type: xxx)</code>, descreva
              o tom, as perguntas que a Laura/Julia deve fazer, o gatilho de valor
              e termine com o <code className="font-mono">wants_help</code>. Isso ajuda o bot
              a seguir o fluxo certinho.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flow-prompt">Prompt do fluxo</Label>
            <Textarea
              id="flow-prompt"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={20}
              className="font-mono text-xs leading-relaxed resize-none"
              placeholder="Cole ou escreva aqui o prompt completo deste fluxo…"
            />
            <p className="text-[11px] text-muted-foreground">
              {text.length} caracteres
              {isDirty && (
                <span className="ml-2 text-primary">
                  • alterações não salvas
                </span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleRestoreDefault}
            disabled={saving}
            className="gap-2 sm:mr-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão do sistema
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="gradient-primary text-primary-foreground gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar prompt do fluxo
            <Sparkles className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

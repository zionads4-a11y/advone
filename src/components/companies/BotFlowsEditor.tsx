import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, ListChecks, Save, Plus, Trash2, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCompanyBotFlows, type CompanyBotFlow } from "@/hooks/useCompanyBotFlows";
import { useCompanyOffices } from "@/hooks/useCompanyOffices";
import { buildDynamicLauraPrompt, getFlowBlock, type EnabledFlow, type OfficeAddress } from "./botFlowBlocks";
import type { Niche } from "./botFlowsCatalog";
import { CustomFlowDialog } from "./CustomFlowDialog";
import { EditFlowPromptDialog } from "./EditFlowPromptDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
  niche: Niche;
  officeName: string;
  disabled?: boolean;
  /** Quando o usuário clica em "Aplicar prompt", o componente pai atualiza o textarea */
  onApplyPrompt?: (prompt: string) => void;
}

export function BotFlowsEditor({ companyId, niche, officeName, disabled, onApplyPrompt }: Props) {
  const { flows, loading, toggleFlow, createCustomFlow, deleteFlow, updateFlowPrompt } = useCompanyBotFlows(companyId, niche);
  const { offices } = useCompanyOffices(companyId);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<CompanyBotFlow | null>(null);
  const [flowToEdit, setFlowToEdit] = useState<CompanyBotFlow | null>(null);

  const enabledCount = useMemo(() => flows.filter((f) => f.enabled).length, [flows]);
  const customCount = useMemo(() => flows.filter((f) => f.is_custom).length, [flows]);

  const handleApply = async () => {
    const enabledFlows: EnabledFlow[] = flows
      .filter((f) => f.enabled)
      .map((f) => ({
        flow_key: f.flow_key,
        label: f.label,
        icon_emoji: f.icon_emoji,
        position: f.position,
        niche: f.niche as EnabledFlow["niche"],
        is_custom: f.is_custom,
        case_type: f.case_type || undefined,
        description: f.description || undefined,
        custom_prompt_block: f.custom_prompt_block,
      }));

    if (enabledFlows.length === 0) {
      toast.error("Habilite pelo menos um fluxo antes de aplicar.");
      return;
    }

    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const renumbered = enabledFlows.map((f, idx) => ({
      ...f,
      // Mantém o emoji custom dos fluxos personalizados, renumera só os do catálogo
      icon_emoji: f.is_custom ? f.icon_emoji : (numberEmojis[idx] || f.icon_emoji),
    }));

    const { data: cfg } = await supabase
      .from("whatsapp_configs")
      .select("scheduling_link")
      .eq("company_id", companyId)
      .maybeSingle();

    const { data: companyData } = await supabase
      .from("companies")
      .select("bot_name, bot_role_description")
      .eq("id", companyId)
      .maybeSingle();

    const activeOffices: OfficeAddress[] = offices
      .filter((o) => o.is_active)
      .map((o) => ({
        name: o.name,
        address: o.address,
        complement: o.complement,
        reference_point: o.reference_point,
        maps_url: o.maps_url,
      }));

    const prompt = buildDynamicLauraPrompt({
      niche,
      officeName,
      enabledFlows: renumbered,
      offices: activeOffices,
      schedulingLink: cfg?.scheduling_link || undefined,
      botName: companyData?.bot_name || undefined,
      botRoleDescription: companyData?.bot_role_description || undefined,
    });

    const { error } = await supabase
      .from("whatsapp_configs")
      .update({ ai_prompt: prompt })
      .eq("company_id", companyId);

    if (error) {
      toast.error("Erro ao aplicar prompt: " + error.message);
      return;
    }

    onApplyPrompt?.(prompt);
    toast.success(
      `Prompt gerado com ${enabledFlows.length} fluxo(s) e ${activeOffices.length} unidade(s).`,
    );
  };

  const handleDownloadReport = () => {
    const enabledFlows = flows.filter((f) => f.enabled);
    if (enabledFlows.length === 0) {
      toast.error("Habilite pelo menos um fluxo para gerar o relatório.");
      return;
    }

    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`RELATÓRIO DE CONFIGURAÇÃO DO BOT - ${officeName.toUpperCase()}`, margin, y);
    y += 10;

    // Metadados
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}`, margin, y);
    y += 6;
    doc.text(`Nicho: ${niche.toUpperCase()}`, margin, y);
    y += 6;
    doc.text(`Fluxos Ativos: ${enabledFlows.length}`, margin, y);
    y += 10;

    // Linha divisória
    doc.setLineWidth(0.5);
    doc.line(margin, y, 190, y);
    y += 10;

    // REGRA DE VALORES - DESTACADA
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204); // Azul
    doc.text("💰 SEÇÃO: REGRA DE VALORES E CONSULTA (DESTACADA)", margin, y);
    y += 7;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Preto
    const valorTexto = "Pode ficar tranquilo(a) 🙂 Essa nossa primeira conversa aqui para entender o seu problema e te orientar é totalmente gratuita e feita diretamente com a nossa equipe jurídica. Assuntos relacionados a valores de honorários devem ser tratados somente com os advogados durante a reunião, mas pode ficar despreocupado, pois nesse momento o importante é entender o seu caso e resolver ele! Vamos agendar essa conversa?";
    const valorSplit = doc.splitTextToSize(valorTexto, 170);
    doc.text(valorSplit, margin, y);
    y += (valorSplit.length * 5) + 10;

    doc.line(margin, y, 190, y);
    y += 10;

    // FLUXOS SELECIONADOS
    doc.setFont("helvetica", "bold");
    doc.text("🔥 FLUXOS SELECIONADOS:", margin, y);
    y += 10;

    enabledFlows.forEach((f, idx) => {
      // Check for page break
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      const caseType = f.case_type || f.flow_key;
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 50, 50); // Vermelho suave para destaque do fluxo
      doc.text(`${idx + 1}. [${f.icon_emoji}] ${f.label.toUpperCase()}`, margin, y);
      y += 6;
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(`case_type: ${caseType}`, margin + 5, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("--- CONTEÚDO DO PROMPT ---", margin + 5, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      const block = f.custom_prompt_block || getFlowBlock(f.niche as any, f.flow_key)?.block || "Bloco não encontrado";
      const blockSplit = doc.splitTextToSize(block, 160);
      
      // Handle multiline prompt block with page breaks
      blockSplit.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin + 5, y);
        y += 5;
      });

      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + 5, y, 185, y);
      y += 10;
    });

    doc.save(`relatorio-bot-${officeName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success("Relatório PDF gerado com sucesso!");
  };

  const handleDeleteConfirm = async () => {
    if (!flowToDelete) return;
    try {
      await deleteFlow(flowToDelete.id);
      toast.success("Fluxo personalizado removido. Clique em \"Gerar prompt\" pra atualizar o bot.");
    } catch (err) {
      toast.error("Erro ao remover fluxo");
    } finally {
      setFlowToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base flex-wrap">
            <ListChecks className="h-5 w-5 text-primary" />
            Fluxos Atendidos pelo Escritório
            <Badge variant="secondary">
              {enabledCount} ativos
            </Badge>
            {customCount > 0 && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                {customCount} personalizado(s)
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              className="ml-auto h-7 text-[10px] gap-1"
              title="Baixar relatório dos prompts para auditoria"
            >
              <FileText className="h-3 w-3" />
              Relatório Auditoria
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Habilite apenas os assuntos que este escritório realmente atende. O bot só vai
            oferecer essas opções no menu de abertura. Você também pode adicionar fluxos personalizados
            com teses específicas (ex: FGTS para professor contratado).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCustomDialogOpen(true)}
            disabled={disabled}
            className="w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            Adicionar fluxo personalizado (tese específica)
          </Button>

          {flows.map((flow) => (
            <div
              key={flow.id}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                flow.enabled ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="text-lg leading-none mt-0.5">{flow.icon_emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{flow.label}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {flow.niche}
                    </Badge>
                    {flow.is_custom && (
                      <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                        Personalizado
                      </Badge>
                    )}
                    {flow.custom_prompt_block && flow.custom_prompt_block.trim().length > 0 && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                        ✏️ Prompt editado
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    case_type: {flow.case_type || flow.flow_key}
                  </p>
                  {flow.is_custom && flow.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {flow.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFlowToEdit(flow)}
                  disabled={disabled}
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  title="Editar prompt deste fluxo"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Switch
                  checked={flow.enabled}
                  onCheckedChange={(v) => toggleFlow(flow.id, v)}
                  disabled={disabled}
                />
                {flow.is_custom && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFlowToDelete(flow)}
                    disabled={disabled}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            onClick={handleApply}
            disabled={disabled || enabledCount === 0}
            className="w-full gradient-primary text-primary-foreground gap-2 mt-4"
          >
            <Sparkles className="h-4 w-4" />
            Gerar prompt com os fluxos selecionados
            <Save className="h-4 w-4" />
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            O prompt é montado dinamicamente, incluindo {offices.filter((o) => o.is_active).length} unidade(s) ativa(s) para reunião presencial.
          </p>
          {offices.filter((o) => o.is_active).length === 0 && (
            <p className="text-[10px] text-center text-destructive">
              ⚠️ Nenhum endereço cadastrado. Para reunião presencial, cadastre as unidades em &quot;Endereços dos Escritórios&quot; (Configurações da Empresa).
            </p>
          )}
        </CardContent>
      </Card>

      <CustomFlowDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        niche={niche}
        onCreate={createCustomFlow}
      />

      <EditFlowPromptDialog
        open={!!flowToEdit}
        onOpenChange={(o) => !o && setFlowToEdit(null)}
        flow={flowToEdit}
        onSave={updateFlowPrompt}
      />

      <AlertDialog open={!!flowToDelete} onOpenChange={(o) => !o && setFlowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fluxo personalizado?</AlertDialogTitle>
            <AlertDialogDescription>
              O fluxo <strong>{flowToDelete?.label}</strong> será removido permanentemente.
              Lembre-se de clicar em &quot;Gerar prompt&quot; pra atualizar o bot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

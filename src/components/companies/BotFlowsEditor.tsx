import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, ListChecks, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompanyBotFlows } from "@/hooks/useCompanyBotFlows";
import { useCompanyOffices } from "@/hooks/useCompanyOffices";
import { buildDynamicLauraPrompt, type EnabledFlow, type OfficeAddress } from "./botFlowBlocks";
import type { Niche } from "./botFlowsCatalog";
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
  const { flows, loading, toggleFlow } = useCompanyBotFlows(companyId, niche);
  const { offices } = useCompanyOffices(companyId);

  const enabledCount = useMemo(() => flows.filter((f) => f.enabled).length, [flows]);

  const handleApply = async () => {
    const enabledFlows: EnabledFlow[] = flows
      .filter((f) => f.enabled)
      .map((f) => ({
        flow_key: f.flow_key,
        label: f.label,
        icon_emoji: f.icon_emoji,
        position: f.position,
        niche: f.niche as "previdenciario" | "trabalhista",
      }));

    if (enabledFlows.length === 0) {
      toast.error("Habilite pelo menos um fluxo antes de aplicar.");
      return;
    }

    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const renumbered = enabledFlows.map((f, idx) => ({
      ...f,
      icon_emoji: numberEmojis[idx] || f.icon_emoji,
    }));

    const { data: cfg } = await supabase
      .from("whatsapp_configs")
      .select("scheduling_link")
      .eq("company_id", companyId)
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
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-5 w-5 text-primary" />
          Fluxos Atendidos pelo Escritório
          <Badge variant="secondary" className="ml-auto">
            {enabledCount} ativos
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Habilite apenas os assuntos que este escritório realmente atende. O bot só vai
          oferecer essas opções no menu de abertura. Ex: escritório que só faz RMC/RCC,
          BPC e Demora INSS pode desativar Aposentadoria e Revisão.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
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
                </div>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  case_type: {flow.flow_key}
                </p>
              </div>
            </div>
            <Switch
              checked={flow.enabled}
              onCheckedChange={(v) => toggleFlow(flow.id, v)}
              disabled={disabled}
            />
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
          <p className="text-[10px] text-center text-amber-600 dark:text-amber-400">
            ⚠️ Nenhum endereço cadastrado. Para reunião presencial, cadastre as unidades em &quot;Endereços dos Escritórios&quot; (Configurações da Empresa).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

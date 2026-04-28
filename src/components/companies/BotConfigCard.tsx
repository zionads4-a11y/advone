import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Loader2, Save, ShieldCheck, Building2, Link2, Users, Clock, ListChecks, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TriageOptionsEditor, type TriageOption } from "./TriageOptionsEditor";
import { BotTestChat } from "./BotTestChat";
import { AgentConfigPanel } from "./AgentConfigPanel";
import { DecisionRulesPanel } from "./DecisionRulesPanel";
import { PROMPT_TEMPLATES } from "./PromptTemplates";
import { PracticeSpecialtySelector, type PracticeSpecialty } from "./PracticeSpecialtySelector";
import { BotFlowsEditor } from "./BotFlowsEditor";

interface BotConfigCardProps {
  companyId: string;
  hasWhatsappConfig: boolean;
}

export function BotConfigCard({ companyId, hasWhatsappConfig }: BotConfigCardProps) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [communicationTone, setCommunicationTone] = useState("moderado");
  const [schedulingLink, setSchedulingLink] = useState("");
  const [consultationDuration, setConsultationDuration] = useState("30 minutos");
  const [targetAudience, setTargetAudience] = useState("");
  const [triageOptions, setTriageOptions] = useState<TriageOption[]>([]);
  const [specialty, setSpecialty] = useState<PracticeSpecialty>("previdenciario");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mostra todos os templates disponíveis. A área de atuação serve apenas como referência;
  // o usuário pode aplicar qualquer prompt (Previdenciário, Trabalhista ou Híbrido).
  const visibleTemplates = PROMPT_TEMPLATES;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_configs")
        .select("ai_enabled, ai_auto_reply, ai_prompt, office_name, practice_area, communication_tone, scheduling_link, consultation_duration, target_audience, triage_options")
        .eq("company_id", companyId)
        .maybeSingle();

      if (data) {
        setAiEnabled(data.ai_enabled || false);
        setAiAutoReply(data.ai_auto_reply || false);
        setAiPrompt(
          data.ai_prompt ||
            "Você é um atendente virtual da empresa. Seja cordial, responda dúvidas dos clientes de forma clara e objetiva."
        );
        setOfficeName((data as any).office_name || "");
        setPracticeArea((data as any).practice_area || "");
        setCommunicationTone((data as any).communication_tone || "moderado");
        setSchedulingLink((data as any).scheduling_link || "");
        setConsultationDuration((data as any).consultation_duration || "30 minutos");
        setTargetAudience((data as any).target_audience || "");
        setTriageOptions(Array.isArray((data as any).triage_options) ? (data as any).triage_options : []);
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);

    const { data: oldData } = await supabase
      .from("whatsapp_configs")
      .select("ai_enabled, ai_auto_reply, ai_prompt")
      .eq("company_id", companyId)
      .maybeSingle();

    const newValues = {
      ai_enabled: aiEnabled,
      ai_auto_reply: aiAutoReply,
      ai_prompt: "", // Removido da UI: prompt montado pelo Bot Flows Editor
      office_name: officeName || null,
      practice_area: practiceArea || null,
      communication_tone: communicationTone,
      scheduling_link: schedulingLink || null,
      consultation_duration: consultationDuration,
      target_audience: targetAudience || null,
      triage_options: triageOptions.length > 0 ? JSON.parse(JSON.stringify(triageOptions)) : null,
    };

    const { error } = await supabase
      .from("whatsapp_configs")
      .update(newValues)
      .eq("company_id", companyId);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("insert_audit_log", {
          _company_id: companyId,
          _user_id: user.id,
          _action: "update",
          _entity_type: "whatsapp_ai_config",
          _entity_id: companyId,
          _old_values: oldData ? {
            ai_enabled: oldData.ai_enabled,
            ai_auto_reply: oldData.ai_auto_reply,
            ai_prompt: oldData.ai_prompt,
          } : null,
          _new_values: newValues,
        });
      }
      toast.success("Configuração do bot salva!");
    }
    setSaving(false);
  };

  if (!hasWhatsappConfig) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-muted-foreground" />
            Bot de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Configure o WhatsApp primeiro para habilitar o bot de atendimento.
          </p>
        </CardContent>
      </Card>
    );
  }

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
    <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
      <div className="space-y-6">
      {/* Practice specialty selector */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Área de Atuação do Escritório
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Define quais templates de qualificação ficam disponíveis para esta empresa.
          </p>
        </CardHeader>
        <CardContent>
          <PracticeSpecialtySelector companyId={companyId} onChange={setSpecialty} compact />
        </CardContent>
      </Card>

      {/* Main toggle card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            Bot de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => setAiEnabled(!aiEnabled)}
            className={`w-full flex items-center justify-between rounded-xl p-4 transition-all cursor-pointer border-2 ${
              aiEnabled
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                aiEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <Bot className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-base font-semibold text-foreground">
                  {aiEnabled ? "Bot Ativado" : "Bot Desativado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {aiEnabled ? "O robô está qualificando leads automaticamente" : "Clique para ativar o atendente virtual"}
                </p>
              </div>
            </div>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          </button>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Resposta automática</p>
              <p className="text-xs text-muted-foreground">
                Bot responde e qualifica leads automaticamente
              </p>
            </div>
            <Switch
              checked={aiAutoReply}
              onCheckedChange={setAiAutoReply}
              disabled={!aiEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Personalization card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Personalização do Bot SDR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Nome do escritório
              </Label>
              <Input
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="Ex: Silva & Associados"
                disabled={!aiEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Área de atuação
              </Label>
              <Input
                value={practiceArea}
                onChange={(e) => setPracticeArea(e.target.value)}
                placeholder="Ex: Direito Trabalhista"
                disabled={!aiEnabled}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Tom de comunicação</Label>
              <Select value={communicationTone} onValueChange={setCommunicationTone} disabled={!aiEnabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="informal">Informal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Duração da consulta
              </Label>
              <Input
                value={consultationDuration}
                onChange={(e) => setConsultationDuration(e.target.value)}
                placeholder="Ex: 30 minutos"
                disabled={!aiEnabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              Link de agendamento
            </Label>
            <Input
              value={schedulingLink}
              onChange={(e) => setSchedulingLink(e.target.value)}
              placeholder="Ex: https://calendly.com/seuescritorio"
              disabled={!aiEnabled}
            />
            <p className="text-[10px] text-muted-foreground">
              O bot enviará este link quando o lead estiver pronto para agendar.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Público-alvo
            </Label>
            <Textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ex: Trabalhadores CLT demitidos sem justa causa, com pelo menos 6 meses de vínculo..."
              rows={2}
              className="text-sm"
              disabled={!aiEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Menu de Triagem removido — substituído pelo Editor de Fluxos abaixo */}

      {/* Editor de fluxos do bot por empresa */}
      <BotFlowsEditor
        companyId={companyId}
        niche={specialty}
        officeName={officeName}
        disabled={!aiEnabled}
        onApplyPrompt={async (p) => {
          setAiPrompt(p);
          // Também atualiza o prompt na tabela de empresas para que apareça no topo da página de configurações
          await supabase
            .from("companies")
            .update({ bot_prompt: p })
            .eq("id", companyId);
        }}
      />

      {/* Botão de salvar (prompt agora é montado pelo Bot Flows Editor) */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gradient-primary text-primary-foreground gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Salvando..." : "Salvar Configuração do Bot"}
          </Button>
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            O prompt da Laura é montado automaticamente pelos fluxos ativados acima.
          </p>
        </CardContent>
      </Card>

      {/* Agent Configuration Panel */}
      <AgentConfigPanel companyId={companyId} aiEnabled={aiEnabled} />

      {/* Decision Engine Rules Panel */}
      <DecisionRulesPanel companyId={companyId} />
      </div>

      {/* Test Chat Panel */}
      <div className="lg:sticky lg:top-4 self-start">
        <BotTestChat companyId={companyId} />
      </div>
    </div>
  );
}

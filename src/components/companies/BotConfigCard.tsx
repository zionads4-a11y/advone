import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface BotConfigCardProps {
  companyId: string;
  hasWhatsappConfig: boolean;
}

export function BotConfigCard({ companyId, hasWhatsappConfig }: BotConfigCardProps) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_configs")
        .select("ai_enabled, ai_auto_reply, ai_prompt")
        .eq("company_id", companyId)
        .maybeSingle();

      if (data) {
        setAiEnabled(data.ai_enabled || false);
        setAiAutoReply(data.ai_auto_reply || false);
        setAiPrompt(
          data.ai_prompt ||
            "Você é um atendente virtual da empresa. Seja cordial, responda dúvidas dos clientes de forma clara e objetiva."
        );
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
      ai_prompt: aiPrompt,
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
        await supabase.from("audit_logs").insert({
          company_id: companyId,
          user_id: user.id,
          action: "update",
          entity_type: "whatsapp_ai_config",
          entity_id: companyId,
          old_values: oldData ? {
            ai_enabled: oldData.ai_enabled,
            ai_auto_reply: oldData.ai_auto_reply,
            ai_prompt: oldData.ai_prompt,
          } : null,
          new_values: newValues,
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
            Configure o WhatsApp (Z-API) primeiro para habilitar o bot de atendimento.
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
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          Bot de Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Ativar Bot</p>
            <p className="text-xs text-muted-foreground">Habilita o atendente virtual com IA</p>
          </div>
          <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
        </div>

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

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Perfil de clientes desejados
          </Label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Descreva o perfil de clientes que o escritório deseja atender, critérios de qualificação, área de atuação e como o bot deve se comportar..."
            rows={6}
            className="text-sm"
            disabled={!aiEnabled}
          />
          <p className="text-[10px] text-muted-foreground">
            Descreva sua área de atuação, critérios de qualificação e orientações para o bot. Ex: "Somos um escritório de direito trabalhista. Só atendemos clientes com mínimo de 6 meses de vínculo empregatício registrado em carteira."
          </p>
        </div>

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
      </CardContent>
    </Card>
  );
}

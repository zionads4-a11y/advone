import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Copy, QrCode, Link2, Loader2, RefreshCw, Bot } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface WhatsAppConfig {
  id: string;
  company_id: string;
  zapi_instance_id: string;
  zapi_token: string;
  zapi_webhook_configured: boolean;
  phone_number: string | null;
  status: string;
}

interface ZapiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  config: WhatsAppConfig | null;
  onSubmit: (formData: FormData) => void;
}

function getWebhookUrl(companyId: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "oonteavjxzkovrzktnie";
  return `https://${projectId}.supabase.co/functions/v1/zapi-webhook?company_id=${companyId}`;
}

export function ZapiConfigDialog({
  open,
  onOpenChange,
  companyId,
  config,
  onSubmit,
}: ZapiConfigDialogProps) {
  const { userRole } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const canConfigureAI = userRole === "admin" || userRole === "gerente";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(getWebhookUrl(companyId));
    toast.success("URL do webhook copiada!");
  };

  const fetchQrCode = async () => {
    if (!config) {
      toast.error("Configure a Z-API primeiro antes de gerar o QR Code");
      return;
    }
    setQrLoading(true);
    setQrCode(null);

    const { data, error } = await supabase.functions.invoke("zapi-qrcode", {
      body: { company_id: companyId, action: "get_qrcode" },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao obter QR Code");
    } else if (data?.qrcode) {
      setQrCode(typeof data.qrcode === "string" ? data.qrcode : JSON.stringify(data.qrcode));
    }
    setQrLoading(false);
  };

  const generateShareableLink = async () => {
    if (!config) {
      toast.error("Configure a Z-API primeiro antes de gerar o link");
      return;
    }
    setLinkLoading(true);

    const { data, error } = await supabase.functions.invoke("zapi-qrcode", {
      body: { company_id: companyId, action: "generate_link" },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao gerar link");
    } else if (data?.token) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/connect/${data.token}`;
      setShareableLink(link);
      setLinkExpiry(data.expires_at);
      toast.success("Link gerado com sucesso!");
    }
    setLinkLoading(false);
  };

  const copyShareableLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      toast.success("Link copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Configurar WhatsApp (Z-API)
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="config" className="flex-1 gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Configuração
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex-1 gap-1.5 text-xs" disabled={!config}>
              <QrCode className="h-3.5 w-3.5" /> QR Code
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1 gap-1.5 text-xs" disabled={!config}>
              <Link2 className="h-3.5 w-3.5" /> Link
            </TabsTrigger>
            {canConfigureAI && (
              <TabsTrigger value="ai" className="flex-1 gap-1.5 text-xs" disabled={!config}>
                <Bot className="h-3.5 w-3.5" /> IA
              </TabsTrigger>
            )}
          </TabsList>

          {/* Config Tab */}
          <TabsContent value="config">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>ID da Instância *</Label>
                <Input
                  name="zapi_instance_id"
                  required
                  placeholder="Ex: 3C1A2B3D4E5F..."
                  defaultValue={config?.zapi_instance_id || ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Token *</Label>
                <Input
                  name="zapi_token"
                  type="password"
                  required
                  placeholder="Token da Z-API"
                  defaultValue={config?.zapi_token || ""}
                />
              </div>

              {companyId && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">URL do Webhook</p>
                  <p className="text-xs text-muted-foreground">
                    Configure esta URL no painel da Z-API como webhook de recebimento:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background p-2 text-[10px] text-foreground break-all">
                      {getWebhookUrl(companyId)}
                    </code>
                    <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                Salvar Configuração
              </Button>
            </form>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Escaneie o QR Code abaixo com o WhatsApp da empresa para conectar à Z-API.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {qrLoading ? (
                  <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-border bg-background">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : qrCode ? (
                  <div className="rounded-lg border border-border bg-white p-4">
                    <img
                      src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code WhatsApp"
                      className="h-64 w-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-64 w-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background text-muted-foreground">
                    <QrCode className="mb-2 h-10 w-10" />
                    <p className="text-xs">Clique para gerar o QR Code</p>
                  </div>
                )}

                <Button onClick={fetchQrCode} disabled={qrLoading} variant="outline" className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${qrLoading ? "animate-spin" : ""}`} />
                  {qrCode ? "Atualizar QR Code" : "Gerar QR Code"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Shareable Link Tab */}
          <TabsContent value="link">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Gere um link temporário (válido por <strong className="text-foreground">3 horas</strong>) para
                  enviar à empresa. Ao acessar o link, a empresa poderá escanear o QR Code diretamente.
                </p>
              </div>

              {shareableLink ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Link gerado:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-background p-2 text-[10px] text-foreground break-all">
                        {shareableLink}
                      </code>
                      <Button type="button" variant="outline" size="sm" onClick={copyShareableLink}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {linkExpiry && (
                      <p className="text-[10px] text-muted-foreground">
                        Expira em: {new Date(linkExpiry).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <Button onClick={generateShareableLink} disabled={linkLoading} variant="outline" className="w-full gap-2">
                    <RefreshCw className={`h-4 w-4 ${linkLoading ? "animate-spin" : ""}`} />
                    Gerar novo link
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Link2 className="h-8 w-8 text-primary" />
                  </div>
                  <Button
                    onClick={generateShareableLink}
                    disabled={linkLoading}
                    className="gradient-primary text-primary-foreground gap-2"
                  >
                    {linkLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Gerar Link Compartilhável
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI Tab - only for admin/gerente */}
          {canConfigureAI && (
            <TabsContent value="ai">
              <AIConfigTab companyId={companyId} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AIConfigTab({ companyId }: { companyId: string }) {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current AI config
  useState(() => {
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
  });

  const handleSave = async () => {
    setSaving(true);

    // Capture old values before update
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
      // Log audit entry
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
      toast.success("Configuração IA salva!");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/30 p-3">
        <p className="text-xs text-muted-foreground">
          Configure o atendente virtual com IA. Quando ativado, a IA pode responder automaticamente
          os leads pelo WhatsApp ou sugerir respostas na tela de Conversas.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Ativar IA</p>
          <p className="text-xs text-muted-foreground">Habilita sugestões de resposta na tela de Conversas</p>
        </div>
        <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Resposta automática</p>
          <p className="text-xs text-muted-foreground">
            IA responde automaticamente quando chega uma mensagem
          </p>
        </div>
        <Switch
          checked={aiAutoReply}
          onCheckedChange={setAiAutoReply}
          disabled={!aiEnabled}
        />
      </div>

      <div className="space-y-2">
        <Label>Prompt da IA</Label>
        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Instruções para a IA..."
          rows={4}
          className="text-sm"
          disabled={!aiEnabled}
        />
        <p className="text-[10px] text-muted-foreground">
          Defina como a IA deve se comportar, o tom de voz, informações sobre a empresa, etc.
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gradient-primary text-primary-foreground"
      >
        {saving ? "Salvando..." : "Salvar Configuração IA"}
      </Button>
    </div>
  );
}

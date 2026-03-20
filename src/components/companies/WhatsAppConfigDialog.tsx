import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wifi,
  Copy,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Bot,
} from "lucide-react";
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

interface WhatsAppConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  config: WhatsAppConfig | null;
  onSubmit: (formData: FormData) => void;
}

const SERVER_URL = "https://ziondigital.uazapi.com";

function getWebhookUrl() {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-webhook`;
}

export function ZapiConfigDialog({
  open,
  onOpenChange,
  companyId,
  config,
  onSubmit,
}: ZapiConfigDialogProps) {
  const { userRole: _userRole } = useAuth();

  const [activeTab, setActiveTab] = useState("whatsapp");
  const [saving, setSaving] = useState(false);

  // WhatsApp form
  const [formInstanceId, setFormInstanceId] = useState("");
  const [formToken, setFormToken] = useState("");

  // QR Code state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState<"connected" | "disconnected">("disconnected");

  // AI form
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(true);

  const webhookUrl = getWebhookUrl();

  // Populate form when config changes
  useEffect(() => {
    if (config) {
      setFormInstanceId(config.zapi_instance_id || "");
      setFormToken(config.zapi_token || "");
      setQrStatus("disconnected");
      setQrCode(null);
      // Check connection status
      checkStatus();
    } else {
      setFormInstanceId("");
      setFormToken("");
      setQrCode(null);
      setQrStatus("disconnected");
    }
  }, [config, open]);

  // Load AI config
  useEffect(() => {
    if (!open || !companyId) return;
    const load = async () => {
      setAiLoading(true);
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
      setAiLoading(false);
    };
    load();
  }, [companyId, open]);

  const checkStatus = async () => {
    if (!config) return;
    setQrLoading(true);
    try {
      const { data } = await supabase.functions.invoke("zapi-qrcode", {
        body: { company_id: companyId, action: "get-status" },
      });
      const connected = data?.connected === true;
      setQrStatus(connected ? "connected" : "disconnected");
      if (connected) {
        setQrCode(null);
      }
    } catch {
      setQrStatus("disconnected");
    } finally {
      setQrLoading(false);
    }
  };

  const fetchQrCode = async () => {
    if (!config) {
      toast.error("Salve a configuração primeiro antes de gerar o QR Code");
      return;
    }
    setQrLoading(true);
    setQrCode(null);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-qrcode", {
        body: { company_id: companyId, action: "get_qrcode" },
      });
      if (error) throw error;
      if (data?.connected) {
        setQrStatus("connected");
        toast.success("WhatsApp já conectado!");
      } else if (data?.qrcode) {
        const qr = data.qrcode;
        setQrCode(qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);
        setQrStatus("disconnected");
      } else {
        toast.error(data?.error || "QR Code indisponível. Tente novamente.");
      }
    } catch (err: any) {
      toast.error("Erro ao gerar QR Code: " + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    if (!formInstanceId) {
      toast.error("Nome da instância é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      // Use the onSubmit callback with a synthetic FormData
      const fd = new FormData();
      fd.set("zapi_instance_id", formInstanceId);
      fd.set("zapi_token", formToken);
      onSubmit(fd);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAI = async () => {
    setSaving(true);
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
          old_values: null,
          new_values: newValues,
        });
      }
      toast.success("Configuração IA salva!");
    }
    setSaving(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
          <DialogDescription>
            Configure a instância UaZapi e chatbot de IA.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="whatsapp">Conexão WhatsApp</TabsTrigger>
            <TabsTrigger value="ai">Chatbot IA (SDR)</TabsTrigger>
          </TabsList>

          {/* Tab: Conexão WhatsApp */}
          <TabsContent value="whatsapp" className="space-y-4 pt-2">
            {/* Server URL - read-only */}
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs font-medium text-muted-foreground">Server URL (salvo nos padrões)</Label>
              <Input readOnly value={SERVER_URL} className="text-xs font-mono bg-background text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Configurado em Padrões da Clínica. O Admin Token está salvo nos secrets.</p>
            </div>

            {/* Instance Name */}
            <div className="space-y-2">
              <Label>Nome da Instância (UaZapi) *</Label>
              <Input
                value={formInstanceId}
                onChange={(e) => setFormInstanceId(e.target.value)}
                placeholder="Ex: 88fbac77-b070-48b2-872e-2db662cc800b"
              />
              <p className="text-xs text-muted-foreground">Nome exato da instância criada no painel do UaZapi.</p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label className="text-xs font-medium">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={webhookUrl} className="text-xs font-mono bg-background" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl, "URL do webhook")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Conectar WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code para conectar</p>
                </div>
                <div className="flex items-center gap-2">
                  {qrStatus === "connected" ? (
                    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="w-3 h-3" /> Conectado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" /> Desconectado
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={checkStatus} disabled={qrLoading}>
                    <RefreshCw className={`w-4 h-4 ${qrLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {qrStatus !== "connected" && (
                <div className="space-y-3">
                  {!qrCode && (
                    <Button onClick={fetchQrCode} disabled={qrLoading || !config} variant="outline" className="w-full gap-2">
                      {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                      {qrLoading ? "Gerando QR Code..." : "Gerar QR Code"}
                    </Button>
                  )}
                  {qrCode && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-background border border-dashed rounded-lg">
                      <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                      <p className="text-xs text-muted-foreground text-center">
                        Escaneie com o WhatsApp da empresa
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchQrCode} disabled={qrLoading}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
                        </Button>
                        <Button variant="outline" size="sm" onClick={checkStatus} disabled={qrLoading}>
                          Verificar Conexão
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {qrStatus === "connected" && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">WhatsApp conectado e pronto para uso!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Chatbot IA (SDR) */}
          <TabsContent value="ai" className="space-y-4 pt-2">
            {aiLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Chatbot IA (SDR)</p>
                    <p className="text-xs text-muted-foreground">Respostas automáticas inteligentes via WhatsApp</p>
                  </div>
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>

                {aiEnabled && (
                  <>
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

                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-2 text-sm">
                        <Bot className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <div>
                          <p className="font-medium">Atendente IA ativado</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            O chatbot irá atender automaticamente as mensagens recebidas,
                            qualificar leads e agendar consultas. Configure a personalização
                            completa no painel do Bot (menu lateral).
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Prompt da IA</Label>
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Instruções para a IA..."
                        rows={4}
                        className="text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Defina como a IA deve se comportar, o tom de voz, informações sobre a empresa, etc.
                      </p>
                    </div>
                  </>
                )}

                {!aiEnabled && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Ative o Chatbot IA para atendimento automático</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={activeTab === "whatsapp" ? handleSaveWhatsApp : handleSaveAI}
            disabled={saving}
            className="gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

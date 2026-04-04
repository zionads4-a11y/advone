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
  onSubmit: () => void;
}

const SERVER_URL = "https://ziondigital.uazapi.com";

function getWebhookUrl(companyId: string) {
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapi-webhook`;
  return companyId ? `${baseUrl}?company_id=${companyId}` : baseUrl;
}

export function WhatsAppConfigDialog({
  open,
  onOpenChange,
  companyId,
  config,
  onSubmit,
}: WhatsAppConfigDialogProps) {
  const { userRole: _userRole } = useAuth();

  const [activeTab, setActiveTab] = useState("whatsapp");
  const [saving, setSaving] = useState(false);

  // WhatsApp form
  const [formInstanceId, setFormInstanceId] = useState("");

  // QR Code state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState<"connected" | "disconnected">("disconnected");

  // AI form
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiObjective, setAiObjective] = useState("Entrar em contato com os Leads e agendar uma reunião");
  const [alertWhatsapp, setAlertWhatsapp] = useState("");
  const [aiLoading, setAiLoading] = useState(true);

  const webhookUrl = getWebhookUrl(companyId);

  // Populate form when config changes
  useEffect(() => {
    if (config) {
      setFormInstanceId(config.zapi_instance_id || "");
      setQrStatus("disconnected");
      setQrCode(null);
      checkStatus();
    } else {
      setFormInstanceId("");
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
        .select("ai_enabled, ai_auto_reply, ai_prompt, ai_objective, alert_whatsapp")
        .eq("company_id", companyId)
        .maybeSingle();

      if (data) {
        setAiEnabled(data.ai_enabled || false);
        setAiAutoReply(data.ai_auto_reply || false);
        setAiPrompt(
          data.ai_prompt ||
          "Você é um SDR especializado em [seu nicho].\n\nSeu objetivo é:\n1. Qualificar o interesse do lead\n2. Descobrir as necessidades\n3. Agendar uma reunião"
        );
        setAiObjective(data.ai_objective || "Entrar em contato com os Leads e agendar uma reunião");
        setAlertWhatsapp(data.alert_whatsapp || "");
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

    if (!config.zapi_token) {
      toast.error("Informe o token da instância e salve antes de gerar o QR Code");
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
        return;
      }

      const qrPayload = data?.qrcode;
      const qr =
        typeof qrPayload === "string"
          ? qrPayload
          : typeof qrPayload?.value === "string"
            ? qrPayload.value
            : typeof qrPayload?.qrcode === "string"
              ? qrPayload.qrcode
              : null;

      if (!qr) {
        const apiError =
          data?.error ||
          qrPayload?.error ||
          qrPayload?.message ||
          "QR Code inválido retornado pela API";
        toast.error(apiError);
        return;
      }

      setQrCode(qr.startsWith("data:image") ? qr : `data:image/png;base64,${qr}`);
      setQrStatus("disconnected");
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
      const { data, error } = await supabase.functions.invoke("zapi-qrcode", {
        body: { company_id: companyId, action: "save_instance", instance_id: formInstanceId.trim() },
      });
      if (error) throw error;
      if (data?.saved) {
        toast.success(data.message || "Configuração salva!");
        onSubmit(); // trigger parent refresh
      } else {
        toast.error(data?.error || "Erro ao salvar");
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
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
      ai_objective: aiObjective,
      alert_whatsapp: alertWhatsapp || null,
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
                placeholder="Ex: f2749759-f67f-477a-b5d6-cfe75984f029"
              />
              <p className="text-xs text-muted-foreground">UUID da instância criada no painel do UaZapi. O token será buscado automaticamente.</p>
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">WhatsApp conectado e pronto para uso!</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    disabled={qrLoading}
                    onClick={async () => {
                      setQrLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("zapi-qrcode", {
                          body: { company_id: companyId, action: "disconnect" },
                        });
                        if (error) throw error;
                        if (data?.disconnected) {
                          toast.success("WhatsApp desconectado com sucesso!");
                          setQrStatus("disconnected");
                          setQrCode(null);
                        } else {
                          toast.error(data?.error || "Erro ao desconectar");
                        }
                      } catch (err: any) {
                        toast.error("Erro ao desconectar: " + err.message);
                      } finally {
                        setQrLoading(false);
                      }
                    }}
                  >
                    {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Desconectar WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 pt-2">
            {aiLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Toggle Ativar Chatbot IA */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Ativar Chatbot IA</p>
                      <p className="text-xs text-muted-foreground">IA responderá automaticamente as mensagens</p>
                    </div>
                  </div>
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>

                {aiEnabled && (
                  <>
                    {/* Objetivo da IA */}
                    <div className="space-y-2">
                      <Label className="font-medium">Objetivo da IA</Label>
                      <Input
                        value={aiObjective}
                        onChange={(e) => setAiObjective(e.target.value)}
                        placeholder="Ex: Entrar em contatos com os Leads e agendar uma reunião"
                      />
                      <p className="text-xs text-muted-foreground">Define o objetivo principal do chatbot</p>
                    </div>

                    {/* Script/Prompt da IA */}
                    <div className="space-y-2">
                      <Label className="font-medium">Script/Prompt da IA</Label>
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Instruções para a IA..."
                        rows={8}
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Este script guia o comportamento da IA. Seja específico sobre seu negócio e objetivo.
                      </p>
                    </div>

                    {/* WhatsApp para Alertas */}
                    <div className="space-y-2">
                      <Label className="font-medium">Seu WhatsApp para Alertas</Label>
                      <Input
                        value={alertWhatsapp}
                        onChange={(e) => setAlertWhatsapp(e.target.value)}
                        placeholder="Ex: 5511999999999"
                      />
                      <p className="text-xs text-muted-foreground">
                        Receba uma mensagem no seu WhatsApp quando um lead demonstrar interesse.
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

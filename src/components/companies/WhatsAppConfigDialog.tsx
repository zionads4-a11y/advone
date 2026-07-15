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
  const { userRole, user } = useAuth();

  const [activeTab, setActiveTab] = useState("whatsapp");
  const [saving, setSaving] = useState(false);

  // Provider (uazapi | meta_cloud)
  const [provider, setProvider] = useState<"uazapi" | "meta_cloud">("uazapi");

  // WhatsApp form
  const [formInstanceId, setFormInstanceId] = useState("");

  // Meta Cloud form
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaBusinessId, setMetaBusinessId] = useState("");
  const [metaTesting, setMetaTesting] = useState(false);
  const [metaTestInfo, setMetaTestInfo] = useState<any>(null);

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
  const [botOnlyAfterHours, setBotOnlyAfterHours] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);

  const zapiWebhookUrl = getWebhookUrl(companyId);
  const metaWebhookUrl = companyId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook?company_id=${companyId}`
    : "";

  // Populate form when config changes
  useEffect(() => {
    if (!open || !companyId) return;
    const load = async () => {
      const { data } = await supabase
        .from("whatsapp_configs")
        .select("provider, meta_phone_number_id, meta_waba_id, meta_access_token, meta_app_id, meta_app_secret, meta_verify_token, meta_business_id")
        .eq("company_id", companyId)
        .maybeSingle();
      const p = (data as any)?.provider === "meta_cloud" ? "meta_cloud" : "uazapi";
      setProvider(p);
      setMetaPhoneNumberId((data as any)?.meta_phone_number_id || "");
      setMetaWabaId((data as any)?.meta_waba_id || "");
      setMetaAccessToken((data as any)?.meta_access_token || "");
      setMetaAppId((data as any)?.meta_app_id || "");
      setMetaAppSecret((data as any)?.meta_app_secret || "");
      setMetaVerifyToken((data as any)?.meta_verify_token || "");
      setMetaBusinessId((data as any)?.meta_business_id || "");
    };
    load();

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
  }, [config, open, companyId]);

  // Load AI config
  useEffect(() => {
    if (!open || !companyId) return;
    const load = async () => {
      setAiLoading(true);
      const { data } = await supabase
        .from("whatsapp_configs")
        .select("ai_enabled, ai_auto_reply, ai_prompt, ai_objective, alert_whatsapp, bot_only_after_hours")
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
        setBotOnlyAfterHours((data as any).bot_only_after_hours || false);
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
      // Update status in DB to keep it in sync
      await supabase
        .from("whatsapp_configs")
        .update({ status: connected ? "connected" : "disconnected" })
        .eq("company_id", companyId);
    } catch {
      setQrStatus("disconnected");
      await supabase
        .from("whatsapp_configs")
        .update({ status: "disconnected" })
        .eq("company_id", companyId);
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
    // Meta Cloud
    if (provider === "meta_cloud") {
      if (!metaPhoneNumberId.trim() || !metaAccessToken.trim()) {
        toast.error("Phone Number ID e Access Token são obrigatórios.");
        return;
      }
      setSaving(true);
      try {
        const verifyToken = metaVerifyToken || crypto.randomUUID();
        const payload = {
          company_id: companyId,
          provider: "meta_cloud" as const,
          meta_phone_number_id: metaPhoneNumberId.trim(),
          meta_waba_id: metaWabaId.trim() || null,
          meta_access_token: metaAccessToken.trim(),
          meta_app_id: metaAppId.trim() || null,
          meta_app_secret: metaAppSecret.trim() || null,
          meta_verify_token: verifyToken,
          meta_business_id: metaBusinessId.trim() || null,
          // preencher campos legados NOT NULL da UaZapi com placeholders quando novo
          zapi_instance_id: config?.zapi_instance_id || `meta-${companyId}`,
          zapi_token: (config as any)?.zapi_token || "meta_cloud",
        };
        const { error } = await supabase
          .from("whatsapp_configs")
          .upsert(payload, { onConflict: "company_id" });
        if (error) throw error;
        setMetaVerifyToken(verifyToken);
        toast.success("Configuração Meta salva! Configure o webhook no painel Meta.");
        onSubmit();
      } catch (err: any) {
        toast.error("Erro ao salvar: " + err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // UaZapi (padrão)
    if (!formInstanceId) {
      toast.error("Nome da instância é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      // garante provider=uazapi persistido
      await supabase.from("whatsapp_configs").update({ provider: "uazapi" }).eq("company_id", companyId);
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

  const handleTestMeta = async () => {
    setMetaTesting(true);
    setMetaTestInfo(null);
    try {
      const { data, error } = await supabase.functions.invoke("meta-test-connection", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      setMetaTestInfo(data);
      if (data?.ok) {
        toast.success(`Conectado: ${data.info?.display_phone_number || "OK"}`);
      } else {
        toast.error(data?.error || "Falha ao validar credenciais");
      }
    } catch (err: any) {
      toast.error("Erro no teste: " + err.message);
    } finally {
      setMetaTesting(false);
    }
  };

  const handleSaveAI = async () => {
    setSaving(true);
    const newValues = {
      ai_enabled: aiEnabled,
      ai_auto_reply: aiAutoReply,
      ai_prompt: "", // Removido da UI: prompt agora é montado dinamicamente pelo Bot Flows Editor
      ai_objective: aiObjective,
      alert_whatsapp: alertWhatsapp || null,
      bot_only_after_hours: botOnlyAfterHours,
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
          _old_values: null,
          _new_values: newValues,
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
            {(userRole !== "gerente" || user?.email === "zionads4@gmail.com") && (
              <TabsTrigger value="ai">Chatbot IA (SDR)</TabsTrigger>
            )}
          </TabsList>

          {/* Tab: Conexão WhatsApp */}
          <TabsContent value="whatsapp" className="space-y-4 pt-2">
            {/* Provider selector */}
            <div className="space-y-2">
              <Label className="font-medium text-sm">Provedor de WhatsApp</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProvider("uazapi")}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    provider === "uazapi"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-medium text-sm">UaZapi</p>
                  <p className="text-[11px] text-muted-foreground">Padrão. Rápido. Para receptivo.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("meta_cloud")}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    provider === "meta_cloud"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-medium text-sm">Meta Cloud API (Oficial)</p>
                  <p className="text-[11px] text-muted-foreground">Selo verde. Zero risco de ban.</p>
                </button>
              </div>
            </div>

            {provider === "uazapi" && (
              <>
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
                    <Input readOnly value={zapiWebhookUrl} className="text-xs font-mono bg-background" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(zapiWebhookUrl, "URL do webhook")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {provider === "meta_cloud" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-medium">Como obter as credenciais:</p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Acesse business.facebook.com → WhatsApp Manager</li>
                    <li>Adicione um número e conclua a verificação da empresa (CNPJ)</li>
                    <li>Em "Configurações da API" copie <strong>Phone Number ID</strong> e <strong>WABA ID</strong></li>
                    <li>Gere um <strong>Access Token permanente</strong> em Configurações → System Users</li>
                    <li>Cole abaixo, salve, e configure o webhook usando a URL/Verify Token gerados</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number ID *</Label>
                  <Input value={metaPhoneNumberId} onChange={(e) => setMetaPhoneNumberId(e.target.value)} placeholder="Ex: 106540392307050" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Business Account ID (WABA)</Label>
                  <Input value={metaWabaId} onChange={(e) => setMetaWabaId(e.target.value)} placeholder="Ex: 102290129340398" />
                </div>
                <div className="space-y-2">
                  <Label>Access Token Permanente *</Label>
                  <Input type="password" value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)} placeholder="EAAG..." />
                  <p className="text-[11px] text-muted-foreground">Armazenado com segurança. Só o backend lê.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>App ID</Label>
                    <Input value={metaAppId} onChange={(e) => setMetaAppId(e.target.value)} placeholder="Opcional" />
                  </div>
                  <div className="space-y-2">
                    <Label>App Secret</Label>
                    <Input type="password" value={metaAppSecret} onChange={(e) => setMetaAppSecret(e.target.value)} placeholder="Opcional (validação HMAC)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Business Manager ID</Label>
                  <Input value={metaBusinessId} onChange={(e) => setMetaBusinessId(e.target.value)} placeholder="Opcional" />
                </div>

                {/* Webhook + Verify token (readonly) */}
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <Label className="text-xs font-medium">Webhook URL (colar no painel Meta)</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={metaWebhookUrl} className="text-xs font-mono bg-background" />
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(metaWebhookUrl, "URL")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Label className="text-xs font-medium pt-2">Verify Token</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={metaVerifyToken || "(gerado ao salvar)"}
                      className="text-xs font-mono bg-background"
                    />
                    {metaVerifyToken && (
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(metaVerifyToken, "Verify token")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Assine o campo <strong>messages</strong> no webhook.</p>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleTestMeta}
                  disabled={metaTesting || !metaPhoneNumberId || !metaAccessToken}
                >
                  {metaTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Testar conexão Meta
                </Button>

                {metaTestInfo && (
                  <div className={`text-xs p-2 rounded ${metaTestInfo.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"}`}>
                    {metaTestInfo.ok
                      ? `✅ ${metaTestInfo.info?.verified_name || ""} — ${metaTestInfo.info?.display_phone_number || ""} — Qualidade: ${metaTestInfo.info?.quality_rating || "n/d"}`
                      : `❌ ${metaTestInfo.error || "Falha"}`}
                  </div>
                )}
              </div>
            )}

            {/* QR Code Section (UaZapi only) */}
            {provider === "uazapi" && (
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
            )}
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
                    {/* Toggle: Bot só fora do horário comercial */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/40 dark:bg-amber-950/10">
                      <div className="flex items-center gap-3">
                        <span className="text-xl leading-none">🌙</span>
                        <div>
                          <p className="font-medium text-sm">Bot só fora do horário comercial</p>
                          <p className="text-xs text-muted-foreground">
                            Dentro do expediente (definido em Configurações da Empresa → Horários), a equipe atende manualmente.
                            Fora do horário e nos finais de semana, a Laura assume automaticamente.
                          </p>
                        </div>
                      </div>
                      <Switch checked={botOnlyAfterHours} onCheckedChange={setBotOnlyAfterHours} />
                    </div>

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

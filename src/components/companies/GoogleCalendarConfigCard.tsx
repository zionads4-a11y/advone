import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, Save, Loader2, ExternalLink, Copy, CheckCircle2, XCircle, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Props {
  companyId: string;
}

interface Calendar {
  id: string;
  summary: string;
  primary?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/google-calendar-oauth-callback`;

export function GoogleCalendarConfigCard({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [savingCreds, setSavingCreds] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(CALLBACK_URL);
  const [credsExist, setCredsExist] = useState(false);

  const [connection, setConnection] = useState<{
    google_email: string;
    selected_calendar_id: string | null;
    selected_calendar_name: string | null;
    is_active: boolean;
  } | null>(null);

  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "gcal_oauth") {
        setConnecting(false);
        if (e.data.success) {
          toast.success("Google Calendar conectado!");
          void load();
        } else {
          toast.error("Falha ao conectar com o Google.");
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const load = async () => {
    setLoading(true);
    const [credsRes, connRes] = await Promise.all([
      supabase
        .from("google_oauth_credentials")
        .select("client_id, client_secret, redirect_uri")
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("google_calendar_connections")
        .select("google_email, selected_calendar_id, selected_calendar_name, is_active")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);
    if (credsRes.data) {
      setClientId(credsRes.data.client_id);
      setClientSecret(credsRes.data.client_secret);
      setRedirectUri(credsRes.data.redirect_uri);
      setCredsExist(true);
    } else {
      setRedirectUri(CALLBACK_URL);
    }
    setConnection(connRes.data ?? null);
    if (connRes.data?.is_active) void loadCalendars();
    setLoading(false);
  };

  const loadCalendars = async () => {
    setLoadingCalendars(true);
    const { data, error } = await supabase.functions.invoke("google-calendar-list", {
      body: { company_id: companyId },
    });
    if (error || data?.error) {
      console.error(error || data?.error);
    } else {
      setCalendars(data.calendars || []);
    }
    setLoadingCalendars(false);
  };

  const saveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim() || !redirectUri.trim()) {
      toast.error("Preencha Client ID, Client Secret e Redirect URI.");
      return;
    }
    setSavingCreds(true);
    const { data: userRes } = await supabase.auth.getUser();
    const payload = {
      company_id: companyId,
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      redirect_uri: redirectUri.trim(),
      created_by: userRes.user?.id,
    };
    let error;
    if (credsExist) {
      ({ error } = await supabase
        .from("google_oauth_credentials")
        .update(payload)
        .eq("company_id", companyId));
    } else {
      ({ error } = await supabase.from("google_oauth_credentials").insert(payload));
    }
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Credenciais salvas!");
      setCredsExist(true);
    }
    setSavingCreds(false);
  };

  const startOAuth = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("google-calendar-oauth-start", {
      body: { company_id: companyId },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Falha ao iniciar OAuth.");
      setConnecting(false);
      return;
    }
    window.open(data.auth_url, "gcal_oauth", "width=600,height=720");
  };

  const disconnect = async () => {
    if (!confirm("Desconectar o Google Calendar deste escritório?")) return;
    const { error } = await supabase
      .from("google_calendar_connections")
      .delete()
      .eq("company_id", companyId);
    if (error) toast.error(error.message);
    else {
      toast.success("Conta desconectada.");
      setConnection(null);
      setCalendars([]);
    }
  };

  const selectCalendar = async (calId: string) => {
    const cal = calendars.find((c) => c.id === calId);
    setSavingCalendar(true);
    const { error } = await supabase
      .from("google_calendar_connections")
      .update({
        selected_calendar_id: calId,
        selected_calendar_name: cal?.summary ?? null,
      })
      .eq("company_id", companyId);
    if (error) toast.error(error.message);
    else {
      toast.success("Calendário definido!");
      setConnection((c) => (c ? { ...c, selected_calendar_id: calId, selected_calendar_name: cal?.summary ?? null } : c));
    }
    setSavingCalendar(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <CalendarClock className="h-5 w-5 text-primary" />
          Google Calendar — Integração do Escritório
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Conecte a agenda do Google deste escritório para sincronizar automaticamente os compromissos criados no AdvOne.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Passo 1 - Credenciais */}
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">1. Credenciais OAuth do Google Cloud</h3>
            {credsExist && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Configurado
              </Badge>
            )}
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              Crie credenciais OAuth 2.0 em{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Google Cloud Console <ExternalLink className="h-3 w-3" />
              </a>
              . Habilite a <strong>Google Calendar API</strong> e configure a tela de consentimento.
            </p>
            <p>
              Em <strong>"Authorized redirect URIs"</strong> use exatamente o valor abaixo:
            </p>
          </div>

          <div className="space-y-2">
            <Label>Redirect URI (cole no Google Cloud)</Label>
            <div className="flex gap-2">
              <Input value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copyToClipboard(redirectUri, "Redirect URI")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-xxxxx.apps.googleusercontent.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <Button onClick={saveCredentials} disabled={savingCreds} className="w-full">
            {savingCreds ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {credsExist ? "Atualizar credenciais" : "Salvar credenciais"}
          </Button>
        </div>

        {/* Passo 2 - Conexão */}
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">2. Conectar conta Google</h3>
            {connection?.is_active ? (
              <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <XCircle className="h-3 w-3" /> Desconectado
              </Badge>
            )}
          </div>

          {connection?.is_active ? (
            <div className="space-y-2">
              <p className="text-sm">
                Conta conectada: <strong>{connection.google_email}</strong>
              </p>
              <Button variant="outline" size="sm" onClick={disconnect} className="gap-2">
                <Unlink className="h-4 w-4" /> Desconectar
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Após salvar as credenciais acima, clique em conectar e autorize o acesso à agenda Google deste escritório.
              </p>
              <Button onClick={startOAuth} disabled={!credsExist || connecting} className="gap-2">
                <Link2 className="h-4 w-4" />
                {connecting ? "Aguardando autorização..." : "Conectar com Google"}
              </Button>
            </>
          )}
        </div>

        {/* Passo 3 - Calendário */}
        {connection?.is_active && (
          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">3. Selecionar calendário destino</h3>
              {connection.selected_calendar_id && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Definido
                </Badge>
              )}
            </div>

            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando calendários...
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Os compromissos do AdvOne serão criados em:</Label>
                <Select
                  value={connection.selected_calendar_id ?? undefined}
                  onValueChange={selectCalendar}
                  disabled={savingCalendar}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um calendário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.summary} {c.primary && "(principal)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={loadCalendars} className="text-xs">
                  Recarregar lista
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

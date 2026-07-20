import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
}

type MetaConfig = {
  provider: string | null;
  meta_phone_number_id: string | null;
  meta_waba_id: string | null;
  meta_access_token: string | null;
  meta_app_id: string | null;
  meta_app_secret: string | null;
  meta_verify_token: string | null;
  meta_business_id: string | null;
};

const EMPTY: MetaConfig = {
  provider: null,
  meta_phone_number_id: null,
  meta_waba_id: null,
  meta_access_token: null,
  meta_app_id: null,
  meta_app_secret: null,
  meta_verify_token: null,
  meta_business_id: null,
};

export default function MetaCloudSetup() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [cfg, setCfg] = useState<MetaConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testInfo, setTestInfo] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      setCompanies(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_configs")
        .select("provider, meta_phone_number_id, meta_waba_id, meta_access_token, meta_app_id, meta_app_secret, meta_verify_token, meta_business_id")
        .eq("company_id", companyId)
        .maybeSingle();
      setCfg((data as MetaConfig) || EMPTY);
      setTestInfo(null);
    })();
  }, [companyId]);

  const webhookUrl = useMemo(
    () =>
      companyId
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook?company_id=${companyId}`
        : "",
    [companyId],
  );

  const stepDone = {
    s1: !!cfg.meta_phone_number_id && !!cfg.meta_access_token,
    s2: !!cfg.meta_verify_token,
    s3: cfg.provider === "meta_cloud",
    s4: cfg.provider === "meta_cloud" && testInfo?.ok === true,
  };

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${label} copiado`);
  };

  const set = <K extends keyof MetaConfig>(k: K, v: MetaConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const handleSave = async () => {
    if (!companyId) return toast.error("Selecione uma empresa");
    if (!cfg.meta_phone_number_id?.trim() || !cfg.meta_access_token?.trim()) {
      return toast.error("Phone Number ID e Access Token são obrigatórios");
    }
    setSaving(true);
    try {
      const verifyToken = cfg.meta_verify_token || crypto.randomUUID();
      const payload = {
        company_id: companyId,
        provider: "meta_cloud" as const,
        meta_phone_number_id: cfg.meta_phone_number_id.trim(),
        meta_waba_id: cfg.meta_waba_id?.trim() || null,
        meta_access_token: cfg.meta_access_token.trim(),
        meta_app_id: cfg.meta_app_id?.trim() || null,
        meta_app_secret: cfg.meta_app_secret?.trim() || null,
        meta_verify_token: verifyToken,
        meta_business_id: cfg.meta_business_id?.trim() || null,
        zapi_instance_id: cfg.meta_phone_number_id.trim(),
        zapi_token: "meta_cloud",
        status: "connected",
      };
      const { error } = await supabase.from("whatsapp_configs").upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
      set("meta_verify_token", verifyToken);
      set("provider", "meta_cloud");
      toast.success("Credenciais Meta Cloud salvas com sucesso");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!cfg.meta_phone_number_id || !cfg.meta_access_token) {
      return toast.error("Salve as credenciais antes de testar");
    }
    setTesting(true);
    setTestInfo(null);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${cfg.meta_phone_number_id}?fields=verified_name,display_phone_number,quality_rating`,
        { headers: { Authorization: `Bearer ${cfg.meta_access_token}` } },
      );
      const json = await res.json();
      if (!res.ok) {
        setTestInfo({ ok: false, msg: json?.error?.message || "Falha na verificação" });
      } else {
        setTestInfo({
          ok: true,
          msg: `${json.verified_name || ""} — ${json.display_phone_number || ""} — Qualidade: ${json.quality_rating || "n/d"}`,
        });
      }
    } catch (e: any) {
      setTestInfo({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Meta Cloud API — Onboarding
        </h1>
        <p className="text-sm text-muted-foreground">
          Ative o WhatsApp Business oficial (Meta) para uma empresa. Zero risco de ban, sem QR Code.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Selecionar empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-full sm:w-[360px]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {companyId && (
        <>
          {/* Passo 1 - Meta panel */}
          <StepCard
            n={1}
            done={stepDone.s1}
            title="No painel Meta: coletar credenciais"
            icon={<ExternalLink className="h-5 w-5" />}
          >
            <ol className="list-decimal pl-5 text-sm space-y-1 text-muted-foreground">
              <li>Acessar <a className="text-primary underline" href="https://business.facebook.com" target="_blank" rel="noreferrer">business.facebook.com</a> → WhatsApp Manager</li>
              <li>Adicionar o número do cliente e concluir a verificação da empresa (CNPJ)</li>
              <li>Em <strong>Configurações → Usuários do sistema</strong> criar um System User e gerar <strong>Access Token permanente</strong> com escopos <code>whatsapp_business_messaging</code> + <code>whatsapp_business_management</code></li>
              <li>Copiar <strong>Phone Number ID</strong>, <strong>WABA ID</strong> e <strong>App Secret</strong></li>
            </ol>
          </StepCard>

          {/* Passo 2 - Colar */}
          <StepCard
            n={2}
            done={stepDone.s2}
            title="Colar credenciais no AdvOne"
            icon={<Sparkles className="h-5 w-5" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone Number ID *" value={cfg.meta_phone_number_id || ""} onChange={(v) => set("meta_phone_number_id", v)} placeholder="1268738996315614" />
              <Field label="WABA ID" value={cfg.meta_waba_id || ""} onChange={(v) => set("meta_waba_id", v)} placeholder="1535531164982888" />
              <Field label="Access Token Permanente *" type="password" value={cfg.meta_access_token || ""} onChange={(v) => set("meta_access_token", v)} placeholder="EAAG..." className="sm:col-span-2" />
              <Field label="App ID" value={cfg.meta_app_id || ""} onChange={(v) => set("meta_app_id", v)} placeholder="Opcional" />
              <Field label="App Secret" type="password" value={cfg.meta_app_secret || ""} onChange={(v) => set("meta_app_secret", v)} placeholder="Recomendado (valida assinatura HMAC)" />
              <Field label="Business Manager ID" value={cfg.meta_business_id || ""} onChange={(v) => set("meta_business_id", v)} placeholder="Opcional" className="sm:col-span-2" />
            </div>
            <Button className="mt-4 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar credenciais
            </Button>
          </StepCard>

          {/* Passo 3 - Webhook */}
          <StepCard
            n={3}
            done={stepDone.s3}
            title="Configurar Webhook no painel Meta"
            icon={<Webhook className="h-5 w-5" />}
          >
            <p className="text-sm text-muted-foreground mb-3">
              Volte no painel Meta → App → WhatsApp → Configuração → Webhook. Cole os valores abaixo e assine o campo <strong className="text-foreground">messages</strong>.
            </p>
            <div className="space-y-3">
              <ReadOnlyRow label="Callback URL" value={webhookUrl} onCopy={() => copy(webhookUrl, "URL")} />
              <ReadOnlyRow
                label="Verify Token"
                value={cfg.meta_verify_token || "(gerado ao salvar no passo 2)"}
                onCopy={cfg.meta_verify_token ? () => copy(cfg.meta_verify_token!, "Verify token") : undefined}
              />
            </div>
          </StepCard>

          {/* Passo 4 - Testar */}
          <StepCard
            n={4}
            done={stepDone.s4}
            title="Testar conexão"
            icon={<CheckCircle2 className="h-5 w-5" />}
          >
            <Button variant="outline" onClick={handleTest} disabled={testing || !cfg.meta_access_token} className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Testar conexão Meta
            </Button>
            {testInfo && (
              <div className={`mt-3 text-sm p-3 rounded-md ${testInfo.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 border border-emerald-200" : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200 border border-red-200"}`}>
                {testInfo.ok ? `✅ ${testInfo.msg}` : `❌ ${testInfo.msg}`}
              </div>
            )}
          </StepCard>

          {stepDone.s4 && (
            <Card className="border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-6 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-medium">Empresa pronta pra receber e enviar mensagens via canal oficial Meta.</p>
                  <p className="text-xs text-muted-foreground">A Laura já responde automaticamente. Nenhuma configuração adicional necessária.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StepCard({ n, done, title, icon, children }: { n: number; done: boolean; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className={done ? "border-emerald-500/40" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-3">
          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          <span className="flex items-center gap-2">
            <Badge variant="outline">Passo {n}</Badge>
            {title}
          </span>
          <span className="ml-auto text-muted-foreground">{icon}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ReadOnlyRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs bg-muted" />
        {onCopy && (
          <Button variant="outline" size="icon" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

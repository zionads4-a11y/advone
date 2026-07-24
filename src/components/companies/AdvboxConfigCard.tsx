import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, TestTube, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props { companyId: string }

interface AdvboxConfig {
  id?: string;
  api_token: string;
  base_url: string;
  enabled: boolean;
  auto_push_on_won: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

const DEFAULT: AdvboxConfig = {
  api_token: "",
  base_url: "https://app.advbox.com.br/api/v1",
  enabled: true,
  auto_push_on_won: true,
  last_sync_at: null,
  last_sync_status: null,
  last_sync_error: null,
};

export function AdvboxConfigCard({ companyId }: Props) {
  const [cfg, setCfg] = useState<AdvboxConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("advbox_configs" as any)
        .select("*").eq("company_id", companyId).maybeSingle();
      if (data) setCfg({ ...DEFAULT, ...(data as any) });
      setLoading(false);
    })();
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      company_id: companyId,
      api_token: cfg.api_token.trim(),
      base_url: cfg.base_url.trim() || DEFAULT.base_url,
      enabled: cfg.enabled,
      auto_push_on_won: cfg.auto_push_on_won,
    };
    const { error } = await supabase.from("advbox_configs" as any)
      .upsert(payload, { onConflict: "company_id" });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Integração ADVBOX salva");
  };

  const handleTest = async () => {
    if (!cfg.api_token) return toast.error("Cadastre o token antes de testar");
    setTesting(true);
    // Save first so the edge function reads the latest token
    await supabase.from("advbox_configs" as any).upsert({
      company_id: companyId, api_token: cfg.api_token, base_url: cfg.base_url,
      enabled: cfg.enabled, auto_push_on_won: cfg.auto_push_on_won,
    }, { onConflict: "company_id" });

    const { data, error } = await supabase.functions.invoke("advbox-push-lead", {
      body: { lead_id: "00000000-0000-0000-0000-000000000000", test_only: true },
    });
    setTesting(false);
    if (error || !data?.success) {
      toast.error("Falha ao conectar no ADVBOX. Verifique o token.");
    } else {
      toast.success("Conexão com ADVBOX OK");
    }
    // Refresh status
    const { data: fresh } = await supabase.from("advbox_configs" as any)
      .select("*").eq("company_id", companyId).maybeSingle();
    if (fresh) setCfg({ ...DEFAULT, ...(fresh as any) });
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              Integração ADVBOX
              {cfg.last_sync_status === "ok" && <Badge variant="secondary">Conectado</Badge>}
              {cfg.last_sync_status === "error" && <Badge variant="destructive">Erro</Badge>}
            </CardTitle>
            <CardDescription>
              Envie leads ganhos automaticamente para o ADVBOX como contatos.
              <a href="https://app.advbox.com.br" target="_blank" rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                Acessar ADVBOX <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Token da API do ADVBOX</Label>
          <Input
            type="password"
            value={cfg.api_token}
            onChange={(e) => setCfg({ ...cfg, api_token: e.target.value })}
            placeholder="Cole o token gerado no painel do ADVBOX"
          />
          <p className="text-xs text-muted-foreground">
            Gere em: ADVBOX → Configurações → Integrações → API.
          </p>
        </div>

        <div className="space-y-2">
          <Label>URL base da API</Label>
          <Input
            value={cfg.base_url}
            onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })}
            placeholder="https://app.advbox.com.br/api/v1"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm">Integração ativa</Label>
            <p className="text-xs text-muted-foreground">Desligue temporariamente sem apagar o token.</p>
          </div>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm">Enviar automaticamente ao ganhar lead</Label>
            <p className="text-xs text-muted-foreground">Quando um lead cair na coluna "Ganho", cria contato no ADVBOX.</p>
          </div>
          <Switch checked={cfg.auto_push_on_won} onCheckedChange={(v) => setCfg({ ...cfg, auto_push_on_won: v })} />
        </div>

        {cfg.last_sync_error && (
          <p className="text-xs text-destructive">Último erro: {cfg.last_sync_error}</p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button onClick={handleTest} disabled={testing || !cfg.api_token} variant="outline">
            <TestTube className="mr-2 h-4 w-4" />
            {testing ? "Testando..." : "Testar conexão"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

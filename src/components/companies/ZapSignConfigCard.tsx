import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileSignature, Save, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ZapSignConfigProps {
  companyId: string;
}

export function ZapSignConfigCard({ companyId }: ZapSignConfigProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [configExists, setConfigExists] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [companyId]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("zapsign_configs")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) {
      setApiToken((data as Record<string, unknown>).api_token as string || "");
      setSandbox((data as Record<string, unknown>).sandbox as boolean || false);
      setDefaultTemplateId((data as Record<string, unknown>).default_template_id as string || "");
      setConfigExists(true);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!apiToken.trim()) {
      toast.error("API Token é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        api_token: apiToken.trim(),
        sandbox,
        default_template_id: defaultTemplateId.trim() || null,
      };

      if (configExists) {
        const { error } = await supabase
          .from("zapsign_configs")
          .update(payload)
          .eq("company_id", companyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("zapsign_configs")
          .insert(payload);
        if (error) throw error;
        setConfigExists(true);
      }

      toast.success("Configuração ZapSign salva!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Erro ao salvar configuração");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="h-5 w-5 text-primary" />
          ZapSign — Assinatura Digital
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure a integração com ZapSign para envio de contratos via WhatsApp.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zs-token">API Token</Label>
          <Input
            id="zs-token"
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Cole aqui o API Token da ZapSign"
          />
          <p className="text-xs text-muted-foreground">
            Encontre em{" "}
            <a
              href="https://app.zapsign.com.br/conta/integracoes/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              ZapSign → Integrações → API <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zs-template">Template ID (padrão)</Label>
          <Input
            id="zs-template"
            value={defaultTemplateId}
            onChange={(e) => setDefaultTemplateId(e.target.value)}
            placeholder="ID do template padrão de contrato"
          />
          <p className="text-xs text-muted-foreground">
            Encontre o ID do template na URL: app.zapsign.com.br/conta/modelos/<strong>ID_AQUI</strong>
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Modo Sandbox</p>
            <p className="text-xs text-muted-foreground">Ative para testes sem validade jurídica</p>
          </div>
          <Switch checked={sandbox} onCheckedChange={setSandbox} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {configExists ? "Salvar alterações" : "Configurar ZapSign"}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, Loader2, KeyRound, Zap, Brain, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { type BillingModel } from "@/lib/billingModels";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  companyId: string;
}

type Provider = "lovable" | "openai" | "anthropic";

interface AIConfig {
  provider: Provider;
  model: string;
  custom_system_prompt: string | null;
  use_openai_for_testing: boolean;
}

const LOVABLE_MODELS = [
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (mais rápido, mais barato)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (recomendado, equilibrado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (mais inteligente, mais caro)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview (novo)" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (barato, ~$0.15/M tokens)" },
  { value: "gpt-4o", label: "GPT-4o (recomendado, ~$2.50/M tokens)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (legado)" },
  { value: "gpt-5-nano", label: "GPT-5 Nano (rápido)" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-5", label: "GPT-5 (mais inteligente)" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (mais rápido, mais barato)" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recomendado, melhor custo-benefício)" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 (mais inteligente, premium)" },
];

const DEFAULTS: AIConfig = {
  provider: "lovable",
  model: "google/gemini-2.5-flash",
  custom_system_prompt: null,
  use_openai_for_testing: false,
};

export function CompanyAIConfigCard({ companyId }: Props) {
  const [config, setConfig] = useState<AIConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingModel, setBillingModel] = useState<BillingModel | null>(null);
  const { userRole } = useAuth();
  
  const isAgencyStaff = userRole === "admin" || userRole === "member";
  const isPlanCompleto = isAgencyStaff || billingModel === "plan_completo" || billingModel === "plan_zionads";

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("company_ai_config" as any)
      .select("provider,model,custom_system_prompt,use_openai_for_testing, companies(billing_model)")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) {
      setBillingModel((data as any).companies?.billing_model);
      setConfig({
        provider: ((data as any).provider as Provider) ?? "lovable",
        model: (data as any).model ?? DEFAULTS.model,
        custom_system_prompt: (data as any).custom_system_prompt ?? null,
        use_openai_for_testing: !!(data as any).use_openai_for_testing,
      });
    } else {
      setConfig(DEFAULTS);
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const payload = {
      company_id: companyId,
      provider: config.provider,
      model: config.model,
      custom_system_prompt: config.custom_system_prompt,
      use_openai_for_testing: config.use_openai_for_testing,
    };

    const { error } = await supabase
      .from("company_ai_config" as any)
      .upsert(payload, { onConflict: "company_id" });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configuração de IA salva!");
    }
    setSaving(false);
  }

  function setProvider(p: Provider) {
    // Ao trocar de provider, sugere o modelo padrão correspondente
    setConfig((c) => ({
      ...c,
      provider: p,
      model: p === "openai" ? "gpt-4o" : p === "anthropic" ? "claude-sonnet-4-6" : "google/gemini-2.5-flash",
    }));
  }

  const models = config.provider === "openai"
    ? OPENAI_MODELS
    : config.provider === "anthropic"
    ? ANTHROPIC_MODELS
    : LOVABLE_MODELS;

  const isAnthropicDisabled = !isPlanCompleto;

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Provedor de IA
          <Badge variant={config.provider === "openai" ? "default" : config.provider === "anthropic" ? "default" : "secondary"} className="ml-2">
            {config.provider === "openai" ? "OpenAI" : config.provider === "anthropic" ? "Claude (Anthropic)" : "AdvOne IA (Gemini)"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Escolha qual motor de IA o bot Laura deste escritório vai usar. Você pode trocar a qualquer momento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Provider toggle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setProvider("lovable")}
            className={`text-left rounded-lg border-2 p-4 transition-all ${
              config.provider === "lovable"
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20 hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">AdvOne IA (Gemini)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Incluso no plano. Sem custo extra. Ideal para começar e validar.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setProvider("openai")}
            className={`text-left rounded-lg border-2 p-4 transition-all ${
              config.provider === "openai"
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20 hover:border-border/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">OpenAI (chave própria)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Usa a chave OpenAI configurada na plataforma. GPT-4o / GPT-5. Maior qualidade em PT-BR jurídico.
            </p>
          </button>

          <button
            type="button"
            disabled={isAnthropicDisabled}
            onClick={() => setProvider("anthropic")}
            className={`text-left rounded-lg border-2 p-4 transition-all relative ${
              config.provider === "anthropic"
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/20 hover:border-border/80"
            } ${isAnthropicDisabled ? "opacity-60 grayscale cursor-not-allowed" : ""}`}
          >
            {!isPlanCompleto && (
              <Badge className="absolute -top-2 -right-2 bg-accent text-[9px] h-4">PREMIUM</Badge>
            )}
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Claude (Anthropic)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              IA premium para o plano Completo. Claude Sonnet/Opus. Excelente em análise jurídica e redação em PT-BR.
            </p>
          </button>
        </div>

        {/* Modelo */}
        <div className="space-y-2">
          <Label>Modelo</Label>
          <Select value={config.model} onValueChange={(v) => setConfig((c) => ({ ...c, model: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Trocar o modelo afeta apenas as funções já migradas para o novo motor (a migração é feita gradualmente, função por função).
          </p>
        </div>

        {/* Prompt custom */}
        <div className="space-y-2">
          <Label>Prompt System adicional (opcional)</Label>
          <Textarea
            rows={4}
            placeholder="Instruções extras a serem adicionadas ao system prompt do bot. Ex: 'Sempre mencione que somos especialistas em direito previdenciário há 15 anos.'"
            value={config.custom_system_prompt ?? ""}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                custom_system_prompt: e.target.value || null,
              }))
            }
          />
          <p className="text-[11px] text-muted-foreground">
            Será concatenado ao prompt principal da Laura. Útil para personalizações pontuais sem mexer no template.
          </p>
        </div>

        {/* A/B testing */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
          <Switch
            checked={config.use_openai_for_testing}
            onCheckedChange={(v) => setConfig((c) => ({ ...c, use_openai_for_testing: v }))}
          />
          <div className="flex-1">
            <Label className="text-sm cursor-pointer">Forçar Claude no ambiente de teste</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Mesmo que o provider acima esteja em "AdvOne IA", o ambiente de teste usará Claude. Ideal para comparar respostas.
            </p>
          </div>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full gradient-primary text-primary-foreground gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar configuração de IA"}
        </Button>
      </CardContent>
    </Card>
  );
}

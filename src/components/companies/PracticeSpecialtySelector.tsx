import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2, Save, Scale, Shield, Layers, Gavel, Heart, ShieldAlert, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PracticeSpecialty =
  | "previdenciario"
  | "trabalhista"
  | "hibrido"
  | "civel"
  | "familia"
  | "criminal"
  | "tributario";

interface SpecialtyOption {
  value: PracticeSpecialty;
  label: string;
  description: string;
  icon: typeof Shield;
}

const OPTIONS: SpecialtyOption[] = [
  {
    value: "previdenciario",
    label: "Previdenciário / INSS",
    description: "Aposentadoria, BPC, auxílio-doença, revisões e benefícios negados.",
    icon: Shield,
  },
  {
    value: "trabalhista",
    label: "Trabalhista / CLT",
    description: "Rescisão, horas extras, vínculo, acidente, assédio.",
    icon: Scale,
  },
  {
    value: "hibrido",
    label: "Previdenciário + Trabalhista",
    description: "Escritório atende casos previdenciários e trabalhistas.",
    icon: Layers,
  },
  {
    value: "civel",
    label: "Cível / Consumidor",
    description: "Indenizações, banco, plano de saúde, voo, produtos com defeito.",
    icon: Gavel,
  },
  {
    value: "familia",
    label: "Família",
    description: "Divórcio, pensão, guarda, inventário, união estável.",
    icon: Heart,
  },
  {
    value: "criminal",
    label: "Criminal",
    description: "Flagrante, inquérito, audiência, recurso, habeas corpus, execução penal.",
    icon: ShieldAlert,
  },
  {
    value: "tributario",
    label: "Tributário / Empresarial",
    description: "Recuperação tributária, defesa fiscal, contratos, societário.",
    icon: Building2,
  },
];

interface Props {
  companyId: string;
  /** Quando salva, pode notificar o pai para refiltrar templates */
  onChange?: (value: PracticeSpecialty) => void;
  /** Esconde o card e renderiza inline (usado no BotConfig) */
  compact?: boolean;
}

export function PracticeSpecialtySelector({ companyId, onChange, compact = false }: Props) {
  const [value, setValue] = useState<PracticeSpecialty>("previdenciario");
  const [original, setOriginal] = useState<PracticeSpecialty>("previdenciario");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("companies")
        .select("practice_specialty")
        .eq("id", companyId)
        .maybeSingle();
      const v = ((data as any)?.practice_specialty || "previdenciario") as PracticeSpecialty;
      setValue(v);
      setOriginal(v);
      onChange?.(v);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ practice_specialty: value } as any)
      .eq("id", companyId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar área de atuação");
      return;
    }
    setOriginal(value);
    onChange?.(value);
    toast.success("Área de atuação atualizada");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const grid = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue(opt.value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-muted/30 hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-foreground">{opt.label}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{opt.description}</p>
            </button>
          );
        })}
      </div>

      {value !== original && (
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="gradient-primary text-primary-foreground gap-2"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar área de atuação
        </Button>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          Área de atuação do escritório
        </Label>
        {grid}
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Área de Atuação
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define quais nichos o escritório atende. Filtra templates de bot e regras do Decision Engine.
        </p>
      </CardHeader>
      <CardContent>{grid}</CardContent>
    </Card>
  );
}

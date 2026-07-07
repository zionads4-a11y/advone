import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Briefcase, Check, Loader2, Save, Scale, Shield, Layers, Gavel, Heart, ShieldAlert, Building2, Landmark } from "lucide-react";
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
  | "tributario"
  | "bancario_empresarial"
  | "full_service";

// Áreas base que o usuário pode combinar (hibrido/full_service são derivados)
type BaseArea =
  | "previdenciario"
  | "trabalhista"
  | "civel"
  | "familia"
  | "criminal"
  | "tributario"
  | "bancario_empresarial";

interface SpecialtyOption {
  value: BaseArea | "full_service";
  label: string;
  description: string;
  icon: typeof Shield;
}

const OPTIONS: SpecialtyOption[] = [
  {
    value: "full_service",
    label: "Full Service (Todas as Áreas)",
    description: "Escritório atende todas as áreas do Direito sem restrição.",
    icon: Layers,
  },
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
  {
    value: "bancario_empresarial",
    label: "Bancário Empresarial + Reestruturação de Dívidas",
    description: "Renegociação de dívidas PJ, revisão de contratos bancários, recuperação judicial, blindagem patrimonial.",
    icon: Landmark,
  },
];

interface Props {
  companyId: string;
  onChange?: (value: PracticeSpecialty) => void;
  compact?: boolean;
}

// Converte o valor armazenado (single) para conjunto de áreas base selecionadas
function storedToSet(stored: PracticeSpecialty): Set<BaseArea | "full_service"> {
  if (stored === "full_service") return new Set(["full_service"]);
  if (stored === "hibrido") return new Set(["previdenciario", "trabalhista"]);
  return new Set([stored as BaseArea]);
}

// Converte o conjunto selecionado no valor a persistir na coluna practice_specialty
function setToStored(selected: Set<BaseArea | "full_service">): PracticeSpecialty {
  if (selected.has("full_service") || selected.size >= 3) return "full_service";
  if (selected.size === 2 && selected.has("previdenciario") && selected.has("trabalhista")) return "hibrido";
  if (selected.size === 1) return Array.from(selected)[0] as PracticeSpecialty;
  // 2 áreas quaisquer que não sejam prev+trab → full_service (para carregar ambos os fluxos)
  return "full_service";
}

export function PracticeSpecialtySelector({ companyId, onChange, compact = false }: Props) {
  const [selected, setSelected] = useState<Set<BaseArea | "full_service">>(new Set(["previdenciario"]));
  const [originalStored, setOriginalStored] = useState<PracticeSpecialty>("previdenciario");
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
      setSelected(storedToSet(v));
      setOriginalStored(v);
      onChange?.(v);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const toggle = (val: BaseArea | "full_service") => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (val === "full_service") {
        return next.has("full_service") ? new Set(["previdenciario"]) : new Set(["full_service"]);
      }
      // Ao escolher uma área específica, remove full_service
      next.delete("full_service");
      if (next.has(val)) {
        next.delete(val);
        if (next.size === 0) next.add("previdenciario");
      } else {
        next.add(val);
      }
      return next;
    });
  };

  const currentStored = setToStored(selected);
  const dirty = currentStored !== originalStored;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ practice_specialty: currentStored } as any)
      .eq("id", companyId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar áreas de atuação");
      return;
    }
    setOriginalStored(currentStored);
    onChange?.(currentStored);
    toast.success("Áreas de atuação atualizadas");
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
      <p className="text-[11px] text-muted-foreground">
        Selecione uma ou mais áreas. Escolhendo várias, o bot carrega os fluxos de todas elas.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-muted/30 hover:border-primary/40"
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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

      {dirty && (
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="gradient-primary text-primary-foreground gap-2"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar áreas de atuação
        </Button>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
          Áreas de atuação do escritório
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
          Áreas de Atuação
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define quais nichos o escritório atende. Pode escolher várias — filtra templates de bot e regras do Decision Engine.
        </p>
      </CardHeader>
      <CardContent>{grid}</CardContent>
    </Card>
  );
}

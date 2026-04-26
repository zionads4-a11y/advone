import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Clock, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CadenceConfigCardProps {
  companyId: string;
}

type Unit = "minutes" | "hours" | "days";

interface Step {
  step_number: number;
  delay_minutes: number;
  message_text: string;
  enabled: boolean;
  // UI-only:
  delay_value: number;
  delay_unit: Unit;
}

const DEFAULT_STEPS_RAW: Array<Omit<Step, "delay_value" | "delay_unit">> = [
  {
    step_number: 1,
    delay_minutes: 10,
    enabled: true,
    message_text:
      "Oi, {nome} 🙂\n\nFiquei te esperando aqui…\n\nDependendo do seu caso, pode ter algo importante que vale a pena ver agora.\n\nMe chama que eu continuo te ajudando 👇",
  },
  {
    step_number: 2,
    delay_minutes: 60 * 24,
    enabled: true,
    message_text:
      "Oi, {nome} 🙂\n\nOntem eu fiquei pensando no que você me falou…\n\nMuita gente só descobre que tem direito quando analisa melhor o caso.\n\nSe quiser, posso te explicar rapidinho ou já ver um horário com a equipe.",
  },
  {
    step_number: 3,
    delay_minutes: 60 * 24 * 2,
    enabled: true,
    message_text:
      "Oi, {nome} 🙂\n\nSó te dando um toque…\n\nDependendo da situação, esperar pode acabar atrasando ou até fazendo você perder algo importante.\n\nSe quiser retomar, me chama aqui que te ajudo 👇",
  },
  {
    step_number: 4,
    delay_minutes: 60 * 24 * 3,
    enabled: true,
    message_text:
      "Oi, {nome}.\n\nVou ser bem direto com você…\n\nJá vi muitos casos parecidos com o seu que tinham solução — e a pessoa nem imaginava.\n\nPosso te encaixar em uma análise rápida com a equipe e você já entende exatamente o que pode fazer.",
  },
  {
    step_number: 5,
    delay_minutes: 60 * 24 * 4,
    enabled: true,
    message_text:
      "Oi, {nome} 🙂\n\nVou encerrar por aqui pra não ficar te incomodando.\n\nMas se quiser retomar depois, é só me chamar — pode ser que ainda dê tempo de resolver seu caso.\n\nFico à disposição 🙂",
  },
];

function minutesToUnit(minutes: number): { value: number; unit: Unit } {
  if (minutes > 0 && minutes % (60 * 24) === 0) {
    return { value: minutes / (60 * 24), unit: "days" };
  }
  if (minutes > 0 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: "hours" };
  }
  return { value: minutes, unit: "minutes" };
}

function unitToMinutes(value: number, unit: Unit): number {
  const v = Math.max(0, Number(value) || 0);
  if (unit === "days") return v * 60 * 24;
  if (unit === "hours") return v * 60;
  return v;
}

function withUnit(s: Omit<Step, "delay_value" | "delay_unit">): Step {
  const { value, unit } = minutesToUnit(s.delay_minutes);
  return { ...s, delay_value: value, delay_unit: unit };
}

const DEFAULT_STEPS: Step[] = DEFAULT_STEPS_RAW.map(withUnit);

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) {
    const h = minutes / 60;
    return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
  }
  const d = minutes / (60 * 24);
  return `${Number.isInteger(d) ? d : d.toFixed(1)} dia(s)`;
}

export function CadenceConfigCard({ companyId }: CadenceConfigCardProps) {
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("company_cadence_config")
      .select("step_number, delay_minutes, message_text, enabled")
      .eq("company_id", companyId)
      .order("step_number", { ascending: true });

    if (data && data.length > 0) {
      setSteps(
        data.map((s) =>
          withUnit({
            step_number: s.step_number,
            delay_minutes: s.delay_minutes,
            message_text: s.message_text,
            enabled: s.enabled,
          }),
        ),
      );
    } else {
      setSteps(DEFAULT_STEPS);
    }
    setLoading(false);
  }

  function updateStep(index: number, patch: Partial<Step>) {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const next = { ...s, ...patch };
        // Keep delay_minutes in sync with value/unit
        if ("delay_value" in patch || "delay_unit" in patch) {
          next.delay_minutes = unitToMinutes(next.delay_value, next.delay_unit);
        }
        return next;
      }),
    );
  }

  function addStep() {
    setSteps((prev) => {
      const lastNumber = prev.length > 0 ? prev[prev.length - 1].step_number : 0;
      const lastMinutes = prev.length > 0 ? prev[prev.length - 1].delay_minutes : 0;
      // Default new step to last + 1 day
      const defaultMinutes = lastMinutes + 60 * 24;
      const newStep: Step = withUnit({
        step_number: lastNumber + 1,
        delay_minutes: defaultMinutes,
        enabled: true,
        message_text:
          "Oi, {nome} 🙂\n\nPassando aqui pra retomar nosso contato. Se quiser conversar, é só me chamar 👇",
      });
      return [...prev, newStep];
    });
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, step_number: i + 1 })),
    );
  }

  async function handleSave() {
    setSaving(true);
    const rows = steps.map((s, i) => ({
      company_id: companyId,
      step_number: i + 1, // ensure sequential numbering
      delay_minutes: Math.max(0, Number(s.delay_minutes) || 0),
      message_text: s.message_text,
      enabled: s.enabled,
    }));

    // Delete removed steps then upsert remaining (handles shrinking the list)
    const keepNumbers = rows.map((r) => r.step_number);
    const { error: delError } = await supabase
      .from("company_cadence_config")
      .delete()
      .eq("company_id", companyId)
      .not("step_number", "in", `(${keepNumbers.join(",") || "0"})`);

    if (delError) {
      toast.error("Erro ao limpar etapas antigas: " + delError.message);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("company_cadence_config")
      .upsert(rows, { onConflict: "company_id,step_number" });

    if (error) {
      toast.error("Erro ao salvar cadência: " + error.message);
    } else {
      toast.success("Cadência salva!");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-6 text-sm text-muted-foreground">Carregando cadência...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Cadência de Follow-Up
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Mensagens automáticas enviadas quando o lead para de responder. Use{" "}
          <code className="rounded bg-muted px-1">{"{nome}"}</code> para inserir o primeiro nome do lead. Adicione
          quantas tentativas quiser e escolha minutos, horas ou dias para cada uma.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium">
                  {idx + 1}ª tentativa
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({formatDelay(step.delay_minutes)} após o contato inicial)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Ativa</Label>
                  <Switch
                    checked={step.enabled}
                    onCheckedChange={(v) => updateStep(idx, { enabled: v })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeStep(idx)}
                  title="Remover etapa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Atraso após contato inicial
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={step.delay_value}
                    onChange={(e) => updateStep(idx, { delay_value: Number(e.target.value) })}
                    disabled={!step.enabled}
                    className="flex-1"
                  />
                  <Select
                    value={step.delay_unit}
                    onValueChange={(v: Unit) => updateStep(idx, { delay_unit: v })}
                    disabled={!step.enabled}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Equivale a {step.delay_minutes} min
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mensagem</Label>
                <Textarea
                  rows={4}
                  value={step.message_text}
                  onChange={(e) => updateStep(idx, { message_text: e.target.value })}
                  disabled={!step.enabled}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={addStep}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar etapa
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Cadência"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

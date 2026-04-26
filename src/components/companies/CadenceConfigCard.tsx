import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface CadenceConfigCardProps {
  companyId: string;
}

interface Step {
  step_number: number;
  delay_minutes: number;
  message_text: string;
  enabled: boolean;
}

const DEFAULT_STEPS: Step[] = [
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

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / (60 * 24))} dia(s)`;
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
      const map = new Map(data.map((s) => [s.step_number, s]));
      setSteps(
        DEFAULT_STEPS.map((d) => {
          const found = map.get(d.step_number);
          return found
            ? {
                step_number: d.step_number,
                delay_minutes: found.delay_minutes,
                message_text: found.message_text,
                enabled: found.enabled,
              }
            : d;
        }),
      );
    } else {
      setSteps(DEFAULT_STEPS);
    }
    setLoading(false);
  }

  function updateStep(index: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSave() {
    setSaving(true);
    const rows = steps.map((s) => ({
      company_id: companyId,
      step_number: s.step_number,
      delay_minutes: Math.max(0, Number(s.delay_minutes) || 0),
      message_text: s.message_text,
      enabled: s.enabled,
    }));

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
          5 mensagens automáticas enviadas quando o lead para de responder. Use{" "}
          <code className="rounded bg-muted px-1">{"{nome}"}</code> para inserir o primeiro nome do lead.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, idx) => (
          <div key={step.step_number} className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {step.step_number}
                </span>
                <span className="text-sm font-medium">
                  {step.step_number}ª tentativa
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({formatDelay(step.delay_minutes)} após o contato inicial)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Ativa</Label>
                <Switch checked={step.enabled} onCheckedChange={(v) => updateStep(idx, { enabled: v })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Atraso (minutos)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={step.delay_minutes}
                  onChange={(e) => updateStep(idx, { delay_minutes: Number(e.target.value) })}
                  disabled={!step.enabled}
                />
                <p className="text-[10px] text-muted-foreground">
                  Ex: 10 = 10min · 60 = 1h · 1440 = 1 dia
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

        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Cadência"}
        </Button>
      </CardContent>
    </Card>
  );
}

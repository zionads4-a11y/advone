import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Bell, Clock } from "lucide-react";
import { toast } from "sonner";

interface MeetingRemindersConfigCardProps {
  companyId: string;
}

interface Window {
  window_key: "reminder_6h" | "reminder_2h" | "reminder_30m";
  label: string;
  minutes_before: number;
  message_text: string;
  enabled: boolean;
}

const DEFAULT_WINDOWS: Window[] = [
  {
    window_key: "reminder_6h",
    label: "Aviso antecipado",
    minutes_before: 300,
    enabled: true,
    message_text:
      "Olá, {nome}! 👋\n\nPassando aqui para te avisar que o(a) Dr(a). responsável pelo seu atendimento *já foi informado(a)* sobre nossa conversa de hoje ({data} às *{horario}*) e já está separando tudo para te ajudar a resolver o seu caso da melhor forma. ⚖️✨\n\nFoi reservado um horário exclusivo para você, então conto com a sua presença! 🤝",
  },
  {
    window_key: "reminder_2h",
    label: "1 hora antes",
    minutes_before: 60,
    enabled: true,
    message_text:
      '{nome}, falta *1 hora* para o seu atendimento com o(a) advogado(a)! ⏰\n\n📅 Horário: *{horario}*\n\nPara aproveitarmos cada minuto e já sair com encaminhamentos concretos, peço que você:\n\n✅ Separe os *documentos* relacionados ao seu caso (mesmo que sejam fotos pelo celular)\n✅ Anote suas *dúvidas* principais\n✅ Esteja em um lugar *tranquilo* na hora da ligação\n\nMe responde aqui com um *"vou estar pronto(a)"* só para eu confirmar com o(a) Dr(a)? 😉',
  },
  {
    window_key: "reminder_30m",
    label: "30 minutos antes",
    minutes_before: 25,
    enabled: true,
    message_text:
      "{nome}, é AGORA! 🚨\n\nO(A) Dr(a). já está *preparando a sala* e em *25 minutos* vai entrar em contato com você (horário marcado: *{horario}*).\n\n📱 Deixe o celular por perto e o WhatsApp aberto\n📄 Documentos em mãos\n🔇 Ambiente em silêncio\n\nNos falamos em instantes! 👨‍⚖️✨",
  },
];

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min antes`;
  if (min % 60 === 0) return `${min / 60} h antes`;
  return `${(min / 60).toFixed(1)} h antes`;
}

export function MeetingRemindersConfigCard({ companyId }: MeetingRemindersConfigCardProps) {
  const [windows, setWindows] = useState<Window[]>(DEFAULT_WINDOWS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("company_meeting_reminder_config")
      .select("window_key, minutes_before, message_text, enabled")
      .eq("company_id", companyId);

    if (data && data.length > 0) {
      const map = new Map(data.map((s) => [s.window_key, s]));
      setWindows(
        DEFAULT_WINDOWS.map((d) => {
          const found = map.get(d.window_key);
          return found
            ? {
                ...d,
                minutes_before: found.minutes_before,
                message_text: found.message_text,
                enabled: found.enabled,
              }
            : d;
        }),
      );
    } else {
      setWindows(DEFAULT_WINDOWS);
    }
    setLoading(false);
  }

  function update(index: number, patch: Partial<Window>) {
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  }

  async function handleSave() {
    setSaving(true);
    const rows = windows.map((w) => ({
      company_id: companyId,
      window_key: w.window_key,
      minutes_before: Math.max(1, Number(w.minutes_before) || 1),
      message_text: w.message_text,
      enabled: w.enabled,
    }));

    const { error } = await supabase
      .from("company_meeting_reminder_config")
      .upsert(rows, { onConflict: "company_id,window_key" });

    if (error) {
      toast.error("Erro ao salvar lembretes: " + error.message);
    } else {
      toast.success("Lembretes de reunião salvos!");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-6 text-sm text-muted-foreground">Carregando lembretes...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Lembretes de Reunião
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Mensagens automáticas enviadas ao lead antes da reunião agendada. Use{" "}
          <code className="rounded bg-muted px-1">{"{nome}"}</code>,{" "}
          <code className="rounded bg-muted px-1">{"{data}"}</code> e{" "}
          <code className="rounded bg-muted px-1">{"{horario}"}</code> nos textos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {windows.map((w, idx) => (
          <div key={w.window_key} className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{w.label}</div>
                <div className="text-xs text-muted-foreground">{formatMinutes(w.minutes_before)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Ativo</Label>
                <Switch checked={w.enabled} onCheckedChange={(v) => update(idx, { enabled: v })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Minutos antes
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={w.minutes_before}
                  onChange={(e) => update(idx, { minutes_before: Number(e.target.value) })}
                  disabled={!w.enabled}
                />
                <p className="text-[10px] text-muted-foreground">
                  Ex: 25 = 25min · 60 = 1h · 300 = 5h
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mensagem</Label>
                <Textarea
                  rows={5}
                  value={w.message_text}
                  onChange={(e) => update(idx, { message_text: e.target.value })}
                  disabled={!w.enabled}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Lembretes"}
        </Button>
      </CardContent>
    </Card>
  );
}

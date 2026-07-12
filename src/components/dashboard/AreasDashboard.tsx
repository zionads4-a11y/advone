import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Layers } from "lucide-react";

interface AreaRow {
  areaName: string;
  ativos: number;
  atrasados: number;
  atencao: number;
  emDia: number;
}

/**
 * Dashboard de Áreas Jurídicas. Respeita RLS: cada usuário só vê os process_cards
 * que já pode enxergar via user_can_see_process_card / user_has_area_access.
 */
export function AreasDashboard() {
  const [rows, setRows] = useState<AreaRow[]>([]);
  const [totals, setTotals] = useState({ ativos: 0, atrasados: 0, atencao: 0, emDia: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: cards } = await supabase
      .from("process_cards")
      .select("id, board_id, last_activity_at, weekly_target, process_boards!inner(id, name, legal_area_id, legal_areas(name))");
    const list = (cards ?? []) as any[];

    // Determinar semana atual (BRT ~ segunda-sexta). Simplificado: 7d rolling.
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0=dom
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const dowFri = 5;
    const daysUntilFriday = (dowFri - now.getDay() + 7) % 7; // 0 se sexta

    const perArea: Record<string, AreaRow> = {};
    let tAtr = 0, tAtn = 0, tOk = 0;

    for (const c of list) {
      const areaName = c.process_boards?.legal_areas?.name ?? c.process_boards?.name ?? "Sem área";
      if (!perArea[areaName]) perArea[areaName] = { areaName, ativos: 0, atrasados: 0, atencao: 0, emDia: 0 };
      perArea[areaName].ativos += 1;

      const last = c.last_activity_at ? new Date(c.last_activity_at) : null;
      const hasWeekly = last && last >= startOfWeek;
      let status: "atrasado" | "atencao" | "emDia";
      if (hasWeekly) status = "emDia";
      else if (daysUntilFriday === 0 || daysUntilFriday > 5) status = "atrasado"; // sexta ou fim de semana sem atividade
      else if (daysUntilFriday <= 2) status = "atencao";
      else status = "emDia";

      if (status === "atrasado") { perArea[areaName].atrasados += 1; tAtr += 1; }
      else if (status === "atencao") { perArea[areaName].atencao += 1; tAtn += 1; }
      else { perArea[areaName].emDia += 1; tOk += 1; }
    }

    setRows(Object.values(perArea).sort((a, b) => b.ativos - a.ativos));
    setTotals({ ativos: list.length, atrasados: tAtr, atencao: tAtn, emDia: tOk });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Processos ativos" value={totals.ativos} icon={Layers} variant="info" />
        <MetricCard title="Em atraso" value={totals.atrasados} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Atenção" value={totals.atencao} icon={Clock} variant="accent" />
        <MetricCard title="Em dia" value={totals.emDia} icon={CheckCircle2} variant="success" />
      </div>

      <Card className="border-border/60 bg-card">
        <CardHeader><CardTitle className="text-base">Saúde por área jurídica</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum processo cadastrado nas suas áreas ainda.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.areaName} className="rounded-lg border border-border/60 bg-secondary/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{r.areaName}</span>
                    <span className="text-xs text-muted-foreground">{r.ativos} ativos</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-destructive/10 px-2 py-1 text-destructive">🔴 {r.atrasados} atrasados</div>
                    <div className="rounded-md bg-accent/10 px-2 py-1 text-accent">🟡 {r.atencao} atenção</div>
                    <div className="rounded-md bg-success/10 px-2 py-1 text-success">🟢 {r.emDia} em dia</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

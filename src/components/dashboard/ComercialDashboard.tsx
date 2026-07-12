import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Handshake, Target, Users, TrendingUp } from "lucide-react";

interface ComercialStats {
  totalLeads: number;
  reunioesAgendadas: number;
  reunioesRealizadas: number;
  ganhos: number;
  perdidos: number;
}

/** Dashboard visível para SDR/Closer e como aba do Master. Nunca mostra valores de honorários. */
export function ComercialDashboard({ hideHonorarios = true }: { hideHonorarios?: boolean }) {
  const { filterByCompany, loading } = useUserCompanies();
  const [stats, setStats] = useState<ComercialStats>({
    totalLeads: 0, reunioesAgendadas: 0, reunioesRealizadas: 0, ganhos: 0, perdidos: 0,
  });
  const [ranking, setRanking] = useState<{ name: string; ganhos: number }[]>([]);

  useEffect(() => { if (!loading) fetchStats(); }, [loading]);

  const fetchStats = async () => {
    // Leads
    let q = supabase.from("leads").select("id, status, assigned_to, kanban_column_id");
    q = filterByCompany(q);
    const { data: leads } = await q;
    const list = leads ?? [];

    // Colunas para saber "Agendado" e "Reunião Realizada"
    let cq = supabase.from("kanban_columns").select("id, name, is_won, is_lost, is_meeting_held");
    cq = filterByCompany(cq);
    const { data: cols } = await cq;
    const agendadoIds = new Set((cols ?? []).filter((c: any) => /agendado/i.test(c.name)).map((c: any) => c.id));
    const realizadaIds = new Set((cols ?? []).filter((c: any) => c.is_meeting_held).map((c: any) => c.id));

    const ganhos = list.filter((l: any) => list && (cols ?? []).find((c: any) => c.id === l.kanban_column_id && c.is_won)).length;
    const perdidos = list.filter((l: any) => (cols ?? []).find((c: any) => c.id === l.kanban_column_id && c.is_lost)).length;
    const reunioesAgendadas = list.filter((l: any) => agendadoIds.has(l.kanban_column_id)).length;
    const reunioesRealizadas = list.filter((l: any) => realizadaIds.has(l.kanban_column_id) || ganhos).length;

    setStats({
      totalLeads: list.length,
      reunioesAgendadas,
      reunioesRealizadas: list.filter((l: any) => realizadaIds.has(l.kanban_column_id)).length + ganhos,
      ganhos,
      perdidos,
    });

    // Ranking de closers
    const wonByUser: Record<string, number> = {};
    list.forEach((l: any) => {
      const isWon = (cols ?? []).find((c: any) => c.id === l.kanban_column_id && c.is_won);
      if (isWon && l.assigned_to) wonByUser[l.assigned_to] = (wonByUser[l.assigned_to] || 0) + 1;
    });
    const userIds = Object.keys(wonByUser);
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      setRanking(
        Object.entries(wonByUser)
          .map(([uid, n]) => ({ name: (profs ?? []).find((p: any) => p.user_id === uid)?.full_name ?? "—", ganhos: n }))
          .sort((a, b) => b.ganhos - a.ganhos)
          .slice(0, 5),
      );
    }
  };

  const conv = stats.totalLeads > 0 ? ((stats.ganhos / stats.totalLeads) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Leads no funil" value={stats.totalLeads} icon={Users} variant="info" />
        <MetricCard title="Reuniões agendadas" value={stats.reunioesAgendadas} icon={CalendarCheck} variant="accent" />
        <MetricCard title="Reuniões realizadas" value={stats.reunioesRealizadas} icon={Handshake} variant="success" />
        <MetricCard title="Virou cliente" value={`${stats.ganhos} (${conv}%)`} icon={TrendingUp} variant="success" />
      </div>

      <Card className="border-border/60 bg-card">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" />Ranking de fechamentos</CardTitle></CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum fechamento ainda.</p>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, i) => (
                <div key={r.name + i} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{i + 1}</span>
                    <span className="text-sm text-foreground">{r.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{r.ganhos} {r.ganhos === 1 ? "cliente" : "clientes"}</span>
                </div>
              ))}
            </div>
          )}
          {!hideHonorarios ? null : (
            <p className="mt-3 text-[11px] text-muted-foreground">Valores de honorários ficam disponíveis apenas para Master e Financeiro.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

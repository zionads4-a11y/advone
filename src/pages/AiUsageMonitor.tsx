import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gauge, AlertTriangle, Loader2, CheckCircle2, TrendingUp } from "lucide-react";

// Thresholds de Fair Use (atendimentos/mês)
const WARN_THRESHOLD = 2000;
const ALERT_THRESHOLD = 3000;
// Estimativa de custo Gemini Flash com prompt dinâmico enxuto
const COST_PER_INBOUND = 0.0156;

type Row = {
  company_id: string;
  company_name: string;
  billing_model: string | null;
  inbound: number;
  unique_leads: number;
  estimated_cost: number;
  status: "ok" | "warn" | "alert";
};

export default function AiUsageMonitor() {
  const { userRole, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole !== "admin" && userRole !== "member") return;
    loadUsage();
  }, [userRole]);

  async function loadUsage() {
    setLoading(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("company_id, lead_id, direction")
        .gte("created_at", startOfMonth.toISOString())
        .eq("direction", "in");

      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, billing_model");

      const map = new Map<string, { count: number; leads: Set<string> }>();
      (msgs ?? []).forEach((m: any) => {
        if (!m.company_id) return;
        const cur = map.get(m.company_id) ?? { count: 0, leads: new Set() };
        cur.count += 1;
        if (m.lead_id) cur.leads.add(m.lead_id);
        map.set(m.company_id, cur);
      });

      const built: Row[] = (companies ?? []).map((c: any) => {
        const s = map.get(c.id) ?? { count: 0, leads: new Set() };
        const status: Row["status"] =
          s.count >= ALERT_THRESHOLD ? "alert" : s.count >= WARN_THRESHOLD ? "warn" : "ok";
        return {
          company_id: c.id,
          company_name: c.name,
          billing_model: c.billing_model,
          inbound: s.count,
          unique_leads: s.leads.size,
          estimated_cost: s.count * COST_PER_INBOUND,
          status,
        };
      });

      built.sort((a, b) => b.inbound - a.inbound);
      setRows(built);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if (userRole !== "admin" && userRole !== "member") return <Navigate to="/dashboard" replace />;

  const totalInbound = rows.reduce((s, r) => s + r.inbound, 0);
  const totalCost = rows.reduce((s, r) => s + r.estimated_cost, 0);
  const alertCount = rows.filter((r) => r.status === "alert").length;
  const warnCount = rows.filter((r) => r.status === "warn").length;

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6" /> Monitor de Uso IA · Fair Use
        </h1>
        <p className="text-muted-foreground text-sm">
          Atendimentos recebidos por empresa neste mês. Alerta a partir de {ALERT_THRESHOLD.toLocaleString("pt-BR")} para proteger a margem.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total atendimentos</CardDescription><CardTitle className="text-2xl">{totalInbound.toLocaleString("pt-BR")}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Custo IA estimado</CardDescription><CardTitle className="text-2xl">R$ {totalCost.toFixed(2)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Empresas em atenção</CardDescription><CardTitle className="text-2xl text-amber-600">{warnCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Empresas em alerta</CardDescription><CardTitle className="text-2xl text-destructive">{alertCount}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Ranking por consumo</CardTitle>
          <CardDescription>Atendimentos = mensagens recebidas de leads/clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="text-right">Leads únicos</TableHead>
                  <TableHead className="text-right">Custo IA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.company_id}>
                    <TableCell className="font-medium">{r.company_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.billing_model ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.inbound.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{r.unique_leads}</TableCell>
                    <TableCell className="text-right">R$ {r.estimated_cost.toFixed(2)}</TableCell>
                    <TableCell>
                      {r.status === "alert" && (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Alerta &gt; {ALERT_THRESHOLD}</Badge>
                      )}
                      {r.status === "warn" && (
                        <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle className="h-3 w-3" /> Atenção</Badge>
                      )}
                      {r.status === "ok" && (
                        <Badge variant="outline" className="gap-1 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum dado ainda neste mês.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

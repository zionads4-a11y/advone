import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, PiggyBank, Wallet, FileSignature } from "lucide-react";

const brl = (v: number) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanceiroDashboard() {
  const { filterByCompany, loading } = useUserCompanies();
  const [recebidoMes, setRecebidoMes] = useState(0);
  const [fechadoMes, setFechadoMes] = useState(0);
  const [aReceber, setAReceber] = useState(0);
  const [aPagar, setAPagar] = useState(0);
  const [inadimplencia, setInadimplencia] = useState(0);
  const [caixaAsaas, setCaixaAsaas] = useState<number | null>(null);
  const [caixaLoading, setCaixaLoading] = useState(true);
  const [caixaErr, setCaixaErr] = useState<string | null>(null);

  useEffect(() => { if (!loading) fetchData(); }, [loading]);

  const fetchData = async () => {
    const start = new Date();
    start.setDate(1); start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString().slice(0, 10);

    // Transações
    let tx = supabase.from("financial_transactions").select("type, status, amount, paid_date, due_date");
    tx = filterByCompany(tx);
    const { data: txData } = await tx;
    const txs = txData ?? [];

    setRecebidoMes(txs.filter((t: any) => t.type === "receivable" && t.status === "paid" && t.paid_date && t.paid_date >= startIso).reduce((s: number, t: any) => s + Number(t.amount || 0), 0));
    setAReceber(txs.filter((t: any) => t.type === "receivable" && t.status === "pending").reduce((s: number, t: any) => s + Number(t.amount || 0), 0));
    setAPagar(txs.filter((t: any) => t.type === "payable" && t.status !== "paid" && t.status !== "cancelled").reduce((s: number, t: any) => s + Number(t.amount || 0), 0));
    const today = new Date().toISOString().slice(0, 10);
    setInadimplencia(txs.filter((t: any) => t.type === "receivable" && t.status === "pending" && t.due_date < today).reduce((s: number, t: any) => s + Number(t.amount || 0), 0));

    // Contratos fechados no mês
    let cc = supabase.from("closed_contracts").select("honorarios_estimados, signed_at");
    cc = filterByCompany(cc);
    const { data: ccData } = await cc;
    setFechadoMes((ccData ?? []).filter((c: any) => c.signed_at >= start.toISOString()).reduce((s: number, c: any) => s + Number(c.honorarios_estimados || 0), 0));

    // Caixa Asaas
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const { data: bal, error: fnErr } = await supabase.functions.invoke("asaas-balance", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (fnErr) throw fnErr;
      setCaixaAsaas(Number((bal as any)?.balance ?? 0));
    } catch (e: any) {
      setCaixaErr(e?.message ?? "Erro ao buscar saldo");
    } finally {
      setCaixaLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Recebido no mês" value={brl(recebidoMes)} icon={ArrowUpCircle} variant="success" />
        <MetricCard title="Fechado no mês (contratos)" value={brl(fechadoMes)} icon={FileSignature} variant="accent" subtitle="Soma dos honorários estimados" />
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" />Caixa Asaas</CardTitle></CardHeader>
          <CardContent>
            {caixaLoading ? <p className="text-sm text-muted-foreground">Carregando saldo…</p>
              : caixaErr ? <p className="text-xs text-destructive">Não foi possível puxar do Asaas: {caixaErr}</p>
              : <p className="font-display text-2xl font-bold text-foreground">{brl(caixaAsaas ?? 0)}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="A receber" value={brl(aReceber)} icon={ArrowUpCircle} variant="info" />
        <MetricCard title="A pagar" value={brl(aPagar)} icon={ArrowDownCircle} variant="destructive" />
        <MetricCard title="Inadimplência" value={brl(inadimplencia)} icon={PiggyBank} variant="accent" subtitle="Recebíveis vencidos" />
      </div>
    </div>
  );
}

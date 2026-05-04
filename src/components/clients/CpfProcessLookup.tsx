import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  leadId: string;
  companyId: string;
  cpf?: string | null;
}

interface Lookup {
  id: string;
  created_at: string;
  status: string;
  processes_count: number;
  payload: any;
  error_message: string | null;
}

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  description: string | null;
  created_at: string;
  read_at: string | null;
}

export function CpfProcessLookup({ leadId, companyId, cpf }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState<Lookup | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: lk }, { data: al }] = await Promise.all([
      supabase
        .from("lead_cpf_lookups")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("lead_cpf_alerts")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setLatest(lk as any);
    setAlerts((al as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const runLookup = async () => {
    if (!cpf) {
      toast({ title: "CPF necessário", description: "Cadastre o CPF do cliente para consultar.", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("cpf-lookup-runner", {
        body: { lead_id: leadId, company_id: companyId, cpf, reason: "manual" },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Erro na consulta");
      toast({ title: "Consulta concluída", description: `${(data as any).processes_count} processo(s) encontrado(s).` });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const markAlertRead = async (id: string) => {
    await supabase.from("lead_cpf_alerts").update({ read_at: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  const items: any[] = (latest?.payload as any)?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Processos vinculados ao CPF</h3>
          <p className="text-sm text-muted-foreground">
            {cpf ? `CPF: ${cpf}` : "Cadastre o CPF do cliente para habilitar a consulta."}
            {" "}— atualização semanal automática.
          </p>
        </div>
        <Button onClick={runLookup} disabled={running || !cpf}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          Consultar agora
        </Button>
      </div>

      {alerts.filter((a) => !a.read_at).length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Atualizações detectadas
            </div>
            {alerts.filter((a) => !a.read_at).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-2 text-sm border-t pt-2">
                <div>
                  <div className="font-medium">{a.title}</div>
                  {a.description && <div className="text-muted-foreground">{a.description}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markAlertRead(a.id)}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !latest ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Nenhuma consulta realizada ainda. {cpf && "Clique em \"Consultar agora\" ou aguarde a atualização semanal."}
        </CardContent></Card>
      ) : latest.status === "error" ? (
        <Card className="border-destructive"><CardContent className="pt-6 text-sm text-destructive">
          Erro na última consulta: {latest.error_message}
        </CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Nenhum processo encontrado para este CPF.
          <div className="text-xs mt-1">Última verificação: {new Date(latest.created_at).toLocaleString("pt-BR")}</div>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span><RefreshCw className="h-3 w-3 inline mr-1" /> Última verificação: {new Date(latest.created_at).toLocaleString("pt-BR")}</span>
              <Badge variant="secondary">{items.length} processo(s)</Badge>
            </div>
            {items.map((p: any, idx: number) => (
              <div key={p.numero_cnj || idx} className="border rounded-lg p-3 space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-mono font-medium">{p.numero_cnj || "—"}</div>
                  {p.fontes?.[0]?.sigla && <Badge variant="outline">{p.fontes[0].sigla}</Badge>}
                </div>
                {p.fontes?.[0]?.capa?.classe && (
                  <div className="text-muted-foreground"><strong>Classe:</strong> {p.fontes[0].capa.classe}</div>
                )}
                {p.fontes?.[0]?.capa?.assunto && (
                  <div className="text-muted-foreground"><strong>Assunto:</strong> {p.fontes[0].capa.assunto}</div>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p.data_inicio && <span>Início: {p.data_inicio}</span>}
                  {p.data_ultima_movimentacao && <span>Última movim.: {p.data_ultima_movimentacao}</span>}
                  {typeof p.quantidade_movimentacoes === "number" && <span>{p.quantidade_movimentacoes} mov.</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Send, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

interface CompanySummary {
  company_id: string;
  company_name: string;
  count: number;
  total: number;
}

export function MonthlyConsolidation() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [consolidating, setConsolidating] = useState<string | null>(null);
  const [consolidatingAll, setConsolidatingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: charges } = await supabase
      .from("meeting_charges")
      .select("company_id, amount")
      .eq("invoice_month", month)
      .eq("status", "pending");

    const { data: companies } = await supabase.from("companies").select("id, name");
    const cmap: Record<string, string> = {};
    (companies || []).forEach((c) => { cmap[c.id] = c.name; });

    const grouped: Record<string, CompanySummary> = {};
    (charges || []).forEach((c) => {
      const k = c.company_id;
      if (!grouped[k]) grouped[k] = { company_id: k, company_name: cmap[k] || "Empresa", count: 0, total: 0 };
      grouped[k].count += 1;
      grouped[k].total += Number(c.amount);
    });

    setSummary(Object.values(grouped).sort((a, b) => b.total - a.total));
    setLoading(false);
  };

  useEffect(() => { load(); }, [month]);

  const consolidate = async (companyId?: string) => {
    if (companyId) setConsolidating(companyId);
    else setConsolidatingAll(true);

    try {
      const { data, error } = await supabase.functions.invoke("invoice-monthly-meetings", {
        body: companyId ? { month, company_id: companyId } : { month },
      });
      if (error) throw error;
      const results = (data?.results || []) as Array<{ ok: boolean; company_name?: string; count?: number; total?: number; error?: string }>;
      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      if (okCount > 0) toast.success(`${okCount} fatura(s) gerada(s) no Asaas`);
      if (failCount > 0) toast.error(`${failCount} empresa(s) falharam — veja logs`);
      await load();
    } catch (err: any) {
      toast.error("Erro ao consolidar: " + (err?.message || String(err)));
    } finally {
      setConsolidating(null);
      setConsolidatingAll(false);
    }
  };

  const grandTotal = summary.reduce((acc, s) => acc + s.total, 0);
  const grandCount = summary.reduce((acc, s) => acc + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Revisão antes de consolidar no Asaas</CardTitle>
        <CardDescription>
          Confira o que será faturado por empresa e gere a cobrança consolidada (1 fatura única por empresa) com um clique.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="month-input" className="text-xs">Mês de competência</Label>
            <Input
              id="month-input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button
            onClick={() => consolidate()}
            disabled={consolidatingAll || summary.length === 0}
            className="ml-auto"
          >
            {consolidatingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Consolidar todas no Asaas
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : summary.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">Nenhuma cobrança pendente neste mês.</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border bg-muted/30 p-3 flex justify-between text-sm">
              <span className="font-medium">{grandCount} reunião(ões) em {summary.length} empresa(s)</span>
              <span className="font-semibold text-primary">{formatBRL(grandTotal)}</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Reuniões</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => (
                    <TableRow key={s.company_id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {s.company_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{s.count}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatBRL(s.total)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => consolidate(s.company_id)}
                          disabled={consolidating === s.company_id || consolidatingAll}
                        >
                          {consolidating === s.company_id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : "Faturar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

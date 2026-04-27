import { useMemo } from "react";
import { useMeetingCharges } from "@/hooks/useMeetingCharges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3 } from "lucide-react";

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const formatMonth = (m: string) => {
  const [y, mm] = m.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[Number(mm) - 1]}/${y.slice(2)}`;
};

interface RowAgg {
  company_id: string;
  company_name: string;
  invoice_month: string;
  meetings: number;
  total: number;
  paid: number;
  pending: number;
}

export function MonthlyMeetingReport() {
  const { allCharges, companyNames, loading, canView } = useMeetingCharges();

  const rows = useMemo<RowAgg[]>(() => {
    const map = new Map<string, RowAgg>();
    for (const c of allCharges) {
      const month = c.invoice_month || c.meeting_at.slice(0, 7);
      const key = `${c.company_id}__${month}`;
      const existing = map.get(key) || {
        company_id: c.company_id,
        company_name: companyNames[c.company_id] || "Empresa",
        invoice_month: month,
        meetings: 0,
        total: 0,
        paid: 0,
        pending: 0,
      };
      existing.meetings += 1;
      existing.total += Number(c.amount || 0);
      if (c.status === "paid") existing.paid += Number(c.amount || 0);
      if (c.status === "pending") existing.pending += Number(c.amount || 0);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.invoice_month !== a.invoice_month) return b.invoice_month.localeCompare(a.invoice_month);
      return a.company_name.localeCompare(b.company_name);
    });
  }, [allCharges, companyNames]);

  if (!canView) return null;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Relatório mensal — Faturamento por Reunião
        </CardTitle>
        <CardDescription>
          Agregado por empresa e mês. Faturamento total, recebido e pendente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            Nenhuma reunião realizada registrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Reuniões</TableHead>
                  <TableHead className="text-right">Faturamento total</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Pendente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.company_id}_${r.invoice_month}`}>
                    <TableCell>
                      <Badge variant="outline">{formatMonth(r.invoice_month)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.company_name}</TableCell>
                    <TableCell className="text-right">{r.meetings}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatBRL(r.total)}</TableCell>
                    <TableCell className="text-right text-accent-foreground">{formatBRL(r.paid)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatBRL(r.pending)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

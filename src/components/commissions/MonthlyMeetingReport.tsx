import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, FileBarChart } from "lucide-react";

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

interface Row {
  company_id: string;
  company_name: string;
  total_meetings: number;
  pending: number;
  invoiced: number;
  paid: number;
  canceled: number;
  total_amount: number;
}

export function MonthlyMeetingReport() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [month]);

  const load = async () => {
    setLoading(true);
    const { data: charges } = await supabase
      .from("meeting_charges")
      .select("company_id, amount, status")
      .eq("invoice_month", month);

    const { data: companies } = await supabase.from("companies").select("id, name");
    const cmap: Record<string, string> = {};
    (companies || []).forEach((c) => { cmap[c.id] = c.name; });

    const grouped: Record<string, Row> = {};
    (charges || []).forEach((c) => {
      const k = c.company_id;
      if (!grouped[k]) {
        grouped[k] = {
          company_id: k,
          company_name: cmap[k] || "Empresa",
          total_meetings: 0, pending: 0, invoiced: 0, paid: 0, canceled: 0,
          total_amount: 0,
        };
      }
      const r = grouped[k];
      // só conta como reunião realizada se NÃO estiver cancelada
      if (c.status !== "canceled") {
        r.total_meetings += 1;
        r.total_amount += Number(c.amount);
      }
      r[c.status as keyof Row] = (r[c.status as keyof Row] as number) + 1;
    });

    setRows(Object.values(grouped).sort((a, b) => b.total_meetings - a.total_meetings));
    setLoading(false);
  };

  const totalMeetings = rows.reduce((acc, r) => acc + r.total_meetings, 0);
  const totalAmount = rows.reduce((acc, r) => acc + r.total_amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileBarChart className="h-5 w-5 text-primary" />
          Relatório mensal — Faturamento por Reunião
        </CardTitle>
        <CardDescription>
          Quantas reuniões foram marcadas como "Reunião Realizada" por empresa, com total de R$ 97 cada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="report-month" className="text-xs">Mês</Label>
            <Input
              id="report-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[160px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Sem reuniões registradas neste mês.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Empresas</p>
                <p className="text-xl font-bold">{rows.length}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Reuniões realizadas</p>
                <p className="text-xl font-bold">{totalMeetings}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Faturamento total</p>
                <p className="text-xl font-bold text-primary">{formatBRL(totalAmount)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-center">Reuniões</TableHead>
                    <TableHead className="text-center">Pendente</TableHead>
                    <TableHead className="text-center">Faturada</TableHead>
                    <TableHead className="text-center">Paga</TableHead>
                    <TableHead className="text-center">Estornada</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.company_id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.company_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{r.total_meetings}</TableCell>
                      <TableCell className="text-center">
                        {r.pending > 0 ? <Badge variant="outline">{r.pending}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.invoiced > 0 ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{r.invoiced}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.paid > 0 ? <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30">{r.paid}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.canceled > 0 ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{r.canceled}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatBRL(r.total_amount)}</TableCell>
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

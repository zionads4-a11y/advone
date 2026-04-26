import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMeetingCharges } from "@/hooks/useMeetingCharges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, CalendarCheck, Clock, CheckCircle2, FileText, Building2, Loader2, Receipt } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  invoiced: { label: "Faturada", className: "bg-primary/10 text-primary border-primary/20" },
  paid: { label: "Paga", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  canceled: { label: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const formatMonth = (m: string | null) => {
  if (!m) return "—";
  const [y, mm] = m.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[Number(mm) - 1]}/${y.slice(2)}`;
};

export default function Commissions() {
  const { userRole } = useAuth();
  const {
    charges, availableCompanies, companyFilter, setCompanyFilter,
    loading, canView, isAdmin, metrics,
  } = useMeetingCharges();

  if (!canView && userRole) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento por Reunião</h1>
          <p className="text-sm text-muted-foreground">
            Cobrança de R$ 97,00 por cada reunião realizada — consolidação mensal por empresa
          </p>
        </div>
      </div>

      {/* Filtro de empresa (só faz sentido pra admin que vê várias) */}
      {isAdmin && availableCompanies.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Empresa:</span>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {availableCompanies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reuniões realizadas</p>
                <p className="text-2xl font-bold">{metrics.totalMeetings}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A faturar</p>
                <p className="text-2xl font-bold text-primary">{formatBRL(metrics.totalPending)}</p>
              </div>
              <Clock className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturado (aguardando pgto)</p>
                <p className="text-2xl font-bold text-accent-foreground">{formatBRL(metrics.totalInvoiced)}</p>
              </div>
              <Receipt className="h-8 w-8 text-accent/60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-2xl font-bold text-accent-foreground">{formatBRL(metrics.totalPaid)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-accent/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charges Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reuniões realizadas</CardTitle>
          <CardDescription>
            Cada reunião confirmada gera R$ 97,00. As cobranças são consolidadas no fim de cada mês em uma única fatura por empresa via Asaas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Nenhuma reunião realizada registrada{companyFilter !== "all" ? " para esta empresa" : ""}. As reuniões aparecem aqui quando o gerente marca como "realizada" no card do lead.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead>Empresa</TableHead>}
                    <TableHead>Lead</TableHead>
                    <TableHead>Reunião em</TableHead>
                    <TableHead>Confirmada em</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Mês fatura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((c) => {
                    const st = statusConfig[c.status] || statusConfig.pending;
                    return (
                      <TableRow key={c.id}>
                        {isAdmin && (
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-sm">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {availableCompanies.find((a) => a.id === c.company_id)?.name || "—"}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{c.lead_name}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(c.meeting_at).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.confirmed_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatBRL(Number(c.amount))}
                        </TableCell>
                        <TableCell className="text-xs">{formatMonth(c.invoice_month)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.className}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.asaas_invoice_url ? (
                            <a
                              href={c.asaas_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" /> Ver
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

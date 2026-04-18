import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCommissions } from "@/hooks/useCommissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Clock, CheckCircle2, FileSignature, Building2, Loader2 } from "lucide-react";

const statusLabels: Record<string, { label: string; className: string }> = {
  em_andamento: { label: "Em andamento", className: "bg-primary/10 text-primary border-primary/20" },
  ganho: { label: "Ganho", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  perdido: { label: "Perdido", className: "bg-destructive/10 text-destructive border-destructive/20" },
  acordo: { label: "Acordo", className: "bg-secondary/30 text-secondary-foreground border-secondary/40" },
  arquivado: { label: "Arquivado", className: "bg-muted text-muted-foreground" },
};

const commissionStatusLabels: Record<string, { label: string; className: string }> = {
  aguardando_exito: { label: "Aguardando êxito", className: "bg-muted text-muted-foreground" },
  cobranca_gerada: { label: "Cobrança gerada", className: "bg-primary/10 text-primary" },
  pago: { label: "Pago", className: "bg-accent/20 text-accent-foreground" },
  inadimplente: { label: "Inadimplente", className: "bg-destructive/10 text-destructive" },
};

const formatBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function Commissions() {
  const { userRole } = useAuth();
  const { contracts, companyNames, loading, isAdmin, metrics } = useCommissions();

  if (!isAdmin && userRole) return <Navigate to="/dashboard" replace />;

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
          <h1 className="text-2xl font-bold text-foreground">Comissões de Êxito</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de contratos fechados e comissões devidas</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contratos fechados</p>
                <p className="text-2xl font-bold">{metrics.totalContracts}</p>
              </div>
              <FileSignature className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aguardando êxito</p>
                <p className="text-2xl font-bold text-primary">{metrics.contractsWaiting}</p>
              </div>
              <Clock className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissão potencial</p>
                <p className="text-2xl font-bold text-accent-foreground">{formatBRL(metrics.totalCommissionPending)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent/60" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sobre honorários estimados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Comissão recebida</p>
                <p className="text-2xl font-bold text-accent-foreground">{formatBRL(metrics.totalPaid)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-accent/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contratos Fechados</CardTitle>
          <CardDescription>
            Cada contrato registrado pelos escritórios. Comissão de 30% sobre honorários é cobrada quando o processo for ganho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Nenhum contrato fechado registrado ainda. Os contratos aparecerão aqui automaticamente quando os escritórios assinarem via ZapSign.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cliente final</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead className="text-right">Honorários est.</TableHead>
                    <TableHead className="text-right">Comissão (30%)</TableHead>
                    <TableHead>Status processo</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Assinado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => {
                    const ps = statusLabels[c.process_status] || statusLabels.em_andamento;
                    const cs = commissionStatusLabels[c.commission_status] || commissionStatusLabels.aguardando_exito;
                    const commissionPotential = (Number(c.honorarios_estimados) * Number(c.commission_percentage)) / 100;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {companyNames[c.company_id] || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{c.client_name}</TableCell>
                        <TableCell className="font-mono text-xs">{c.client_cpf}</TableCell>
                        <TableCell className="font-mono text-xs">{c.processo_cnj || "—"}</TableCell>
                        <TableCell className="text-right">{formatBRL(Number(c.honorarios_estimados))}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatBRL(commissionPotential)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ps.className}>{ps.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cs.className}>{cs.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.signed_at).toLocaleDateString("pt-BR")}
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

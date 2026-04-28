import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ExternalLink, CheckCircle2, CreditCard, Wallet } from "lucide-react";
import { AgreementFormDialog } from "./AgreementFormDialog";
import { AGREEMENT_STATUS_LABEL, INSTALLMENT_STATUS_LABEL, brl } from "@/lib/agreements";

interface Props {
  lead: any;
  companyId: string;
}

export function ClientAgreements({ lead, companyId }: Props) {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [installmentsByAg, setInstallmentsByAg] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [chargingId, setChargingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: ags } = await supabase
      .from("client_agreements")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setAgreements(ags || []);
    if (ags && ags.length) {
      const ids = ags.map((a) => a.id);
      const { data: insts } = await supabase
        .from("agreement_installments")
        .select("*")
        .in("agreement_id", ids)
        .order("installment_number");
      const grouped: Record<string, any[]> = {};
      (insts || []).forEach((i) => {
        grouped[i.agreement_id] = grouped[i.agreement_id] || [];
        grouped[i.agreement_id].push(i);
      });
      setInstallmentsByAg(grouped);
    } else {
      setInstallmentsByAg({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [lead.id]);

  const remove = async (id: string) => {
    if (!confirm("Excluir este acordo e todas as parcelas?")) return;
    const { error } = await supabase.from("client_agreements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Acordo excluído");
    load();
  };

  const markPaid = async (instId: string) => {
    const { error } = await supabase
      .from("agreement_installments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", instId);
    if (error) return toast.error(error.message);
    toast.success("Parcela marcada como paga");
    load();
  };

  const generateAsaasCharges = async (agId: string) => {
    setChargingId(agId);
    try {
      const { data, error } = await supabase.functions.invoke("create-agreement-charges", {
        body: { agreement_id: agId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${(data as any).count || 0} cobrança(s) Asaas geradas`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar cobranças no Asaas");
    } finally {
      setChargingId(null);
    }
  };

  const totals = agreements.reduce(
    (acc, a) => {
      acc.fee += Number(a.fee_amount || 0);
      acc.client += Number(a.client_amount || 0);
      acc.total += Number(a.total_amount || 0);
      return acc;
    },
    { fee: 0, client: 0, total: 0 },
  );

  const statusVariant = (s: string) =>
    s === "paid" ? "default" : s === "overdue" ? "destructive" : s === "canceled" ? "outline" : "secondary";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Acordos & Honorários</h3>
          <p className="text-xs text-muted-foreground">Cálculo automático e parcelamento via Asaas.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo acordo
        </Button>
      </div>

      {agreements.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-2">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total de acordos</p>
            <p className="text-lg font-bold">{brl(totals.total)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Honorários (receita)</p>
            <p className="text-lg font-bold text-success">{brl(totals.fee)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cliente recebe</p>
            <p className="text-lg font-bold">{brl(totals.client)}</p>
          </CardContent></Card>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : agreements.length === 0 ? (
        <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
          <Wallet className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm">Nenhum acordo cadastrado.</p>
          <p className="text-xs mt-1">Crie um acordo e veja o cálculo automático de honorários.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((ag) => {
            const insts = installmentsByAg[ag.id] || [];
            const paidCount = insts.filter((i) => i.status === "paid").length;
            const hasAsaas = insts.some((i) => i.asaas_payment_id);
            return (
              <Card key={ag.id} className="overflow-hidden">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{ag.title}</h4>
                        <Badge variant="outline">{AGREEMENT_STATUS_LABEL[ag.status] || ag.status}</Badge>
                        <Badge variant="secondary" className="capitalize">
                          {ag.payment_type === "parcelado" ? `${ag.installments_count}x` : "À vista"}
                        </Badge>
                      </div>
                      {ag.description && <p className="text-xs text-muted-foreground mt-1">{ag.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(ag); setOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(ag.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2 text-sm bg-muted/30 rounded-md p-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="font-semibold">{brl(ag.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Honorários ({ag.fee_percentage}%)</p>
                      <p className="font-semibold text-success">{brl(ag.fee_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Cliente</p>
                      <p className="font-semibold">{brl(ag.client_amount)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium">Parcelas dos honorários ({paidCount}/{insts.length} pagas)</p>
                      {!hasAsaas && insts.length > 0 && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => generateAsaasCharges(ag.id)}
                          disabled={chargingId === ag.id}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          {chargingId === ag.id ? "Gerando..." : "Gerar cobranças Asaas"}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {insts.map((i) => (
                        <div key={i.id} className="flex items-center justify-between gap-2 px-2 py-1.5 border rounded text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono w-10 text-muted-foreground">{i.installment_number}/{insts.length}</span>
                            <span className="font-medium">{brl(i.amount)}</span>
                            <span className="text-xs text-muted-foreground">
                              venc. {new Date(i.due_date+"T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                            <Badge variant={statusVariant(i.status) as any} className="text-[10px]">
                              {INSTALLMENT_STATUS_LABEL[i.status] || i.status}
                            </Badge>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {i.asaas_invoice_url && (
                              <a href={i.asaas_invoice_url} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
                              </a>
                            )}
                            {i.status !== "paid" && i.status !== "canceled" && (
                              <Button size="sm" variant="ghost" onClick={() => markPaid(i.id)} title="Marcar como paga">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AgreementFormDialog
        open={open}
        onOpenChange={setOpen}
        lead={lead}
        companyId={companyId}
        agreement={editing}
        onSaved={load}
      />
    </div>
  );
}

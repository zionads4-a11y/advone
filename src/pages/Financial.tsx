import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Plus,
  RefreshCw,
  Download,
  Settings,
  Trash2,
  Pencil,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

interface Transaction {
  id: string;
  company_id: string;
  type: "payable" | "receivable";
  description: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  category: string | null;
  asaas_payment_id: string | null;
  notes: string | null;
  created_at: string;
}

interface AsaasConfig {
  id: string;
  company_id: string;
  environment: string;
  last_sync_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-warning" },
  paid: { label: "Pago", icon: CheckCircle, color: "text-success" },
  overdue: { label: "Atrasado", icon: AlertCircle, color: "text-destructive" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-muted-foreground" },
};

export default function Financial() {
  const { user } = useAuth();
  const { companyIds } = useUserCompanies();
  const companyId = companyIds[0] || "";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [asaasConfig, setAsaasConfig] = useState<AsaasConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Form states
  const [addOpen, setAddOpen] = useState(false);
  const [asaasOpen, setAsaasOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<"payable" | "receivable">("payable");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaidDate, setFormPaidDate] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [formCategory, setFormCategory] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Asaas form
  const [asaasApiKey, setAsaasApiKey] = useState("");
  const [asaasEnv, setAsaasEnv] = useState("production");

  useEffect(() => {
    if (companyId) fetchData();
  }, [companyId]);

  const fetchData = async () => {
    setLoading(true);
    const [txRes, configRes] = await Promise.all([
      supabase
        .from("financial_transactions")
        .select("*")
        .eq("company_id", companyId)
        .order("due_date", { ascending: false }),
      supabase
        .from("asaas_configs")
        .select("id, company_id, environment, last_sync_at")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);
    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (configRes.data) setAsaasConfig(configRes.data as AsaasConfig);
    setLoading(false);
  };

  // Metrics
  const metrics = useMemo(() => {
    const payable = transactions.filter((t) => t.type === "payable");
    const receivable = transactions.filter((t) => t.type === "receivable");
    const totalPayable = payable.reduce((s, t) => s + Number(t.amount), 0);
    const totalReceivable = receivable.reduce((s, t) => s + Number(t.amount), 0);
    const paidReceivable = receivable
      .filter((t) => t.status === "paid")
      .reduce((s, t) => s + Number(t.amount), 0);
    const paidPayable = payable
      .filter((t) => t.status === "paid")
      .reduce((s, t) => s + Number(t.amount), 0);
    return {
      totalPayable,
      totalReceivable,
      netRevenue: paidReceivable - paidPayable,
      pendingPayable: payable.filter((t) => t.status === "pending").length,
      pendingReceivable: receivable.filter((t) => t.status === "pending").length,
    };
  }, [transactions]);

  // Chart data: monthly aggregation
  const monthlyData = useMemo(() => {
    const months: Record<string, { receita: number; despesa: number }> = {};
    transactions.forEach((t) => {
      const dateStr = t.paid_date || t.due_date;
      if (!dateStr) return;
      const key = dateStr.substring(0, 7); // YYYY-MM
      if (!months[key]) months[key] = { receita: 0, despesa: 0 };
      if (t.type === "receivable" && t.status === "paid") {
        months[key].receita += Number(t.amount);
      } else if (t.type === "payable" && t.status === "paid") {
        months[key].despesa += Number(t.amount);
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, vals]) => ({
        month: format(new Date(month + "-15"), "MMM/yy", { locale: ptBR }),
        receita: vals.receita,
        despesa: vals.despesa,
        liquido: vals.receita - vals.despesa,
      }));
  }, [transactions]);

  const chartConfig: ChartConfig = {
    receita: { label: "Receita", color: "hsl(var(--success))" },
    despesa: { label: "Despesa", color: "hsl(var(--destructive))" },
    liquido: { label: "Líquido", color: "hsl(var(--primary))" },
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAddTransaction = async () => {
    if (!user || !companyId) return;
    const data = {
      company_id: companyId,
      type: formType,
      description: formDesc,
      amount: parseFloat(formAmount) || 0,
      due_date: formDueDate,
      paid_date: formPaidDate || null,
      status: formStatus,
      category: formCategory || null,
      notes: formNotes || null,
      created_by: user.id,
    };

    if (editingTx) {
      const { error } = await supabase
        .from("financial_transactions")
        .update(data)
        .eq("id", editingTx.id);
      if (error) return toast.error("Erro: " + error.message);
      toast.success("Transação atualizada!");
    } else {
      const { error } = await supabase
        .from("financial_transactions")
        .insert(data);
      if (error) return toast.error("Erro: " + error.message);
      toast.success("Transação criada!");
    }

    resetForm();
    setAddOpen(false);
    setEditingTx(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", id);
    if (error) return toast.error("Erro: " + error.message);
    toast.success("Transação excluída!");
    fetchData();
  };

  const resetForm = () => {
    setFormType("payable");
    setFormDesc("");
    setFormAmount("");
    setFormDueDate("");
    setFormPaidDate("");
    setFormStatus("pending");
    setFormCategory("");
    setFormNotes("");
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormDesc(tx.description);
    setFormAmount(String(tx.amount));
    setFormDueDate(tx.due_date);
    setFormPaidDate(tx.paid_date || "");
    setFormStatus(tx.status);
    setFormCategory(tx.category || "");
    setFormNotes(tx.notes || "");
    setAddOpen(true);
  };

  const handleSaveAsaas = async () => {
    if (!companyId) return;
    const payload = {
      company_id: companyId,
      api_key: asaasApiKey,
      environment: asaasEnv,
    };

    if (asaasConfig) {
      const { error } = await supabase
        .from("asaas_configs")
        .update(payload)
        .eq("id", asaasConfig.id);
      if (error) return toast.error("Erro: " + error.message);
    } else {
      const { error } = await supabase.from("asaas_configs").insert(payload);
      if (error) return toast.error("Erro: " + error.message);
    }

    toast.success("Configuração Asaas salva!");
    setAsaasOpen(false);
    fetchData();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-asaas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ company_id: companyId }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro na sincronização");
      toast.success(`Sincronizado! ${result.synced} transações atualizadas.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const exportCSV = () => {
    const headers = "Tipo,Descrição,Valor,Vencimento,Pagamento,Status,Categoria\n";
    const rows = transactions
      .map(
        (t) =>
          `${t.type === "payable" ? "A Pagar" : "A Receber"},"${t.description}",${t.amount},${t.due_date},${t.paid_date || ""},${STATUS_MAP[t.status]?.label || t.status},"${t.category || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = (type: "payable" | "receivable") => {
    const filtered = transactions.filter((t) => t.type === type);
    return (
      <div className="overflow-x-auto -mx-2 sm:mx-0">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="w-20">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((tx) => {
              const st = STATUS_MAP[tx.status] || STATUS_MAP.pending;
              const Icon = st.icon;
              return (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {tx.description}
                    {tx.asaas_payment_id && (
                      <Badge variant="outline" className="ml-2 text-[9px]">
                        Asaas
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(Number(tx.amount))}</TableCell>
                  <TableCell>{format(new Date(tx.due_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    {tx.paid_date
                      ? format(new Date(tx.paid_date + "T12:00:00"), "dd/MM/yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {st.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{tx.category || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
    );
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma empresa vinculada ao seu perfil.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Contas a pagar, receber e faturamento</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={asaasOpen} onOpenChange={setAsaasOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAsaasApiKey("");
                  if (asaasConfig) {
                    setAsaasEnv(asaasConfig.environment);
                  }
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Asaas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Asaas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Chave API</Label>
                  <Input
                    type="password"
                    value={asaasApiKey}
                    onChange={(e) => setAsaasApiKey(e.target.value)}
                    placeholder="$aas_..."
                  />
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <Input value="Produção" disabled className="bg-muted" />
                </div>
                {asaasConfig?.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Última sincronização:{" "}
                    {format(new Date(asaasConfig.last_sync_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                )}
                <Button onClick={handleSaveAsaas} className="w-full">
                  Salvar configuração
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {asaasConfig && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar Asaas
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>

          <Dialog
            open={addOpen}
            onOpenChange={(o) => {
              setAddOpen(o);
              if (!o) {
                resetForm();
                setEditingTx(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova transação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTx ? "Editar transação" : "Nova transação"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payable">Conta a Pagar</SelectItem>
                      <SelectItem value="receivable">Conta a Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data de pagamento</Label>
                    <Input
                      type="date"
                      value={formPaidDate}
                      onChange={(e) => setFormPaidDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex: Honorários, Aluguel, etc."
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button onClick={handleAddTransaction} className="w-full">
                  {editingTx ? "Salvar alterações" : "Criar transação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.totalReceivable)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingReceivable} pendente{metrics.pendingReceivable !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contas a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.totalPayable)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingPayable} pendente{metrics.pendingPayable !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${metrics.netRevenue >= 0 ? "text-success" : "text-destructive"}`}
            >
              {formatCurrency(metrics.netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Recebido − Pago</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(metrics.totalReceivable - metrics.totalPayable)}
            </div>
            <p className="text-xs text-muted-foreground">A Receber − A Pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {monthlyData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" className="text-[10px]" tickLine={false} axisLine={false} />
                  <YAxis className="text-[10px]" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="receita" fill="var(--color-receita)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" fill="var(--color-despesa)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Evolução do Faturamento Líquido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" className="text-[10px]" tickLine={false} axisLine={false} />
                  <YAxis className="text-[10px]" tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Line type="monotone" dataKey="receita" stroke="var(--color-receita)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="despesa" stroke="var(--color-despesa)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="liquido" stroke="var(--color-liquido)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="receivable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receivable">Contas a Receber</TabsTrigger>
          <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="receivable">
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0 sm:p-6 sm:pt-6">{renderTable("receivable")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable">
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0 sm:p-6 sm:pt-6">{renderTable("payable")}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

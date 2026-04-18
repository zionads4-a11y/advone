import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, History, Download, Shield, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { LeadConversationDrawer } from "@/components/leads/LeadConversationDrawer";

interface LeadHistoryRow {
  id: string;
  name: string;
  cpf: string | null;
  cpf_cliente_final: string | null;
  phone: string | null;
  email: string | null;
  processo_numero: string | null;
  value: number | null;
  honorarios_estimados: number | null;
  status: string;
  source: string | null;
  contract_status: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  company_name: string;
  partnership_type: string;
  column_name: string | null;
  is_won: boolean;
  is_lost: boolean;
  has_contract: boolean;
}

function formatCpf(cpf: string | null) {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatMoney(v: number | null | undefined) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusLabels: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  negotiating: "Negociando",
  won: "Vendido",
  lost: "Perdido",
};

export default function LeadsHistory() {
  const [rows, setRows] = useState<LeadHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterPartnership, setFilterPartnership] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [drawerLead, setDrawerLead] = useState<LeadHistoryRow | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, columnsRes, leadsRes, contractsRes] = await Promise.all([
        supabase.from("companies").select("id, name, partnership_type"),
        supabase.from("kanban_columns").select("id, name, is_won, is_lost"),
        supabase
          .from("leads")
          .select("id, name, cpf, cpf_cliente_final, phone, email, processo_numero, value, honorarios_estimados, status, source, contract_status, created_at, updated_at, company_id, kanban_column_id")
          .order("updated_at", { ascending: false })
          .limit(2000),
        supabase.from("closed_contracts").select("lead_id"),
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (columnsRes.error) throw columnsRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (contractsRes.error) throw contractsRes.error;

      const companyMap = new Map((companiesRes.data || []).map((c: any) => [c.id, c]));
      const columnMap = new Map((columnsRes.data || []).map((k: any) => [k.id, k]));
      const contractSet = new Set((contractsRes.data || []).map((c: any) => c.lead_id));

      const list: LeadHistoryRow[] = (leadsRes.data || []).map((l: any) => {
        const company = companyMap.get(l.company_id);
        const column = l.kanban_column_id ? columnMap.get(l.kanban_column_id) : null;
        return {
          id: l.id,
          name: l.name,
          cpf: l.cpf,
          cpf_cliente_final: l.cpf_cliente_final,
          phone: l.phone,
          email: l.email,
          processo_numero: l.processo_numero,
          value: l.value,
          honorarios_estimados: l.honorarios_estimados,
          status: l.status,
          source: l.source,
          contract_status: l.contract_status,
          created_at: l.created_at,
          updated_at: l.updated_at,
          company_id: l.company_id,
          company_name: company?.name || "—",
          partnership_type: company?.partnership_type || "—",
          column_name: column?.name || null,
          is_won: !!column?.is_won,
          is_lost: !!column?.is_lost,
          has_contract: contractSet.has(l.id),
        };
      });
      setRows(list);
    } catch (err: any) {
      toast.error("Erro ao carregar histórico: " + (err?.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.company_id, r.company_name));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(s) ||
        (r.cpf?.includes(search) ?? false) ||
        (r.cpf_cliente_final?.includes(search) ?? false) ||
        (r.phone?.includes(search) ?? false) ||
        (r.processo_numero?.toLowerCase().includes(s) ?? false) ||
        (r.email?.toLowerCase().includes(s) ?? false);
      const matchCompany = filterCompany === "all" || r.company_id === filterCompany;
      const matchPart = filterPartnership === "all" || r.partnership_type === filterPartnership;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "won" && r.is_won) ||
        (filterStatus === "lost" && r.is_lost) ||
        (filterStatus === "open" && !r.is_won && !r.is_lost) ||
        (filterStatus === "with_contract" && r.has_contract);
      return matchSearch && matchCompany && matchPart && matchStatus;
    });
  }, [rows, search, filterCompany, filterPartnership, filterStatus]);

  const exportCsv = () => {
    const header = [
      "Empresa",
      "Tipo Parceria",
      "Nome",
      "CPF",
      "Telefone",
      "E-mail",
      "Processo",
      "Valor",
      "Honorários",
      "Etapa Kanban",
      "Status",
      "Contrato",
      "Origem",
      "Criado",
      "Atualizado",
    ];
    const lines = filtered.map((r) => {
      const cpf = formatCpf(r.cpf_cliente_final || r.cpf) || "";
      return [
        r.company_name,
        r.partnership_type,
        r.name,
        cpf,
        r.phone || "",
        r.email || "",
        r.processo_numero || "",
        r.value ?? "",
        r.honorarios_estimados ?? "",
        r.column_name || "",
        statusLabels[r.status] || r.status,
        r.has_contract ? "Sim" : "Não",
        r.source || "",
        new Date(r.created_at).toLocaleString("pt-BR"),
        new Date(r.updated_at).toLocaleString("pt-BR"),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wonCount = rows.filter((r) => r.is_won).length;
  const contractCount = rows.filter((r) => r.has_contract).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Histórico Global de Leads
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Rastreabilidade contratual · {rows.length} leads · {wonCount} ganhos · {contractCount} com contrato
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline" disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV (prova)
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, telefone, processo, e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <Filter className="mr-2 h-3 w-3" />
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companyOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPartnership} onValueChange={setFilterPartnership}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Parceria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas parcerias</SelectItem>
                <SelectItem value="exito">Êxito</SelectItem>
                <SelectItem value="mensalidade_zionads">Mensalidade ZionAds</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="open">Em andamento</SelectItem>
                <SelectItem value="won">Ganhos</SelectItem>
                <SelectItem value="lost">Perdidos</SelectItem>
                <SelectItem value="with_contract">Com contrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-muted-foreground">Lead</TableHead>
                  <TableHead className="text-muted-foreground">CPF</TableHead>
                  <TableHead className="text-muted-foreground">Telefone</TableHead>
                  <TableHead className="text-muted-foreground">Processo</TableHead>
                  <TableHead className="text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground">Etapa</TableHead>
                  <TableHead className="text-muted-foreground">Contrato</TableHead>
                  <TableHead className="text-muted-foreground">Atualizado</TableHead>
                  <TableHead className="text-muted-foreground text-right">Conversa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      {loading ? "Carregando..." : (
                        <div className="flex flex-col items-center">
                          <History className="mb-2 h-8 w-8" />
                          <p>Nenhum lead encontrado</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const cpf = formatCpf(r.cpf_cliente_final || r.cpf);
                    return (
                      <TableRow key={r.id} className="border-border hover:bg-secondary/50">
                        <TableCell className="text-foreground">
                          <div className="font-medium">{r.company_name}</div>
                          <div className="text-[10px] uppercase text-muted-foreground">
                            {r.partnership_type === "exito" ? "Êxito" : "Mensalidade"}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          <div className="font-medium">{r.name}</div>
                          {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                        </TableCell>
                        <TableCell className={cpf ? "text-foreground font-mono text-xs" : "text-muted-foreground"}>
                          {cpf || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.phone || "—"}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {r.processo_numero || "—"}
                        </TableCell>
                        <TableCell className="text-foreground text-xs">
                          {formatMoney(r.honorarios_estimados || r.value)}
                        </TableCell>
                        <TableCell>
                          {r.column_name ? (
                            <Badge
                              variant="outline"
                              className={
                                r.is_won
                                  ? "bg-success/10 text-success border-success/30"
                                  : r.is_lost
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : "bg-info/10 text-info border-info/30"
                              }
                            >
                              {r.column_name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {statusLabels[r.status] || r.status}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.has_contract ? (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(r.updated_at).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

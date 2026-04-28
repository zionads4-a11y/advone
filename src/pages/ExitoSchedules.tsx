import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Trophy, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

interface ExitoSchedule {
  lead_id: string;
  lead_name: string;
  cpf_cliente_final: string | null;
  cpf: string | null;
  phone: string | null;
  pending_data_warning: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  company_name: string;
  column_name: string;
}

function formatCpf(cpf: string | null) {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function ExitoSchedules() {
  const [rows, setRows] = useState<ExitoSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterPending, setFilterPending] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1) Get all "exito" partnership companies
      const { data: companies, error: cErr } = await supabase
        .from("companies")
        .select("id, name")
        .eq("partnership_type", "exito");
      if (cErr) throw cErr;
      if (!companies || companies.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const companyMap = new Map(companies.map((c) => [c.id, c.name]));
      const companyIds = companies.map((c) => c.id);

      // 2) Get won/scheduled kanban columns for those companies
      const { data: columns, error: kErr } = await supabase
        .from("kanban_columns")
        .select("id, name, company_id, is_won")
        .in("company_id", companyIds)
        .eq("is_won", true);
      if (kErr) throw kErr;
      if (!columns || columns.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const columnMap = new Map(columns.map((k) => [k.id, k.name]));
      const columnIds = columns.map((k) => k.id);

      // 3) Get leads in those columns
      const { data: leads, error: lErr } = await supabase
        .from("leads")
        .select("id, name, cpf, cpf_cliente_final, phone, pending_data_warning, created_at, updated_at, company_id, kanban_column_id")
        .in("kanban_column_id", columnIds)
        .order("updated_at", { ascending: false });
      if (lErr) throw lErr;

      const list: ExitoSchedule[] = (leads || []).map((l) => ({
        lead_id: l.id,
        lead_name: l.name,
        cpf_cliente_final: l.cpf_cliente_final,
        cpf: l.cpf,
        phone: l.phone,
        pending_data_warning: l.pending_data_warning,
        created_at: l.created_at,
        updated_at: l.updated_at,
        company_id: l.company_id,
        company_name: companyMap.get(l.company_id) || "—",
        column_name: columnMap.get(l.kanban_column_id!) || "—",
      }));
      setRows(list);
    } catch (err: any) {
      toast.error("Erro ao carregar agendamentos: " + (err?.message || "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.company_id, r.company_name));
    return Array.from(map.entries());
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !search ||
        r.lead_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.cpf_cliente_final?.includes(search) ?? false) ||
        (r.cpf?.includes(search) ?? false) ||
        (r.phone?.includes(search) ?? false);
      const matchCompany = filterCompany === "all" || r.company_id === filterCompany;
      const isPending = !!r.pending_data_warning;
      const matchPending =
        filterPending === "all" ||
        (filterPending === "pending" && isPending) ||
        (filterPending === "complete" && !isPending);
      return matchSearch && matchCompany && matchPending;
    });
  }, [rows, search, filterCompany, filterPending]);

  const exportCsv = () => {
    const header = ["Empresa", "Nome", "Telefone", "Etapa", "Status", "Data"];
    const lines = filtered.map((r) => {
      const status = r.pending_data_warning ? "Pendente" : "Completo";
      return [
        r.company_name,
        r.lead_name,
        r.phone || "",
        r.column_name,
        status,
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
    a.download = `agendamentos-exito-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = rows.filter((r) => r.pending_data_warning).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-warning" />
            Agendamentos por Êxito
          </h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} agendamento{rows.length !== 1 ? "s" : ""} de empresas no modelo Êxito
            {pendingCount > 0 && (
              <span className="ml-2 text-warning">
                · {pendingCount} com dados pendentes
              </span>
            )}
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline" disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[200px]">
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
            <Select value={filterPending} onValueChange={setFilterPending}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pending">⚠️ Pendentes</SelectItem>
                <SelectItem value="complete">✅ Completos</SelectItem>
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
                  <TableHead className="text-muted-foreground">Nome do Cliente</TableHead>
                  
                  <TableHead className="text-muted-foreground">Telefone</TableHead>
                  <TableHead className="text-muted-foreground">Etapa</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      {loading ? "Carregando..." : (
                        <div className="flex flex-col items-center">
                          <Trophy className="mb-2 h-8 w-8" />
                          <p>Nenhum agendamento encontrado</p>
                          <p className="text-xs">Empresas no modelo Êxito ainda não possuem leads em fases de ganho/agendamento</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const cpf = formatCpf(r.cpf_cliente_final || r.cpf);
                    const isPending = !r.cpf_cliente_final || !!r.pending_data_warning;
                    return (
                      <TableRow key={r.lead_id} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-medium text-foreground">{r.company_name}</TableCell>
                        <TableCell className="text-foreground">{r.lead_name}</TableCell>
                        <TableCell className={cpf ? "text-foreground font-mono text-xs" : "text-muted-foreground"}>
                          {cpf || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.phone || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                            {r.column_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                              Completo
                            </Badge>
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

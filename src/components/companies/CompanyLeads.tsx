import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users } from "lucide-react";
import { SourceBadge } from "@/components/leads/SourceBadge";

type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
type CampaignSource = "google" | "meta";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: LeadStatus;
  value: number;
  source: CampaignSource | null;
  created_at: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "Novo", className: "bg-warning/15 text-warning border-warning/30" },
  contacted: { label: "Contatado", className: "bg-info/15 text-info border-info/30" },
  qualified: { label: "Qualificado", className: "bg-primary/15 text-primary border-primary/30" },
  negotiating: { label: "Negociando", className: "bg-info/15 text-info border-info/30" },
  won: { label: "Vendido", className: "bg-success/15 text-success border-success/30" },
  lost: { label: "Perdido", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface CompanyLeadsProps {
  companyId: string;
}

export function CompanyLeads({ companyId }: CompanyLeadsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, [companyId]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (lead.phone?.includes(search) ?? false);
    const matchStatus = filterStatus === "all" || lead.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Leads ({leads.length})
        </h3>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Contato</TableHead>
                  <TableHead className="text-muted-foreground">Origem</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      {loading ? "Carregando..." : (
                        <div className="flex flex-col items-center">
                          <Users className="mb-2 h-8 w-8" />
                          <p>Nenhum lead encontrado</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium text-foreground">{lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.email || lead.phone || lead.whatsapp || "—"}
                      </TableCell>
                      <TableCell>
                        {lead.source ? <SourceBadge source={lead.source} size="md" /> : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[lead.status].className}>
                          {statusConfig[lead.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {lead.value > 0
                          ? `R$ ${Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

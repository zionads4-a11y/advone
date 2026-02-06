import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { KanbanColumnSettings, type KanbanColumn } from "@/components/kanban/KanbanColumnSettings";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  value: number;
  source: string | null;
  company_id: string;
  kanban_column_id: string | null;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

// Default columns used when a company has no custom columns
const DEFAULT_COLUMNS = [
  { name: "Novo", color: "#f59e0b", position: 0, is_won: false, is_lost: false },
  { name: "Contatado", color: "#3b82f6", position: 1, is_won: false, is_lost: false },
  { name: "Qualificado", color: "#8b5cf6", position: 2, is_won: false, is_lost: false },
  { name: "Negociando", color: "#06b6d4", position: 3, is_won: false, is_lost: false },
  { name: "Vendido", color: "#22c55e", position: 4, is_won: true, is_lost: false },
  { name: "Perdido", color: "#ef4444", position: 5, is_won: false, is_lost: true },
];

export default function Kanban() {
  const { userRole } = useAuth();
  const { isClient, filterByCompany, companyIds, loading: companiesLoading } = useUserCompanies();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
    if (!companiesLoading) {
      fetchCompanies();
    }
  }, [companiesLoading]);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchColumnsAndLeads();
    }
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      // Auto-select: for clients, use their company; for admin, use first
      if (isClient && companyIds.length > 0) {
        setSelectedCompanyId(companyIds[0]);
      } else {
        setSelectedCompanyId(data[0].id);
      }
    }
  };

  const fetchColumnsAndLeads = async () => {
    const [columnsRes, leadsRes] = await Promise.all([
      supabase
        .from("kanban_columns")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("position"),
      supabase
        .from("leads")
        .select("id, name, email, phone, value, source, company_id, kanban_column_id, created_at")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false }),
    ]);

    if (columnsRes.data) {
      setKanbanColumns(columnsRes.data as KanbanColumn[]);
    }
    if (leadsRes.data) {
      setLeads(leadsRes.data as Lead[]);
    }
  };

  const initDefaultColumns = async () => {
    for (const col of DEFAULT_COLUMNS) {
      await supabase.from("kanban_columns").insert({
        company_id: selectedCompanyId,
        ...col,
      });
    }
    toast.success("Funil padrão criado!");
    fetchColumnsAndLeads();
  };

  const moveLeadToColumn = async (leadId: string, columnId: string) => {
    const { error } = await supabase.from("leads").update({ kanban_column_id: columnId }).eq("id", leadId);
    if (error) {
      toast.error("Erro ao mover lead");
    } else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, kanban_column_id: columnId } : l)));
      toast.success("Lead movido!");
    }
  };

  const activeColumns = kanbanColumns.length > 0 ? kanbanColumns : [];
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const title = isClient ? "Seus Leads" : "Kanban";
  const subtitle = isClient ? "Acompanhe e atualize o status dos seus leads" : "Gerencie os leads por etapa do funil";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {!isClient && companies.length > 1 && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!isClient && selectedCompanyId && (
            <KanbanColumnSettings
              companyId={selectedCompanyId}
              companyName={selectedCompany?.name || ""}
              columns={kanbanColumns}
              onUpdate={fetchColumnsAndLeads}
            />
          )}
        </div>
      </div>

      {companies.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p>Cadastre uma empresa para começar</p>
          </CardContent>
        </Card>
      ) : activeColumns.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            <p>Esta empresa ainda não tem um funil configurado</p>
            {!isClient && (
              <div className="flex gap-2">
                <button
                  onClick={initDefaultColumns}
                  className="gradient-primary rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                >
                  Criar Funil Padrão
                </button>
                <KanbanColumnSettings
                  companyId={selectedCompanyId}
                  companyName={selectedCompany?.name || ""}
                  columns={[]}
                  onUpdate={fetchColumnsAndLeads}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeColumns.sort((a, b) => a.position - b.position).map((col) => {
            const colLeads = leads.filter((l) => l.kanban_column_id === col.id);
            // Also include leads without a column assigned (show in first column)
            const unassigned = col.position === 0 ? leads.filter((l) => !l.kanban_column_id) : [];
            const allLeads = [...colLeads, ...unassigned];

            return (
              <div key={col.id} className="min-w-[280px] flex-1">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="font-display text-sm font-semibold text-foreground">{col.name}</h3>
                  {col.is_won && <Badge variant="outline" className="text-[10px] border-success/30 text-success">Venda</Badge>}
                  {col.is_lost && <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Perda</Badge>}
                  <Badge variant="secondary" className="ml-auto text-xs">{allLeads.length}</Badge>
                </div>

                <div className="space-y-2">
                  {allLeads.map((lead) => (
                    <Card key={lead.id} className="glass-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
                      <CardContent className="p-3">
                        <div className="mb-2 flex items-start justify-between">
                          <p className="text-sm font-medium text-foreground">{lead.name}</p>
                          {lead.source && (
                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                              {lead.source === "google" ? "Google" : "Meta"}
                            </Badge>
                          )}
                        </div>

                        <div className="mb-3 space-y-1">
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </div>
                          )}
                          {lead.value > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                              <DollarSign className="h-3 w-3" />
                              R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>

                        <Select
                          value={lead.kanban_column_id || ""}
                          onValueChange={(val) => moveLeadToColumn(lead.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Mover para..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeColumns.sort((a, b) => a.position - b.position).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}

                  {allLeads.length === 0 && (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      Nenhum lead
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

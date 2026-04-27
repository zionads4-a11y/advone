import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { KanbanColumnSettings, type KanbanColumn } from "@/components/kanban/KanbanColumnSettings";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { DraggableLeadCard } from "@/components/kanban/DraggableLeadCard";
import { DroppableColumn } from "@/components/kanban/DroppableColumn";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";

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

const DEFAULT_COLUMNS = [
  { name: "Em Atendimento", color: "#f59e0b", position: 0, is_won: false, is_lost: false },
  { name: "1º Follow-UP", color: "#60a5fa", position: 1, is_won: false, is_lost: false },
  { name: "2º Follow-UP", color: "#93c5fd", position: 2, is_won: false, is_lost: false },
  { name: "3º Follow-UP", color: "#a78bfa", position: 3, is_won: false, is_lost: false },
  { name: "4º Follow-UP", color: "#c084fc", position: 4, is_won: false, is_lost: false },
  { name: "5º Follow-UP", color: "#d8b4fe", position: 5, is_won: false, is_lost: false },
  { name: "Agendado", color: "#10b981", position: 6, is_won: false, is_lost: false },
  { name: "Ganho", color: "#22c55e", position: 7, is_won: true, is_lost: false },
  { name: "Perdido", color: "#ef4444", position: 8, is_won: false, is_lost: true },
];

export default function Kanban() {
  const { userRole } = useAuth();
  const { isClient, companyIds, loading: companiesLoading } = useUserCompanies();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => {
    if (!companiesLoading) fetchCompanies();
  }, [companiesLoading]);

  useEffect(() => {
    if (selectedCompanyId) fetchColumnsAndLeads();
  }, [selectedCompanyId]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data && data.length > 0) {
      setCompanies(data);
      if (isClient && companyIds.length > 0) {
        setSelectedCompanyId(companyIds[0]);
      } else {
        setSelectedCompanyId(data[0].id);
      }
    }
  };

  const fetchColumnsAndLeads = async () => {
    const [columnsRes, leadsRes] = await Promise.all([
      supabase.from("kanban_columns").select("*").eq("company_id", selectedCompanyId).order("position"),
      supabase.from("leads").select("*").eq("company_id", selectedCompanyId).order("created_at", { ascending: false }),
    ]);
    if (columnsRes.data) setKanbanColumns(columnsRes.data as KanbanColumn[]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
  };

  const initDefaultColumns = async () => {
    for (const col of DEFAULT_COLUMNS) {
      await supabase.from("kanban_columns").insert({ company_id: selectedCompanyId, ...col });
    }
    toast.success("Funil padrão criado!");
    fetchColumnsAndLeads();
  };

  const moveLeadToColumn = useCallback(async (leadId: string, columnId: string) => {
    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, kanban_column_id: columnId } : l)));
    const { error } = await supabase.from("leads").update({ kanban_column_id: columnId }).eq("id", leadId);
    if (error) {
      toast.error("Erro ao mover lead");
      fetchColumnsAndLeads(); // Revert
    }
  }, []);

  const sortedColumns = useMemo(() => [...kanbanColumns].sort((a, b) => a.position - b.position), [kanbanColumns]);
  const filteredLeads = useMemo(() => filterSource === "all" ? leads : leads.filter((l) => l.source === filterSource), [leads, filterSource]);

  const getColumnIdForLead = (lead: Lead): string | null => {
    if (lead.kanban_column_id) return lead.kanban_column_id;
    return sortedColumns[0]?.id || null;
  };

  const getLeadsForColumn = (colId: string, colPosition: number) => {
    const colLeads = filteredLeads.filter((l) => l.kanban_column_id === colId);
    const unassigned = colPosition === 0 ? filteredLeads.filter((l) => !l.kanban_column_id) : [];
    return [...colLeads, ...unassigned];
  };

  // --- Drag handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveDragLead(lead);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    // Determine target column
    const overData = over.data?.current;
    if (overData?.type === "column") {
      setOverColumnId(overData.columnId);
    } else if (overData?.type === "lead") {
      // Hovering over another lead card — find its column
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) {
        setOverColumnId(getColumnIdForLead(overLead));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragLead(null);
    setOverColumnId(null);

    if (!over) return;

    const leadId = active.id as string;
    let targetColumnId: string | null = null;

    const overData = over.data?.current;
    if (overData?.type === "column") {
      targetColumnId = overData.columnId;
    } else if (overData?.type === "lead") {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) {
        targetColumnId = getColumnIdForLead(overLead);
      }
    }

    if (!targetColumnId) return;

    const currentLead = leads.find((l) => l.id === leadId);
    const currentColumnId = currentLead ? getColumnIdForLead(currentLead) : null;

    if (targetColumnId !== currentColumnId) {
      moveLeadToColumn(leadId, targetColumnId);
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const title = isClient ? "Seus Leads" : "Kanban";
  const subtitle = isClient ? "Acompanhe e atualize o status dos seus leads" : "Arraste os leads entre as etapas do funil";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Filter className="mr-2 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Origens</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
              <SelectItem value="meta">Meta Ads</SelectItem>
            </SelectContent>
          </Select>
          {!isClient && companies.length > 1 && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
      ) : sortedColumns.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            <p>Esta empresa ainda não tem um funil configurado</p>
            {!isClient && (
              <div className="flex gap-2">
                <button onClick={initDefaultColumns} className="gradient-primary rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
                  Criar Funil Padrão
                </button>
                <KanbanColumnSettings companyId={selectedCompanyId} companyName={selectedCompany?.name || ""} columns={[]} onUpdate={fetchColumnsAndLeads} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {sortedColumns.map((col) => {
              const colLeads = getLeadsForColumn(col.id, col.position);
              return (
                <DroppableColumn
                  key={col.id}
                  column={col}
                  leadIds={colLeads.map((l) => l.id)}
                  isOver={overColumnId === col.id}
                >
                  {colLeads.map((lead) => (
                    <DraggableLeadCard
                      key={lead.id}
                      lead={lead}
                      isInMeetingHeld={(col as any).is_meeting_held === true}
                      onClick={() => {
                        setSelectedLead(lead);
                        setDrawerOpen(true);
                      }}
                      onValueUpdate={(leadId, newValue) => {
                        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, value: newValue } : l));
                      }}
                    />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activeDragLead ? <DraggableLeadCard lead={activeDragLead} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onLeadUpdate={fetchColumnsAndLeads}
      />
    </div>
  );
}

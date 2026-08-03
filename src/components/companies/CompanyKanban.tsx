import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import { KanbanColumnSettings, type KanbanColumn } from "@/components/kanban/KanbanColumnSettings";
import { DraggableLeadCard } from "@/components/kanban/DraggableLeadCard";
import { DroppableColumn } from "@/components/kanban/DroppableColumn";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { WonHandoffDialog } from "@/components/kanban/WonHandoffDialog";
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
  whatsapp: string | null;
  status: "new" | "contacted" | "qualified" | "negotiating" | "won" | "lost";
  assigned_to: string | null;
  lead_score: string | null;
  pending_data_warning: string | null;
  bot_disabled: boolean;
  processo_numero: string | null;
  cpf: string | null;
  processo_valor: number | null;
}

const DEFAULT_COLUMNS = [
  { name: "Em Atendimento", color: "#f59e0b", position: 0, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "1º Follow-UP", color: "#60a5fa", position: 1, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "2º Follow-UP", color: "#93c5fd", position: 2, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "3º Follow-UP", color: "#a78bfa", position: 3, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "4º Follow-UP", color: "#c084fc", position: 4, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "5º Follow-UP", color: "#d8b4fe", position: 5, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "Agendado", color: "#10b981", position: 6, is_won: false, is_lost: false, is_meeting_held: false },
  { name: "Reunião Realizada", color: "#14b8a6", position: 7, is_won: false, is_lost: false, is_meeting_held: true },
  { name: "Ganho", color: "#22c55e", position: 8, is_won: true, is_lost: false, is_meeting_held: false },
  { name: "Perdido", color: "#ef4444", position: 9, is_won: false, is_lost: true, is_meeting_held: false },
];

interface CompanyKanbanProps {
  companyId: string;
  companyName: string;
}

interface Board {
  id: string;
  name: string;
  is_default: boolean;
  position: number;
}

export function CompanyKanban({ companyId, companyName }: CompanyKanbanProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [boardId, setBoardId] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wonHandoff, setWonHandoff] = useState<{ lead: Lead; columnId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => {
    fetchColumnsAndLeads();
  }, [companyId]);

  const getOrCreateDefaultBoard = async () => {
    const { data: boards, error } = await supabase
      .from("kanban_boards")
      .select("id, name, is_default, position")
      .eq("company_id", companyId)
      .order("position");

    if (error) {
      toast.error("Erro ao carregar quadro", { description: error.message });
      return "";
    }

    const existing = ((boards || []) as Board[]).find((b) => b.is_default) || ((boards || []) as Board[])[0];
    if (existing) return existing.id;

    const { data, error: createError } = await supabase
      .from("kanban_boards")
      .insert({
        company_id: companyId,
        name: "Pipeline Comercial",
        description: "Funil principal de leads",
        color: "#0ea5a4",
        is_default: true,
        position: 0,
      })
      .select("id")
      .single();

    if (createError) {
      toast.error("Erro ao criar quadro", { description: createError.message });
      return "";
    }

    return data.id;
  };

  const fetchColumnsAndLeads = async () => {
    const currentBoardId = await getOrCreateDefaultBoard();
    setBoardId(currentBoardId);

    const [columnsRes, leadsRes] = await Promise.all([
      currentBoardId
        ? supabase.from("kanban_columns").select("*").eq("company_id", companyId).eq("board_id", currentBoardId).order("position")
        : Promise.resolve({ data: [], error: null }),
      supabase.from("leads").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    if (columnsRes.data) setKanbanColumns(columnsRes.data as KanbanColumn[]);
    if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
  };

  const initDefaultColumns = async () => {
    const currentBoardId = boardId || await getOrCreateDefaultBoard();
    if (!currentBoardId) return;

    for (const col of DEFAULT_COLUMNS) {
      const { error } = await supabase.from("kanban_columns").insert({ company_id: companyId, board_id: currentBoardId, ...col });
      if (error) {
        toast.error("Erro ao criar funil padrão", { description: error.message });
        return;
      }
    }
    toast.success("Funil padrão criado!");
    fetchColumnsAndLeads();
  };

  const moveLeadToColumn = useCallback(async (leadId: string, columnId: string) => {
    const targetColumn = kanbanColumns.find((column) => column.id === columnId);
    if (targetColumn?.is_won) {
      const lead = leads.find((item) => item.id === leadId);
      if (lead) setWonHandoff({ lead, columnId });
      return;
    }

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, kanban_column_id: columnId } : l)));
    const { error } = await supabase.from("leads").update({ kanban_column_id: columnId }).eq("id", leadId);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("CPF_REQUIRED")) {
        toast.error("Cadastre o CPF do cliente antes de mover para Ganho.");
      } else if (msg.includes("CONTRACT_REQUIRED")) {
        toast.error("Registre o contrato assinado (aba Contrato do lead) antes de mover para Ganho.");
      } else {
        toast.error(msg || "Erro ao mover lead");
      }
      fetchColumnsAndLeads();
    }
  }, [kanbanColumns, leads]);

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

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveDragLead(lead);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumnId(null); return; }
    const overData = over.data?.current;
    if (overData?.type === "column") {
      setOverColumnId(overData.columnId);
    } else if (overData?.type === "lead") {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) setOverColumnId(getColumnIdForLead(overLead));
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
      if (overLead) targetColumnId = getColumnIdForLead(overLead);
    }
    if (!targetColumnId) return;

    const currentLead = leads.find((l) => l.id === leadId);
    const currentColumnId = currentLead ? getColumnIdForLead(currentLead) : null;
    if (targetColumnId !== currentColumnId) {
      moveLeadToColumn(leadId, targetColumnId);
    }
  };

  if (kanbanColumns.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
          <p>Esta empresa ainda não tem um funil configurado</p>
          <div className="flex gap-2">
            <button onClick={initDefaultColumns} className="gradient-primary rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
              Criar Funil Padrão
            </button>
            <KanbanColumnSettings companyId={companyId} companyName={companyName} boardId={boardId} columns={[]} onUpdate={fetchColumnsAndLeads} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Kanban</h3>
        <div className="flex items-center gap-2">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Origens</SelectItem>
              <SelectItem value="google">Google Ads</SelectItem>
              <SelectItem value="meta">Meta Ads</SelectItem>
            </SelectContent>
          </Select>
          <KanbanColumnSettings companyId={companyId} companyName={companyName} boardId={boardId} columns={kanbanColumns} onUpdate={fetchColumnsAndLeads} />
        </div>
      </div>

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
              <DroppableColumn key={col.id} column={col} leadIds={colLeads.map((l) => l.id)} isOver={overColumnId === col.id}>
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
                      setLeads((prev) => prev.map((item) => item.id === leadId ? { ...item, value: newValue } : item));
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

      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onLeadUpdate={fetchColumnsAndLeads}
      />

      {wonHandoff && (
        <WonHandoffDialog
          open={!!wonHandoff}
          onOpenChange={(open) => !open && setWonHandoff(null)}
          leadId={wonHandoff.lead.id}
          leadName={wonHandoff.lead.name}
          companyId={wonHandoff.lead.company_id}
          targetColumnId={wonHandoff.columnId}
          onCompleted={() => {
            setWonHandoff(null);
            fetchColumnsAndLeads();
          }}
        />
      )}
    </div>
  );
}

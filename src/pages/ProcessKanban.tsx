import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Scale, Plus, Loader2, Trash2, Pencil, Users, GripVertical, Briefcase,
  Calendar, AlertTriangle, ChevronRight, UserPlus, X, Activity, CheckCircle2, Clock, FileText, MessageSquare, Upload,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AREA_COLORS = ["#0ea5a4", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#8b5cf6", "#f97316"];
const AREA_ICONS = ["⚖️", "👷", "🏛️", "👨‍👩‍👧", "🚨", "💰", "🏢", "👴", "🛒"];
const COLUMN_COLORS = ["#94a3b8", "#60a5fa", "#a78bfa", "#f59e0b", "#10b981", "#22c55e", "#ef4444", "#0ea5a4"];

// Templates de área para one-click
const AREA_PRESETS = [
  { name: "Previdenciário", icon: "👴", color: "#0ea5a4" },
  { name: "Trabalhista", icon: "👷", color: "#f59e0b" },
  { name: "Cível / Consumidor", icon: "🏛️", color: "#3b82f6" },
  { name: "Família", icon: "👨‍👩‍👧", color: "#ec4899" },
  { name: "Criminal", icon: "🚨", color: "#ef4444" },
  { name: "Tributário", icon: "💰", color: "#10b981" },
  { name: "Empresarial", icon: "🏢", color: "#8b5cf6" },
];

// -------- HEALTH (movimentação semanal) --------
function getWeekStartBRT(): Date {
  // Monday 00:00 in America/Sao_Paulo, expressed in UTC
  const nowBrt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const day = nowBrt.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(nowBrt);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function getCardHealth(card: ProcessCard, weekCount: number): {
  level: "green" | "yellow" | "red"; label: string; days: number;
} {
  const last = card.last_activity_at ? new Date(card.last_activity_at) : null;
  const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : 99;
  const target = card.weekly_target || 1;
  if (weekCount >= target && days <= 4) return { level: "green", label: "Em dia", days };
  if (days >= 7 || (weekCount < target && new Date().getDay() >= 5)) return { level: "red", label: "Parado", days };
  return { level: "yellow", label: "Atenção", days };
}
const HEALTH_COLORS = {
  green: { bg: "bg-emerald-500", ring: "border-l-emerald-500", text: "text-emerald-600", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  yellow: { bg: "bg-amber-500", ring: "border-l-amber-500", text: "text-amber-600", chip: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  red: { bg: "bg-red-500 animate-pulse", ring: "border-l-red-500", text: "text-red-600", chip: "bg-red-500/10 text-red-700 border-red-500/30" },
};

const ACTIVITY_TYPES = [
  { value: "daily_check", label: "Consulta ao andamento", icon: "🔍" },
  { value: "petition_filed", label: "Petição protocolada", icon: "📝" },
  { value: "client_contact", label: "Contato com cliente", icon: "📞" },
  { value: "internal_meeting", label: "Reunião interna", icon: "👥" },
  { value: "waiting_deadline", label: "Aguardando prazo", icon: "⏳" },
  { value: "other", label: "Outro", icon: "✏️" },
];


interface LegalArea { id: string; name: string; color: string; icon: string | null; position: number; is_active: boolean; }
interface Board { id: string; legal_area_id: string; name: string; description: string | null; color: string; position: number; is_default: boolean; }
interface Column { id: string; board_id: string; name: string; color: string; position: number; stage_type: string; }
interface ProcessCard {
  id: string; board_id: string; column_id: string | null; cnj_number: string | null;
  client_name: string | null; court: string | null; title: string | null; description: string | null;
  responsible_id: string | null; priority: string; next_deadline_at: string | null;
  next_deadline_label: string | null; last_movement_at: string | null; last_movement_text: string | null;
  last_activity_at: string | null; last_activity_type: string | null; weekly_target: number;
  position: number;
}
interface CardActivity {
  id: string; card_id: string; actor_id: string | null; activity_type: string;
  message: string | null; metadata: any; created_at: string;
  from_column_id?: string | null; to_column_id?: string | null;
}
interface Member { user_id: string; full_name: string | null; email: string | null; }
interface TeamRow { id: string; card_id: string; user_id: string; role_on_card: string; }

interface CompanyLite { id: string; name: string; }

export default function ProcessKanban() {
  const { user } = useAuth();
  const { companyIds, isClient } = useUserCompanies();

  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<ProcessCard[]>([]);
  const [teamRows, setTeamRows] = useState<TeamRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [openedCard, setOpenedCard] = useState<ProcessCard | null>(null);
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [cardActivities, setCardActivities] = useState<CardActivity[]>([]);
  const [onlyStale, setOnlyStale] = useState(false);

  const [activeDrag, setActiveDrag] = useState<ProcessCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load companies list (admin/member = all; gerente/operador = only theirs)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name");
      const list = (data || []) as CompanyLite[];
      const filtered = isClient ? list.filter(c => companyIds.includes(c.id)) : list;
      setCompanies(filtered);
      setCompanyId((cur) => cur || filtered[0]?.id || "");
    })();
  }, [user, isClient, companyIds]);

  const loadAll = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const [aRes, bRes, cRes, cardsRes, teamRes, membersRes] = await Promise.all([
      supabase.from("legal_areas").select("*").eq("company_id", companyId).order("position"),
      supabase.from("process_boards").select("*").eq("company_id", companyId).order("position"),
      supabase.from("process_board_columns").select("*").eq("company_id", companyId).order("position"),
      supabase.from("process_cards").select("*").eq("company_id", companyId).order("position"),
      supabase.from("process_card_team").select("id,card_id,user_id,role_on_card").eq("company_id", companyId),
      supabase.from("client_companies").select("user_id, profiles:profiles!inner(user_id, full_name, email)").eq("company_id", companyId),
    ]);
    if (aRes.data) setAreas(aRes.data as LegalArea[]);
    if (bRes.data) setBoards(bRes.data as Board[]);
    if (cRes.data) setColumns(cRes.data as Column[]);
    if (cardsRes.data) setCards(cardsRes.data as ProcessCard[]);
    if (teamRes.data) setTeamRows(teamRes.data as TeamRow[]);
    if (membersRes.data) {
      const m = (membersRes.data as any[]).map((r) => ({
        user_id: r.user_id, full_name: r.profiles?.full_name, email: r.profiles?.email,
      }));
      setMembers(m);
    }
    setLoading(false);

    // load weekly activity counts (Mon-Sun BRT)
    const weekStart = getWeekStartBRT().toISOString();
    const { data: acts } = await supabase
      .from("process_card_activity")
      .select("card_id")
      .eq("company_id", companyId)
      .gte("created_at", weekStart);
    if (acts) {
      const counts: Record<string, number> = {};
      (acts as any[]).forEach(a => { counts[a.card_id] = (counts[a.card_id] || 0) + 1; });
      setWeekCounts(counts);
    }
  }, [companyId]);

  // Load activities for opened card
  useEffect(() => {
    if (!openedCard) { setCardActivities([]); return; }
    (async () => {
      const { data } = await supabase
        .from("process_card_activity")
        .select("*")
        .eq("card_id", openedCard.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setCardActivities((data || []) as CardActivity[]);
    })();
  }, [openedCard?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!selectedAreaId && areas.length) setSelectedAreaId(areas[0].id);
  }, [areas, selectedAreaId]);

  const areaBoards = useMemo(() => boards.filter(b => b.legal_area_id === selectedAreaId).sort((a,b) => a.position - b.position), [boards, selectedAreaId]);
  useEffect(() => {
    if (!areaBoards.find(b => b.id === selectedBoardId)) {
      setSelectedBoardId(areaBoards[0]?.id ?? null);
    }
  }, [areaBoards, selectedBoardId]);

  const boardColumns = useMemo(() => columns.filter(c => c.board_id === selectedBoardId).sort((a,b) => a.position - b.position), [columns, selectedBoardId]);
  const boardCards = useMemo(() => {
    const all = cards.filter(c => c.board_id === selectedBoardId);
    if (!onlyStale) return all;
    return all.filter(c => getCardHealth(c, weekCounts[c.id] || 0).level !== "green");
  }, [cards, selectedBoardId, onlyStale, weekCounts]);
  const staleCount = useMemo(
    () => cards.filter(c => c.board_id === selectedBoardId && getCardHealth(c, weekCounts[c.id] || 0).level !== "green").length,
    [cards, selectedBoardId, weekCounts]
  );

  const memberById = useMemo(() => Object.fromEntries(members.map(m => [m.user_id, m])), [members]);
  const teamByCard = useMemo(() => {
    const map: Record<string, TeamRow[]> = {};
    teamRows.forEach(t => { (map[t.card_id] ??= []).push(t); });
    return map;
  }, [teamRows]);

  // ------- CREATE HELPERS -------
  const createArea = async (name: string, color: string, icon: string) => {
    if (!companyId || !user) return;
    const { data, error } = await supabase.from("legal_areas").insert({
      company_id: companyId, name, color, icon, position: areas.length, created_by: user.id,
    }).select().single();
    if (error) return toast.error("Erro ao criar área", { description: error.message });
    setAreas(prev => [...prev, data as LegalArea]);
    setSelectedAreaId((data as LegalArea).id);
    toast.success("Área criada");
  };

  const createBoard = async (name: string, description: string, color: string) => {
    if (!companyId || !user || !selectedAreaId) return;
    if (areaBoards.length > 0) {
      return toast.error("Esta área já tem um funil", { description: "Cada setor pode ter apenas 1 quadro. Edite as colunas do funil existente." });
    }
    const { data, error } = await supabase.from("process_boards").insert({
      company_id: companyId, legal_area_id: selectedAreaId, name, description, color,
      position: areaBoards.length, created_by: user.id, is_default: true,
    }).select().single();
    if (error) return toast.error("Erro ao criar quadro", { description: error.message });
    setBoards(prev => [...prev, data as Board]);
    setSelectedBoardId((data as Board).id);
    toast.success("Funil criado para esta área");
  };

  const createColumn = async (name: string, color: string, stage_type: string) => {
    if (!companyId || !selectedBoardId) return;
    const { data, error } = await supabase.from("process_board_columns").insert({
      company_id: companyId, board_id: selectedBoardId, name, color, stage_type,
      position: boardColumns.length,
    }).select().single();
    if (error) return toast.error("Erro ao criar coluna", { description: error.message });
    setColumns(prev => [...prev, data as Column]);
    toast.success("Coluna criada");
  };

  const removeColumn = async (col: Column) => {
    if (!confirm(`Excluir coluna "${col.name}"? Cards ficarão sem coluna.`)) return;
    const { error } = await supabase.from("process_board_columns").delete().eq("id", col.id);
    if (error) return toast.error(error.message);
    setColumns(prev => prev.filter(c => c.id !== col.id));
    toast.success("Coluna excluída");
  };

  const removeBoard = async (b: Board) => {
    if (!confirm(`Excluir quadro "${b.name}"? Todas as colunas e cards vinculados serão removidos.`)) return;
    const { error } = await supabase.from("process_boards").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    await loadAll();
  };

  const removeArea = async (a: LegalArea) => {
    if (!confirm(`Excluir a área "${a.name}"? Todos os quadros dela serão removidos.`)) return;
    const { error } = await supabase.from("legal_areas").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    await loadAll();
  };

  // ------- CARD OPS -------
  const createCard = async (payload: Partial<ProcessCard>) => {
    if (!companyId || !user || !selectedBoardId) return;
    const firstCol = boardColumns[0];
    const { data, error } = await supabase.from("process_cards").insert({
      company_id: companyId, board_id: selectedBoardId, column_id: firstCol?.id ?? null,
      created_by: user.id, position: boardCards.length,
      cnj_number: payload.cnj_number || null,
      client_name: payload.client_name || null,
      court: payload.court || null,
      title: payload.title || null,
      description: payload.description || null,
      responsible_id: payload.responsible_id || null,
      priority: payload.priority || "normal",
    }).select().single();
    if (error) return toast.error("Erro ao criar card", { description: error.message });
    const newCard = data as ProcessCard;
    setCards(prev => [...prev, newCard]);
    if (newCard.responsible_id) {
      await supabase.from("process_card_team").insert({
        card_id: newCard.id, company_id: companyId, user_id: newCard.responsible_id,
        role_on_card: "responsavel", added_by: user.id,
      });
      await loadAll();
    }
    toast.success("Processo adicionado");
  };

  const moveCard = async (cardId: string, targetColumnId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: targetColumnId } : c));
    const { error } = await supabase.from("process_cards").update({ column_id: targetColumnId }).eq("id", cardId);
    if (error) { toast.error(error.message); loadAll(); }
  };

  const updateCard = async (cardId: string, patch: Partial<ProcessCard>) => {
    const { error } = await supabase.from("process_cards").update(patch).eq("id", cardId);
    if (error) return toast.error(error.message);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...patch } as ProcessCard : c));
    if (openedCard?.id === cardId) setOpenedCard(prev => prev ? { ...prev, ...patch } as ProcessCard : prev);
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm("Excluir este processo do quadro?")) return;
    const { error } = await supabase.from("process_cards").delete().eq("id", cardId);
    if (error) return toast.error(error.message);
    setCards(prev => prev.filter(c => c.id !== cardId));
    setOpenedCard(null);
    toast.success("Processo excluído");
  };

  const addTeamMember = async (cardId: string, userId: string, role: string) => {
    if (!companyId || !user) return;
    const { error } = await supabase.from("process_card_team").insert({
      card_id: cardId, company_id: companyId, user_id: userId, role_on_card: role, added_by: user.id,
    });
    if (error) return toast.error(error.message);
    await loadAll();
  };
  const removeTeamMember = async (rowId: string) => {
    const { error } = await supabase.from("process_card_team").delete().eq("id", rowId);
    if (error) return toast.error(error.message);
    setTeamRows(prev => prev.filter(t => t.id !== rowId));
  };

  const logActivity = async (cardId: string, activityType: string, message: string) => {
    if (!companyId || !user) return;
    const { data, error } = await supabase.from("process_card_activity").insert({
      card_id: cardId, company_id: companyId, actor_id: user.id,
      activity_type: activityType, message: message || null,
    }).select().single();
    if (error) return toast.error("Erro ao registrar", { description: error.message });
    const now = new Date().toISOString();
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, last_activity_at: now, last_activity_type: activityType } : c));
    setWeekCounts(prev => ({ ...prev, [cardId]: (prev[cardId] || 0) + 1 }));
    setCardActivities(prev => [data as CardActivity, ...prev]);
    toast.success("Registro adicionado ao diário");
  };


  // ------- DND -------
  const handleDragStart = (e: DragStartEvent) => {
    const c = cards.find(x => x.id === e.active.id);
    if (c) setActiveDrag(c);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const overData = over.data?.current as any;
    let colId: string | null = null;
    if (overData?.type === "column") colId = overData.columnId;
    else if (overData?.type === "card") {
      const c = cards.find(x => x.id === over.id);
      colId = c?.column_id ?? null;
    }
    if (!colId) return;
    const cur = cards.find(x => x.id === active.id);
    if (cur && cur.column_id !== colId) moveCard(active.id as string, colId);
  };

  if (!companyId) return <div className="p-8 text-muted-foreground">Nenhuma empresa disponível.</div>;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const selectedBoard = areaBoards.find(b => b.id === selectedBoardId);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 lg:flex-row">
      {/* SIDEBAR ÁREAS */}
      <div className="w-full shrink-0 rounded-lg border bg-card p-3 lg:w-64">
        {companies.length > 1 && (
          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Empresa</label>
            <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setSelectedAreaId(null); setSelectedBoardId(null); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {companies.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Scale className="h-4 w-4 text-primary" /> Áreas
          </h3>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAreaDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {areas.length === 0 && (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Nenhuma área ainda. Crie a primeira!
            </div>
          )}
          {areas.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAreaId(a.id)}
              className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                selectedAreaId === a.id ? "bg-primary/10 font-medium text-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="text-base">{a.icon || "⚖️"}</span>
              <span className="flex-1 truncate">{a.name}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
              <Trash2
                className="h-3.5 w-3.5 opacity-0 text-muted-foreground hover:text-destructive group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); removeArea(a); }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {!selectedArea ? (
          <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">
            Crie ou selecione uma área jurídica para começar.
          </CardContent></Card>
        ) : (
          <>
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2 text-xl font-bold">
                  <span>{selectedArea.icon}</span> {selectedArea.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gestão de processos • {areaBoards.length} quadro(s) • {boardCards.length} processo(s) no quadro atual
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedBoard && (
                  <label className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs cursor-pointer transition ${onlyStale ? "border-red-500/40 bg-red-500/5 text-red-700" : "hover:bg-muted"}`}>
                    <Switch checked={onlyStale} onCheckedChange={setOnlyStale} />
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Só parados {staleCount > 0 && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{staleCount}</Badge>}
                  </label>
                )}
                {areaBoards.length === 0 && (
                  <Button size="sm" variant="outline" onClick={() => setBoardDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Criar funil desta área
                  </Button>
                )}
                {selectedBoard && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setColumnDialogOpen(true)}>
                      <Plus className="mr-1 h-4 w-4" /> Nova coluna
                    </Button>
                    <Button size="sm" onClick={() => setCardDialogOpen(true)}>
                      <Briefcase className="mr-1 h-4 w-4" /> Novo processo
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs de quadros */}
            {areaBoards.length > 0 ? (
              <Tabs value={selectedBoardId ?? ""} onValueChange={setSelectedBoardId}>
                <TabsList className="w-fit">
                  {areaBoards.map(b => (
                    <TabsTrigger key={b.id} value={b.id} className="group relative">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: b.color }} />
                      {b.name}
                      <X
                        className="ml-2 h-3 w-3 opacity-0 hover:text-destructive group-hover:opacity-70"
                        onClick={(e) => { e.stopPropagation(); removeBoard(b); }}
                      />
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                Esta área ainda não tem funil. Clique em "Criar funil desta área" — cada setor terá seu próprio quadro isolado.
              </CardContent></Card>
            )}

            {/* Kanban */}
            {selectedBoard && (
              boardColumns.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Adicione colunas para montar o fluxo (ex.: "Inicial", "Instrução", "Sentença", "Arquivado").
                </CardContent></Card>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  <div className="flex flex-1 gap-3 overflow-x-auto pb-3">
                    {boardColumns.map(col => {
                      const colCards = boardCards.filter(c => c.column_id === col.id);
                      return (
                        <KanbanColumn key={col.id} column={col} cards={colCards}
                          onRemoveColumn={() => removeColumn(col)}
                          onOpenCard={setOpenedCard}
                          memberById={memberById}
                          teamByCard={teamByCard}
                          weekCounts={weekCounts}
                        />
                      );
                    })}
                  </div>
                  <DragOverlay>
                    {activeDrag && <ProcessCardView card={activeDrag} memberById={memberById} teamByCard={teamByCard} weekCount={weekCounts[activeDrag.id] || 0} isDragOverlay />}
                  </DragOverlay>
                </DndContext>
              )
            )}
          </>
        )}
      </div>

      {/* DIALOGS */}
      <AreaDialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen} onCreate={createArea} existingNames={areas.map(a => a.name)} />
      <BoardDialog open={boardDialogOpen} onOpenChange={setBoardDialogOpen} onCreate={createBoard} />
      <ColumnDialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen} onCreate={createColumn} />
      <CardCreateDialog open={cardDialogOpen} onOpenChange={setCardDialogOpen} onCreate={createCard} members={members} />

      <CardDrawer
        card={openedCard} onClose={() => setOpenedCard(null)}
        members={members} teamRows={openedCard ? (teamByCard[openedCard.id] ?? []) : []}
        memberById={memberById}
        onUpdate={updateCard} onDelete={deleteCard}
        onAddMember={addTeamMember} onRemoveMember={removeTeamMember}
        activities={cardActivities}
        weekCount={openedCard ? (weekCounts[openedCard.id] || 0) : 0}
        onLogActivity={logActivity}
      />
    </div>
  );
}

// ============ KANBAN COLUMN ============
function KanbanColumn({ column, cards, onRemoveColumn, onOpenCard, memberById, teamByCard, weekCounts }: {
  column: Column; cards: ProcessCard[]; onRemoveColumn: () => void;
  onOpenCard: (c: ProcessCard) => void;
  memberById: Record<string, Member>; teamByCard: Record<string, TeamRow[]>;
  weekCounts: Record<string, number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}`, data: { type: "column", columnId: column.id } });
  return (
    <div className="flex min-w-[300px] flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 rounded-t-md border-b-2 px-2 py-1.5" style={{ borderColor: column.color }}>
        <div className="h-2 w-2 rounded-full" style={{ background: column.color }} />
        <h4 className="flex-1 text-sm font-semibold">{column.name}</h4>
        <Badge variant="secondary" className="text-xs">{cards.length}</Badge>
        <Trash2 className="h-3.5 w-3.5 cursor-pointer text-muted-foreground hover:text-destructive" onClick={onRemoveColumn} />
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-md p-1 transition-colors ${isOver ? "bg-primary/10 ring-2 ring-primary/30" : ""}`}>
          {cards.map(c => (
            <SortableCard key={c.id} card={c} onOpenCard={() => onOpenCard(c)} memberById={memberById} teamByCard={teamByCard} weekCount={weekCounts[c.id] || 0} />
          ))}
          {cards.length === 0 && (
            <div className="flex h-20 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
              Arraste processos aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ card, onOpenCard, memberById, teamByCard, weekCount }: {
  card: ProcessCard; onOpenCard: () => void;
  memberById: Record<string, Member>; teamByCard: Record<string, TeamRow[]>;
  weekCount: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: "card" } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onOpenCard}>
      <ProcessCardView card={card} memberById={memberById} teamByCard={teamByCard} weekCount={weekCount} />
    </div>
  );
}

function ProcessCardView({ card, memberById, teamByCard, weekCount = 0, isDragOverlay }: {
  card: ProcessCard; memberById: Record<string, Member>; teamByCard: Record<string, TeamRow[]>;
  weekCount?: number; isDragOverlay?: boolean;
}) {
  const responsible = card.responsible_id ? memberById[card.responsible_id] : null;
  const team = teamByCard[card.id] ?? [];
  const others = team.filter(t => t.user_id !== card.responsible_id).slice(0, 3);
  const priorityColor = card.priority === "urgente" ? "bg-red-500" : card.priority === "alta" ? "bg-orange-500" : card.priority === "baixa" ? "bg-slate-400" : "bg-blue-500";
  const health = getCardHealth(card, weekCount);
  const hc = HEALTH_COLORS[health.level];
  return (
    <Card className={`cursor-pointer border-l-4 transition hover:shadow-md ${hc.ring} ${isDragOverlay ? "shadow-lg" : ""}`}>
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{card.title || card.client_name || "Sem título"}</div>
            {card.cnj_number && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{card.cnj_number}</div>}
          </div>
          <span className={`h-2 w-2 shrink-0 rounded-full ${priorityColor}`} title={`Prioridade: ${card.priority}`} />
        </div>
        <div className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10px] ${hc.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${hc.bg}`} />
          <Activity className="h-3 w-3" />
          <span className="font-medium">{health.label}</span>
          <span className="opacity-70">
            • {card.last_activity_at ? `${health.days}d sem mexer` : "sem histórico"} • {weekCount}/{card.weekly_target || 1} semana
          </span>
        </div>
        {card.client_name && card.title && (
          <div className="truncate text-xs text-muted-foreground">👤 {card.client_name}</div>
        )}
        {card.court && <div className="truncate text-xs text-muted-foreground">🏛️ {card.court}</div>}
        {card.last_movement_text && (
          <div className="line-clamp-2 rounded bg-muted/50 px-1.5 py-1 text-[11px] text-muted-foreground">
            📡 {card.last_movement_text}
          </div>
        )}
        {card.next_deadline_at && (
          <div className="flex items-center gap-1 text-[11px] text-orange-600">
            <Calendar className="h-3 w-3" />
            {format(new Date(card.next_deadline_at), "dd/MM/yy", { locale: ptBR })}
            {card.next_deadline_label && ` • ${card.next_deadline_label}`}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-2">
            {responsible && (
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                  {(responsible.full_name || responsible.email || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            {others.map(t => {
              const m = memberById[t.user_id];
              return (
                <Avatar key={t.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="bg-muted text-[10px]">
                    {(m?.full_name || m?.email || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {team.length > (responsible ? 4 : 3) && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                +{team.length - (responsible ? 4 : 3)}
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============ DIALOGS ============
function AreaDialog({ open, onOpenChange, onCreate, existingNames }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (name: string, color: string, icon: string) => Promise<any>;
  existingNames: string[];
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(AREA_COLORS[0]);
  const [icon, setIcon] = useState(AREA_ICONS[0]);
  const [saving, setSaving] = useState(false);

  const remainingPresets = AREA_PRESETS.filter(p => !existingNames.includes(p.name));

  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    await onCreate(name.trim(), color, icon);
    setSaving(false);
    setName(""); setColor(AREA_COLORS[0]); setIcon(AREA_ICONS[0]);
    onOpenChange(false);
  };

  const quickCreate = async (preset: typeof AREA_PRESETS[0]) => {
    setSaving(true);
    await onCreate(preset.name, preset.color, preset.icon);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova área jurídica</DialogTitle>
          <DialogDescription>Crie de forma rápida a partir de uma área comum ou personalize.</DialogDescription>
        </DialogHeader>
        {remainingPresets.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-medium">Adicionar rápido</label>
            <div className="flex flex-wrap gap-2">
              {remainingPresets.map(p => (
                <Button key={p.name} size="sm" variant="outline" onClick={() => quickCreate(p)} disabled={saving}>
                  <span className="mr-1">{p.icon}</span> {p.name}
                </Button>
              ))}
            </div>
            <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou personalizada <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}
        <div className="space-y-3">
          <Input placeholder="Nome da área" value={name} onChange={e => setName(e.target.value)} />
          <div>
            <label className="mb-1 block text-xs">Ícone</label>
            <div className="flex flex-wrap gap-1">
              {AREA_ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`h-9 w-9 rounded-md border text-lg transition ${icon === i ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs">Cor</label>
            <div className="flex flex-wrap gap-2">
              {AREA_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                  className={`h-7 w-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BoardDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (name: string, description: string, color: string) => Promise<any>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(AREA_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    await onCreate(name.trim(), description.trim(), color);
    setSaving(false);
    setName(""); setDescription(""); setColor(AREA_COLORS[0]);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo quadro</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder='Ex.: "Judicial", "Administrativo INSS"' value={name} onChange={e => setName(e.target.value)} />
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {AREA_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground scale-110" : "border-transparent"}`} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (name: string, color: string, stage_type: string) => Promise<any>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLUMN_COLORS[0]);
  const [stageType, setStageType] = useState("andamento");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    await onCreate(name.trim(), color, stageType);
    setSaving(false);
    setName(""); setColor(COLUMN_COLORS[0]); setStageType("andamento");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova coluna</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder='Ex.: "Instrução", "Sentença", "Arquivado"' value={name} onChange={e => setName(e.target.value)} />
          <Select value={stageType} onValueChange={setStageType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inicial">Inicial</SelectItem>
              <SelectItem value="andamento">Em andamento</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="arquivo">Arquivo</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {COLUMN_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground scale-110" : "border-transparent"}`} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardCreateDialog({ open, onOpenChange, onCreate, members }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (payload: Partial<ProcessCard>) => Promise<any>;
  members: Member[];
}) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [cnj, setCnj] = useState("");
  const [court, setCourt] = useState("");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState<string>("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!title.trim() && !clientName.trim()) return toast.error("Informe título ou cliente");
    setSaving(true);
    await onCreate({
      title: title.trim(), client_name: clientName.trim(), cnj_number: cnj.trim(),
      court: court.trim(), description: description.trim(),
      responsible_id: responsible || null, priority,
    });
    setSaving(false);
    setTitle(""); setClientName(""); setCnj(""); setCourt(""); setDescription(""); setResponsible(""); setPriority("normal");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo processo no quadro</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Título do caso (ex.: Aposentadoria por tempo)" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="Cliente" value={clientName} onChange={e => setClientName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Nº CNJ" value={cnj} onChange={e => setCnj(e.target.value)} />
            <Input placeholder="Vara / Órgão" value={court} onChange={e => setCourt(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger><SelectValue placeholder="Advogado responsável" /></SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Observações internas" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ DRAWER ============
function CardDrawer({ card, onClose, members, teamRows, memberById, onUpdate, onDelete, onAddMember, onRemoveMember }: {
  card: ProcessCard | null; onClose: () => void; members: Member[]; teamRows: TeamRow[];
  memberById: Record<string, Member>;
  onUpdate: (id: string, patch: Partial<ProcessCard>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onAddMember: (cardId: string, userId: string, role: string) => Promise<any>;
  onRemoveMember: (rowId: string) => Promise<any>;
}) {
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("coautor");
  if (!card) return null;
  const responsible = card.responsible_id ? memberById[card.responsible_id] : null;
  const availableToAdd = members.filter(m => !teamRows.some(t => t.user_id === m.user_id));
  return (
    <Sheet open={!!card} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {card.title || card.client_name || "Processo"}
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="resumo" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="resumo" className="flex-1">Resumo</TabsTrigger>
            <TabsTrigger value="equipe" className="flex-1">Equipe</TabsTrigger>
            <TabsTrigger value="movimentacoes" className="flex-1">Movimentações</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Título</label>
              <Input value={card.title || ""} onChange={e => onUpdate(card.id, { title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Cliente</label>
                <Input value={card.client_name || ""} onChange={e => onUpdate(card.id, { client_name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Prioridade</label>
                <Select value={card.priority} onValueChange={v => onUpdate(card.id, { priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Nº CNJ</label>
                <Input value={card.cnj_number || ""} onChange={e => onUpdate(card.id, { cnj_number: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Vara / Órgão</label>
                <Input value={card.court || ""} onChange={e => onUpdate(card.id, { court: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Advogado responsável</label>
              <Select value={card.responsible_id || ""} onValueChange={v => onUpdate(card.id, { responsible_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Textarea value={card.description || ""} onChange={e => onUpdate(card.id, { description: e.target.value })} rows={4} />
            </div>
            <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(card.id)}>
              <Trash2 className="mr-1 h-4 w-4" /> Excluir processo
            </Button>
          </TabsContent>

          <TabsContent value="equipe" className="space-y-3">
            {responsible && (
              <div className="rounded-md border bg-primary/5 p-2">
                <div className="text-[10px] font-semibold uppercase text-primary">Responsável</div>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground">
                    {(responsible.full_name || responsible.email || "?")[0].toUpperCase()}
                  </AvatarFallback></Avatar>
                  <div className="text-sm">{responsible.full_name || responsible.email}</div>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Equipe do processo</div>
              {teamRows.length === 0 && <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">Ninguém adicionado ainda</div>}
              {teamRows.map(t => {
                const m = memberById[t.user_id];
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded border p-2">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">
                      {(m?.full_name || m?.email || "?")[0].toUpperCase()}
                    </AvatarFallback></Avatar>
                    <div className="flex-1 text-sm">{m?.full_name || m?.email}</div>
                    <Badge variant="secondary" className="text-[10px]">{t.role_on_card}</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemoveMember(t.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {availableToAdd.length > 0 && (
              <div className="space-y-2 rounded border p-2">
                <div className="text-xs font-semibold text-muted-foreground">Adicionar membro</div>
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger><SelectValue placeholder="Escolher usuário" /></SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coautor">Coautor</SelectItem>
                    <SelectItem value="estagiario">Estagiário</SelectItem>
                    <SelectItem value="paralegal">Paralegal</SelectItem>
                    <SelectItem value="revisor">Revisor</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full" disabled={!addUserId} onClick={async () => {
                  await onAddMember(card.id, addUserId, addRole);
                  setAddUserId(""); setAddRole("coautor");
                }}>
                  <UserPlus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="movimentacoes" className="space-y-2">
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              📡 As movimentações do Escavador aparecerão aqui automaticamente (Fase 2 do módulo).<br /><br />
              Última movimentação registrada:
              {card.last_movement_text ? (
                <div className="mt-2 rounded bg-muted/50 p-2 text-foreground">{card.last_movement_text}</div>
              ) : <div className="mt-2 italic">— nenhuma —</div>}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

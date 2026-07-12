import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Download,
  Send,
  ArrowRightLeft,
  Archive,
  MessageSquare,
  Search,
  Shield,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type LegalArea = { id: string; name: string };
type Conversation = {
  id: string;
  company_id: string;
  client_lead_id: string;
  legal_area_id: string | null;
  assigned_lawyer_id: string | null;
  subject: string | null;
  status: "active" | "archived";
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  lead?: { name: string; phone: string | null; cpf_cliente_final: string | null };
  legal_area?: { name: string } | null;
  assigned?: { full_name: string } | null;
};
type Message = {
  id: string;
  direction: "in" | "out";
  sender_type: "client" | "laura" | "lawyer" | "system";
  content: string | null;
  media_url: string | null;
  created_at: string;
};
type Lawyer = { user_id: string; full_name: string };

export default function ClientConversations() {
  const { user, userRole } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAreaId, setTransferAreaId] = useState<string>("");
  const [transferLawyerId, setTransferLawyerId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadAreas();
    loadLawyers();
    loadConversations();
  }, [companyId, showArchived]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    markRead(selectedId);
    const ch = supabase
      .channel(`client_conv_${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "client_conversation_messages", filter: `conversation_id=eq.${selectedId}` },
        () => loadMessages(selectedId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedId]);

  async function loadAreas() {
    const { data } = await supabase
      .from("legal_areas")
      .select("id,name")
      .eq("company_id", companyId!)
      .eq("is_active", true)
      .order("position");
    setAreas(data ?? []);
  }

  async function loadLawyers() {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .order("full_name");
    setLawyers((data ?? []).map((p: any) => ({ user_id: p.user_id, full_name: p.full_name ?? "Sem nome" })));
  }

  async function loadConversations() {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_conversations")
      .select(
        `id, company_id, client_lead_id, legal_area_id, assigned_lawyer_id, subject, status,
         last_message_at, last_message_preview, unread_count,
         lead:leads!client_lead_id(name, phone, cpf_cliente_final),
         legal_area:legal_areas(name),
         assigned:profiles!client_conversations_assigned_lawyer_id_fkey(full_name)`,
      )
      .eq("company_id", companyId!)
      .eq("status", showArchived ? "archived" : "active")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) console.error(error);
    setConversations((data ?? []) as any);
    setLoading(false);
  }

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from("client_conversation_messages")
      .select("id,direction,sender_type,content,media_url,created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as any);
  }

  async function markRead(convId: string) {
    await supabase.from("client_conversations").update({ unread_count: 0 }).eq("id", convId);
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)));
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    const text = reply.trim();
    setReply("");
    const { error } = await supabase.from("client_conversation_messages").insert({
      conversation_id: selectedId,
      company_id: companyId!,
      direction: "out",
      sender_type: "lawyer",
      sender_user_id: user!.id,
      content: text,
    });
    if (error) {
      toast.error("Falha ao enviar: " + error.message);
      setReply(text);
      return;
    }
    // TODO: invocar edge function send-whatsapp para entregar ao cliente
    toast.success("Mensagem registrada");
  }

  async function submitTransfer() {
    if (!selectedId) return;
    const current = conversations.find((c) => c.id === selectedId);
    if (!current) return;
    if (!transferAreaId && !transferLawyerId) {
      toast.error("Escolha uma área ou um advogado destino.");
      return;
    }
    const { error } = await supabase.from("client_conversation_transfers").insert({
      conversation_id: selectedId,
      company_id: companyId!,
      from_area_id: current.legal_area_id,
      to_area_id: transferAreaId || null,
      from_lawyer_id: current.assigned_lawyer_id,
      to_lawyer_id: transferLawyerId || null,
      transferred_by: user!.id,
      reason: transferReason || null,
    });
    if (error) return toast.error("Falha na transferência: " + error.message);
    await supabase.from("client_conversation_messages").insert({
      conversation_id: selectedId,
      company_id: companyId!,
      direction: "out",
      sender_type: "system",
      sender_user_id: user!.id,
      content: `Conversa transferida${transferAreaId ? ` para a área ${areas.find((a) => a.id === transferAreaId)?.name ?? ""}` : ""}${transferLawyerId ? ` para ${lawyers.find((l) => l.user_id === transferLawyerId)?.full_name ?? ""}` : ""}${transferReason ? ` — motivo: ${transferReason}` : ""}.`,
    });
    toast.success("Conversa transferida");
    setTransferOpen(false);
    setTransferAreaId("");
    setTransferLawyerId("");
    setTransferReason("");
    loadConversations();
  }

  async function archive() {
    if (!selectedId) return;
    const { error } = await supabase
      .from("client_conversations")
      .update({ status: "archived" })
      .eq("id", selectedId);
    if (error) return toast.error(error.message);
    toast.success("Conversa arquivada (não é possível apagar por conformidade LGPD).");
    setSelectedId(null);
    loadConversations();
  }

  function downloadTranscript() {
    if (!selectedId) return;
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;
    const header = [
      `AdvOne — Transcrição de conversa com cliente`,
      `Cliente: ${conv.lead?.name ?? "-"}`,
      `Telefone: ${conv.lead?.phone ?? "-"}`,
      `CPF: ${conv.lead?.cpf_cliente_final ?? "-"}`,
      `Área: ${conv.legal_area?.name ?? "-"}`,
      `Assunto: ${conv.subject ?? "-"}`,
      `Advogado responsável: ${conv.assigned?.full_name ?? "-"}`,
      `Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
      `--------------------------------------------`,
      "",
    ].join("\n");
    const body = messages
      .map((m) => {
        const who =
          m.sender_type === "client"
            ? "Cliente"
            : m.sender_type === "laura"
              ? "Laura (IA)"
              : m.sender_type === "lawyer"
                ? "Advogado"
                : "Sistema";
        const when = format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
        return `[${when}] ${who}:\n${m.content ?? m.media_url ?? ""}\n`;
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-${conv.lead?.name?.replace(/\s+/g, "_") ?? conv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredConvs = useMemo(() => {
    let list = conversations;
    if (activeTab !== "all") list = list.filter((c) => c.legal_area_id === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.lead?.name?.toLowerCase().includes(q) ||
          c.lead?.phone?.includes(q) ||
          c.lead?.cpf_cliente_final?.includes(q) ||
          c.subject?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [conversations, activeTab, search]);

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-6 w-6" />
            Conversas de Clientes
          </h1>
          <p className="text-sm text-muted-foreground">
            Atendimento a clientes ativos, separado do funil de leads.{" "}
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Shield className="h-3 w-3" /> Nenhuma conversa pode ser apagada.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Ver ativas" : "Ver arquivadas"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todas ({conversations.length})</TabsTrigger>
          {areas.map((a) => {
            const count = conversations.filter((c) => c.legal_area_id === a.id).length;
            return (
              <TabsTrigger key={a.id} value={a.id}>
                {a.name} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
            {/* Lista */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF ou telefone…"
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-18rem)]">
                {loading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Carregando…
                  </div>
                )}
                {!loading && filteredConvs.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma conversa nesta área.
                  </div>
                )}
                {filteredConvs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full border-b p-3 text-left transition-colors hover:bg-muted ${
                      selectedId === c.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{c.lead?.name ?? "Cliente"}</span>
                          {c.unread_count > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {c.unread_count}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {c.legal_area?.name && <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{c.legal_area.name}</Badge>}
                          {c.assigned?.full_name && <span className="truncate">{c.assigned.full_name}</span>}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.last_message_preview}</p>
                      </div>
                      {c.last_message_at && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {format(new Date(c.last_message_at), "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </Card>

            {/* Painel */}
            <Card className="flex flex-col overflow-hidden">
              {!selected && (
                <div className="flex flex-1 items-center justify-center p-10 text-muted-foreground">
                  Selecione uma conversa
                </div>
              )}
              {selected && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{selected.lead?.name}</span>
                        {selected.legal_area?.name && (
                          <Badge variant="secondary">{selected.legal_area.name}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selected.lead?.phone} · {selected.lead?.cpf_cliente_final ?? "sem CPF"} ·{" "}
                        Responsável: {selected.assigned?.full_name ?? "não atribuído"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
                        <ArrowRightLeft className="mr-1 h-4 w-4" /> Transferir
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadTranscript}>
                        <Download className="mr-1 h-4 w-4" /> Baixar
                      </Button>
                      <Button variant="outline" size="sm" onClick={archive}>
                        <Archive className="mr-1 h-4 w-4" /> Arquivar
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.map((m) => {
                        const isOut = m.direction === "out";
                        const bubbleClass =
                          m.sender_type === "system"
                            ? "mx-auto bg-muted text-xs text-muted-foreground italic"
                            : isOut
                              ? "ml-auto bg-primary text-primary-foreground"
                              : "bg-muted";
                        return (
                          <div
                            key={m.id}
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${bubbleClass}`}
                          >
                            {m.sender_type !== "system" && (
                              <div className="mb-0.5 text-[10px] opacity-70">
                                {m.sender_type === "client"
                                  ? "Cliente"
                                  : m.sender_type === "laura"
                                    ? "Laura (IA)"
                                    : "Advogado"}
                                {" · "}
                                {format(new Date(m.created_at), "dd/MM HH:mm")}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <div className="border-t p-3">
                    <div className="flex gap-2">
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Escreva uma resposta ao cliente…"
                        rows={2}
                        className="resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                      />
                      <Button onClick={sendReply} disabled={!reply.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nova área</label>
              <Select value={transferAreaId} onValueChange={setTransferAreaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mantém a área atual" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Novo advogado responsável</label>
              <Select value={transferLawyerId} onValueChange={setTransferLawyerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mantém o responsável atual" />
                </SelectTrigger>
                <SelectContent>
                  {lawyers.map((l) => (
                    <SelectItem key={l.user_id} value={l.user_id}>
                      {l.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Ex.: cliente perguntou sobre outro caso previdenciário"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitTransfer}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

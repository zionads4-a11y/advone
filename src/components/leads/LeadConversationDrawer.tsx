import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Bot, Calendar, Download, FileDown, Loader2, MessageSquare } from "lucide-react";
import jsPDF from "jspdf";

interface Message {
  id: string;
  direction: string;
  message_text: string | null;
  sender_name: string | null;
  timestamp: string;
}

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  reminder_type: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadName?: string;
  leadCpf?: string | null;
  leadPhone?: string | null;
}

export function LeadConversationDrawer({ open, onOpenChange, leadId, leadName, leadCpf, leadPhone }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && leadId) fetchData();
    else {
      setMessages([]);
      setReminders([]);
    }
  }, [open, leadId]);

  const fetchData = async () => {
    if (!leadId) return;
    setLoading(true);
    const [msgs, rems] = await Promise.all([
      supabase
        .from("whatsapp_messages")
        .select("id, direction, message_text, sender_name, timestamp")
        .eq("lead_id", leadId)
        .order("timestamp", { ascending: true }),
      supabase
        .from("lead_reminders")
        .select("id, title, description, due_at, reminder_type, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true }),
    ]);
    setMessages((msgs.data || []) as Message[]);
    setReminders((rems.data || []) as Reminder[]);
    setLoading(false);
  };

  // First scheduling event (agendamento)
  const firstSchedule = reminders[0];
  const cutoffDate = firstSchedule ? new Date(firstSchedule.created_at) : null;

  // Messages until scheduling
  const messagesUntilSchedule = cutoffDate
    ? messages.filter((m) => new Date(m.timestamp) <= cutoffDate)
    : messages;
  const messagesAfterSchedule = cutoffDate
    ? messages.filter((m) => new Date(m.timestamp) > cutoffDate)
    : [];

  const exportTranscript = () => {
    const lines: string[] = [];
    lines.push(`HISTÓRICO DE CONVERSA - ${leadName || "Lead"}`);
    if (leadCpf) lines.push(`CPF: ${leadCpf}`);
    if (leadPhone) lines.push(`Telefone: ${leadPhone}`);
    lines.push(`Exportado em: ${new Date().toLocaleString("pt-BR")}`);
    lines.push("=".repeat(60));
    lines.push("");

    messagesUntilSchedule.forEach((m) => {
      const ts = new Date(m.timestamp).toLocaleString("pt-BR");
      const who = m.direction === "incoming" ? "CLIENTE" : m.sender_name === "IA" ? "IA" : "ATENDENTE";
      lines.push(`[${ts}] ${who}: ${m.message_text || "[mídia]"}`);
    });

    if (firstSchedule) {
      lines.push("");
      lines.push("─".repeat(60));
      lines.push(`📅 AGENDAMENTO REGISTRADO`);
      lines.push(`Título: ${firstSchedule.title}`);
      lines.push(`Data: ${new Date(firstSchedule.due_at).toLocaleString("pt-BR")}`);
      if (firstSchedule.description) lines.push(`Detalhes: ${firstSchedule.description}`);
      lines.push("─".repeat(60));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-${(leadName || "lead").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <MessageSquare className="h-5 w-5 text-primary" />
            Conversa até o agendamento
          </SheetTitle>
          <SheetDescription>
            <div className="flex flex-col gap-1">
              <span><strong>{leadName}</strong> · {leadPhone || "sem telefone"}</span>
              {leadCpf && <span className="font-mono text-xs">CPF: {leadCpf}</span>}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 py-2 border-b">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {messagesUntilSchedule.length} mensagens até o agendamento
          </Badge>
          {firstSchedule && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <Calendar className="h-3 w-3 mr-1" /> Agendado
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={exportTranscript} disabled={messages.length === 0} className="ml-auto">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">Nenhuma conversa registrada para este lead</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {messagesUntilSchedule.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "incoming" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      msg.direction === "incoming"
                        ? "bg-secondary text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      {msg.direction === "incoming" ? (
                        <ArrowDownLeft className="h-3 w-3 opacity-60" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 opacity-60" />
                      )}
                      {msg.sender_name === "IA" && <Bot className="h-3 w-3 opacity-60" />}
                      <span className="text-[10px] opacity-70">
                        {msg.sender_name === "IA" ? "IA • " : ""}
                        {new Date(msg.timestamp).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message_text || "[mídia]"}</p>
                  </div>
                </div>
              ))}

              {firstSchedule && (
                <div className="my-4 rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold text-sm">Agendamento criado</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{firstSchedule.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para: {new Date(firstSchedule.due_at).toLocaleString("pt-BR")}
                  </p>
                  {firstSchedule.description && (
                    <p className="text-xs text-muted-foreground mt-1">{firstSchedule.description}</p>
                  )}
                </div>
              )}

              {messagesAfterSchedule.length > 0 && (
                <details className="rounded-lg border border-border p-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    + {messagesAfterSchedule.length} mensagens após o agendamento
                  </summary>
                  <div className="space-y-3 mt-3">
                    {messagesAfterSchedule.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === "incoming" ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 opacity-70 ${
                            msg.direction === "incoming"
                              ? "bg-secondary text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.message_text || "[mídia]"}</p>
                          <span className="text-[10px] opacity-70">
                            {new Date(msg.timestamp).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

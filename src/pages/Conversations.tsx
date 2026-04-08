import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, User, ArrowDownLeft, ArrowUpRight, Send, Sparkles, Loader2, Bot, Paperclip, Video, Image, FileText, ArrowLeft,
} from "lucide-react";
import { LeadBotToggle } from "@/components/leads/LeadBotToggle";
import { toast } from "sonner";
import { useNewMessageNotifications } from "@/hooks/useNewMessageNotifications";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  id: string;
  company_id: string;
  lead_id: string | null;
  phone: string;
  message_text: string | null;
  direction: string;
  sender_name: string | null;
  timestamp: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  bot_disabled: boolean;
}

interface Company {
  id: string;
  name: string;
}

export default function Conversations() {
  const { isClient, companyIds, loading: companiesLoading } = useUserCompanies();
  const { clearUnread } = useNewMessageNotifications();
  const isMobile = useIsMobile();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showChat, setShowChat] = useState(false);

  // Clear unread notifications when entering conversations
  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  useEffect(() => {
    if (!companiesLoading) fetchCompanies();
  }, [companiesLoading]);

  useEffect(() => {
    if (selectedCompanyId) fetchMessages();
  }, [selectedCompanyId]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedCompanyId) return;

    const channel = supabase
      .channel(`whatsapp-${selectedCompanyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `company_id=eq.${selectedCompanyId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setConversations((prev) => {
            const updated = { ...prev };
            if (!updated[newMsg.phone]) updated[newMsg.phone] = [];
            // Avoid duplicates
            if (!updated[newMsg.phone].find((m) => m.id === newMsg.id)) {
              updated[newMsg.phone] = [...updated[newMsg.phone], newMsg];
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCompanyId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, selectedPhone]);

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

  const fetchMessages = async () => {
    const [messagesRes, leadsRes] = await Promise.all([
      supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("timestamp", { ascending: true }),
      supabase
        .from("leads")
        .select("id, name, phone, bot_disabled")
        .eq("company_id", selectedCompanyId),
    ]);

    if (messagesRes.data) {
      const grouped: Record<string, Message[]> = {};
      messagesRes.data.forEach((msg) => {
        const m = msg as Message;
        if (!grouped[m.phone]) grouped[m.phone] = [];
        grouped[m.phone].push(m);
      });
      setConversations(grouped);

      const phones = Object.keys(grouped);
      if (phones.length > 0 && !selectedPhone) {
        setSelectedPhone(phones[0]);
      }
    }

    if (leadsRes.data) {
      const map: Record<string, Lead> = {};
      leadsRes.data.forEach((l) => {
        if (l.phone) map[l.phone] = l as Lead;
      });
      setLeads(map);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedPhone || !selectedCompanyId) return;

    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { company_id: selectedCompanyId, phone: selectedPhone, message: messageText },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao enviar mensagem");
    } else {
      setMessageText("");
      // Message will appear via realtime subscription, but also fetch to be safe
      setTimeout(fetchMessages, 500);
    }
    setSending(false);
  };

  const handleAiSuggest = async () => {
    if (!selectedPhone || !selectedCompanyId) return;

    setAiSuggesting(true);
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { company_id: selectedCompanyId, phone: selectedPhone, action: "ai_suggest" },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao gerar sugestão IA");
    } else if (data?.suggestion) {
      setMessageText(data.suggestion);
      toast.success("Sugestão IA gerada! Edite se necessário e envie.");
    }
    setAiSuggesting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPhone || !selectedCompanyId) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo: 20MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${selectedCompanyId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("whatsapp-media")
        .getPublicUrl(path);

      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          company_id: selectedCompanyId,
          phone: selectedPhone,
          message: messageText.trim() || undefined,
          media_url: publicUrl,
          media_type: file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : "document",
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Erro ao enviar arquivo");
      } else {
        setMessageText("");
        toast.success("Arquivo enviado!");
        setTimeout(fetchMessages, 500);
      }
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const phones = Object.keys(conversations).sort((a, b) => {
    const lastA = conversations[a][conversations[a].length - 1]?.timestamp || "";
    const lastB = conversations[b][conversations[b].length - 1]?.timestamp || "";
    return lastB.localeCompare(lastA);
  });

  const selectedMessages = selectedPhone ? conversations[selectedPhone] || [] : [];
  const selectedLead = selectedPhone ? leads[selectedPhone] : null;

  const showContactList = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {(!isMobile || !showChat) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Conversas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Mensagens do WhatsApp dos seus leads</p>
          </div>
          {!isClient && companies.length > 1 && (
            <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); setSelectedPhone(""); }}>
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
        </div>
      )}

      <div className={`grid gap-4 h-[calc(100vh-200px)] sm:h-[calc(100vh-220px)] ${isMobile ? '' : 'lg:grid-cols-[320px_1fr]'}`}>
        {/* Contact list */}
        {showContactList && (
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display text-foreground">Contatos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-310px)]">
                {phones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="mb-2 h-8 w-8" />
                    <p className="text-xs">Nenhuma conversa ainda</p>
                    <p className="text-[10px]">As mensagens aparecerão aqui quando chegarem via WhatsApp</p>
                  </div>
                ) : (
                  phones.map((phone) => {
                    const msgs = conversations[phone];
                    const lastMsg = msgs[msgs.length - 1];
                    const lead = leads[phone];
                    const isActive = selectedPhone === phone;

                    return (
                      <button
                        key={phone}
                        onClick={() => { setSelectedPhone(phone); if (isMobile) setShowChat(true); }}
                        className={`w-full border-b border-border p-3 text-left transition-colors hover:bg-secondary/50 ${
                          isActive ? "bg-secondary" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {lead?.name || lastMsg?.sender_name || phone}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {lastMsg?.message_text || "..."}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">
                              {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {lastMsg?.sender_name === "IA" && (
                                <Bot className="h-3 w-3 text-primary" />
                              )}
                              <Badge variant="secondary" className="text-[9px]">{msgs.length}</Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {showChatPanel && (
        <Card className="glass-card overflow-hidden flex flex-col">
          {selectedPhone ? (
            <>
              <CardHeader className="border-b border-border pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <Button variant="ghost" size="icon" className="shrink-0 -ml-1" onClick={() => setShowChat(false)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-display text-foreground">
                      {selectedLead?.name || selectedPhone}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{selectedPhone}</p>
                  </div>
                  {selectedLead && (
                    <div className="ml-auto flex items-center gap-2">
                      <LeadBotToggle
                        leadId={selectedLead.id}
                        initialDisabled={!!selectedLead.bot_disabled}
                        compact
                        onUpdate={() => fetchMessages()}
                      />
                      <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                        Lead cadastrado
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Messages area */}
              <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-420px)] p-4">
                  <div className="space-y-3">
                    {selectedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "incoming" ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-3 py-2 ${
                            msg.direction === "incoming"
                              ? "bg-secondary text-foreground"
                              : "gradient-primary text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            {msg.direction === "incoming" ? (
                              <ArrowDownLeft className="h-3 w-3 opacity-60" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 opacity-60" />
                            )}
                            {msg.sender_name === "IA" && (
                              <Bot className="h-3 w-3 opacity-60" />
                            )}
                            <span className="text-[10px] opacity-60">
                              {msg.sender_name === "IA" ? "IA • " : ""}
                              {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message_text || "[mídia]"}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Send area */}
              <div className="border-t border-border p-3 flex-shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="video/*,image/*,application/pdf,.doc,.docx"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleAiSuggest}
                          disabled={aiSuggesting}
                          className="shrink-0"
                        >
                          {aiSuggesting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sugestão IA</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="shrink-0"
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Enviar vídeo, imagem ou arquivo</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageText.trim()}
                    className="gradient-primary text-primary-foreground shrink-0"
                    size="icon"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="mb-3 h-12 w-12" />
              <p className="text-sm">Selecione uma conversa</p>
            </CardContent>
          )}
        </Card>
        )}
      </div>
    </div>
  );
}

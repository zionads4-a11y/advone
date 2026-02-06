import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, ArrowDownLeft, ArrowUpRight } from "lucide-react";

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
}

interface Company {
  id: string;
  name: string;
}

export default function Conversations() {
  const { isClient, companyIds, loading: companiesLoading } = useUserCompanies();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [selectedPhone, setSelectedPhone] = useState<string>("");

  useEffect(() => {
    if (!companiesLoading) fetchCompanies();
  }, [companiesLoading]);

  useEffect(() => {
    if (selectedCompanyId) fetchMessages();
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

  const fetchMessages = async () => {
    const [messagesRes, leadsRes] = await Promise.all([
      supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("timestamp", { ascending: true }),
      supabase
        .from("leads")
        .select("id, name, phone")
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

      // Auto select first conversation
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

  const phones = Object.keys(conversations).sort((a, b) => {
    const lastA = conversations[a][conversations[a].length - 1]?.timestamp || "";
    const lastB = conversations[b][conversations[b].length - 1]?.timestamp || "";
    return lastB.localeCompare(lastA);
  });

  const selectedMessages = selectedPhone ? conversations[selectedPhone] || [] : [];
  const selectedLead = selectedPhone ? leads[selectedPhone] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Conversas</h1>
          <p className="text-sm text-muted-foreground">Mensagens do WhatsApp dos seus leads</p>
        </div>
        {!isClient && companies.length > 1 && (
          <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); setSelectedPhone(""); }}>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] h-[calc(100vh-220px)]">
        {/* Contact list */}
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
                  <p className="text-[10px]">As mensagens aparecerão aqui quando chegarem via Z-API</p>
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
                      onClick={() => setSelectedPhone(phone)}
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
                          <Badge variant="secondary" className="text-[9px] mt-1">{msgs.length}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="glass-card overflow-hidden">
          {selectedPhone ? (
            <>
              <CardHeader className="border-b border-border pb-3">
                <div className="flex items-center gap-3">
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
                    <Badge variant="outline" className="ml-auto border-primary/30 text-primary text-[10px]">
                      Lead cadastrado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-350px)] p-4">
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
                            <span className="text-[10px] opacity-60">
                              {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message_text || "[mídia]"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="mb-3 h-12 w-12" />
              <p className="text-sm">Selecione uma conversa</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

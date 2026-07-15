import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, AtSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Msg {
  id: string;
  sender_id: string;
  content: string;
  mentions: string[] | null;
  created_at: string;
  sender_name?: string;
}

interface Member {
  user_id: string;
  full_name: string;
}

interface Props {
  leadId: string;
  companyId: string;
}

export function LeadInternalChat({ leadId, companyId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const memberMap = new Map(members.map((m) => [m.user_id, m.full_name]));

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Fetch messages
      const { data: msgs } = await supabase
        .from("lead_internal_messages")
        .select("id, sender_id, content, mentions, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      // Fetch company members
      const { data: cc } = await supabase
        .from("client_companies")
        .select("user_id")
        .eq("company_id", companyId);
      const ids = (cc || []).map((c: any) => c.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      if (!mounted) return;
      setMembers(profs || []);
      const nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      setMessages(
        (msgs || []).map((m: any) => ({
          ...m,
          sender_name: nameMap.get(m.sender_id) || "Usuário",
        })),
      );
    };
    load();

    const channel = supabase
      .channel(`lead_internal_${leadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_internal_messages", filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) => [
            ...prev,
            { ...m, sender_name: memberMap.get(m.sender_id) || "Usuário" },
          ]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, companyId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const parseMentions = (raw: string): string[] => {
    const ids: string[] = [];
    for (const m of members) {
      const first = (m.full_name || "").split(" ")[0].toLowerCase();
      const re = new RegExp(`@${first}\\b`, "i");
      if (re.test(raw)) ids.push(m.user_id);
    }
    return ids;
  };

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const mentions = parseMentions(text);
    const { error } = await supabase.from("lead_internal_messages").insert({
      lead_id: leadId,
      company_id: companyId,
      sender_id: user.id,
      content: text.trim(),
      mentions,
    });
    setSending(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
  };

  const insertMention = (name: string) => {
    const first = (name || "").split(" ")[0];
    setText((t) => `${t}${t.endsWith(" ") || t === "" ? "" : " "}@${first} `);
    setShowMentions(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="h-4 w-4 text-primary" />
        Notas internas da equipe
        <Badge variant="secondary" className="text-xs">tempo real</Badge>
      </div>

      <div className="border rounded-md bg-muted/20">
        <ScrollArea className="h-64 p-3" ref={scrollRef as any}>
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Sem mensagens. Use este espaço para conversar com sua equipe sobre este lead — mencione alguém com <code>@nome</code> para notificar via WhatsApp.
            </p>
          )}
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                    <div className="text-[10px] opacity-70 mb-0.5">
                      {m.sender_name} • {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex gap-2 items-end">
        <Popover open={showMentions} onOpenChange={setShowMentions}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="Mencionar alguém">
              <AtSign className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="start">
            <div className="text-xs text-muted-foreground p-2">Mencionar (notifica no WhatsApp):</div>
            <div className="max-h-48 overflow-auto">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => insertMention(m.full_name)}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded"
                >
                  @{(m.full_name || "").split(" ")[0]} <span className="text-xs text-muted-foreground">— {m.full_name}</span>
                </button>
              ))}
              {members.length === 0 && <div className="p-2 text-xs text-muted-foreground">Sem membros</div>}
            </div>
          </PopoverContent>
        </Popover>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreva uma mensagem para a equipe... (@nome para mencionar)"
          rows={2}
          className="flex-1 resize-none"
        />
        <Button onClick={send} disabled={!text.trim() || sending} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

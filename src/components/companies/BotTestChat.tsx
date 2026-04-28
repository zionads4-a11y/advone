import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, RotateCcw, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  parts?: string[];
}

interface BotTestChatProps {
  companyId: string;
}

export function BotTestChat({ companyId }: BotTestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        setLoading(false);
        return;
      }

      const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-bot-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ company_id: companyId, messages: apiMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || "Erro ao comunicar com o bot", {
          description: err.detail ? String(err.detail).slice(0, 300) : undefined,
        });
        setLoading(false);
        return;
      }

      const data = await resp.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
        parts: data.parts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Erro de conexão");
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <Card className="border-border/50 flex flex-col" style={{ height: "600px" }}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-primary" />
            Ambiente de Teste
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset} title="Reiniciar conversa">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Simule uma conversa como se fosse um lead. O bot usará as configurações atuais salvas.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 overflow-hidden p-3 pt-0">
        {/* Chat messages */}
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3 py-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bot className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Envie uma mensagem para testar o bot</p>
                <p className="text-xs mt-1">Ex: "Olá, boa tarde!"</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className="space-y-1">
                    {msg.role === "assistant" && msg.parts && msg.parts.length > 1 ? (
                      msg.parts.map((part, j) => (
                        <div
                          key={j}
                          className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-foreground"
                        >
                          {part}
                        </div>
                      ))
                    ) : (
                      <div
                        className={`rounded-xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-xl bg-muted/60 px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2 pt-2 border-t border-border mt-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Digite como se fosse um lead..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

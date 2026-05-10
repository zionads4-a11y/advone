import { useState, useEffect, useRef } from "react";
import { Bot, User, Send } from "lucide-react";

interface DemoMessage {
  role: "user" | "bot";
  text: string;
  delay: number;
}

const demoScript: DemoMessage[] = [
  { role: "user", text: "Oi, boa tarde. Vi o anúncio de vocês.", delay: 0 },
  { role: "bot", text: "Boa tarde! 👋 Aqui é a Laura, secretária virtual do escritório Mendes & Vasconcelos Advocacia. Que bom ter você por aqui! Pra eu te ajudar direitinho, me conta: o que aconteceu?", delay: 1400 },
  { role: "user", text: "Fui demitido semana passada e acho que não recebi tudo certo.", delay: 3600 },
  { role: "bot", text: "Imagino o quanto isso é estressante 😔 Fica tranquilo(a), vou te ajudar. Você trabalhou de carteira assinada?", delay: 5200 },
  { role: "user", text: "Sim, 4 anos e meio.", delay: 7000 },
  { role: "bot", text: "Perfeito. Pelo tempo de casa, já adianto: provavelmente tem rescisão, FGTS, multa de 40% e aviso prévio pra revisar. Vale muito a pena uma análise do Dr. Mendes. Posso agendar uma consulta gratuita pra você?", delay: 8800 },
  { role: "user", text: "Pode sim, por favor", delay: 11000 },
  { role: "bot", text: "Maravilha! ✨ Tenho dois horários amanhã:\n🕘 09:30 (manhã)\n🕐 14:00 (tarde)\nQual prefere?", delay: 12400 },
  { role: "user", text: "14h tá ótimo", delay: 14200 },
  { role: "bot", text: "Pronto! ✅ Consulta agendada pra amanhã às 14:00 com o Dr. Mendes. Vou te enviar lembretes 6h, 2h e 30min antes. Qualquer coisa, é só chamar aqui. Até amanhã! 🤝", delay: 15600 },
];

export function InteractiveChatDemo() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [typingBot, setTypingBot] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  // Scroll only the inner chat container, never the page
  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typingBot]);

  const playDemo = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setMessages([]);
    setIsPlaying(true);
    setTypingBot(false);

    demoScript.forEach((msg, i) => {
      // Show typing indicator before bot messages
      if (msg.role === "bot") {
        const typingDelay = i === 0 ? msg.delay : msg.delay - 600;
        const t1 = setTimeout(() => setTypingBot(true), typingDelay);
        timeoutsRef.current.push(t1);
      }

      const t2 = setTimeout(() => {
        setTypingBot(false);
        setMessages((prev) => [...prev, msg]);
        if (i === demoScript.length - 1) {
          setTimeout(() => setIsPlaying(false), 1000);
        }
      }, msg.delay);
      timeoutsRef.current.push(t2);
    });
  };

  // Auto-play only when the demo scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayedRef.current) {
          hasPlayedRef.current = true;
          const t = setTimeout(playDemo, 400);
          timeoutsRef.current.push(t);
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-sm mx-auto">
      {/* Phone frame */}
      <div className="rounded-[2rem] border-2 border-[hsl(220,20%,20%)] bg-[hsl(220,25%,8%)] p-1 shadow-2xl shadow-[hsl(153,60%,45%)]/10">
        {/* Notch */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1.5 w-16 rounded-full bg-[hsl(220,20%,16%)]" />
        </div>

        {/* Chat header */}
        <div className="mx-1 flex items-center gap-3 rounded-t-2xl bg-[hsl(153,60%,35%)] px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(0,0%,100%)]/20">
            <Bot className="h-5 w-5 text-[hsl(0,0%,100%)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[hsl(0,0%,100%)]">Laura · Secretária Virtual</p>
            <p className="text-xs text-[hsl(0,0%,100%)]/70">Mendes &amp; Vasconcelos · online</p>
          </div>
          <div className="ml-auto flex h-2.5 w-2.5 rounded-full bg-[hsl(120,60%,50%)]">
            <span className="inline-flex h-full w-full animate-ping rounded-full bg-[hsl(120,60%,50%)] opacity-75" />
          </div>
        </div>

        {/* Chat body */}
        <div ref={chatBodyRef} className="mx-1 bg-[hsl(220,25%,10%)] px-3" style={{ height: 380, overflowY: "auto" }}>
          <div className="space-y-2 py-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-[hsl(153,60%,40%)] text-[hsl(0,0%,100%)] rounded-br-md"
                      : "bg-[hsl(220,20%,16%)] text-[hsl(220,10%,85%)] rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {typingBot && (
              <div className="flex justify-start animate-fade-in">
                <div className="rounded-2xl rounded-bl-md bg-[hsl(220,20%,16%)] px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[hsl(220,10%,45%)] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-[hsl(220,10%,45%)] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-[hsl(220,10%,45%)] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="mx-1 flex items-center gap-2 rounded-b-2xl bg-[hsl(220,20%,12%)] px-3 py-3">
          <div className="flex-1 rounded-full bg-[hsl(220,20%,16%)] px-4 py-2 text-sm text-[hsl(220,10%,40%)]">
            Digite uma mensagem...
          </div>
          <button
            onClick={playDemo}
            disabled={isPlaying}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(153,60%,45%)] text-[hsl(0,0%,100%)] transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-24 rounded-full bg-[hsl(220,20%,20%)]" />
        </div>
      </div>

      {/* Replay button */}
      <p
        onClick={() => !isPlaying && playDemo()}
        className={`mt-4 text-center text-sm cursor-pointer transition-colors ${
          isPlaying ? "text-[hsl(220,10%,30%)]" : "text-[hsl(153,60%,45%)] hover:text-[hsl(153,60%,55%)]"
        }`}
      >
        {isPlaying ? "Simulando conversa..." : "▶ Replay da demonstração"}
      </p>
    </div>
  );
}

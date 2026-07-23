import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bot, Clock, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.webp";

const benefits = [
  "Atendimento automático 24/7 no WhatsApp do escritório",
  "Qualificação inteligente: bot identifica área (trabalhista, previdenciário, cível…)",
  "Agendamento automático na agenda do advogado responsável",
  "Lembretes automáticos 6h, 2h e 30min antes da reunião",
  "Transferência para humano quando o lead está pronto",
  "Histórico completo de conversa salvo no CRM",
];

export default function WhatsappAdvogados() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Automação de WhatsApp para Advogados com IA | AdvOne</title>
        <meta name="description" content="Automatize o WhatsApp do seu escritório com IA SDR jurídica. Atende, qualifica e agenda 24/7. Teste a Laura, secretária virtual da AdvOne, grátis." />
        <link rel="canonical" href="https://advone.online/whatsapp-advogados" />
        <meta property="og:title" content="Automação de WhatsApp para Advogados com IA | AdvOne" />
        <meta property="og:description" content="IA Laura atende WhatsApp do escritório 24/7, qualifica leads e agenda reuniões." />
        <meta property="og:url" content="https://advone.online/whatsapp-advogados" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne automação WhatsApp" className="h-10 w-auto" /></Link>
          <Link to="/auth"><Button>Testar grátis</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        <section className="text-center space-y-6 mb-20">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            Automação de <span className="text-primary">WhatsApp</span> para Advogados
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Pare de perder leads no fim de semana e à noite. A IA Laura, da AdvOne, atende cada mensagem do WhatsApp do
            seu escritório, qualifica o caso e marca a reunião na agenda do advogado certo — sem você levantar um dedo.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Link to="/auth"><Button size="lg">Ativar no meu WhatsApp <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/ia"><Button size="lg" variant="outline">Conversar com a Laura</Button></Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Bot className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">IA treinada para advocacia</h2>
            <p className="text-sm text-muted-foreground">Entende termos jurídicos, nichos de atuação e segue o tom de voz do seu escritório.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Clock className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Resposta em segundos</h2>
            <p className="text-sm text-muted-foreground">Lead recebido às 23h é atendido às 23h. Sem demora, sem perda para o concorrente.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Calendar className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Agenda automática</h2>
            <p className="text-sm text-muted-foreground">Marca reunião direto na agenda do advogado responsável pela área do caso.</p>
          </div>
        </section>

        <section className="space-y-4 mb-20">
          <h2 className="font-display text-3xl font-bold">O que a Laura faz pelo seu escritório</h2>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-10 text-center space-y-4">
          <h2 className="font-display text-3xl font-bold">Conecte seu WhatsApp em 5 minutos</h2>
          <p className="text-muted-foreground">Sem WhatsApp Business API cara. Sem integração complexa.</p>
          <Link to="/auth"><Button size="lg">Começar grátis</Button></Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AdvOne · <Link to="/terms" className="hover:underline">Termos</Link> · <Link to="/privacy" className="hover:underline">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}

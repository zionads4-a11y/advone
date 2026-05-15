import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingDown, Users } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.png";

export default function SdrIaJuridico() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>SDR com IA para Escritório Jurídico | Laura — AdvOne</title>
        <meta name="description" content="SDR virtual com IA para escritórios de advocacia. Laura qualifica leads, agenda reuniões e elimina o custo de um SDR humano. R$ 397/mês." />
        <link rel="canonical" href="https://advone.online/sdr-ia-juridico" />
        <meta property="og:title" content="SDR com IA para Escritório Jurídico — Laura | AdvOne" />
        <meta property="og:description" content="A primeira SDR virtual com IA para advogados. Atende, qualifica e agenda no WhatsApp." />
        <meta property="og:url" content="https://advone.online/sdr-ia-juridico" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne SDR IA jurídico" className="h-10 w-auto" /></Link>
          <Link to="/ia"><Button>Conhecer Laura</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        <section className="text-center space-y-6 mb-20">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            SDR com <span className="text-primary">IA Jurídica</span> 24/7
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Substitua a SDR humana (R$ 3.500/mês + encargos) por <strong>Laura</strong>, a primeira SDR virtual treinada
            para escritórios de advocacia. Ela atende WhatsApp, qualifica casos por nicho jurídico e agenda reuniões — por R$ 397/mês.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Link to="/ia"><Button size="lg">Falar com a Laura agora <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <TrendingDown className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">90% mais barato</h2>
            <p className="text-sm text-muted-foreground">SDR humana custa R$ 3.500 a R$ 5.000/mês. Laura custa R$ 397/mês e trabalha 24h.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Users className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Atende 100% dos leads</h2>
            <p className="text-sm text-muted-foreground">Sem fila, sem férias, sem licença. Cada lead recebe resposta em segundos.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Aprende seu escritório</h2>
            <p className="text-sm text-muted-foreground">Configure nicho, tom e fluxos. Laura adapta a abordagem a cada caso.</p>
          </div>
        </section>

        <section className="space-y-4 mb-20">
          <h2 className="font-display text-3xl font-bold">Como funciona a SDR IA jurídica?</h2>
          <ol className="space-y-4 text-muted-foreground">
            <li><strong className="text-foreground">1. Lead chega no WhatsApp</strong> — Vindo de Google Ads, Meta Ads ou indicação.</li>
            <li><strong className="text-foreground">2. Laura atende em segundos</strong> — Cumprimenta, identifica o caso e o nicho jurídico.</li>
            <li><strong className="text-foreground">3. Qualifica e classifica</strong> — Marca como quente, morno ou frio com base nas respostas.</li>
            <li><strong className="text-foreground">4. Agenda reunião</strong> — Direto na agenda do advogado responsável pela área.</li>
            <li><strong className="text-foreground">5. Notifica o advogado</strong> — WhatsApp do advogado correto recebe o aviso na hora.</li>
          </ol>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-10 text-center space-y-4">
          <h2 className="font-display text-3xl font-bold">Conheça a Laura agora</h2>
          <p className="text-muted-foreground">Demo gratuita. Converse com ela no WhatsApp.</p>
          <Link to="/ia"><Button size="lg">Testar Laura SDR</Button></Link>
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

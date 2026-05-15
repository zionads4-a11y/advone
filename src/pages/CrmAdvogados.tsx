import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageSquare, Calendar, Kanban, FileText, Shield, ArrowRight } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.png";

const features = [
  { icon: MessageSquare, title: "WhatsApp integrado com IA", desc: "Laura SDR atende, qualifica e agenda reuniões 24h por dia direto no WhatsApp do escritório." },
  { icon: Kanban, title: "Kanban de leads jurídicos", desc: "Funil de 9 etapas pronto para advocacia: contato, atendimento, agendado, ganho e perdido." },
  { icon: Calendar, title: "Agenda integrada ao Google", desc: "Sincroniza com Google Calendar de cada advogado e envia lembretes automáticos via WhatsApp." },
  { icon: FileText, title: "Gestão de processos e clientes", desc: "Cadastro de clientes, processos CNJ, monitoramento Escavador e geração de contratos." },
  { icon: Shield, title: "LGPD e segurança", desc: "Dados isolados por escritório, RLS no banco e compliance com a LGPD para dados de clientes." },
  { icon: CheckCircle2, title: "Sem instalação", desc: "100% web. Acesse de qualquer dispositivo, sem precisar instalar nada no computador do escritório." },
];

export default function CrmAdvogados() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>CRM para Advogados — Software Jurídico Completo | AdvOne</title>
        <meta name="description" content="O CRM para advogados nº 1 do Brasil: IA no WhatsApp, kanban de leads, agenda integrada e gestão de processos. Teste o software jurídico AdvOne grátis." />
        <link rel="canonical" href="https://advone.online/crm-advogados" />
        <meta property="og:title" content="CRM para Advogados — Software Jurídico Completo | AdvOne" />
        <meta property="og:description" content="IA SDR no WhatsApp, kanban de leads, agenda e processos. Teste o CRM AdvOne grátis." />
        <meta property="og:url" content="https://advone.online/crm-advogados" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "AdvOne — CRM para Advogados",
          description: "Software jurídico com CRM, IA no WhatsApp, agenda e gestão de processos.",
          brand: { "@type": "Brand", name: "AdvOne" },
          offers: { "@type": "Offer", price: "397", priceCurrency: "BRL", url: "https://advone.online/crm-advogados" },
        })}</script>
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne CRM para advogados" className="h-10 w-auto" /></Link>
          <Link to="/auth"><Button>Testar grátis</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        <section className="text-center space-y-6 mb-20">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            CRM para Advogados feito para <span className="text-primary">vender mais</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            O AdvOne é o software jurídico que une CRM, IA no WhatsApp, agenda integrada e gestão de processos
            em uma única plataforma. Pensado para escritórios de advocacia que querem escalar atendimento sem aumentar a equipe.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Link to="/auth"><Button size="lg">Começar agora <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/ia"><Button size="lg" variant="outline">Ver demo da IA</Button></Link>
          </div>
        </section>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="rounded-xl border border-border bg-card p-6 space-y-3">
              <Icon className="h-8 w-8 text-primary" />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </section>

        <section className="space-y-6 mb-20">
          <h2 className="font-display text-3xl font-bold">Por que escritórios de advocacia escolhem o AdvOne?</h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>Diferente de CRMs genéricos, o AdvOne foi desenhado <strong>para o dia a dia da advocacia brasileira</strong>:
            qualifica leads por nicho (previdenciário, trabalhista, cível, família, criminal e tributário), entende OAB,
            CPF, número CNJ e integra com Escavador para monitorar processos automaticamente.</p>
            <p>O resultado é um <strong>sistema para advocacia</strong> que reduz o tempo perdido com leads frios,
            organiza o pipeline comercial e libera o advogado para focar no que importa: ganhar causas.</p>
          </div>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-10 text-center space-y-4">
          <h2 className="font-display text-3xl font-bold">Teste o CRM AdvOne grátis</h2>
          <p className="text-muted-foreground">Configure em minutos. Sem cartão de crédito.</p>
          <Link to="/auth"><Button size="lg">Criar minha conta</Button></Link>
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

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.png";

const posts = [
  {
    slug: "como-qualificar-leads-advocacia-whatsapp",
    title: "Como qualificar leads de advocacia pelo WhatsApp em 2026",
    excerpt: "Passo a passo para usar IA e roteiros para transformar conversas frias em reuniões agendadas.",
    date: "Em breve",
  },
  {
    slug: "sdr-humano-vs-ia-escritorio-advocacia",
    title: "SDR humano vs IA: qual escolher para escritório de advocacia",
    excerpt: "Comparativo de custo, conversão e escalabilidade entre SDR humana e IA jurídica.",
    date: "Em breve",
  },
  {
    slug: "lgpd-escritorios-advocacia-atendimento",
    title: "LGPD para escritórios: como atender no WhatsApp sem multa",
    excerpt: "Guia prático de compliance LGPD no atendimento jurídico digital.",
    date: "Em breve",
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Blog AdvOne — Conteúdo para advogados e escritórios | AdvOne</title>
        <meta name="description" content="Artigos sobre CRM, IA, WhatsApp, LGPD e gestão para escritórios de advocacia. Estratégias práticas para crescer seu escritório." />
        <link rel="canonical" href="https://advone.online/blog" />
        <meta property="og:title" content="Blog AdvOne — Conteúdo para advogados" />
        <meta property="og:description" content="Estratégias de CRM, IA e gestão para escritórios de advocacia." />
        <meta property="og:url" content="https://advone.online/blog" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne" className="h-10 w-auto" /></Link>
          <Link to="/auth"><Button>Testar grátis</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-16">
        <section className="text-center space-y-4 mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Blog AdvOne</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estratégias práticas de CRM, IA, WhatsApp e gestão para escritórios de advocacia que querem crescer.
          </p>
        </section>

        <section className="grid gap-6">
          {posts.map((post) => (
            <article key={post.slug} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{post.date}</p>
              <h2 className="text-xl md:text-2xl font-semibold mb-2">{post.title}</h2>
              <p className="text-muted-foreground">{post.excerpt}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 rounded-2xl bg-primary/5 border border-primary/20 p-10 text-center space-y-4">
          <h2 className="font-display text-2xl font-bold">Quer receber conteúdo novo?</h2>
          <p className="text-muted-foreground">Em breve: newsletter quinzenal com estratégias de crescimento para advogados.</p>
          <Link to="/auth"><Button size="lg">Criar conta AdvOne <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
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

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, Share2 } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.webp";

export default function PostQualificarLeads() {
  const post = {
    title: "Como qualificar leads de advocacia pelo WhatsApp em 2026",
    description: "Aprenda a estratégia definitiva para qualificar leads jurídicos no WhatsApp usando IA e roteiros de atendimento que convertem curiosos em clientes.",
    date: "15 de Maio, 2026",
    author: "Equipe AdvOne",
    category: "Gestão e Vendas",
    url: "https://advone.online/blog/como-qualificar-leads-advocacia-whatsapp"
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{post.title} | Blog AdvOne</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={post.url} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={post.url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.description,
          "author": { "@type": "Organization", "name": "AdvOne" },
          "datePublished": "2026-05-15",
          "publisher": { "@type": "Organization", "name": "AdvOne" }
        })}</script>
      </Helmet>

      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne" className="h-10 w-auto" /></Link>
          <Link to="/auth"><Button size="sm">Começar Grátis</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/blog" className="flex items-center text-primary mb-8 hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Blog
        </Link>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <header className="mb-10 space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-medium">{post.category}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 6 min de leitura</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">{post.title}</h1>
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">A</div>
              <div>
                <p className="text-sm font-semibold">{post.author}</p>
                <p className="text-xs text-muted-foreground">{post.date}</p>
              </div>
            </div>
          </header>

          <p className="lead text-xl text-muted-foreground italic">
            Atender centenas de mensagens no WhatsApp e não fechar nenhum contrato é o pesadelo de muitos advogados. A solução? Uma qualificação de leads implacável.
          </p>

          <h2>O problema do WhatsApp na advocacia</h2>
          <p>
            O WhatsApp se tornou o canal número 1 de entrada de clientes. Porém, ele traz um desafio: o volume de "curiosos". Advogados perdem horas explicando termos básicos para pessoas que não têm perfil de cliente ou que nem possuem uma causa real.
          </p>

          <h2>1. O que é Qualificação de Leads Jurídicos?</h2>
          <p>
            Qualificar é o processo de filtrar quem realmente tem uma dor que seu escritório resolve e capacidade de contratação. Em 2026, fazer isso manualmente é impossível se você quer escala.
          </p>

          <h2>2. O Roteiro de Ouro para Qualificação</h2>
          <p>Para qualificar um lead jurídico no WhatsApp, você precisa descobrir quatro pontos fundamentais (BANT adaptado):</p>
          <ul>
            <li><strong>Necessidade:</strong> Ele realmente tem um problema jurídico ou apenas uma dúvida?</li>
            <li><strong>Urgência:</strong> O prazo está correndo? É para ontem?</li>
            <li><strong>Perfil:</strong> Ele se encaixa no seu nicho de atuação?</li>
            <li><strong>Autoridade:</strong> Ele é o tomador de decisão?</li>
          </ul>

          <h2>3. Usando IA (SDR Virtual) para Automatizar</h2>
          <p>
            A grande tendência em 2026 é o uso de <strong>SDRs Virtuais com IA</strong>, como a Laura do AdvOne. Em vez de um estagiário ou você mesmo fazer as perguntas básicas, a IA assume o primeiro contato em segundos.
          </p>
          <blockquote>
            "O lead que recebe resposta em menos de 5 minutos tem 21x mais chances de ser qualificado do que um atendido após 30 minutos."
          </blockquote>

          <h2>4. Classificação por "Temperatura"</h2>
          <p>Após a conversa inicial, seu CRM deve classificar o lead automaticamente:</p>
          <ul>
            <li><strong>Lead Quente:</strong> Caso urgente, no seu nicho, pronto para reunião. (Direcionar para o advogado agora!)</li>
            <li><strong>Lead Morno:</strong> Tem o problema, mas não tem pressa ou falta alguma informação. (Nutrir com conteúdo).</li>
            <li><strong>Lead Frio:</strong> Apenas curioso ou fora do nicho. (Encerrar com educação).</li>
          </ul>

          <h2>Conclusão</h2>
          <p>
            Qualificar leads no WhatsApp não é sobre ser mal-educado ou apressado, mas sim sobre respeitar o tempo do seu escritório. Use a tecnologia para filtrar o joio do trigo e foque sua energia jurídica apenas em quem vai assinar o contrato.
          </p>

          <div className="mt-16 p-8 rounded-2xl bg-primary text-primary-foreground space-y-4">
            <h3 className="text-2xl font-bold mt-0 text-white">Quer automatizar sua qualificação?</h3>
            <p className="text-primary-foreground/90">A IA Laura atende, qualifica e agenda reuniões no seu WhatsApp 24h por dia.</p>
            <Link to="/auth"><Button variant="secondary" size="lg">Testar Laura Grátis</Button></Link>
          </div>
        </article>
      </main>
    </div>
  );
}

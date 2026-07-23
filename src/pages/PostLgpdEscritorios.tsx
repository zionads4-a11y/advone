import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, Share2, ShieldCheck, Lock } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.webp";

export default function PostLgpdEscritorios() {
  const post = {
    title: "LGPD para escritórios: como atender no WhatsApp sem riscos",
    description: "Guia completo sobre compliance LGPD no atendimento jurídico via WhatsApp. Proteja os dados dos seus clientes e evite multas pesadas.",
    date: "17 de Maio, 2026",
    author: "Equipe AdvOne",
    category: "Compliance",
    url: "https://advone.online/blog/lgpd-escritorios-advocacia-atendimento"
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
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 5 min de leitura</span>
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

          <p className="lead text-xl text-muted-foreground">
            O WhatsApp é uma ferramenta poderosa, mas pode ser um campo minado jurídico para advogados que não se atentam à LGPD.
          </p>

          <h2>A responsabilidade do advogado</h2>
          <p>
            Como operadores do Direito, advogados lidam com dados sensíveis (saúde, filiação sindical, antecedentes). Pela Lei Geral de Proteção de Dados (LGPD), o escritório é o controlador desses dados e responde por qualquer vazamento ou uso indevido.
          </p>

          <div className="flex gap-4 p-6 bg-muted rounded-xl border border-border items-center">
            <ShieldCheck className="h-12 w-12 text-primary shrink-0" />
            <div>
              <p className="font-bold mb-0">Compliance Digital</p>
              <p className="text-sm mb-0">Não basta seguir o Estatuto da OAB; é preciso seguir a legislação de dados vigente.</p>
            </div>
          </div>

          <h2>1. Consentimento no Atendimento Inicial</h2>
          <p>
            O ideal é que, na primeira mensagem automática, seu escritório informe que os dados serão tratados para fins de triagem jurídica e peça um aceite tácito ou expresso.
          </p>
          <blockquote>
            "Ao continuar este atendimento, você concorda com o tratamento dos seus dados para fins de análise do seu caso jurídico conforme nossa Política de Privacidade."
          </blockquote>

          <h2>2. O Risco do Uso de Dispositivos Pessoais</h2>
          <p>
            Quando o lead fala no WhatsApp pessoal do advogado ou do estagiário, os dados do cliente saem do controle do escritório. Se esse colaborador sair da empresa, os dados sensíveis vão com ele. 
          </p>
          <p>
            <strong>Solução:</strong> Use um CRM centralizado (como o AdvOne) que isola as conversas em um ambiente corporativo, onde você pode revogar acessos a qualquer momento.
          </p>

          <h2>3. Retenção e Exclusão de Dados</h2>
          <p>
            Você não pode manter dados de leads "eternos" se o contrato não for fechado. A LGPD exige uma finalidade. Se o lead não virou cliente após X meses, o correto é anonimizar ou excluir esses registros, salvo se houver base legal para manutenção.
          </p>

          <h2>4. Segurança no Banco de Dados</h2>
          <p>
            Muitas "planilhas de leads" rolam soltas em grupos de WhatsApp. Isso é crime digital. Seus leads devem estar em bancos de dados seguros, com criptografia e RLS (Row Level Security), garantindo que apenas o advogado responsável veja os dados daquele cliente.
          </p>

          <h2>Conclusão</h2>
          <p>
            Atender pelo WhatsApp é inevitável, mas fazer isso de forma amadora é perigoso. Utilizar uma plataforma profissional que já nasceu pensada em privacidade garante que seu escritório foque em ganhar causas, e não em responder processos por vazamento de dados.
          </p>

          <div className="mt-16 p-8 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-5 w-5" />
              <span className="font-bold uppercase tracking-wider text-sm">Segurança Prioritária</span>
            </div>
            <h3 className="text-2xl font-bold mt-0">Proteja seu escritório com o AdvOne</h3>
            <p className="text-muted-foreground">Nossa plataforma utiliza criptografia de ponta e isolamento de dados por empresa para manter você em conformidade total com a LGPD.</p>
            <Link to="/auth"><Button variant="default">Conhecer Segurança AdvOne</Button></Link>
          </div>
        </article>
      </main>
    </div>
  );
}

import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, Share2 } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.png";

export default function PostSdrHumanoVsIa() {
  const post = {
    title: "SDR Humano vs IA: Qual escolher para seu escritório de advocacia",
    description: "Compare os custos, a eficiência e o ROI entre contratar um SDR humano ou utilizar uma IA Jurídica para o atendimento inicial do seu escritório.",
    date: "16 de Maio, 2026",
    author: "Equipe AdvOne",
    category: "Gestão e Eficiência",
    url: "https://advone.online/blog/sdr-humano-vs-ia-escritorio-advocacia"
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
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> 7 min de leitura</span>
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

          <h2>O dilema do crescimento</h2>
          <p>
            Todo escritório que investe em marketing digital (Google Ads ou Meta Ads) chega em um teto: o volume de leads se torna maior do que a capacidade dos advogados de atenderem com qualidade. É aqui que surge a dúvida: contrato um SDR (Sales Development Representative) ou uso Inteligência Artificial?
          </p>

          <h2>O que faz um SDR Jurídico?</h2>
          <p>
            O SDR é o profissional responsável pela primeira triagem. Ele filtra quem é cliente em potencial e quem não é, agendando a reunião para o advogado especialista. É uma função vital, mas cara e difícil de escalar.
          </p>

          <h2>1. O Custo: Humano vs IA</h2>
          <p>Vamos aos números médios de 2026 no mercado brasileiro:</p>
          <table className="min-w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2">Item</th>
                <th className="border border-border p-2">SDR Humano</th>
                <th className="border border-border p-2">IA (Laura SDR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2 font-medium">Salário + Encargos</td>
                <td className="border border-border p-2">R$ 3.500 - R$ 5.500</td>
                <td className="border border-border p-2">R$ 397 (Plano Base)</td>
              </tr>
              <tr>
                <td className="border border-border p-2 font-medium">Treinamento</td>
                <td className="border border-border p-2">30 a 60 dias</td>
                <td className="border border-border p-2">15 minutos</td>
              </tr>
              <tr>
                <td className="border border-border p-2 font-medium">Disponibilidade</td>
                <td className="border border-border p-2">44h semanais</td>
                <td className="border border-border p-2">168h semanais (24/7)</td>
              </tr>
              <tr>
                <td className="border border-border p-2 font-medium">Escalabilidade</td>
                <td className="border border-border p-2">Atende 1 por vez</td>
                <td className="border border-border p-2">Atende 1.000 ao mesmo tempo</td>
              </tr>
            </tbody>
          </table>

          <h2>2. O Fator Resposta Imediata</h2>
          <p>
            Na internet, a velocidade é tudo. Se um lead te chama no sábado às 22h, um SDR humano só responderá na segunda às 09h. Até lá, o lead já chamou outros 3 escritórios e provavelmente já agendou com quem respondeu primeiro. A IA ganha por nocaute aqui: ela responde em menos de 10 segundos.
          </p>

          <h2>3. A Qualidade Jurídica</h2>
          <p>
            Muitos temem que a IA seja "robótica". Porém, modelos modernos como a Laura SDR do AdvOne são treinados especificamente em nichos jurídicos. Ela sabe a diferença entre uma rescisão indireta e uma demissão por justa causa, e sabe quais perguntas fazer para cada caso.
          </p>

          <h2>Quando o SDR Humano ainda faz sentido?</h2>
          <p>
            O SDR humano é imbatível em casos de altíssimo ticket (high-end) ou negociações B2B complexas que exigem um lobby ou relacionamento prévio de anos. Para a advocacia de massa ou varejo (Trabalhista, Previdenciário, Cível, Família), a IA já superou o humano em ROI.
          </p>

          <h2>Conclusão</h2>
          <p>
            Para o pequeno e médio escritório, o SDR humano é um custo fixo pesado que impede o crescimento. A IA Jurídica é um custo variável baixo que impulsiona a escala. Começar com a IA e deixar os humanos apenas para a estratégia jurídica é o caminho mais lucrativo em 2026.
          </p>

          <div className="mt-16 p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center space-y-4">
            <h3 className="text-2xl font-bold mt-0">Dê o próximo passo na sua eficiência</h3>
            <p className="text-muted-foreground">Ative sua SDR virtual hoje e reduza seus custos de atendimento em até 90%.</p>
            <Link to="/auth"><Button size="lg">Ver Planos AdvOne</Button></Link>
          </div>
        </article>
      </main>
    </div>
  );
}

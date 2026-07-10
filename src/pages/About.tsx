import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Target, Shield, Users } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone.png";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Sobre a AdvOne — Empresa de Software Jurídico | AdvOne</title>
        <meta name="description" content="Conheça a AdvOne: empresa brasileira de software jurídico especializada em CRM, IA SDR e automação de WhatsApp para escritórios de advocacia." />
        <link rel="canonical" href="https://advone.online/sobre" />
        <meta property="og:title" content="Sobre a AdvOne" />
        <meta property="og:url" content="https://advone.online/sobre" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne" className="h-10 w-auto" /></Link>
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12 space-y-12">
        <section className="space-y-4">
          <h1 className="font-display text-4xl font-bold">Sobre a AdvOne</h1>
          <p className="text-lg text-muted-foreground">
            A <strong>AdvOne</strong> é uma empresa brasileira de tecnologia dedicada exclusivamente ao mercado jurídico.
            Desenvolvemos um CRM completo com inteligência artificial que ajuda escritórios de advocacia a atender,
            qualificar e agendar reuniões com potenciais clientes via WhatsApp, 24 horas por dia.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Target className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Nossa Missão</h2>
            <p className="text-muted-foreground">
              Democratizar o acesso à tecnologia jurídica, permitindo que escritórios de qualquer porte
              — do advogado solo à banca com dezenas de operadores — automatizem seu atendimento e
              aumentem sua conversão de leads em clientes.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Shield className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Nossos Valores</h2>
            <p className="text-muted-foreground">
              Transparência, segurança de dados (LGPD-first), respeito aos códigos éticos da OAB
              e melhoria contínua orientada pelo feedback dos escritórios que confiam na plataforma.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Users className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Quem Somos</h2>
            <p className="text-muted-foreground">
              Somos um time enxuto de engenheiros de software e especialistas em processos jurídicos.
              Trabalhamos lado a lado com escritórios reais para construir funcionalidades que
              resolvem problemas do dia a dia da advocacia brasileira.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Dados da Empresa</h2>
            <p className="text-muted-foreground text-sm space-y-1">
              <strong>Razão social:</strong> 54.253.906 DANIEL FELIPE VIANA MANACES<br />
              <strong>CNPJ:</strong> 54.253.906/0001-47<br />
              <strong>Porte:</strong> ME (Microempresa)<br />
              <strong>Natureza jurídica:</strong> Empresário Individual<br />
              <strong>Data de abertura:</strong> 08/03/2024<br />
              <strong>CNAE principal:</strong> 73.19-0-02 — Promoção de vendas<br />
              <strong>Endereço:</strong> Rua José Bartolota, 40 — Glória, Belo Horizonte/MG — CEP 30.830-440<br />
              <strong>Telefone:</strong> (31) 9805-1061<br />
              <strong>E-mail:</strong> contato@advone.online<br />
              <strong>Site:</strong> advone.online
            </p>
          </article>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 space-y-4">
          <h2 className="text-2xl font-bold">O que fazemos</h2>
          <p>
            A AdvOne oferece um <strong>software SaaS (Software as a Service)</strong> hospedado na nuvem que reúne, em uma única plataforma:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>CRM com kanban de leads especializado para advocacia</li>
            <li>Secretária virtual com IA (Laura) integrada ao WhatsApp</li>
            <li>Agenda sincronizada com Google Calendar</li>
            <li>Gestão de processos, clientes e contratos</li>
            <li>Assinatura eletrônica via ZapSign</li>
            <li>Monitoramento de processos judiciais via Escavador</li>
            <li>Financeiro integrado ao Asaas</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Nosso público-alvo são <strong>escritórios de advocacia brasileiros</strong> regularmente inscritos na OAB.
            Não vendemos para pessoas físicas fora do mercado jurídico.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AdvOne · <Link to="/terms" className="hover:underline">Termos</Link> · <Link to="/privacy" className="hover:underline">Privacidade</Link> · <Link to="/contato" className="hover:underline">Contato</Link>
        </div>
      </footer>
    </div>
  );
}

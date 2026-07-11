import { forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoAdvOne from "@/assets/logo-advone-light.png";
import heroBg from "@/assets/hero-bg-lp.jpg";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import { InteractiveChatDemo } from "@/components/landing/InteractiveChatDemo";
import { Reveal } from "@/components/landing/useScrollReveal";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import {
  Headphones,
  Kanban,
  CalendarDays,
  Wallet,
  MessageSquare,
  FileText,
  Briefcase,
  Users,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  BarChart3,
  Clock,
  Target,
  Play,
  Scale,
  Sparkles,
  GraduationCap,
  BookOpen,
  Gavel,
} from "lucide-react";

const stats = [
  { value: "9", label: "Módulos integrados na plataforma" },
  { value: "24/7", label: "Operação ininterrupta" },
  { value: "100%", label: "Compatível com LGPD" },
  { value: "72h", label: "Implantação assistida" },
];

const features = [
  { icon: Kanban, title: "CRM Jurídico com pipeline de 9 etapas", desc: "Funil desenhado para a advocacia: Novo, Atendimento, Qualificação, Agendamento, Reunião, Contrato, Ganho e Perdido. Governança total do primeiro contato ao encerramento." },
  { icon: Briefcase, title: "Gestão de clientes e processos (CNJ)", desc: "Cadastro 360° do cliente com contratos, procurações, documentos e vínculo direto aos processos judiciais monitorados diariamente." },
  { icon: CalendarDays, title: "Agenda com Google Calendar", desc: "Integração OAuth por advogado. Audiências, prazos e reuniões sincronizados em tempo real, com lembretes automatizados ao cliente." },
  { icon: Wallet, title: "Financeiro nativo com Asaas", desc: "Emissão e conciliação de honorários em PIX, boleto e cartão. Contas a pagar/receber, DRE gerencial e receita líquida em tempo real." },
  { icon: MessageSquare, title: "Atendimento centralizado no WhatsApp", desc: "Um único canal oficial para leads e clientes. Transcrição de áudios, histórico completo por contato e distribuição por advogado responsável." },
  { icon: FileText, title: "Elaboração assistida de peças", desc: "Módulo de IA jurídica para petições, contestações, recursos, mandados de segurança e contratos em .docx (padrão ABNT), com fundamentação citada." },
  { icon: Shield, title: "Monitoramento diário de processos", desc: "Integração com Escavador: consulta diária por CNJ e semanal por CPF. Alertas de novas movimentações no painel e via WhatsApp." },
  { icon: Users, title: "Multiusuário com 5 níveis de acesso", desc: "Administrador, Gerente, Membro, Operador e Cliente. Segregação de funções, RLS no banco de dados e trilha de auditoria." },
];

const valueProps = [
  {
    icon: Briefcase,
    title: "Uma única plataforma para toda a operação",
    desc: "Substitua planilhas, agendas paralelas, grupos de WhatsApp e sistemas financeiros avulsos. Do primeiro contato do lead ao recebimento do honorário, tudo em ambiente unificado, auditável e seguro.",
  },
  {
    icon: BarChart3,
    title: "Decisões baseadas em indicadores confiáveis",
    desc: "Dashboards de conversão por etapa, produtividade por advogado, retorno por origem de mídia e evolução financeira. Informação estruturada para o sócio-gestor tomar decisão com segurança.",
  },
  {
    icon: Shield,
    title: "Segurança, sigilo e conformidade",
    desc: "Arquitetura multiusuário com Row-Level Security, criptografia em trânsito e em repouso, controle de acessos por perfil e aderência às diretrizes da LGPD e da OAB para tratamento de dados sensíveis.",
  },
];

const testimonials = [
  {
    text: "Após a implantação do AdvOne, unificamos atendimento, pipeline comercial, agenda e financeiro em um único ambiente. A gestão passou a ser guiada por indicadores objetivos e a produtividade da equipe aumentou significativamente.",
    name: "Dr. Rafael Andrade",
    role: "Sócio-titular · Andrade Advocacia Previdenciária · São Paulo/SP",
  },
  {
    text: "A padronização do funil em nove etapas e a integração com a agenda dos advogados eliminaram retrabalho e perdas de prazo. A ferramenta trouxe disciplina operacional ao escritório sem burocratizar o atendimento.",
    name: "Dra. Camila Peixoto",
    role: "Sócia-gestora · Peixoto & Associados · Belo Horizonte/MG",
  },
  {
    text: "O monitoramento diário dos processos e o histórico consolidado por cliente reduziram nosso tempo de resposta e elevaram a percepção de qualidade do serviço prestado. É uma plataforma pensada para escritórios que buscam maturidade de gestão.",
    name: "Dr. Eduardo Ramalho",
    role: "Sócio-fundador · Ramalho Sociedade de Advogados · Curitiba/PR",
  },
];

// Floating particles for hero
const HeroParticles = forwardRef<HTMLDivElement>(function HeroParticles(_, ref) {
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[hsl(153,60%,45%)]"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.3 + 0.05,
            animation: `float${i % 3} ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float0 { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-30px) translateX(15px); } }
        @keyframes float1 { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(20px) translateX(-20px); } }
        @keyframes float2 { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-15px) translateX(-10px); } }
      `}</style>
    </div>
  );
});

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen bg-[hsl(220,25%,6%)] text-[hsl(220,10%,92%)]" id="home">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[hsl(220,20%,16%)] bg-[hsl(220,25%,6%)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <img
            src={logoAdvOne}
            alt="AdvOne"
            className="h-16 w-auto md:h-20 drop-shadow-[0_0_24px_hsl(153,60%,45%/0.55)] transition-transform hover:scale-105"
          />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#funcionalidades" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Funcionalidades</a>
            <a href="#gestao" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Gestão</a>
            <a href="#demo" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Demo</a>
            <a href="#ia-juridica" className="text-sm font-medium text-[hsl(38,90%,55%)] transition-colors hover:text-[hsl(45,95%,60%)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              IA Jurídica
            </a>
            <a href="#depoimentos" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Depoimentos</a>
            <a href="#planos" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth?mode=login")} className="text-[hsl(220,10%,70%)] hover:text-[hsl(153,60%,45%)]">
              Login
            </Button>
            <Button onClick={() => navigate("/signup?plan=admin")} className="gradient-primary text-[hsl(0,0%,100%)] font-semibold">
              Solicitar apresentação
            </Button>

          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,25%,6%)]/70 via-transparent to-[hsl(220,25%,6%)]" />
        </div>
        <HeroParticles />
        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text */}
            <div className="text-center lg:text-left">
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(153,60%,45%)]/30 bg-[hsl(153,60%,45%)]/10 px-4 py-1.5 text-sm text-[hsl(153,60%,45%)] animate-fade-in"
              >
                <Scale className="h-4 w-4" />
                Plataforma de gestão para escritórios de advocacia
              </div>
              <h1
                className="mb-6 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-5xl lg:text-6xl animate-slide-up"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                A gestão completa do seu <span className="gradient-text">escritório</span>,<br />em uma única plataforma.
              </h1>
              <p className="mx-auto mb-8 max-w-xl text-lg text-[hsl(220,10%,55%)] lg:mx-0 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                O AdvOne integra <strong className="text-[hsl(220,10%,80%)]">CRM jurídico, agenda, financeiro, gestão de processos e atendimento via WhatsApp</strong> em um único ambiente seguro e auditável. Uma solução desenvolvida para escritórios que buscam eficiência operacional, previsibilidade de receita e conformidade com a LGPD.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/signup?plan=admin")}
                  className="gradient-primary glow-primary px-8 py-6 text-lg font-semibold text-[hsl(0,0%,100%)] group"
                >
                  Solicitar apresentação
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <a
                  href="#demo"
                  className="flex items-center gap-2 text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]"
                >
                  <Play className="h-4 w-4" />
                  Conhecer a plataforma
                </a>
              </div>
              <p className="mt-4 text-sm text-[hsl(220,10%,45%)]">
                Implantação assistida em até 72h · Suporte especializado · Dados sob padrão LGPD
              </p>

            </div>

            {/* Right: Chat Demo */}
            <div className="hidden lg:flex justify-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <InteractiveChatDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4">
          {stats.map((s) => (
            <AnimatedCounter key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* Dashboard Mockup */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="text-center mb-12">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Painel de gestão</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Visão consolidada da operação do escritório.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[hsl(220,10%,55%)]">
            Indicadores de captação, conversão, produtividade e resultado financeiro reunidos em um único painel — com recortes por advogado, unidade, área de atuação e origem de mídia.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-r from-[hsl(153,60%,45%)]/10 via-[hsl(38,90%,55%)]/10 to-[hsl(153,60%,45%)]/10 blur-3xl rounded-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,28%,7%)] shadow-2xl shadow-[hsl(153,60%,45%)]/10 transition-transform duration-500 hover:scale-[1.01]">
              {/* Browser bar */}
              <div className="flex items-center gap-2 border-b border-[hsl(220,20%,16%)] bg-[hsl(220,28%,5%)] px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[hsl(0,70%,55%)]/80" />
                  <div className="h-3 w-3 rounded-full bg-[hsl(38,90%,55%)]/80" />
                  <div className="h-3 w-3 rounded-full bg-[hsl(153,60%,45%)]/80" />
                </div>
                <div className="ml-4 flex-1 rounded-md bg-[hsl(220,25%,9%)] px-3 py-1 text-xs text-[hsl(220,10%,50%)]">
                  app.advone.online/dashboard
                </div>
              </div>

              <div className="p-5 md:p-7 space-y-5">
                {/* Performance hero card */}
                <div className="rounded-xl border border-[hsl(220,20%,16%)] bg-gradient-to-br from-[hsl(220,28%,9%)] to-[hsl(220,28%,7%)] p-5 md:p-6">
                  <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex-1 min-w-[260px]">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(153,60%,55%)] flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(153,60%,55%)] animate-pulse" />
                        Performance do mês
                      </p>
                      <div className="flex items-baseline gap-3 mb-2">
                        <h3 className="text-4xl md:text-5xl font-bold text-[hsl(220,10%,95%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          38.4%
                        </h3>
                        <span className="rounded-md bg-[hsl(153,60%,45%)]/15 px-2 py-1 text-xs font-semibold text-[hsl(153,60%,55%)] flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Taxa de conversão
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(220,10%,60%)] mb-4">
                        47 contratos fechados de 122 leads recebidos. Cadência mantendo o ritmo.
                      </p>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[hsl(220,20%,16%)]">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(220,10%,50%)] mb-1">Faturamento</p>
                          <p className="text-lg font-bold text-[hsl(38,90%,55%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>R$ 142.380</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(220,10%,50%)] mb-1">Pipeline</p>
                          <p className="text-lg font-bold text-[hsl(210,80%,60%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>68</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(220,10%,50%)] mb-1">Perdidos</p>
                          <p className="text-lg font-bold text-[hsl(220,10%,70%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>7</p>
                        </div>
                      </div>
                    </div>
                    {/* Mini chart */}
                    <div className="flex-1 min-w-[260px] h-[140px] relative">
                      <svg viewBox="0 0 400 140" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(153,60%,45%)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="hsl(153,60%,45%)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0,110 C 40,90 60,40 100,50 C 140,60 160,100 200,95 C 240,90 260,30 300,25 C 340,20 360,70 400,60 L 400,140 L 0,140 Z"
                          fill="url(#chartGrad)"
                        />
                        <path
                          d="M 0,110 C 40,90 60,40 100,50 C 140,60 160,100 200,95 C 240,90 260,30 300,25 C 340,20 360,70 400,60"
                          fill="none"
                          stroke="hsl(153,60%,55%)"
                          strokeWidth="2.5"
                        />
                        {[
                          { x: 0, y: 110 }, { x: 100, y: 50 }, { x: 200, y: 95 }, { x: 300, y: 25 }, { x: 400, y: 60 }
                        ].map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="hsl(153,60%,55%)" />
                        ))}
                      </svg>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-[hsl(220,10%,45%)] px-1">
                        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <span key={d}>{d}</span>)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total de Leads", value: "122", icon: Users, color: "hsl(210,80%,60%)" },
                    { label: "Novos Leads", value: "23", sub: "Aguardando contato", icon: Target, color: "hsl(38,90%,55%)" },
                    { label: "Vendas Fechadas", value: "47", icon: TrendingUp, color: "hsl(153,60%,55%)" },
                    { label: "Faturamento", value: "R$ 142k", icon: Wallet, color: "hsl(45,95%,60%)" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,28%,8%)] p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(220,10%,55%)]">{kpi.label}</p>
                        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
                          <kpi.icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: kpi.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {kpi.value}
                      </p>
                      {kpi.sub && <p className="mt-1 text-[10px] text-[hsl(220,10%,55%)]">{kpi.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Bottom: Origin + Funnel */}
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,28%,8%)] p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-[hsl(220,10%,90%)] flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-[hsl(210,80%,60%)]" />
                        Leads por Origem
                      </h4>
                      <p className="text-[10px] text-[hsl(220,10%,50%)] mt-0.5">Distribuição por canal de aquisição</p>
                    </div>
                    <div className="flex items-end justify-around h-[120px] gap-3">
                      {[
                        { label: "Google", value: 58, height: 100 },
                        { label: "Meta", value: 41, height: 70 },
                        { label: "Orgânico", value: 23, height: 40 },
                      ].map((b) => (
                        <div key={b.label} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-[hsl(220,10%,80%)]">{b.value}</span>
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-[hsl(210,80%,55%)] to-[hsl(210,80%,65%)] transition-all"
                            style={{ height: `${b.height}px` }}
                          />
                          <span className="text-[10px] text-[hsl(220,10%,55%)]">{b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,28%,8%)] p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-[hsl(220,10%,90%)] flex items-center gap-2">
                        <Target className="h-4 w-4 text-[hsl(153,60%,55%)]" />
                        Status dos Leads
                      </h4>
                      <p className="text-[10px] text-[hsl(220,10%,50%)] mt-0.5">Funil de conversão</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="relative h-[120px] w-[120px] shrink-0">
                        <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(220,20%,14%)" strokeWidth="14" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(153,60%,55%)" strokeWidth="14"
                            strokeDasharray="95.5 251" strokeLinecap="butt" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(210,80%,60%)" strokeWidth="14"
                            strokeDasharray="70 251" strokeDashoffset="-95.5" strokeLinecap="butt" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(38,90%,55%)" strokeWidth="14"
                            strokeDasharray="48 251" strokeDashoffset="-165.5" strokeLinecap="butt" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-xl font-bold text-[hsl(220,10%,95%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>122</p>
                          <p className="text-[9px] text-[hsl(220,10%,50%)] uppercase tracking-wide">Total</p>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 text-xs">
                        {[
                          { label: "Ganhos", value: 47, color: "hsl(153,60%,55%)" },
                          { label: "Em atendimento", value: 34, color: "hsl(210,80%,60%)" },
                          { label: "Novos", value: 23, color: "hsl(38,90%,55%)" },
                          { label: "Perdidos", value: 18, color: "hsl(220,10%,40%)" },
                        ].map((s) => (
                          <div key={s.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="text-[hsl(220,10%,75%)]">{s.label}</span>
                            </div>
                            <span className="font-semibold text-[hsl(220,10%,90%)]">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Feature Pills */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)] py-12">
        <Reveal>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-6">
            {[
              "CRM Jurídico com pipeline configurável",
              "Gestão de clientes e contratos",
              "Processos judiciais monitorados (CNJ)",
              "Agenda integrada ao Google Calendar",
              "Financeiro nativo com Asaas",
              "Atendimento oficial via WhatsApp",
              "Elaboração assistida de peças (IA)",
              "Assinatura eletrônica via ZapSign",
              "Dashboards e relatórios gerenciais",
              "Multiusuário com 5 níveis de acesso",
              "Segurança em conformidade com a LGPD",
              "Implantação e suporte especializados",
            ].map((f) => (

              <span
                key={f}
                className="rounded-full border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] px-4 py-2 text-sm text-[hsl(220,10%,75%)] transition-all duration-300 hover:border-[hsl(153,60%,45%)]/40 hover:text-[hsl(153,60%,45%)] hover:scale-105 cursor-default"
              >
                {f}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Interactive Chat Demo - Mobile & dedicated section */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal direction="left">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Atendimento no WhatsApp</p>
              <h2 className="text-3xl font-bold md:text-4xl mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Atendimento profissional, <span className="gradient-text">disponível o tempo todo</span>.
              </h2>
              <p className="text-[hsl(220,10%,55%)] leading-relaxed mb-6">
                Módulo de atendimento inteligente integrado ao WhatsApp oficial do escritório. Faz a triagem inicial do caso, coleta as informações essenciais, propõe horários disponíveis na agenda do advogado responsável e mantém todo o histórico registrado no CRM — com supervisão humana a qualquer momento.
              </p>
              <ul className="space-y-4">
                {[
                  "Resposta imediata a novos contatos, inclusive fora do horário comercial",
                  "Transcrição automática de áudios e reconhecimento de terminologia jurídica",
                  "Identificação do contato como lead ou cliente ativo por CPF/CNPJ",
                  "Agendamento diretamente no Google Calendar do advogado responsável",
                  "Cadência estruturada de follow-up com textos e tempos configuráveis",
                  "Notificação imediata ao escritório a cada nova reunião confirmada",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[hsl(220,10%,75%)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(153,60%,45%)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

            </div>
          </Reveal>
          <Reveal direction="right" delay={200}>
            <InteractiveChatDemo />
          </Reveal>
        </div>
      </section>

      {/* Value Props */}
      <section id="vantagens" className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Por que o AdvOne</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              A plataforma pensada para <span className="gradient-text">escritórios que buscam maturidade de gestão</span>.
            </h2>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3">
            {valueProps.map((v, i) => (
              <Reveal key={v.title} delay={i * 150}>
                <div className="group rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 transition-all duration-500 hover:border-[hsl(153,60%,45%)]/30 hover:shadow-lg hover:shadow-[hsl(153,60%,45%)]/5 hover:-translate-y-1">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(153,60%,45%)]/10 text-[hsl(153,60%,45%)] transition-all duration-300 group-hover:bg-[hsl(153,60%,45%)]/20 group-hover:scale-110">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {v.title}
                  </h3>
                  <p className="text-[hsl(220,10%,55%)] leading-relaxed">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Módulos da plataforma</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Toda a operação do escritório em um só sistema.
            </h2>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="group rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-6 transition-all duration-500 hover:border-[hsl(153,60%,45%)]/30 hover:-translate-y-1">
                  <f.icon className="mb-4 h-8 w-8 text-[hsl(153,60%,45%)] transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="mb-2 font-semibold text-[hsl(220,10%,92%)]">{f.title}</h3>
                  <p className="text-sm text-[hsl(220,10%,55%)] leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How the Virtual Secretary Works */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <Reveal className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Fluxo operacional</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Do primeiro contato ao contrato assinado — com processo estruturado.
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-5">
            {[
              { step: "1", title: "Captação", desc: "Recepção do contato originado por indicação, site institucional ou campanhas de mídia paga, com atribuição de origem." },
              { step: "2", title: "Triagem", desc: "Registro do caso no CRM, identificação da área do direito envolvida e coleta das informações essenciais." },
              { step: "3", title: "Qualificação", desc: "Análise de viabilidade, classificação da prioridade e distribuição ao advogado responsável pela matéria." },
              { step: "4", title: "Agendamento", desc: "Reunião marcada no Google Calendar do advogado, com envio automatizado de lembretes ao cliente." },
              { step: "5", title: "Contratação", desc: "Envio de proposta, assinatura eletrônica do contrato e emissão de cobrança recorrente pelo módulo financeiro." },
            ].map((s, i) => (

              <Reveal key={s.step} delay={i * 120}>
                <div className="relative text-center group">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[hsl(153,60%,45%)] bg-[hsl(153,60%,45%)]/10 text-xl font-bold text-[hsl(153,60%,45%)] transition-all duration-300 group-hover:bg-[hsl(153,60%,45%)]/20 group-hover:scale-110" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {s.step}
                  </div>
                  <h4 className="mb-1 font-semibold">{s.title}</h4>
                  <p className="text-sm text-[hsl(220,10%,55%)]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gestão Completa do Escritório (ADM) */}
      <section id="gestao" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,25%,6%)] via-[hsl(220,25%,7%)] to-[hsl(220,25%,6%)]" />
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-1/3 -left-20 h-96 w-96 rounded-full bg-[hsl(153,60%,45%)]/15 blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 h-96 w-96 rounded-full bg-[hsl(200,80%,55%)]/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mb-14 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">
              Gestão integrada do escritório
            </p>
            <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight md:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Toda a operação do escritório em <span className="text-[hsl(153,60%,45%)]">um único ambiente</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[hsl(220,10%,65%)] md:text-lg">
              Substitua planilhas paralelas, controles manuais e sistemas desconectados por uma plataforma única que integra captação, atendimento, agenda, financeiro, processos judiciais e gestão documental — com trilha de auditoria e conformidade com a LGPD.
            </p>
          </Reveal>

          <Reveal>
            <div className="mb-16 grid grid-cols-2 gap-4 rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]/60 p-6 backdrop-blur md:grid-cols-4 md:gap-8 md:p-10">
              <div className="text-center">
                <p className="text-3xl font-bold text-[hsl(153,60%,45%)] md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>9</p>
                <p className="mt-1 text-xs text-[hsl(220,10%,55%)] md:text-sm">módulos integrados</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[hsl(153,60%,45%)] md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>5</p>
                <p className="mt-1 text-xs text-[hsl(220,10%,55%)] md:text-sm">níveis de acesso</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[hsl(153,60%,45%)] md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>100%</p>
                <p className="mt-1 text-xs text-[hsl(220,10%,55%)] md:text-sm">aderência à LGPD</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[hsl(153,60%,45%)] md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>72h</p>
                <p className="mt-1 text-xs text-[hsl(220,10%,55%)] md:text-sm">implantação assistida</p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Briefcase, title: "Clientes, contratos e processos", desc: "Cadastro estruturado do cliente com CPF/CNPJ, procurações, contratos e vínculo aos processos judiciais. Conversão do lead em cliente sem retrabalho.", items: ["Ficha 360° do cliente", "Vínculo lead → cliente → processo", "Contratos com assinatura eletrônica"] },
              { icon: Wallet, title: "Financeiro e cobrança recorrente", desc: "Módulo financeiro nativo integrado ao Asaas. Emissão, conciliação, contas a pagar e receber, DRE gerencial e visão de receita líquida em tempo real.", items: ["PIX, boleto e cartão", "Conciliação automatizada", "Indicadores em tempo real"] },
              { icon: BarChart3, title: "Dashboards e relatórios gerenciais", desc: "Indicadores de captação, conversão, produtividade e resultado financeiro consolidados por advogado, unidade, área de atuação e origem de mídia.", items: ["Conversão por etapa do funil", "Retorno por origem", "Produtividade por advogado"] },
              { icon: Users, title: "Multiusuário com governança", desc: "Cinco perfis de acesso (Administrador, Gerente, Membro, Operador e Cliente) com segregação de funções, Row-Level Security e trilha de auditoria completa.", items: ["Segregação de funções", "Auditoria de alterações", "Adequado a grupos e franquias"] },
              { icon: Kanban, title: "CRM Jurídico configurável", desc: "Pipeline padrão da advocacia em nove etapas, com cadência de follow-up parametrizável pelo gerente. Nenhum atendimento é esquecido ou perdido.", items: ["Etapas configuráveis", "Cadência parametrizável", "Distribuição por advogado"] },
              { icon: CalendarDays, title: "Agenda e compromissos", desc: "Integração OAuth por advogado com o Google Calendar. Audiências, prazos e reuniões sincronizados, com envio automatizado de lembretes ao cliente.", items: ["OAuth por advogado", "Sincronização bidirecional", "Lembretes automatizados"] },
              { icon: FileText, title: "Gestão documental e peças", desc: "Repositório documental por escritório com suporte a arquivos de grande porte. Elaboração assistida de peças no padrão ABNT com fundamentação citada.", items: ["Peças em .docx (ABNT)", "Modelos por escritório", "Armazenamento isolado por tenant"] },
              { icon: Shield, title: "Monitoramento processual (CNJ)", desc: "Integração com Escavador para consulta diária dos processos cadastrados e consulta semanal por CPF, com alertas de novas movimentações no painel.", items: ["Consulta diária por CNJ", "Consulta semanal por CPF", "Alertas no painel e no WhatsApp"] },
              { icon: Target, title: "Captação e atribuição de origem", desc: "Geração de links rastreáveis para campanhas em Google e Meta. Cada contato chega com origem, campanha e criativo identificados para análise de retorno.", items: ["Links UTM automatizados", "Origem por contato", "Análise de retorno por criativo"] },
            ].map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 70}>
                <div className="group h-full rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[hsl(153,60%,45%)]/40 hover:shadow-[0_20px_60px_-20px_hsl(153,60%,45%/0.25)]">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[hsl(153,60%,45%)]/10 transition-transform duration-300 group-hover:scale-110">
                    <pillar.icon className="h-5 w-5 text-[hsl(153,60%,45%)]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{pillar.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-[hsl(220,10%,60%)]">{pillar.desc}</p>
                  <ul className="space-y-1.5">
                    {pillar.items.map((it) => (
                      <li key={it} className="flex items-center gap-2 text-xs text-[hsl(220,10%,70%)]">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[hsl(153,60%,45%)]" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-3">
            {[
              { icon: Clock, title: "Foco do advogado no que é técnico-jurídico", desc: "A triagem, o agendamento e as rotinas administrativas são conduzidos pela plataforma. O tempo dos sócios e associados fica preservado para a atividade-fim." },
              { icon: BarChart3, title: "Gestão baseada em dados", desc: "O sócio-gestor deixa de decidir por percepção. Indicadores objetivos de captação, conversão e resultado financeiro guiam a alocação de recursos e o planejamento do escritório." },
              { icon: TrendingUp, title: "Escalabilidade com controle", desc: "A padronização de processos e a segregação de acessos permitem que o escritório cresça em volume e em número de unidades sem perda de qualidade ou de governança." },
            ].map((b, i) => (
              <Reveal key={b.title} delay={i * 100}>
                <div className="rounded-xl border border-[hsl(220,20%,16%)] bg-gradient-to-br from-[hsl(220,25%,9%)] to-[hsl(220,25%,7%)] p-6">
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Benefício</p>
                  <div className="mb-3 flex items-center gap-3">
                    <b.icon className="h-5 w-5 text-[hsl(153,60%,45%)]" />
                    <h4 className="text-base font-semibold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{b.title}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-[hsl(220,10%,60%)]">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16 text-center">
            <Button size="lg" onClick={() => navigate("/signup?plan=mensal")} className="gradient-primary text-[hsl(0,0%,100%)] font-semibold shadow-[0_10px_40px_-10px_hsl(153,60%,45%/0.5)]">
              Solicitar uma apresentação
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-3 text-xs text-[hsl(220,10%,55%)]">Implantação assistida em 72h · Suporte especializado</p>
          </Reveal>

        </div>
      </section>

      {/* IA Jurídica Premium */}
      <section id="ia-juridica" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,25%,6%)] via-[hsl(220,25%,8%)] to-[hsl(220,25%,6%)]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-[hsl(38,90%,55%)]/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-[hsl(153,60%,45%)]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <Reveal className="text-center mb-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(38,90%,55%)]/40 bg-[hsl(38,90%,55%)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[hsl(38,90%,55%)]">
              <Sparkles className="h-3.5 w-3.5" />
              Módulo complementar
            </div>
            <h2 className="text-3xl font-bold md:text-5xl mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="bg-gradient-to-r from-[hsl(38,90%,55%)] via-[hsl(45,95%,60%)] to-[hsl(38,90%,55%)] bg-clip-text text-transparent">Inteligência artificial</span> aplicada
              <br />
              à produção jurídica.
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[hsl(220,10%,65%)] leading-relaxed">
              Assistente de redação treinada em legislação brasileira e jurisprudência dos tribunais superiores para apoiar a elaboração de petições, contestações, recursos, mandados de segurança, contratos e pareceres — sempre com revisão final do advogado.
            </p>

          </Reveal>

          <div className="grid gap-10 lg:grid-cols-2 items-center mb-16">
            {/* Mockup Chat IA */}
            <Reveal direction="left">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-[hsl(38,90%,55%)]/20 via-[hsl(153,60%,45%)]/10 to-[hsl(38,90%,55%)]/20 blur-2xl rounded-3xl" />
                <div className="relative rounded-2xl border border-[hsl(38,90%,55%)]/20 bg-[hsl(220,28%,8%)] p-6 shadow-2xl">
                  <div className="mb-4 flex items-center gap-3 border-b border-[hsl(220,20%,16%)] pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(38,90%,55%)] to-[hsl(45,95%,60%)] text-[hsl(220,25%,6%)]">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[hsl(220,10%,92%)]">IA Jurídica AdvOne</p>
                      <p className="text-xs text-[hsl(153,60%,55%)] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(153,60%,55%)] animate-pulse" />
                        Online · Assistente jurídica
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[hsl(153,60%,45%)]/20 px-4 py-2.5 text-[hsl(220,10%,90%)]">
                      Preciso de uma petição inicial trabalhista por horas extras não pagas.
                    </div>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-[hsl(220,25%,12%)] px-4 py-3 text-[hsl(220,10%,80%)] border border-[hsl(220,20%,16%)]">
                      <p className="mb-2 text-xs font-bold text-[hsl(38,90%,55%)] uppercase tracking-wide">Petição Inicial — Reclamação Trabalhista</p>
                      <p className="text-[13px] leading-relaxed">
                        EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DO TRABALHO DA __ª VARA…<br /><br />
                        <span className="text-[hsl(220,10%,55%)]">[fundamentação com art. 59 da CLT, Súmula 85 TST, jurisprudência…]</span>
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-[hsl(38,90%,55%)]">
                        <Sparkles className="h-3 w-3" />
                        Pronta para download em .docx (ABNT)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Diferenciais */}
            <Reveal direction="right" delay={150}>
              <div className="space-y-5">
                {[
                  {
                    icon: GraduationCap,
                    title: "Treinada em Direito brasileiro",
                    desc: "Especializada em Constitucional, Civil, Trabalhista, Previdenciário e Tributário com base na legislação vigente.",
                  },
                  {
                    icon: Gavel,
                    title: "Petições prontas em segundos",
                    desc: "Iniciais, contestações, recursos, embargos, mandados de segurança, habeas corpus.",
                  },
                  {
                    icon: BookOpen,
                    title: "Contratos e pareceres técnicos",
                    desc: "Cíveis, empresariais, trabalhistas, locação, prestação de serviços. Tudo com base legal citada.",
                  },
                  {
                    icon: FileText,
                    title: "Export direto em .docx (ABNT)",
                    desc: "Times New Roman, margens corretas. Edite no Word e protocole no mesmo dia.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 group">
                    <div className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(38,90%,55%)]/10 text-[hsl(38,90%,55%)] border border-[hsl(38,90%,55%)]/20 transition-all duration-300 group-hover:bg-[hsl(38,90%,55%)]/20 group-hover:scale-110">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[hsl(220,10%,92%)] mb-1">{item.title}</h4>
                      <p className="text-sm text-[hsl(220,10%,60%)] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Comparativo de tempo */}
          <Reveal>
            <div className="rounded-2xl border border-[hsl(38,90%,55%)]/20 bg-gradient-to-r from-[hsl(220,25%,9%)] via-[hsl(220,25%,10%)] to-[hsl(220,25%,9%)] p-8 md:p-10">
              <div className="grid gap-8 md:grid-cols-3 text-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,55%)] mb-2">Sem IA Jurídica</p>
                  <p className="text-4xl font-bold text-[hsl(0,70%,60%)] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>2–4h</p>
                  <p className="text-sm text-[hsl(220,10%,55%)]">por petição</p>
                </div>
                <div className="border-x border-[hsl(220,20%,16%)] px-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[hsl(38,90%,55%)] mb-2">Com IA Jurídica</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-[hsl(38,90%,55%)] to-[hsl(45,95%,60%)] bg-clip-text text-transparent mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>30s</p>
                  <p className="text-sm text-[hsl(220,10%,55%)]">primeira versão pronta</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[hsl(220,10%,55%)] mb-2">Tempo recuperado</p>
                  <p className="text-4xl font-bold text-[hsl(153,60%,55%)] mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>+240x</p>
                  <p className="text-sm text-[hsl(220,10%,55%)]">para fechar contratos</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup?plan=completo")}
                  className="bg-gradient-to-r from-[hsl(38,90%,55%)] to-[hsl(45,95%,60%)] hover:opacity-90 text-[hsl(220,25%,6%)] font-bold px-8 py-6 text-base shadow-lg shadow-[hsl(38,90%,55%)]/20"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Solicitar demonstração do módulo
                </Button>
                <p className="text-xs text-[hsl(220,10%,50%)]">Disponível como módulo complementar em todos os planos</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      <section id="depoimentos">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Escritórios que utilizam o AdvOne</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Referências no mercado da advocacia.
            </h2>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 150}>
                <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 transition-all duration-500 hover:border-[hsl(153,60%,45%)]/20 hover:-translate-y-1">
                  <div className="mb-4 flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-[hsl(38,92%,50%)] text-[hsl(38,92%,50%)]" />
                    ))}
                  </div>
                  <blockquote className="mb-6 text-[hsl(220,10%,75%)] leading-relaxed italic">
                    "{t.text}"
                  </blockquote>
                  <div>
                    <p className="font-semibold text-[hsl(220,10%,92%)]">{t.name}</p>
                    <p className="text-sm text-[hsl(220,10%,55%)]">{t.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Planos</p>
            <h2 className="text-3xl font-bold md:text-4xl mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ESCOLHA SUA FORMA DE PAGAMENTO
            </h2>
            <p className="text-[hsl(220,10%,60%)] max-w-2xl mx-auto">
              Tudo que seu escritório precisa para nunca mais perder um lead.
            </p>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {/* Plano Mensal */}
            <Reveal delay={0}>
              <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col h-full transition-all duration-500 hover:border-[hsl(153,60%,45%)]/30 hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(220,20%,16%)] px-3 py-1 text-xs font-semibold text-[hsl(220,10%,75%)]">PAGAMENTO MENSAL</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[hsl(220,10%,92%)] mb-2">Mais flexibilidade</h3>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "Mesmo acesso completo à plataforma",
                    "Sem fidelidade",
                    "Cancele quando quiser",
                    "Ativação rápida em até 24h"
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="w-full bg-transparent border border-[hsl(220,20%,16%)] hover:bg-[hsl(220,20%,16%)] text-[hsl(220,10%,92%)] font-bold py-6"
                >
                  COMEÇAR AGORA
                </Button>
              </div>
            </Reveal>

            {/* Plano Semestral */}
            <Reveal delay={100}>
              <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col h-full transition-all duration-500 hover:border-[hsl(153,60%,45%)]/30 hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(220,20%,16%)] px-3 py-1 text-xs font-semibold text-[hsl(220,10%,75%)]">PAGAMENTO SEMESTRAL</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[hsl(220,10%,92%)] mb-2">Economia intermediária</h3>
                  <p className="mt-2 text-[hsl(153,60%,45%)] font-bold text-sm">Plano 6 meses</p>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "Mesmo acesso completo",
                    "Compromisso de 6 meses",
                    "Ativação rápida"
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="w-full bg-transparent border border-[hsl(220,20%,16%)] hover:bg-[hsl(220,20%,16%)] text-[hsl(220,10%,92%)] font-bold py-6"
                >
                  COMEÇAR AGORA
                </Button>
              </div>
            </Reveal>

            {/* Plano Anual */}
            <Reveal delay={200}>
              <div className="relative rounded-2xl border-2 border-[hsl(153,60%,45%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col h-full shadow-xl shadow-[hsl(153,60%,45%)]/10 transition-all duration-500 hover:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(153,60%,45%)] px-4 py-1 text-xs font-bold text-[hsl(220,25%,6%)]">
                  MELHOR CUSTO-BENEFÍCIO
                </div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(153,60%,45%)]/15 px-3 py-1 text-xs font-semibold text-[hsl(153,60%,45%)]">PAGAMENTO ANUAL</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[hsl(220,10%,92%)] mb-2 text-[hsl(153,60%,45%)]">Economia máxima</h3>
                  <p className="mt-2 text-[hsl(153,60%,45%)] font-bold text-sm">Plano 12 meses</p>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "Acesso completo vitalício (no período)",
                    "Suporte prioritário exclusivo",
                    "Gerente de conta dedicado",
                    "Sistema completo AdvOne",
                    "Todas as funcionalidades inclusas"
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} 
                  size="lg"
                  className="w-full bg-gradient-to-r from-[hsl(153,60%,45%)] to-[hsl(153,70%,55%)] hover:opacity-90 text-[hsl(220,25%,6%)] font-bold text-lg py-6 shadow-lg shadow-[hsl(153,60%,45%)]/20"
                >
                  QUERO ECONOMIZAR
                </Button>
              </div>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              "Secretária Virtual Jurídica com IA 24h",
              "Atendimento automático no seu WhatsApp",
              "Qualificação inteligente dos leads",
              "Agendamento automático na sua agenda",
              "Follow-up automático",
              "CRM Jurídico completo com Kanban",
              "Agenda + Financeiro integrados",
              "Templates e documentos ilimitados",
              "Monitoramento de Processos (R$ 2,50/processo)"
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)]">
                <div className="h-5 w-5 flex items-center justify-center rounded-full bg-[hsl(153,60%,45%)]/20 text-[hsl(153,60%,45%)]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-[hsl(220,10%,80%)]">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-30" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,25%,6%)] via-transparent to-[hsl(220,25%,6%)]" />
        </div>
        <HeroParticles />
        <Reveal>
          <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
            <h2 className="mb-6 text-3xl font-bold md:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              O AdvOne é uma plataforma completa de{" "}
              <span className="gradient-text">gestão e inteligência</span> para escritórios de advocacia.
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-[hsl(220,10%,55%)]">
              Automatize o atendimento, organize seus leads, controle o financeiro e gerencie processos — tudo em um único CRM com inteligência artificial.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/signup?plan=mensal")}
              className="gradient-primary glow-primary px-10 py-6 text-lg font-semibold text-[hsl(0,0%,100%)] group"
            >
              Começar agora
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(220,20%,16%)] bg-[hsl(220,28%,5%)]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <img
                src={logoAdvOne}
                alt="AdvOne"
                className="h-14 w-auto drop-shadow-[0_0_20px_hsl(153,60%,45%/0.5)]"
              />
              <p className="text-xs text-[hsl(220,10%,55%)] leading-relaxed">
                CRM jurídico com IA no WhatsApp para escritórios de advocacia brasileiros.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Produto</h3>
              <a href="#funcionalidades" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Funcionalidades</a>
              <a href="#demo" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Demo</a>
              <Link to="/crm-advogados" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">CRM para advogados</Link>
              <Link to="/whatsapp-advogados" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">WhatsApp com IA</Link>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Empresa</h3>
              <Link to="/sobre" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Sobre a AdvOne</Link>
              <Link to="/contato" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Contato</Link>
              <Link to="/blog" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Blog</Link>
              <button onClick={() => navigate("/auth")} className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Login</button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Legal</h3>
              <Link to="/privacy" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Política de Privacidade</Link>
              <Link to="/terms" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Termos de Uso</Link>
              <Link to="/seguranca" className="block text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Segurança e LGPD</Link>
            </div>
          </div>

          <div className="mt-10 border-t border-[hsl(220,20%,16%)] pt-6 space-y-2 text-center text-xs text-[hsl(220,10%,45%)]">
            <p>
              <strong className="text-[hsl(220,10%,65%)]">AdvOne</strong> — 54.253.906 DANIEL FELIPE VIANA MANACES ·
              CNPJ 54.253.906/0001-47
            </p>
            <p>
              Rua José Bartolota, 40 — Glória, Belo Horizonte/MG — CEP 30.830-440 · Brasil
            </p>
            <p>
              Contato: <a href="mailto:contato@advone.online" className="hover:text-[hsl(153,60%,45%)]">contato@advone.online</a> ·
              Telefone: <a href="tel:+553198051061" className="hover:text-[hsl(153,60%,45%)]">(31) 9805-1061</a> ·
              DPO/LGPD: <a href="mailto:dpo@advone.online" className="hover:text-[hsl(153,60%,45%)]">dpo@advone.online</a>
            </p>
            <p className="pt-2">
              © {new Date().getFullYear()} AdvOne. Todos os direitos reservados. WhatsApp é marca registrada da Meta Platforms, Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

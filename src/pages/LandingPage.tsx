import { forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoAdvOne from "@/assets/logo-advone-light.png";
import logoAdvOneHero from "@/assets/logo-advone-hero.png";
import heroBg from "@/assets/hero-bg-lp.jpg";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import { InteractiveChatDemo } from "@/components/landing/InteractiveChatDemo";
import { DemoRequestDialog } from "@/components/landing/DemoRequestDialog";
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
  { value: "5min", label: "Para sua IA estar no ar captando" },
  { value: "24/7", label: "Atendendo enquanto você advoga" },
  { value: "9", label: "Módulos que substituem 6 sistemas" },
  { value: "72h", label: "Implantação com time dedicado" },
];

const features = [
  { icon: MessageSquare, title: "Sua IA responde em segundos — sempre", desc: "3h da manhã, feriado, audiência: enquanto o concorrente demora, sua IA já cumprimentou, entendeu o caso e disse que você retorna. Nenhum lead cai no esquecimento." },
  { icon: Zap, title: "Só chega até você quem quer contratar", desc: "A IA conversa, qualifica por área e urgência, e classifica o lead. Você só entra em cena quando o caso vale seu tempo — e já com histórico na mão." },
  { icon: CalendarDays, title: "Agenda cheia no piloto automático", desc: "A IA consulta o Google Calendar do advogado responsável, propõe horários e confirma a reunião direto no chat. Lembretes automáticos eliminam faltas." },
  { icon: Kanban, title: "CRM que trabalha enquanto você advoga", desc: "Pipeline de 9 etapas próprio da advocacia. Cadência de follow-up automatizada em 5 tentativas. Nenhum contato esquecido, nenhuma oportunidade perdida." },
  { icon: Shield, title: "Monitoramento CNJ direto no WhatsApp", desc: "Sentença publicada, prazo abrindo, andamento crítico — o cliente é avisado no WhatsApp e você recebe alerta no painel. Cobertura de todos os tribunais do país." },
  { icon: FileText, title: "Cálculos jurídicos integrados de verdade", desc: "Calculadora previdenciária, trabalhista e de dívida com margem de servidor federal, estadual e municipal. O que era planilha e retrabalho vira 3 cliques." },
  { icon: Wallet, title: "Financeiro que fecha o mês sozinho", desc: "Cobrança recorrente via PIX, boleto e cartão pelo Asaas. Conciliação automática, DRE gerencial e receita líquida em tempo real — sem contador extra." },
  { icon: Users, title: "Time inteiro dentro, sem cobrar por usuário", desc: "Advogados, secretárias, estagiários — todos com acesso segregado por perfil, sem taxa por licença. Escale o escritório sem inflar a fatura." },
];

const valueProps = [
  {
    icon: Zap,
    title: "CHEGA DE PERDER LEAD NO VÁCUO",
    desc: "83% dos clientes fecham com quem responde primeiro. Enquanto você está em audiência, sua IA já cumprimentou, qualificou e marcou a reunião — no seu WhatsApp, com sua voz, sem parecer robô.",
  },
  {
    icon: Briefcase,
    title: "CHEGA DE PLANILHA, GRUPO E CRM CARO",
    desc: "Substitua 6 ferramentas por uma. CRM, agenda, financeiro, WhatsApp, processos e cálculos jurídicos no mesmo ambiente — auditável, seguro e sem cobrar por usuário adicional.",
  },
  {
    icon: Shield,
    title: "CHEGA DE PERDER PRAZO DE PROCESSO",
    desc: "Monitoramento CNJ de todos os tribunais do Brasil. Andamento novo, sentença ou prazo crítico dispara alerta no painel e mensagem automática pro cliente no WhatsApp — antes de virar problema.",
  },
];

const testimonials = [
  {
    text: "Antes o WhatsApp virava um caos no fim de semana. Hoje a IA responde na hora, marca a reunião e eu chego na segunda com a agenda cheia. Parei de perder cliente para escritório maior só porque respondia mais rápido.",
    name: "Dr. Rafael Andrade",
    role: "Sócio-titular · Andrade Advocacia Previdenciária · São Paulo/SP",
  },
  {
    text: "Tirei três sistemas do ar e enfiei tudo no AdvOne: CRM, financeiro, agenda e processos. O que a equipe perdia enroscando em planilha virou tempo de audiência. Pagou o investimento no primeiro mês.",
    name: "Dra. Camila Peixoto",
    role: "Sócia-gestora · Peixoto & Associados · Belo Horizonte/MG",
  },
  {
    text: "O que me convenceu não foi a IA — foi o monitoramento dos processos avisando o cliente antes de mim. A percepção de qualidade subiu, o volume de ligação de cliente ansioso caiu e o meu whatsapp voltou a ser meu.",
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
            alt="Logo AdvOne CRM Jurídico"
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
            <DemoRequestDialog
              source="landing-nav"
              trigger={
                <Button className="gradient-primary text-[hsl(0,0%,100%)] font-semibold">
                  Solicitar apresentação
                </Button>
              }
            />

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
                A plataforma que atende, capta e gerencia por você
              </div>
              <h1
                className="mb-6 text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-5xl lg:text-6xl animate-slide-up"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Enquanto você advoga, o <span className="gradient-text">AdvOne</span> fecha o próximo cliente no WhatsApp.
              </h1>
              <p className="mx-auto mb-8 max-w-xl text-lg text-[hsl(220,10%,55%)] lg:mx-0 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                Seu concorrente responde em segundos. Com o AdvOne, sua <strong className="text-[hsl(220,10%,80%)]">IA jurídica atende no WhatsApp, qualifica o caso, marca a reunião na sua agenda</strong> e ainda gerencia processos, financeiro e cálculos — tudo em um lugar. Você entra em cena só pra fechar.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <DemoRequestDialog
                  source="landing-hero"
                  trigger={
                    <Button
                      size="lg"
                      className="gradient-primary glow-primary px-8 py-6 text-lg font-semibold text-[hsl(0,0%,100%)] group"
                    >
                      Quero parar de perder lead
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  }
                />
                <a
                  href="#demo"
                  className="flex items-center gap-2 text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]"
                >
                  <Play className="h-4 w-4" />
                  Ver a IA em ação
                </a>
              </div>
              <p className="mt-4 text-sm text-[hsl(220,10%,45%)]">
                ✓ Ativo em minutos · ✓ Sem cartão de crédito · ✓ Suporte humano em português
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
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Painel do sócio-gestor</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            O escritório inteiro em uma tela. Sem achismo, sem planilha.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[hsl(220,10%,55%)]">
            Quanto entrou, quanto converteu, quem produziu mais e de onde vieram os leads que fecharam — em tempo real, com recorte por advogado, unidade, área e origem de mídia. O tipo de dado que faz o sócio decidir com segurança.
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
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">IA no WhatsApp</p>
              <h2 className="text-3xl font-bold md:text-4xl mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Do "oi" à reunião marcada — <span className="gradient-text">sem você tocar em nada</span>.
              </h2>
              <p className="text-[hsl(220,10%,55%)] leading-relaxed mb-6">
                Sua IA cumprimenta, entende o caso, pergunta só o que importa, identifica se o contato já é cliente pelo CPF, propõe horário na agenda do advogado responsável e confirma a reunião. Você recebe o lead com histórico completo — é só entrar e advogar.
              </p>
              <ul className="space-y-4">
                {[
                  "Responde na hora, inclusive fora do horário — sem robotizar",
                  "Transcreve áudio e entende juridiquês do lead",
                  "Diferencia lead novo de cliente antigo pelo CPF/CNPJ",
                  "Agenda direto no Google Calendar do advogado certo",
                  "Cadência de 5 follow-ups automáticos para lead que sumiu",
                  "Alerta o escritório no momento em que a reunião é confirmada",
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
              Enquanto o concorrente demora, <span className="gradient-text">você já fechou</span>.
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
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">O que você ganha</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Tudo que seu escritório precisa pra crescer — sem contratar ninguém.
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
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Como funciona</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              5 passos automáticos. Você só entra em cena pra <span className="gradient-text">fechar</span>.
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
            <DemoRequestDialog
              source="landing-planos"
              trigger={
                <Button size="lg" className="gradient-primary text-[hsl(0,0%,100%)] font-semibold shadow-[0_10px_40px_-10px_hsl(153,60%,45%/0.5)]">
                  Quero ver a IA rodando no meu escritório
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              }
            />
            <p className="mt-3 text-xs text-[hsl(220,10%,55%)]">Ativo em minutos · Sem cartão de crédito · Suporte humano BR</p>
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
                <DemoRequestDialog
                  source="landing-ia-modulo"
                  trigger={
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-[hsl(38,90%,55%)] to-[hsl(45,95%,60%)] hover:opacity-90 text-[hsl(220,25%,6%)] font-bold px-8 py-6 text-base shadow-lg shadow-[hsl(38,90%,55%)]/20"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Solicitar demonstração do módulo
                    </Button>
                  }
                />
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
              ESCOLHA O PLANO IDEAL PARA SEU ESCRITÓRIO
            </h2>
            <p className="text-[hsl(220,10%,60%)] max-w-2xl mx-auto">
              Comece pela IA, evolua para Gestão, chegue no Complete e escale com o Enterprise. Você cresce, o AdvOne cresce com você.
            </p>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {/* AdvOne IA */}
            <Reveal delay={0}>
              <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col h-full transition-all duration-500 hover:border-[hsl(153,60%,45%)]/30 hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(220,20%,16%)] px-3 py-1 text-xs font-semibold text-[hsl(220,10%,75%)]">ADVONE IA</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[hsl(220,10%,92%)] mb-2">Sua secretária virtual 24h</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>R$ 597</span>
                    <span className="text-sm text-[hsl(220,10%,60%)]">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-[hsl(153,60%,45%)] font-semibold">no plano anual (economize R$ 2.400/ano)</p>
                  <p className="mt-2 text-sm text-[hsl(220,10%,60%)]">ou R$ 797/mês no plano mensal. Para quem quer parar de perder lead no WhatsApp.</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "Atendimento no WhatsApp 24h",
                    "Qualificação inteligente de leads",
                    "Agendamento automático na sua agenda",
                    "Atendimento a clientes atuais",
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
                  COMEÇAR COM IA
                </Button>
              </div>
            </Reveal>

            {/* AdvOne Gestão — destaque */}
            <Reveal delay={100}>
              <div className="relative rounded-2xl border-2 border-[hsl(153,60%,45%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col h-full shadow-xl shadow-[hsl(153,60%,45%)]/10 transition-all duration-500 hover:-translate-y-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(153,60%,45%)] px-4 py-1 text-xs font-bold text-[hsl(220,25%,6%)]">
                  MAIS POPULAR
                </div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(153,60%,45%)]/15 px-3 py-1 text-xs font-semibold text-[hsl(153,60%,45%)]">ADVONE GESTÃO</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2 text-[hsl(153,60%,45%)]">Escritório organizado de verdade</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>R$ 597</span>
                    <span className="text-sm text-[hsl(220,10%,60%)]">/mês</span>
                  </div>
                  <p className="mt-2 text-sm text-[hsl(220,10%,60%)]">Para escritórios que precisam de processo e time alinhado.</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "CRM jurídico completo",
                    "Até 3 áreas de atuação",
                    "Até 3 advogados por área",
                    "Pipeline (Kanban de leads e casos)",
                    "Automações, cadências e relatórios",
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
                  QUERO ORGANIZAR
                </Button>
              </div>
            </Reveal>

            {/* AdvOne Complete */}
            <Reveal delay={200}>
              <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col h-full transition-all duration-500 hover:border-[hsl(153,60%,45%)]/30 hover:-translate-y-1">
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(220,20%,16%)] px-3 py-1 text-xs font-semibold text-[hsl(220,10%,75%)]">ADVONE COMPLETE</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[hsl(220,10%,92%)] mb-2">Tudo em um só lugar</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>R$ 997</span>
                    <span className="text-sm text-[hsl(220,10%,60%)]">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-[hsl(153,60%,55%)] font-semibold">no plano anual</p>
                  <p className="mt-1 text-sm text-[hsl(220,10%,60%)]">ou R$ 1.297/mês no mensal</p>
                  <p className="mt-2 text-sm text-[hsl(220,10%,60%)]">Para escritórios que querem escalar sem limite.</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "Tudo do plano IA",
                    "Tudo do plano Gestão",
                    "Integrações avançadas (Google, Asaas, ZapSign)",
                    "Recursos exclusivos (IA jurídica, jurisprudência, calculadoras)",
                    "Suporte prioritário",
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
                  FALAR COM ESPECIALISTA
                </Button>
              </div>
            </Reveal>

            {/* AdvOne Enterprise */}
            <Reveal delay={300}>
              <div className="relative rounded-2xl border border-[hsl(45,80%,55%)]/40 bg-gradient-to-br from-[hsl(220,25%,9%)] to-[hsl(220,25%,7%)] p-8 flex flex-col h-full transition-all duration-500 hover:border-[hsl(45,80%,55%)] hover:-translate-y-1 shadow-lg shadow-[hsl(45,80%,55%)]/5">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[hsl(45,80%,55%)] to-[hsl(38,90%,60%)] px-4 py-1 text-xs font-bold text-[hsl(220,25%,6%)]">
                  SOB MEDIDA
                </div>
                <div className="mb-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-[hsl(45,80%,55%)]/15 px-3 py-1 text-xs font-semibold text-[hsl(45,80%,60%)]">ADVONE ENTERPRISE</span>
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2 text-[hsl(45,80%,60%)]">Central de relacionamento com clientes</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sob consulta</span>
                  </div>
                  <p className="mt-2 text-sm text-[hsl(220,10%,60%)]">
                    Para escritórios que atendem centenas de clientes ativos e precisam de um <strong className="text-[hsl(220,10%,80%)]">único WhatsApp</strong> inteligente que separa leads novos de clientes atuais e roteia cada conversa para o setor certo — automaticamente.
                  </p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {[
                    "Tudo do plano Complete incluso",
                    "Áreas de atuação ilimitadas (a partir de 4)",
                    "Equipe ilimitada por área de atuação",
                    "Atendimento a clientes atuais no mesmo número da captação",
                    "Identificação automática do cliente (nome + CPF)",
                    "Roteamento inteligente por área (Trabalhista, Cível, Previdenciário…)",
                    "Sala de conversa exclusiva por departamento",
                    "Transferência manual entre setores e advogados",
                    "Histórico auditável — nenhuma conversa pode ser apagada",
                    "Download completo de conversas (LGPD/compliance)",
                    "Consulta de status de processo direto no WhatsApp",
                    "SLA dedicado e onboarding assistido pela nossa equipe",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(45,80%,55%)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => {
                    const msg = encodeURIComponent("Olá! Quero conversar sobre o plano AdvOne Enterprise para o meu escritório.");
                    window.open(`https://wa.me/5511999999999?text=${msg}`, "_blank");
                  }}
                  className="w-full bg-gradient-to-r from-[hsl(45,80%,55%)] to-[hsl(38,90%,60%)] hover:opacity-90 text-[hsl(220,25%,6%)] font-bold py-6 shadow-lg shadow-[hsl(45,80%,55%)]/20"
                >
                  FALAR COM NOSSA EQUIPE
                </Button>
              </div>
            </Reveal>
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
              A plataforma de <span className="gradient-text">gestão e tecnologia</span> desenvolvida para escritórios de advocacia.
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-[hsl(220,10%,55%)]">
              CRM Jurídico, gestão de clientes e processos, agenda, financeiro, atendimento oficial via WhatsApp e módulo de inteligência artificial — integrados em um único ambiente seguro, auditável e em conformidade com a LGPD.
            </p>
            <DemoRequestDialog
              source="landing-cta-final"
              trigger={
                <Button
                  size="lg"
                  className="gradient-primary glow-primary px-10 py-6 text-lg font-semibold text-[hsl(0,0%,100%)] group"
                >
                  Solicitar apresentação
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              }
            />

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
                alt="Logo AdvOne CRM Jurídico"
                className="h-14 w-auto drop-shadow-[0_0_20px_hsl(153,60%,45%/0.5)]"
              />
              <p className="text-xs text-[hsl(220,10%,55%)] leading-relaxed">
                Plataforma de gestão para escritórios de advocacia. CRM Jurídico, agenda, financeiro, processos e atendimento integrados.
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

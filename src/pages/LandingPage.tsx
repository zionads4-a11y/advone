import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoAdvOne from "@/assets/logo-advone-light.png";
import heroBg from "@/assets/hero-bg-lp.jpg";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import {
  Bot,
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
} from "lucide-react";

const stats = [
  { value: "100%", label: "Automação com IA" },
  { value: "24/7", label: "Bot ativo no WhatsApp" },
  { value: "5x", label: "Mais agendamentos" },
  { value: "0", label: "Leads esquecidos" },
];

const features = [
  { icon: Bot, title: "Bot com IA no WhatsApp", desc: "Atendimento automático 24h, triagem inteligente e agendamento direto pelo WhatsApp." },
  { icon: Kanban, title: "Kanban Automatizado", desc: "Leads se movem automaticamente pelo funil com cadência de 5 tentativas de contato." },
  { icon: CalendarDays, title: "Agenda Integrada", desc: "Agendamentos automáticos respeitando horários livres e expediente configurado." },
  { icon: Wallet, title: "Financeiro com Asaas", desc: "Contas a pagar, receber e faturamento líquido integrado com o Asaas." },
  { icon: MessageSquare, title: "Conversas Centralizadas", desc: "Todas as mensagens do WhatsApp em um só lugar com histórico completo." },
  { icon: FileText, title: "Documentos e Petições", desc: "Upload de documentos até 600MB, petições e procurações organizadas." },
  { icon: Briefcase, title: "Gestão de Processos", desc: "Cadastro de processos com pastas por cliente, documentos e acompanhamento." },
  { icon: Users, title: "Equipe e Permissões", desc: "Gerentes, operadores e clientes com acessos personalizados por função." },
];

const valueProps = [
  {
    icon: Clock,
    title: "Mais tempo para o que importa",
    desc: "Automatize cadências, agendamentos e follow-ups. Seu time foca em fechar negócios enquanto o bot cuida do primeiro contato.",
  },
  {
    icon: Target,
    title: "Nenhum lead fica para trás",
    desc: "Com 5 tentativas automáticas de contato, cadência inteligente e movimentação automática no Kanban, todo lead recebe atenção.",
  },
  {
    icon: TrendingUp,
    title: "Controle financeiro real",
    desc: "Integração direta com Asaas para sincronizar pagamentos. Veja contas a pagar, recebidas e faturamento líquido em tempo real.",
  },
];

const testimonials = [
  {
    text: "O AdvOne transformou nosso atendimento. Agendamentos automáticos pelo WhatsApp 24 horas por dia, sem perder nenhum lead.",
    name: "Dra. Maria Silva",
    role: "Advogada Trabalhista",
  },
  {
    text: "A cadência automática é incrível. Antes perdíamos leads por falta de follow-up, agora o sistema cuida de tudo automaticamente.",
    name: "Dr. Carlos Mendes",
    role: "Advogado Cível",
  },
  {
    text: "Ter o financeiro integrado com Asaas simplificou demais. Vejo tudo em um só lugar: leads, processos e faturamento.",
    name: "Dra. Ana Costa",
    role: "Advogada Previdenciária",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen bg-[hsl(220,25%,6%)] text-[hsl(220,10%,92%)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[hsl(220,20%,16%)] bg-[hsl(220,25%,6%)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <img src={logoAdvOne} alt="AdvOne" className="h-12 w-auto" />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#funcionalidades" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Funcionalidades</a>
            <a href="#vantagens" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Vantagens</a>
            <a href="#depoimentos" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Depoimentos</a>
            <a href="#planos" className="text-sm text-[hsl(220,10%,70%)] transition-colors hover:text-[hsl(153,60%,45%)]">Planos</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")} className="text-[hsl(220,10%,70%)] hover:text-[hsl(153,60%,45%)]">
              Login
            </Button>
            <Button onClick={() => navigate("/auth")} className="gradient-primary text-[hsl(0,0%,100%)] font-semibold">
              Começar agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,25%,6%)]/60 via-transparent to-[hsl(220,25%,6%)]" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 text-center md:pb-32 md:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(153,60%,45%)]/30 bg-[hsl(153,60%,45%)]/10 px-4 py-1.5 text-sm text-[hsl(153,60%,45%)]">
            <Zap className="h-4 w-4" />
            CRM com Inteligência Artificial para Advogados
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span className="gradient-text">CRM completo</span> para a gestão{" "}
            do seu escritório de advocacia.
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-[hsl(220,10%,55%)] md:text-xl">
            Conecte captação de leads, atendimento por WhatsApp, agenda, financeiro e processos em um único ecossistema inteligente. Bot com IA que agenda automaticamente.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="gradient-primary glow-primary px-8 py-6 text-lg font-semibold text-[hsl(0,0%,100%)]"
            >
              Começar agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-[hsl(220,10%,45%)]">
            Planos a partir de R$ 297/mês. Configure em minutos.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-16 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="mb-1 text-3xl font-bold text-[hsl(153,60%,45%)] md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.value}
              </p>
              <p className="text-sm text-[hsl(220,10%,55%)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Mockup */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Nós temos o</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            CRM completo para escritórios de advocacia.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[hsl(220,10%,55%)]">
            Da captação do lead ao agendamento final, centralize toda a operação do seu escritório em uma única plataforma. Leads, WhatsApp, agenda, finanças e processos — tudo conectado.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[hsl(220,20%,16%)] shadow-2xl shadow-[hsl(153,60%,45%)]/5">
          <img
            src={dashboardMockup}
            alt="Dashboard do CRM AdvOne"
            className="w-full"
            loading="lazy"
            width={1200}
            height={800}
          />
        </div>
      </section>

      {/* Feature Pills */}
      <section className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)] py-12">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-6">
          {[
            "Bot WhatsApp com IA",
            "Cadência Automática",
            "Kanban Inteligente",
            "Agenda Integrada",
            "Financeiro + Asaas",
            "Gestão de Processos",
            "Documentos até 600MB",
            "CRM Nativo",
            "Relatórios",
            "Equipe e Permissões",
            "Tracking Links",
            "Campanhas Google/Meta",
          ].map((f) => (
            <span
              key={f}
              className="rounded-full border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] px-4 py-2 text-sm text-[hsl(220,10%,75%)] transition-colors hover:border-[hsl(153,60%,45%)]/40 hover:text-[hsl(153,60%,45%)]"
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* Value Props */}
      <section id="vantagens" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Isso significa</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Pare de perder leads e tempo com tarefas manuais.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {valueProps.map((v) => (
            <div
              key={v.title}
              className="group rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 transition-all hover:border-[hsl(153,60%,45%)]/30 hover:shadow-lg hover:shadow-[hsl(153,60%,45%)]/5"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(153,60%,45%)]/10 text-[hsl(153,60%,45%)] transition-colors group-hover:bg-[hsl(153,60%,45%)]/20">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {v.title}
              </h3>
              <p className="text-[hsl(220,10%,55%)] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Funcionalidades</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Tudo que seu escritório precisa. Em um só lugar.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-6 transition-all hover:border-[hsl(153,60%,45%)]/30"
              >
                <f.icon className="mb-4 h-8 w-8 text-[hsl(153,60%,45%)]" />
                <h3 className="mb-2 font-semibold text-[hsl(220,10%,92%)]">{f.title}</h3>
                <p className="text-sm text-[hsl(220,10%,55%)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How the Bot Works */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Automação Inteligente</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Como funciona a cadência automática
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-5">
          {[
            { step: "1", title: "Lead entra", desc: "Novo lead chega pelo WhatsApp ou campanha" },
            { step: "2", title: "Bot atende", desc: "IA faz triagem e oferece horários disponíveis" },
            { step: "3", title: "Cadência", desc: "5 tentativas automáticas de contato" },
            { step: "4", title: "Agendamento", desc: "Bot agenda e notifica o escritório" },
            { step: "5", title: "Resultado", desc: "Lead marcado como Ganho ou Perdido" },
          ].map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[hsl(153,60%,45%)] bg-[hsl(153,60%,45%)]/10 text-xl font-bold text-[hsl(153,60%,45%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.step}
              </div>
              <h4 className="mb-1 font-semibold">{s.title}</h4>
              <p className="text-sm text-[hsl(220,10%,55%)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="border-y border-[hsl(220,20%,16%)] bg-[hsl(220,25%,8%)]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Depoimentos</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Escritórios que já transformaram sua gestão.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[hsl(38,92%,50%)] text-[hsl(38,92%,50%)]" />
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
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-16 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[hsl(153,60%,45%)]">Planos</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Escolha o plano ideal para o seu escritório.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {/* Essencial */}
          <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col">
            <div className="mb-6">
              <span className="inline-block rounded-full bg-[hsl(153,60%,45%)]/15 px-3 py-1 text-xs font-semibold text-[hsl(153,60%,45%)]">Essencial</span>
            </div>
            <p className="mb-1 text-4xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              R$ 297<span className="text-base font-normal text-[hsl(220,10%,55%)]">/mês</span>
            </p>
            <p className="mt-2 mb-8 text-sm text-[hsl(220,10%,55%)]">CRM + IA + automação completa</p>
            <ul className="mb-8 flex-1 space-y-3">
              {["CRM completo com Kanban", "Bot com IA no WhatsApp", "Cadência automática de 5 tentativas", "Agenda integrada", "Gestão de documentos até 600MB", "Equipe e permissões"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate("/auth")} className="w-full gradient-primary text-[hsl(0,0%,100%)] font-semibold">
              Começar agora
            </Button>
          </div>

          {/* Profissional */}
          <div className="relative rounded-2xl border-2 border-[hsl(153,60%,45%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col shadow-lg shadow-[hsl(153,60%,45%)]/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[hsl(153,60%,45%)] px-4 py-1 text-xs font-bold text-[hsl(220,25%,6%)]">
              MAIS POPULAR
            </div>
            <div className="mb-6">
              <span className="inline-block rounded-full bg-[hsl(210,80%,55%)]/15 px-3 py-1 text-xs font-semibold text-[hsl(210,80%,55%)]">Profissional</span>
            </div>
            <p className="mb-1 text-4xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              R$ 497<span className="text-base font-normal text-[hsl(220,10%,55%)]">/mês</span>
            </p>
            <p className="mt-2 mb-8 text-sm text-[hsl(220,10%,55%)]">Tudo do Essencial + monitoramento</p>
            <ul className="mb-8 flex-1 space-y-3">
              {["Tudo do plano Essencial", "Monitoramento de até 50 processos", "Alertas automáticos de movimentação", "Financeiro integrado com Asaas", "Relatórios avançados", "Suporte prioritário"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate("/auth")} className="w-full gradient-primary text-[hsl(0,0%,100%)] font-semibold">
              Começar agora
            </Button>
          </div>

          {/* Elite */}
          <div className="rounded-2xl border border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] p-8 flex flex-col">
            <div className="mb-6">
              <span className="inline-block rounded-full bg-[hsl(0,70%,55%)]/15 px-3 py-1 text-xs font-semibold text-[hsl(0,70%,60%)]">Elite</span>
            </div>
            <p className="mb-1 text-4xl font-bold text-[hsl(220,10%,92%)]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              R$ 697<span className="text-base font-normal text-[hsl(220,10%,55%)]">/mês</span>
            </p>
            <p className="mt-2 mb-8 text-sm text-[hsl(220,10%,55%)]">Tudo do Profissional + prioridade total</p>
            <ul className="mb-8 flex-1 space-y-3">
              {["Tudo do plano Profissional", "Monitoramento de até 100 processos", "Prioridade máxima nos alertas", "Onboarding personalizado", "Consultoria de automação", "Gerente de conta dedicado"].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                  {item}
                </li>
              ))}
            </ul>
            <Button onClick={() => navigate("/auth")} className="w-full gradient-primary text-[hsl(0,0%,100%)] font-semibold">
              Começar agora
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-30" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,25%,6%)] via-transparent to-[hsl(220,25%,6%)]" />
        </div>
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
            onClick={() => navigate("/auth")}
            className="gradient-primary glow-primary px-10 py-6 text-lg font-semibold text-[hsl(0,0%,100%)]"
          >
            Começar agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(220,20%,16%)] bg-[hsl(220,28%,5%)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <img src={logoAdvOne} alt="AdvOne" className="h-10 w-auto" />
          <p className="text-sm text-[hsl(220,10%,45%)]">
            © {new Date().getFullYear()} AdvOne. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <a href="#funcionalidades" className="text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Funcionalidades</a>
            <a href="#vantagens" className="text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Vantagens</a>
            <button onClick={() => navigate("/auth")} className="text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)]">Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

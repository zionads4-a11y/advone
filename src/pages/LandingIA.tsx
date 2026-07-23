import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackMetaEvent } from "@/lib/metaPixel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/useScrollReveal";
import { InteractiveChatDemo } from "@/components/landing/InteractiveChatDemo";
import { FloatingWhatsAppButton } from "@/components/landing/FloatingWhatsAppButton";
import { DemoRequestDialog } from "@/components/landing/DemoRequestDialog";
import logoAdvOne from "@/assets/logo-advone-light.webp";
import logoAdvOneHero from "@/assets/logo-advone-hero.webp";
import heroBg from "@/assets/hero-bg-lp.jpg";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Headphones,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Zap,
  Star,
  PhoneOff,
  TrendingUp,
  Users,
  Brain,
  Loader2,
} from "lucide-react";

const features = [
  {
    icon: Headphones,
    title: "Atende 24/7 no WhatsApp",
    desc: "Sua secretária virtual responde leads em segundos, mesmo de madrugada e fim de semana.",
  },
  {
    icon: Brain,
    title: "Qualifica como uma humana",
    desc: "Identifica nicho (previdenciário, trabalhista, cível…), coleta dados do caso e avalia viabilidade.",
  },
  {
    icon: CalendarDays,
    title: "Agenda direto na sua agenda",
    desc: "Olha seus horários livres, propõe duas opções e marca a reunião — você só recebe confirmado.",
  },
  {
    icon: MessageSquare,
    title: "Follow-up automático",
    desc: "5 tentativas em cadência inteligente. Lead respondeu? Volta para 'em atendimento'. Sumiu? Continua o ciclo.",
  },
  {
    icon: ShieldCheck,
    title: "100% sob seu controle",
    desc: "Edite o tom de voz, fluxos, perguntas e prompts da Laura sem mexer em código.",
  },
  {
    icon: Zap,
    title: "Setup em até 48h",
    desc: "Conectamos seu WhatsApp, treinamos a Laura com seus fluxos e ela já começa a atender.",
  },
];

const dores = [
  {
    icon: PhoneOff,
    title: "Lead chegou e ninguém atendeu",
    desc: "Você gasta com tráfego, o lead manda mensagem às 22h e quando você responde no dia seguinte… ele já fechou com outro escritório.",
  },
  {
    icon: Clock,
    title: "Sua secretária não dá conta",
    desc: "Triagem manual, copia e cola, esquecimento de follow-up. Cada lead perdido é R$ 3 mil a R$ 30 mil em honorários indo embora.",
  },
  {
    icon: Users,
    title: "Você atende quem não vai fechar",
    desc: "Reuniões com casos sem viabilidade tomam horas que poderiam ser focadas em clientes que pagam.",
  },
];

const beneficiosAdmin = [
  "CRM Completo (Clientes, Leads, Kanban)",
  "WhatsApp (Notificações automáticas)",
  "Agenda integrada",
  "Gestão Financeira",
  "Documentos e Templates ilimitados",
  "IA com Gemini Flash",
  "10 monitoramentos de processos inclusos",
  "R$ 2,58 por processo extra",
];

const beneficiosCompleto = [
  "Tudo do plano Admin +",
  "Bot Comercial com IA (Laura SDR)",
  "Laura SDR atende, qualifica e agenda 24/7",
  "IA Jurídica com Claude (Peças, Análises, Resumos)",
  "Alertas de Fraude em tempo real",
  "Boards e Tarefas avançadas",
  "10 monitoramentos de processos inclusos",
  "R$ 2,58 por processo extra",
];

const faq = [
  {
    q: "Posso usar meu próprio número de WhatsApp?",
    a: "Sim. A Laura roda no seu chip via WhatsApp Business, com QR code. Você mantém o número que seus clientes já conhecem.",
  },
  {
    q: "Quanto tempo leva para começar?",
    a: "Após o pagamento, sua conta é criada na hora. Em até 24h úteis nosso time conecta seu WhatsApp e configura os fluxos da Laura com base no seu nicho.",
  },
  {
    q: "Posso editar o que a Laura fala?",
    a: "Sim. Você tem acesso a um editor de fluxos, prompts e perguntas. Pode mudar o tom, adicionar fluxos personalizados (ex: FGTS, INSS, etc.) e ajustar o que ela pergunta.",
  },
  {
    q: "A IA entende meu nicho específico?",
    a: "Sim. A Laura vem treinada para previdenciário, trabalhista, cível, criminal, família, consumidor e tributário. Você pode adicionar fluxos custom para teses específicas do seu escritório.",
  },
  {
    q: "Esse plano serve para escritório grande?",
    a: "O AdvOne IA (R$ 497/mês no anual · R$ 697 no semestral · R$ 797 no mensal) é otimizado para advogados solo e escritórios pequenos (até 3 advogados). Quer CRM, pipeline e gestão de equipe? Faça upgrade do módulo Gestão por apenas +R$ 397/mês. Para times maiores, temos o AdvOne Complete (R$ 997/mês no anual · R$ 1.297 no mensal).",
  },
];

const formSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  whatsapp: z
    .string()
    .trim()
    .min(10, "WhatsApp inválido")
    .max(20, "WhatsApp inválido")
    .regex(/^[0-9()\-\s+]+$/, "Use apenas números"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255, "E-mail muito longo")
    .optional()
    .or(z.literal("")),
  oab: z.string().trim().max(30, "OAB inválida").optional().or(z.literal("")),
  practice_area: z.string().trim().max(80, "Texto muito longo").optional().or(z.literal("")),
  preferred_date: z.string().optional().or(z.literal("")),
  preferred_time: z.string().optional().or(z.literal("")),
  message: z.string().trim().max(1000, "Mensagem muito longa").optional().or(z.literal("")),
});

const PRACTICE_AREAS = [
  "Previdenciário",
  "Trabalhista",
  "Cível",
  "Família",
  "Criminal",
  "Tributário",
  "Consumidor",
  "Empresarial",
  "Outro / Múltiplas",
];

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

export default function LandingIA() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const utms = useMemo(
    () => ({
      utm_source: searchParams.get("utm_source") || null,
      utm_medium: searchParams.get("utm_medium") || null,
      utm_campaign: searchParams.get("utm_campaign") || null,
      utm_content: searchParams.get("utm_content") || null,
      utm_term: searchParams.get("utm_term") || null,
    }),
    [searchParams],
  );

  useEffect(() => {
    document.title = "Laura SDR — IA no WhatsApp para Advogados | AdvOne";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "AdvOne IA a partir de R$ 497/mês (anual): SDR virtual Laura que atende, qualifica e agenda no WhatsApp 24h. Também disponível no plano Complete (R$ 997/mês).";
    if (meta) {
      meta.setAttribute("content", desc);
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    // ViewContent quando a landing carrega (além do PageView automático)
    trackMetaEvent("ViewContent", { contentName: "Landing IA - Laura SDR" });
  }, []);

  const WA_LINK = "https://wa.link/didraw";

  function openWhatsApp(label = "CTA Landing IA") {
    try {
      trackMetaEvent("Contact", { contentName: label });
    } catch (e) {
      console.warn("[LandingIA] Meta Pixel falhou", e);
    }
    window.open(WA_LINK, "_blank", "noopener,noreferrer");
  }

  function scrollToForm(plan?: string) {
    trackMetaEvent("InitiateCheckout", { contentName: "CTA Landing IA" });
    if (plan) {
      navigate(`/signup?plan=${plan}`);
      return;
    }
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: String(formData.get("name") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      email: String(formData.get("email") || ""),
      oab: String(formData.get("oab") || ""),
      practice_area: String(formData.get("practice_area") || ""),
      preferred_date: String(formData.get("preferred_date") || ""),
      preferred_time: String(formData.get("preferred_time") || ""),
      message: String(formData.get("message") || ""),
    };

    const parsed = formSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message || "Verifique os campos do formulário");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp,
        email: parsed.data.email || null,
        oab: parsed.data.oab || null,
        practice_area: parsed.data.practice_area || null,
        preferred_date: parsed.data.preferred_date || null,
        preferred_time: parsed.data.preferred_time || null,
        message: parsed.data.message || null,
        ...utms,
      };

      const { error } = await supabase.from("landing_ia_leads").insert(payload);
      if (error) throw error;

      // Formulário enviado — evento auxiliar. "Lead" é disparado APENAS após o agendamento no Calendly.
      trackMetaEvent("SubmitApplication", {
        email: parsed.data.email || undefined,
        phone: parsed.data.whatsapp,
        contentName: "Landing IA - Form Submit",
        customData: {
          practice_area: parsed.data.practice_area || undefined,
          oab: parsed.data.oab || undefined,
        },
      });

      setSubmitted(true);
      toast.success("Recebemos sua solicitação! Nosso time entrará em contato em breve.");
    } catch (err) {
      console.error("Erro ao enviar landing IA lead:", err);
      toast.error("Não conseguimos registrar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <img src={logoAdvOne} alt="AdvOne" className="h-8 w-auto" />
          </button>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Recursos
            </a>
            <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground">
              Plano
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth?mode=login")} className="hidden md:flex">
              Login
            </Button>
            <DemoRequestDialog
              source="landing-ia-header"
              trigger={
                <Button className="gradient-primary text-primary-foreground">
                  Quero a Laura
                </Button>
              }
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[hsl(153,85%,50%)]/10 hero-grid-bg">
        {/* Watermark logo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={logoAdvOneHero}
            alt=""
            aria-hidden="true"
            className="w-[110%] max-w-none opacity-[0.035] blur-[2px] select-none"
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050608_78%)]" />

        <div className="container relative mx-auto grid gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <Reveal>
            <div className="space-y-6">
              <div className="flex justify-center lg:justify-start">
                <div className="relative">
                  <div className="absolute inset-0 -z-10 rounded-full bg-[hsl(153,85%,50%)]/25 blur-3xl" />
                  <img
                    src={logoAdvOneHero}
                    alt="AdvOne — IA jurídica no WhatsApp"
                    className="h-24 w-auto drop-shadow-[0_8px_32px_rgba(52,211,153,0.55)] md:h-32 lg:h-36"
                  />
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(153,85%,50%)]/40 bg-[hsl(153,85%,50%)]/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[hsl(153,85%,60%)]">
                <span className="neon-dot h-2 w-2 rounded-full" />
                Plano exclusivo para advogados
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Enquanto você advoga, o <span className="italic text-[hsl(153,85%,55%)]">AdvOne</span> fecha o próximo cliente no WhatsApp.
              </h1>
              <p className="text-lg text-[hsl(220,10%,65%)] md:text-xl">
                Seu concorrente responde em segundos. Com a <strong className="text-white">Laura, sua SDR com IA</strong>, cada lead é atendido na hora, qualificado por nicho jurídico e agendado direto na sua agenda — 24h por dia, todo dia. Você entra em cena só pra fechar.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <DemoRequestDialog
                  source="landing-ia-hero"
                  trigger={
                    <Button size="lg" className="hero-neon-glow bg-[hsl(153,85%,45%)] hover:bg-[hsl(153,85%,50%)] text-[#04120a] font-semibold">
                      Agendar demonstração grátis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  }
                />
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Ver a Laura em ação
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Setup em até 48h
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Sem fidelidade
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Seu próprio WhatsApp
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div id="demo" className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 blur-2xl" />
              <div className="relative rounded-2xl border border-border/60 bg-card/80 p-2 shadow-2xl backdrop-blur">
                <InteractiveChatDemo />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Dores */}
      <section className="container mx-auto px-4 py-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Quantos leads você perdeu essa semana?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Se você é advogado solo ou tem um escritório enxuto, esses cenários provavelmente são
              familiares:
            </p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {dores.map((d, i) => (
            <Reveal key={d.title} delay={i * 100}>
              <Card className="h-full border-destructive/20 bg-card/60">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <d.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{d.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.desc}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Solução / Features */}
      <section id="features" className="border-y border-border/40 bg-card/30">
        <div className="container mx-auto px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <Bot className="h-3.5 w-3.5" />
                Conheça a Laura
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
                A Laura faz o trabalho de uma SDR humana — sem pausa, sem férias, sem esquecer.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Treinada especialmente para o universo jurídico, ela conversa com tom natural, faz
                perguntas certas e entrega o lead pronto na sua mesa.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <Card className="h-full border-border/60 bg-background/60 transition-colors hover:border-primary/40">
                  <CardContent className="space-y-3 p-6">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparativo */}
      <section className="container mx-auto px-4 py-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Laura vs. secretária tradicional
            </h2>
            <p className="mt-4 text-muted-foreground">
              Não é sobre substituir pessoas — é sobre nunca mais perder um lead por horário ou
              esquecimento.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <Reveal>
            <Card className="border-border/60 bg-card/40">
              <CardContent className="space-y-4 p-6">
                <h3 className="font-display text-xl font-semibold text-muted-foreground">
                  Sem Laura
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>❌ Atende só em horário comercial</li>
                  <li>❌ Esquece follow-ups</li>
                  <li>❌ Demora minutos (ou horas) para responder</li>
                  <li>❌ Não qualifica viabilidade do caso</li>
                  <li>❌ Custo: R$ 2.500+/mês com encargos</li>
                </ul>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={120}>
            <Card className="border-primary/40 bg-primary/5 shadow-lg shadow-primary/10">
              <CardContent className="space-y-4 p-6">
                <h3 className="font-display text-xl font-semibold text-primary">Com Laura</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ Atende 24/7, todos os dias</li>
                  <li>✅ 5 follow-ups automáticos por lead</li>
                  <li>✅ Responde em até 30 segundos</li>
                  <li>✅ Qualifica e classifica viabilidade</li>
                  <li>✅ Custo: a partir de R$ 497/mês — sem encargos</li>
                </ul>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Plano */}
      <section
        id="planos"
        className="border-y border-border/40 bg-gradient-to-b from-card/30 to-background"
      >
        <div className="container mx-auto px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <Star className="h-3.5 w-3.5" />
                Oferta exclusiva desta página
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
                ESCOLHA O PLANO IDEAL PARA SEU ESCRITÓRIO
              </h2>
              <p className="mt-4 text-muted-foreground">
                Comece pela IA, evolua para Gestão e chegue no Complete quando fizer sentido.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {/* AdvOne IA */}
            <Reveal delay={120}>
              <Card className="h-full border-border/60 bg-card/40 hover:border-primary/20 transition-all">
                <CardContent className="space-y-6 p-8 flex flex-col">
                  <div>
                    <div className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                      ADVONE IA
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Mensal</span>
                        <span className="text-lg font-bold">R$ 797<span className="text-xs text-muted-foreground font-normal">/mês</span></span>
                      </div>
                      <div className="flex items-baseline justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Semestral</span>
                        <span className="text-lg font-bold">R$ 697<span className="text-xs text-muted-foreground font-normal">/mês</span></span>
                      </div>
                      <div className="flex items-baseline justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
                        <span className="text-xs uppercase tracking-wide text-primary font-semibold">Anual · melhor oferta</span>
                        <span className="text-lg font-bold text-primary">R$ 497<span className="text-xs font-normal">/mês</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <ul className="space-y-3 flex-1">
                    {[
                      "Atendimento no WhatsApp 24h",
                      "Qualificação inteligente de leads",
                      "Agendamento automático na sua agenda",
                      "Atendimento a clientes atuais",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <DemoRequestDialog
                    source="landing-ia-plan-ia"
                    trigger={
                      <Button size="lg" variant="outline" className="w-full">
                        COMEÇAR COM IA
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </Reveal>

            {/* AdvOne Gestão */}
            <Reveal delay={180}>
              <Card className="h-full border-primary/40 bg-card shadow-2xl shadow-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase tracking-widest rounded-bl-lg">
                  Mais Popular
                </div>
                <CardContent className="space-y-6 p-8 flex flex-col">
                  <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide text-primary">
                      ADVONE GESTÃO
                    </div>
                    <div className="mt-2 flex items-baseline justify-center gap-1">
                      <span className="text-2xl font-bold text-muted-foreground">+</span>
                      <span className="text-3xl font-bold">R$</span>
                      <span className="font-display text-5xl font-bold">397</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <div className="mt-1 text-xs text-primary font-bold">
                      upgrade do AdvOne IA
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <ul className="space-y-3 flex-1">
                    {[
                      "CRM jurídico completo",
                      "Pipeline (Kanban de leads e casos)",
                      "Automações e cadências",
                      "Gestão da equipe (papéis e permissões)",
                      "Relatórios e indicadores",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="font-semibold">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <DemoRequestDialog
                    source="landing-ia-plan-gestao"
                    trigger={
                      <Button size="lg" className="w-full gradient-primary text-primary-foreground font-bold">
                        QUERO ORGANIZAR
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </Reveal>

            {/* AdvOne Complete */}
            <Reveal delay={240}>
              <Card className="h-full border-border/60 bg-card/40 hover:border-primary/20 transition-all">
                <CardContent className="space-y-6 p-8 flex flex-col">
                  <div className="text-center">
                    <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      ADVONE COMPLETE
                    </div>
                    <div className="mt-2 flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">R$</span>
                      <span className="font-display text-5xl font-bold">997</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      no plano anual · ou R$ 1.297/mês no mensal
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <ul className="space-y-3 flex-1">
                    {[
                      "Tudo do plano IA",
                      "Tudo do plano Gestão",
                      "Integrações avançadas (Google, Asaas, ZapSign)",
                      "Recursos exclusivos (IA jurídica, jurisprudência, calculadoras)",
                      "Suporte prioritário",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <DemoRequestDialog
                    source="landing-ia-plan-complete"
                    trigger={
                      <Button size="lg" variant="outline" className="w-full">
                        FALAR COM ESPECIALISTA
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
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
              "Monitoramento de Processos (R$ 2,50 por processo/mês)"
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/40">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section ref={formRef} id="form" className="container mx-auto px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-6">
              <h2 className="font-display text-3xl font-bold md:text-4xl">
                Agende uma demonstração ao vivo
              </h2>
              <p className="text-muted-foreground">
                Em 20 minutos, mostramos a Laura atendendo um lead seu de verdade. Você decide se
                contrata ou não — sem pressão.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    1
                  </div>
                  <div>
                    <div className="font-semibold">Você preenche o formulário</div>
                    <div className="text-sm text-muted-foreground">
                      Leva 30 segundos. Pode escolher o melhor dia e horário pra você.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    2
                  </div>
                  <div>
                    <div className="font-semibold">Nosso time entra em contato</div>
                    <div className="text-sm text-muted-foreground">
                      Confirmamos o horário pelo WhatsApp e enviamos o link da reunião.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    3
                  </div>
                  <div>
                    <div className="font-semibold">Demonstração ao vivo</div>
                    <div className="text-sm text-muted-foreground">
                      Você vê a Laura atendendo, qualificando e agendando — em tempo real.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Quem já usa diz:
                </div>
                <p className="mt-2 text-sm italic text-muted-foreground">
                  "Aumentei em 5x o número de agendamentos no primeiro mês. A Laura não dorme."
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  — Dra. Caroline, Advocacia Previdenciária
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <Card className="border-border/60 bg-card/80 shadow-xl">
              <CardContent className="p-6 md:p-8">
                {submitted ? (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">Recebido! 🎉</h3>
                    <p className="text-muted-foreground">
                      Nosso time entra em contato no seu WhatsApp em até 1h em horário comercial
                      para confirmar a demonstração.
                    </p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Enviar outra solicitação
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Nome completo <span className="text-destructive">*</span>
                      </Label>
                      <Input id="name" name="name" required maxLength={100} placeholder="Dr. João Silva" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">
                          WhatsApp <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="whatsapp"
                          name="whatsapp"
                          required
                          maxLength={20}
                          placeholder="(11) 99999-9999"
                          inputMode="tel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          maxLength={255}
                          placeholder="voce@escritorio.com"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="oab">OAB (opcional)</Label>
                        <Input id="oab" name="oab" maxLength={30} placeholder="OAB/SP 123.456" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="practice_area">Área principal</Label>
                        <Select name="practice_area">
                          <SelectTrigger id="practice_area">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRACTICE_AREAS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="preferred_date">Melhor data</Label>
                        <Input
                          id="preferred_date"
                          name="preferred_date"
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preferred_time">Melhor horário</Label>
                        <Select name="preferred_time">
                          <SelectTrigger id="preferred_time">
                            <SelectValue placeholder="Escolha um horário" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Quer contar algo antes? (opcional)</Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={3}
                        maxLength={1000}
                        placeholder="Ex: já uso outro CRM, atendo previdenciário e quero ver fluxo de aposentadoria…"
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      className="w-full gradient-primary text-primary-foreground"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Agendar minha demonstração
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Ao enviar, você concorda em receber contato pelo WhatsApp informado.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-border/40 bg-card/30">
        <div className="container mx-auto px-4 py-20">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
            </div>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
            {faq.map((item, i) => (
              <Reveal key={item.q} delay={i * 60}>
                <Card className="h-full border-border/60 bg-background/60">
                  <CardContent className="space-y-2 p-6">
                    <h3 className="font-display text-base font-semibold">{item.q}</h3>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto px-4 py-20">
        <Reveal>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
            <CardContent className="space-y-6 p-10 text-center md:p-14">
              <h2 className="font-display text-3xl font-bold md:text-4xl">
                Pare de perder leads enquanto você dorme.
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                A Laura está pronta para começar a atender no seu WhatsApp em 24h. Planos a partir de R$ 497/mês.
              </p>
              <DemoRequestDialog
                source="landing-ia-final-cta"
                trigger={
                  <Button size="lg" className="gradient-primary text-primary-foreground">
                    Quero a Laura no meu WhatsApp
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <img src={logoAdvOne} alt="AdvOne" className="h-6 w-auto opacity-80" />
            <span>© {new Date().getFullYear()} AdvOne. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate("/")} className="hover:text-foreground">
              Voltar para AdvOne
            </button>
            <a href="#planos" className="hover:text-foreground">
              Plano
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </div>
        </div>
      </footer>
      <DemoRequestDialog
        source="landing-ia-floating"
        trigger={
          <button
            aria-label="Solicitar apresentação"
            className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition-all hover:scale-110 hover:shadow-xl md:h-16 md:w-16"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
            <svg viewBox="0 0 32 32" className="relative h-8 w-8 md:h-9 md:w-9" fill="currentColor" aria-hidden="true">
              <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.49-1.318.147-.343.247-.717.247-1.087 0-.07 0-.176-.04-.246-.1-.176-2.522-1.39-2.683-1.39zm-2.825 7.683h-.04a9.88 9.88 0 0 1-5.013-1.375l-.36-.214-3.722.97 1-3.624-.236-.374a9.846 9.846 0 0 1-1.51-5.237c.003-5.45 4.444-9.885 9.9-9.885a9.79 9.79 0 0 1 6.995 2.898 9.847 9.847 0 0 1 2.895 6.99c-.002 5.45-4.443 9.885-9.91 9.885zm8.42-18.297A11.81 11.81 0 0 0 16.28 3.13c-6.55 0-11.883 5.32-11.886 11.853a11.82 11.82 0 0 0 1.59 5.93L4.29 26.87l6.107-1.6a11.9 11.9 0 0 0 5.68 1.444h.005c6.548 0 11.88-5.32 11.883-11.853a11.77 11.77 0 0 0-3.473-8.434z" />
            </svg>
          </button>
        }
      />
    </div>
  );
}

import { useState, ReactNode, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Briefcase, Users, UserCheck, GraduationCap, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackMetaEvent } from "@/lib/metaPixel";

// Ajuste aqui o link do Calendly do time comercial da AdvOne
const CALENDLY_URL = "https://calendly.com/connectmktdigitalbr/30min";

const PROFILES = [
  { id: "socio", label: "Sócio de escritório", icon: Briefcase },
  { id: "autonomo", label: "Advogado autônomo", icon: UserCheck },
  { id: "associado", label: "Advogado associado", icon: Users },
  { id: "estudante", label: "Estudante de Direito", icon: GraduationCap },
  { id: "outro", label: "Não sou advogado", icon: HelpCircle },
] as const;

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  email: z.string().trim().email("E-mail inválido").max(160),
  profile: z.string().min(1, "Selecione uma opção"),
});

interface Props {
  trigger: ReactNode;
  source?: string;
}

type Step = 0 | 1 | 2;

export function DemoRequestDialog({ trigger, source = "landing" }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", profile: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset ao fechar
      setTimeout(() => {
        setStep(0);
        setForm({ full_name: "", phone: "", email: "", profile: "" });
        setSubmitted(false);
      }, 200);
    }
  }, [open]);

  // Escuta eventos do Calendly e dispara "Lead" APENAS quando o agendamento for concluído
  useEffect(() => {
    if (!open || step !== 2) return;
    const isCalendlyEvent = (e: MessageEvent) =>
      typeof e.data === "object" && e.data && String(e.data.event || "").indexOf("calendly") === 0;
    const handler = (e: MessageEvent) => {
      if (!isCalendlyEvent(e)) return;
      if (e.data.event === "calendly.event_scheduled") {
        trackMetaEvent("Lead", {
          email: form.email || undefined,
          phone: form.phone,
          contentName: "Calendly - Agendamento concluído",
          customData: { source, profile: form.profile },
        });
        toast.success("Agendamento confirmado! Nosso time te espera. 🎉");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, step, form, source]);

  const goNext = () => {
    if (step === 0) {
      if (!form.full_name.trim() || form.full_name.trim().length < 3) return toast.error("Informe seu nome completo");
      if (!form.phone.trim() || form.phone.trim().length < 10) return toast.error("Telefone inválido");
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return toast.error("E-mail inválido");
      setStep(1);
    } else if (step === 1) {
      if (!form.profile) return toast.error("Selecione seu perfil");
      submit();
    }
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const profileLabel = PROFILES.find((p) => p.id === parsed.data.profile)?.label ?? parsed.data.profile;
    const { error } = await supabase.from("landing_ia_leads").insert({
      name: parsed.data.full_name,
      whatsapp: parsed.data.phone,
      email: parsed.data.email,
      practice_area: parsed.data.profile,
      message: `Perfil: ${profileLabel} | Origem: ${source}`,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    setSubmitted(true);
    setStep(2);
    toast.success("Dados recebidos! Agora escolha o melhor horário.");
  };

  const calendlyUrl = (() => {
    const url = new URL(CALENDLY_URL);
    if (form.full_name) url.searchParams.set("name", form.full_name);
    if (form.email) url.searchParams.set("email", form.email);
    // Calendly aceita utm_content para custom answers
    if (form.phone) url.searchParams.set("a1", form.phone);
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={cn("sm:max-w-lg", step === 2 && "sm:max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>
            {step === 0 && "Vamos começar 👋"}
            {step === 1 && "Qual seu perfil?"}
            {step === 2 && "Escolha o melhor horário"}
          </DialogTitle>
          <DialogDescription>
            {step === 0 && "Precisamos de alguns dados para nossa equipe entrar em contato."}
            {step === 1 && "Isso nos ajuda a preparar a melhor demonstração pra você."}
            {step === 2 && "Selecione um horário na agenda do nosso time comercial."}
          </DialogDescription>
        </DialogHeader>

        {/* Progresso */}
        <div className="flex gap-2 mb-2">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                step >= s ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dr-name">Nome completo *</Label>
              <Input id="dr-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={120} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dr-phone">WhatsApp *</Label>
              <Input id="dr-phone" type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dr-email">E-mail *</Label>
              <Input id="dr-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={160} />
            </div>
            <Button onClick={goNext} className="w-full gradient-primary text-[hsl(0,0%,100%)] font-semibold">
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-2">
              {PROFILES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm({ ...form, profile: id })}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-primary/5",
                    form.profile === id ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border"
                  )}
                >
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <span className="flex-1 font-medium">{label}</span>
                  {form.profile === id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={goNext} disabled={loading || !form.profile} className="flex-1 gradient-primary text-[hsl(0,0%,100%)] font-semibold">
                {loading ? "Enviando..." : "Escolher horário"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && submitted && (
          <div className="space-y-3">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              ✅ Recebemos seus dados, <strong>{form.full_name.split(" ")[0]}</strong>. Agora é só reservar um horário abaixo.
            </div>
            <div className="w-full overflow-hidden rounded-lg border border-border" style={{ height: 620 }}>
              <iframe
                src={calendlyUrl}
                title="Agendamento AdvOne"
                width="100%"
                height="100%"
                frameBorder={0}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Se a agenda não abrir,{" "}
              <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                clique aqui para abrir em nova aba
              </a>
              .
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

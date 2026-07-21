import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Calendar, MessageCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackMetaEvent } from "@/lib/metaPixel";

export default function Obrigado() {
  const [params] = useSearchParams();
  const name = params.get("name") || params.get("invitee_full_name") || "";
  const email = params.get("email") || params.get("invitee_email") || "";
  const phone = params.get("a1") || params.get("phone") || "";
  const firstName = name.split(" ")[0];

  useEffect(() => {
    // Dispara o evento Lead SOMENTE após o agendamento confirmado (redirect do Calendly)
    trackMetaEvent("Lead", {
      email: email || undefined,
      phone: phone || undefined,
      contentName: "Agendamento confirmado - /obrigado",
      customData: { source: "calendly_redirect" },
    });
    // Scroll no topo
    window.scrollTo(0, 0);
  }, [email, phone]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6 ring-4 ring-primary/20">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {firstName ? `${firstName}, seu agendamento está confirmado!` : "Agendamento confirmado!"}
          </h1>
          <p className="text-lg text-muted-foreground">
            Nosso time comercial já recebeu seus dados e vai te encontrar no horário escolhido.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8 text-left space-y-5 shadow-sm">
          <h2 className="text-xl font-semibold text-center">O que acontece agora?</h2>

          <div className="flex gap-4 items-start">
            <Mail className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div>
              <p className="font-medium">Confirmação por e-mail</p>
              <p className="text-sm text-muted-foreground">
                Você recebeu um e-mail com o link da reunião e um convite pro seu calendário.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <MessageCircle className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div>
              <p className="font-medium">Contato no WhatsApp</p>
              <p className="text-sm text-muted-foreground">
                Nosso time entra em contato antes da reunião pra confirmar e tirar dúvidas iniciais.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <Calendar className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div>
              <p className="font-medium">Prepare-se pra reunião</p>
              <p className="text-sm text-muted-foreground">
                Separe 30 minutos, tenha em mente seus principais desafios com leads e atendimento, e o que
                espera automatizar no escritório. Vamos te mostrar a AdvOne funcionando na prática.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gradient-primary text-[hsl(0,0%,100%)] font-semibold">
            <a
              href="https://wa.me/5531984796456?text=Ol%C3%A1%21%20Acabei%20de%20agendar%20uma%20demo%20da%20AdvOne."
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Voltar para o site</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Não recebeu o e-mail? Verifique sua caixa de spam ou fale com a gente no WhatsApp.
        </p>
      </div>
    </div>
  );
}

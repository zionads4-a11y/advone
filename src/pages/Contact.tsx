import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MessageSquare, MapPin, Phone } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone.png";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Contato — Fale com a AdvOne | Suporte, Vendas e DPO</title>
        <meta name="description" content="Entre em contato com a AdvOne: suporte técnico, comercial, encarregado de dados (DPO/LGPD) e canais oficiais de atendimento." />
        <link rel="canonical" href="https://advone.online/contato" />
        <meta property="og:title" content="Contato — AdvOne" />
        <meta property="og:url" content="https://advone.online/contato" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/"><img src={logoAdvOne} alt="AdvOne" className="h-10 w-auto" /></Link>
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12 space-y-10">
        <section className="space-y-3">
          <h1 className="font-display text-4xl font-bold">Fale com a AdvOne</h1>
          <p className="text-lg text-muted-foreground">
            Estamos disponíveis pelos canais oficiais abaixo. Responderemos em até 2 dias úteis.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Mail className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Comercial e Suporte</h2>
            <p className="text-muted-foreground">
              Dúvidas sobre planos, funcionalidades ou suporte técnico.
            </p>
            <a href="mailto:contato@advone.online" className="text-primary font-medium hover:underline">
              contato@advone.online
            </a>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">WhatsApp</h2>
            <p className="text-muted-foreground">
              Atendimento comercial via WhatsApp em horário comercial.
            </p>
            <p className="text-primary font-medium">Em breve</p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Phone className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Encarregado de Dados (DPO)</h2>
            <p className="text-muted-foreground">
              Solicitações relativas à LGPD e proteção de dados pessoais.
            </p>
            <p className="text-sm">
              <strong>Nome:</strong> Daniel Felipe Viana Manaces<br />
              <strong>E-mail:</strong> <a href="mailto:dpo@advone.online" className="text-primary hover:underline">dpo@advone.online</a>
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <MapPin className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Endereço</h2>
            <p className="text-muted-foreground">
              Rua José Bartolota, 40<br />
              Glória — Belo Horizonte/MG — CEP 30.830-440<br />
              Brasil
            </p>
          </article>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 space-y-3">
          <h2 className="text-2xl font-bold">Dados Corporativos</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Razão social:</strong> 54.253.906 DANIEL FELIPE VIANA MANACES<br />
            <strong>CNPJ:</strong> 54.253.906/0001-47<br />
            <strong>Site oficial:</strong> <a href="https://advone.online" className="text-primary hover:underline">https://advone.online</a>
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AdvOne · <Link to="/terms" className="hover:underline">Termos</Link> · <Link to="/privacy" className="hover:underline">Privacidade</Link> · <Link to="/sobre" className="hover:underline">Sobre</Link>
        </div>
      </footer>
    </div>
  );
}

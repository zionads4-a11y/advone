import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, ShieldCheck, KeyRound, Database, Eye, AlertTriangle } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone.png";

export default function Security() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Segurança e Proteção de Dados | AdvOne</title>
        <meta name="description" content="Como a AdvOne protege os dados do seu escritório: criptografia, RLS, LGPD, isolamento por tenant e boas práticas de segurança da informação." />
        <link rel="canonical" href="https://advone.online/seguranca" />
        <meta property="og:title" content="Segurança e Proteção de Dados — AdvOne" />
        <meta property="og:url" content="https://advone.online/seguranca" />
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
          <h1 className="font-display text-4xl font-bold">Segurança e Proteção de Dados</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 10 de julho de 2026</p>
          <p className="text-lg text-muted-foreground">
            Esta página é mantida pela AdvOne para responder às dúvidas mais comuns sobre segurança,
            privacidade e proteção de dados no uso da plataforma. Descreve controles atualmente habilitados;
            não constitui certificação independente.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Lock className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Criptografia</h2>
            <p className="text-sm text-muted-foreground">
              Todo tráfego entre navegador e servidores é protegido por HTTPS/TLS.
              Dados em repouso são armazenados em banco de dados gerenciado com criptografia
              de disco. Senhas são armazenadas apenas como hash criptográfico.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Database className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Isolamento de dados por escritório</h2>
            <p className="text-sm text-muted-foreground">
              Utilizamos Row Level Security (RLS) no banco de dados: cada escritório só enxerga
              seus próprios leads, clientes, conversas e documentos. Nenhum usuário de outro
              escritório consegue acessar seus dados, mesmo com credenciais válidas.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <KeyRound className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Autenticação e acessos</h2>
            <p className="text-sm text-muted-foreground">
              Login por e-mail e senha, com opção de login social (Google). Cinco níveis de perfil
              (Admin, Membro, Gerente, Operador, Cliente) com permissões granulares configuráveis
              pelo próprio escritório.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Conformidade LGPD</h2>
            <p className="text-sm text-muted-foreground">
              A AdvOne opera como <strong>operadora de dados</strong> em relação aos dados de leads
              e clientes do seu escritório, e como <strong>controladora</strong> em relação aos
              dados cadastrais dos usuários da plataforma. Encarregado (DPO) disponível em{" "}
              <a href="mailto:dpo@advone.online" className="text-primary hover:underline">dpo@advone.online</a>.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Eye className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Registros e auditoria</h2>
            <p className="text-sm text-muted-foreground">
              Alterações críticas (configurações de IA, permissões, integrações) são registradas
              em log de auditoria com autor, data e diferenças aplicadas. Webhooks e integrações
              externas mantêm histórico consultável na plataforma.
            </p>
          </article>

          <article className="rounded-xl border border-border bg-card p-6 space-y-3">
            <AlertTriangle className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">Divulgação de vulnerabilidades</h2>
            <p className="text-sm text-muted-foreground">
              Encontrou uma falha de segurança? Reporte responsavelmente para{" "}
              <a href="mailto:seguranca@advone.online" className="text-primary hover:underline">seguranca@advone.online</a>.
              Não exploramos dados de usuários e agradecemos relatos coordenados antes de divulgação pública.
            </p>
          </article>
        </section>

        <section className="rounded-2xl bg-primary/5 border border-primary/20 p-8 space-y-3">
          <h2 className="text-2xl font-bold">Responsabilidade compartilhada</h2>
          <p className="text-sm text-muted-foreground">
            A segurança é uma responsabilidade compartilhada entre a AdvOne e o escritório usuário.
            A AdvOne provê a infraestrutura, criptografia e controles técnicos descritos acima.
            O escritório é responsável por:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
            <li>Usar senhas fortes e ativar autenticação em dois fatores quando disponível;</li>
            <li>Conceder acessos internos apenas às pessoas necessárias;</li>
            <li>Cumprir a LGPD no relacionamento com seus próprios clientes;</li>
            <li>Utilizar as integrações (WhatsApp, Google, ZapSign, Asaas) conforme as políticas de cada provedor.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Subprocessadores</h2>
          <p className="text-sm text-muted-foreground">
            A AdvOne utiliza os seguintes fornecedores para operar a plataforma. Cada um mantém suas
            próprias políticas de segurança e privacidade:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
            <li><strong>Supabase</strong> — banco de dados, autenticação e armazenamento</li>
            <li><strong>Lovable</strong> — hospedagem da aplicação web</li>
            <li><strong>Meta / WhatsApp Business Platform</strong> — envio e recebimento de mensagens WhatsApp</li>
            <li><strong>UaZapi</strong> — conector WhatsApp (para escritórios que não usam API oficial)</li>
            <li><strong>Google (Calendar API)</strong> — sincronização de agendas</li>
            <li><strong>Asaas</strong> — processamento de pagamentos e cobranças</li>
            <li><strong>ZapSign</strong> — assinatura eletrônica de contratos</li>
            <li><strong>Escavador</strong> — dados públicos de processos judiciais</li>
            <li><strong>OpenAI / Google AI</strong> — modelos de linguagem para a Secretária Virtual</li>
          </ul>
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

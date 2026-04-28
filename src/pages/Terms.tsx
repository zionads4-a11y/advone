import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone.png";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAdvOne} alt="AdvOne" className="h-10 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <article className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <h1 className="font-display text-4xl font-bold">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground">
            Última atualização: 27 de abril de 2026
          </p>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar a plataforma <strong>AdvOne</strong> ("Plataforma", "Serviço", "nós"),
              você ("Usuário", "você") concorda integralmente com estes Termos de Uso. Caso não concorde
              com qualquer cláusula, não utilize a Plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">2. Descrição do Serviço</h2>
            <p>
              O AdvOne é um CRM (Customer Relationship Management) destinado a escritórios de advocacia,
              oferecendo gestão de leads, atendimento automatizado por inteligência artificial via WhatsApp,
              agenda integrada, gestão de processos e funcionalidades correlatas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>O Usuário deve fornecer informações verdadeiras, completas e atualizadas no cadastro.</li>
              <li>O Usuário é responsável pela confidencialidade da sua senha e por todas as atividades realizadas em sua conta.</li>
              <li>Notifique-nos imediatamente em caso de uso não autorizado da sua conta.</li>
              <li>Reservamo-nos o direito de suspender contas que violem estes Termos.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">4. Planos e Pagamento</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>O acesso ao AdvOne é mediante assinatura mensal recorrente, conforme planos vigentes.</li>
              <li>Os pagamentos são processados pela Asaas (parceiro financeiro).</li>
              <li>Em caso de inadimplência, o acesso ao painel será bloqueado até regularização.</li>
              <li>O cancelamento pode ser solicitado a qualquer momento, sem multa, com efeito ao final do ciclo vigente.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">5. Uso Aceitável</h2>
            <p>O Usuário compromete-se a NÃO:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Utilizar a Plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros;</li>
              <li>Enviar spam, mensagens não solicitadas ou conteúdo enganoso via WhatsApp;</li>
              <li>Tentar acessar áreas restritas, contas de outros usuários ou sistemas internos;</li>
              <li>Realizar engenharia reversa, decompilar ou copiar partes da Plataforma;</li>
              <li>Utilizar dados de leads em desacordo com a LGPD (Lei 13.709/2018).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">6. Integrações de Terceiros</h2>
            <p>
              O AdvOne integra-se com serviços de terceiros, incluindo Google Calendar, WhatsApp (UaZapi),
              Asaas, ZapSign e Escavador. O uso dessas integrações está sujeito aos termos e políticas
              dos respectivos provedores. Não nos responsabilizamos por interrupções ou falhas desses serviços externos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">7. Integração com Google Calendar</h2>
            <p>
              Ao autorizar a integração com o Google Calendar, você concede ao AdvOne permissão para
              ler, criar e modificar eventos exclusivamente na agenda selecionada, com o propósito de
              sincronizar reuniões agendadas pelo CRM. 
            </p>
            <p>
              Os dados obtidos por meio das APIs do Google não são utilizados para fins de publicidade, remarketing, perfilização de usuários ou qualquer finalidade não diretamente relacionada à funcionalidade principal da aplicação. O AdvOne não compartilha dados do Google com terceiros, exceto quando estritamente necessário para a operação da funcionalidade solicitada pelo usuário.
            </p>
            <p>
              Você pode revogar essa permissão a qualquer momento
              em <a href="https://myaccount.google.com/permissions" className="text-primary underline" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">8. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, marca, logotipo, código-fonte e funcionalidades do AdvOne são de propriedade
              exclusiva da AdvOne e protegidos por leis de direitos autorais e propriedade intelectual. Os
              dados inseridos pelo Usuário (leads, processos, documentos) permanecem de propriedade do Usuário.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">9. Limitação de Responsabilidade</h2>
            <p>
              A Plataforma é fornecida "no estado em que se encontra". Não garantimos disponibilidade
              ininterrupta ou ausência de erros. Não nos responsabilizamos por perdas indiretas, lucros
              cessantes ou danos decorrentes do uso ou indisponibilidade do Serviço, salvo nos limites
              previstos em lei.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">10. Rescisão</h2>
            <p>
              Reservamo-nos o direito de encerrar ou suspender contas que violem estes Termos, sem aviso prévio.
              O Usuário pode cancelar sua conta a qualquer momento. Após o cancelamento, os dados serão
              mantidos pelo prazo legal e excluídos conforme nossa Política de Privacidade.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">11. Alterações dos Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por
              e-mail ou aviso na Plataforma com antecedência mínima de 30 dias.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">12. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
              da Comarca do domicílio do Usuário para dirimir quaisquer controvérsias.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">13. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos, entre em contato:
              <br />
              <strong>E-mail:</strong> contato@advone.online
              <br />
              <strong>Site:</strong> <a href="https://advone.online" className="text-primary underline">advone.online</a>
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AdvOne. Todos os direitos reservados. ·{" "}
          <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}

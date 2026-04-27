import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import logoAdvOne from "@/assets/logo-advone.png";

export default function Privacy() {
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
          <h1 className="font-display text-4xl font-bold">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">
            Última atualização: 27 de abril de 2026
          </p>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">1. Introdução</h2>
            <p>
              A <strong>AdvOne</strong> ("nós", "nosso") está comprometida com a proteção da sua privacidade
              e dos dados pessoais tratados em nossa Plataforma, em conformidade com a Lei Geral de Proteção
              de Dados (LGPD - Lei 13.709/2018) e demais normas aplicáveis. Esta Política descreve como
              coletamos, usamos, armazenamos e protegemos suas informações.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">2. Dados Coletados</h2>
            <h3 className="text-xl font-semibold">2.1 Dados fornecidos por você:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Cadastro:</strong> nome, e-mail, telefone, CNPJ/CPF do escritório, foto de perfil.</li>
              <li><strong>Conteúdo:</strong> dados de leads, processos, documentos, mensagens e arquivos enviados à Plataforma.</li>
              <li><strong>Pagamento:</strong> dados financeiros processados pelo nosso parceiro Asaas (não armazenamos cartões em nossos servidores).</li>
            </ul>

            <h3 className="text-xl font-semibold">2.2 Dados coletados automaticamente:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Endereço IP, tipo de navegador, sistema operacional;</li>
              <li>Páginas visitadas, ações realizadas, data e hora de acesso;</li>
              <li>Cookies essenciais para funcionamento da sessão.</li>
            </ul>

            <h3 className="text-xl font-semibold">2.3 Dados de integrações de terceiros:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google Calendar:</strong> eventos, datas, participantes (apenas leitura/gravação na agenda autorizada).</li>
              <li><strong>WhatsApp (UaZapi):</strong> mensagens, mídias e contatos das conversas com leads.</li>
              <li><strong>Escavador:</strong> dados públicos de processos judiciais (CNJ).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">3. Finalidades do Tratamento</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer, operar e melhorar a Plataforma;</li>
              <li>Autenticar usuários e proteger contas;</li>
              <li>Processar pagamentos e gerenciar assinaturas;</li>
              <li>Enviar notificações operacionais (cadências, lembretes, alertas);</li>
              <li>Cumprir obrigações legais e regulatórias;</li>
              <li>Prevenir fraudes e garantir a segurança da Plataforma.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">4. Uso dos Dados do Google Calendar</h2>
            <p>
              Quando você conecta sua conta Google ao AdvOne, acessamos exclusivamente:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Leitura e escrita de eventos na agenda autorizada por você;</li>
              <li>Sincronização bidirecional de reuniões agendadas via CRM.</li>
            </ul>
            <p>
              <strong>Não usamos esses dados para:</strong> publicidade, treinamento de modelos de IA,
              compartilhamento com terceiros ou qualquer finalidade diversa da sincronização de agenda.
            </p>
            <p>
              O AdvOne adere às{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                Políticas de Dados do Usuário dos Serviços de API do Google
              </a>
              , incluindo os requisitos de Uso Limitado.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">5. Base Legal (LGPD)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Execução de contrato:</strong> dados necessários para prestação do serviço;</li>
              <li><strong>Consentimento:</strong> integrações opcionais (Google, marketing);</li>
              <li><strong>Obrigação legal:</strong> dados fiscais e regulatórios;</li>
              <li><strong>Legítimo interesse:</strong> segurança, prevenção a fraudes e melhorias.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">6. Compartilhamento de Dados</h2>
            <p>Compartilhamos dados apenas com:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Provedores de infraestrutura:</strong> Supabase (banco de dados e armazenamento), Lovable (hospedagem);</li>
              <li><strong>Parceiros operacionais:</strong> Asaas (pagamentos), UaZapi (WhatsApp), ZapSign (assinaturas), Escavador (processos), Google (calendário);</li>
              <li><strong>Autoridades:</strong> mediante ordem judicial ou obrigação legal.</li>
            </ul>
            <p>Não vendemos seus dados pessoais a terceiros.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">7. Armazenamento e Segurança</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dados armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso;</li>
              <li>Acesso restrito por Row Level Security (RLS) e controle de funções;</li>
              <li>Senhas armazenadas com hash criptográfico;</li>
              <li>Backups regulares e monitoramento contínuo.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">8. Retenção</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, os dados são
              retidos por até 5 anos para cumprimento de obrigações legais (fiscais, contábeis) e,
              em seguida, excluídos ou anonimizados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">9. Seus Direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Confirmação da existência de tratamento;</li>
              <li>Acesso aos seus dados;</li>
              <li>Correção de dados incompletos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação;</li>
              <li>Portabilidade;</li>
              <li>Revogação do consentimento;</li>
              <li>Informações sobre compartilhamento.</li>
            </ul>
            <p>
              Para exercer seus direitos, envie e-mail para{" "}
              <strong>contato@advone.online</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">10. Revogação de Acesso ao Google</h2>
            <p>
              Você pode revogar a permissão concedida ao AdvOne para acessar sua conta Google a qualquer
              momento em{" "}
              <a
                href="https://myaccount.google.com/permissions"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              . Após a revogação, a sincronização com o Google Calendar será interrompida.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">11. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para autenticação e funcionamento da sessão. Não usamos cookies
              de publicidade ou rastreamento de terceiros sem consentimento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">12. Menores de Idade</h2>
            <p>
              A Plataforma destina-se a profissionais maiores de 18 anos. Não coletamos intencionalmente
              dados de menores.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">13. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Notificaremos alterações relevantes por
              e-mail ou na Plataforma com antecedência mínima de 30 dias.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-bold">14. Encarregado de Dados (DPO) e Contato</h2>
            <p>
              Para exercer direitos, esclarecer dúvidas ou registrar reclamações relativas ao tratamento
              de dados pessoais:
              <br />
              <strong>E-mail:</strong> contato@advone.online
              <br />
              <strong>Site:</strong>{" "}
              <a href="https://advone.online" className="text-primary underline">
                advone.online
              </a>
            </p>
            <p>
              Você também pode registrar reclamação junto à Autoridade Nacional de Proteção de Dados
              (ANPD) em{" "}
              <a
                href="https://www.gov.br/anpd"
                className="text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                gov.br/anpd
              </a>
              .
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AdvOne. Todos os direitos reservados. ·{" "}
          <Link to="/terms" className="text-primary hover:underline">Termos de Uso</Link>
        </div>
      </footer>
    </div>
  );
}

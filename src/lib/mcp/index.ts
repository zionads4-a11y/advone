import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCompanies from "./tools/list-companies";
import listLeads from "./tools/list-leads";
import getLead from "./tools/get-lead";
import createLead from "./tools/create-lead";
import updateLead from "./tools/update-lead";
import listFunnelColumns from "./tools/list-funnel-columns";
import moveLeadColumn from "./tools/move-lead-column";
import listConversations from "./tools/list-conversations";
import getConversation from "./tools/get-conversation";
import sendWhatsappMessage from "./tools/send-whatsapp-message";
import listMonitoredProcesses from "./tools/list-monitored-processes";
import getProcessStatus from "./tools/get-process-status";

// O issuer OAuth precisa ser o host direto do Supabase, derivado do project ref
// (inline pelo Vite em build time — mantém o módulo seguro para importar).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "advone",
  title: "AdvONe",
  version: "1.0.0",
  instructions: [
    "Ferramentas do AdvOne — CRM jurídico com SDR de IA no WhatsApp, funil Kanban e monitoramento processual.",
    "O usuário conecta com a própria conta AdvOne: todas as tools respeitam as permissões e o escritório dele.",
    "Comece por `list_companies` quando houver mais de um escritório; nas demais tools o company_id é opcional.",
    "Use `list_leads`/`get_lead` para consultar o CRM, `list_funnel_columns` + `move_lead_column` para o funil,",
    "`list_conversations`/`get_conversation` para o histórico de WhatsApp e `list_monitored_processes`/`get_process_status`",
    "para acompanhar processos judiciais e explicar movimentações em linguagem simples.",
    "`send_whatsapp_message` envia mensagem real ao cliente e assume o atendimento humano (desativa o bot na conversa):",
    "sempre confirme o número e o texto com o usuário antes de chamar.",
  ].join(" "),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listCompanies,
    listLeads,
    getLead,
    createLead,
    updateLead,
    listFunnelColumns,
    moveLeadColumn,
    listConversations,
    getConversation,
    sendWhatsappMessage,
    listMonitoredProcesses,
    getProcessStatus,
  ],
});

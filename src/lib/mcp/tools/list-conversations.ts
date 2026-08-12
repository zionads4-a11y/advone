import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser,
  notAuthenticated,
  errorResult,
  jsonResult,
  resolveCompanyId,
} from "../supabase";

export default defineTool({
  name: "list_conversations",
  title: "Listar conversas WhatsApp",
  description:
    "Lista as conversas de WhatsApp do escritório ordenadas pela atividade mais recente, com nome do lead, última mensagem, se está sem resposta e se o bot está ativo.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    only_unread: z.boolean().optional().describe("Apenas conversas com mensagem não lida."),
    limit: z.number().int().min(1).max(100).default(30),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select("phone, message_text, direction, sender_name, timestamp")
      .eq("company_id", resolved.companyId)
      .order("timestamp", { ascending: false })
      .limit(1000);
    if (error) return errorResult(error.message);

    const byPhone = new Map<string, { phone: string; ultima_mensagem: string | null; direcao: string; ultima_mensagem_em: string; total_mensagens: number }>();
    for (const m of messages ?? []) {
      const current = byPhone.get(m.phone);
      if (!current) {
        byPhone.set(m.phone, {
          phone: m.phone,
          ultima_mensagem: m.message_text,
          direcao: m.direction,
          ultima_mensagem_em: m.timestamp,
          total_mensagens: 1,
        });
      } else {
        current.total_mensagens += 1;
      }
    }

    const phones = [...byPhone.keys()];
    const { data: leads } = phones.length
      ? await supabase
          .from("leads")
          .select("id, name, phone, whatsapp, is_unread, bot_disabled, lead_score, status")
          .eq("company_id", resolved.companyId)
          .or(phones.map((p) => `phone.eq.${p},whatsapp.eq.${p}`).join(","))
      : { data: [] };

    const leadByPhone = new Map<string, (typeof leads)[number]>();
    for (const l of leads ?? []) {
      if (l.phone) leadByPhone.set(l.phone, l);
      if (l.whatsapp) leadByPhone.set(l.whatsapp, l);
    }

    let conversations = [...byPhone.values()]
      .map((c) => {
        const lead = leadByPhone.get(c.phone);
        return {
          ...c,
          lead_id: lead?.id ?? null,
          nome: lead?.name ?? null,
          nao_lida: lead?.is_unread ?? false,
          bot_ativo: lead ? !lead.bot_disabled : null,
          lead_score: lead?.lead_score ?? null,
          status: lead?.status ?? null,
          aguardando_resposta_do_escritorio: c.direcao === "incoming",
        };
      })
      .sort((a, b) => b.ultima_mensagem_em.localeCompare(a.ultima_mensagem_em));

    if (input.only_unread) conversations = conversations.filter((c) => c.nao_lida);

    return jsonResult(
      { total: conversations.length, conversations: conversations.slice(0, input.limit) },
      { conversations: conversations.slice(0, input.limit) },
    );
  },
});

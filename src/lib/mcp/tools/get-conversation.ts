import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser,
  notAuthenticated,
  errorResult,
  jsonResult,
  resolveCompanyId,
  phoneVariants,
} from "../supabase";

export default defineTool({
  name: "get_conversation",
  title: "Ler conversa WhatsApp",
  description:
    "Retorna o histórico de mensagens trocadas com um contato em ordem cronológica, identificado por telefone ou lead_id.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    phone: z.string().optional().describe("Telefone do contato."),
    lead_id: z.string().uuid().optional().describe("Id do lead."),
    limit: z.number().int().min(1).max(500).default(100),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!input.phone && !input.lead_id) return errorResult("Informe phone ou lead_id.");
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    let phones: string[] = [];
    let leadName: string | null = null;

    if (input.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("name, phone, whatsapp")
        .eq("id", input.lead_id)
        .eq("company_id", resolved.companyId)
        .maybeSingle();
      if (!lead) return errorResult("Lead não encontrado.");
      leadName = lead.name;
      phones = [lead.phone, lead.whatsapp].filter((p): p is string => Boolean(p));
    } else {
      phones = phoneVariants(input.phone!);
    }
    if (phones.length === 0) return errorResult("Contato sem telefone cadastrado.");

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("direction, message_text, sender_name, timestamp, phone")
      .eq("company_id", resolved.companyId)
      .in("phone", phones)
      .order("timestamp", { ascending: false })
      .limit(input.limit);
    if (error) return errorResult(error.message);

    const mensagens = (data ?? []).reverse().map((m) => ({
      de: m.direction === "incoming" ? "lead" : (m.sender_name ?? "escritorio"),
      texto: m.message_text,
      em: m.timestamp,
    }));

    return jsonResult({ contato: leadName, phones, total: mensagens.length, mensagens }, { mensagens });
  },
});

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
  name: "get_lead",
  title: "Detalhes do lead",
  description:
    "Retorna o lead completo (dados do caso, dados processuais, coluna do funil, agendamentos e últimas mensagens) por id ou por telefone.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().optional().describe("Id do lead."),
    phone: z.string().optional().describe("Telefone do lead (aceita variações com/sem nono dígito)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!input.lead_id && !input.phone) return errorResult("Informe lead_id ou phone.");
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    let query = supabase.from("leads").select("*").eq("company_id", resolved.companyId).limit(1);
    if (input.lead_id) {
      query = query.eq("id", input.lead_id);
    } else {
      const variants = phoneVariants(input.phone!);
      const filter = variants
        .flatMap((v) => [`phone.eq.${v}`, `whatsapp.eq.${v}`])
        .join(",");
      query = query.or(filter);
    }

    const { data: leads, error } = await query;
    if (error) return errorResult(error.message);
    const lead = leads?.[0];
    if (!lead) return errorResult("Lead não encontrado.");

    const [{ data: column }, { data: events }, { data: messages }] = await Promise.all([
      lead.kanban_column_id
        ? supabase.from("kanban_columns").select("id, name, position").eq("id", lead.kanban_column_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("agenda_events")
        .select("id, title, start_at, end_at, meeting_link, status")
        .eq("lead_id", lead.id)
        .order("start_at", { ascending: false })
        .limit(10),
      supabase
        .from("whatsapp_messages")
        .select("direction, message_text, sender_name, timestamp")
        .eq("company_id", resolved.companyId)
        .eq("phone", lead.phone ?? lead.whatsapp ?? "")
        .order("timestamp", { ascending: false })
        .limit(10),
    ]);

    return jsonResult({
      lead,
      kanban_column: column ?? null,
      agendamentos: events ?? [],
      ultimas_mensagens: (messages ?? []).reverse(),
    });
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser,
  notAuthenticated,
  errorResult,
  jsonResult,
  resolveCompanyId,
} from "../supabase";

const LEAD_FIELDS =
  "id, name, phone, whatsapp, email, cpf, status, source, lead_score, case_area, case_subtype, case_urgency, case_summary_short, value, is_client, is_unread, bot_disabled, kanban_column_id, assigned_to, created_at, updated_at";

export default defineTool({
  name: "list_leads",
  title: "Listar leads",
  description:
    "Lista leads do CRM do escritório, com filtros por coluna do funil, status, score, busca por nome/telefone e paginação. Respeita as permissões do usuário conectado.",
  inputSchema: {
    company_id: z.string().uuid().optional().describe("Escritório. Se omitido, usa o primeiro acessível."),
    kanban_column_id: z.string().uuid().optional().describe("Filtra por coluna do funil."),
    status: z.string().optional().describe("Filtra por status do lead (ex: new, contacted, won, lost)."),
    lead_score: z.enum(["hot", "warm", "cold"]).optional().describe("Filtra pela temperatura do lead."),
    only_unread: z.boolean().optional().describe("Apenas leads com mensagem não lida."),
    search: z.string().optional().describe("Busca parcial por nome ou telefone."),
    limit: z.number().int().min(1).max(200).default(50),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("leads")
      .select(LEAD_FIELDS, { count: "exact" })
      .eq("company_id", resolved.companyId)
      .order("updated_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.kanban_column_id) query = query.eq("kanban_column_id", input.kanban_column_id);
    if (input.status) query = query.eq("status", input.status as never);
    if (input.lead_score) query = query.eq("lead_score", input.lead_score);
    if (input.only_unread) query = query.eq("is_unread", true);
    if (input.search) {
      const term = input.search.replace(/[%,]/g, "");
      query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,whatsapp.ilike.%${term}%`);
    }

    const { data, error, count } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(
      { total: count ?? 0, limit: input.limit, offset: input.offset, leads: data ?? [] },
      { leads: data ?? [], total: count ?? 0 },
    );
  },
});

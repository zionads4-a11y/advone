import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser,
  notAuthenticated,
  errorResult,
  jsonResult,
  resolveCompanyId,
  normalizePhone,
  phoneVariants,
} from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Criar lead",
  description:
    "Cria um lead no CRM do escritório. Se já existir lead com o mesmo telefone, faz merge dos campos enviados preservando o histórico e a conversa.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200).describe("Nome do lead."),
    phone: z.string().trim().min(8).max(20).describe("Telefone com DDI+DDD+número."),
    email: z.string().trim().email().max(255).optional(),
    cpf: z.string().trim().max(20).optional(),
    source: z
      .string()
      .optional()
      .describe("Canal de origem (ex: google_ads, meta_ads, organic, indicacao)."),
    notes: z.string().max(4000).optional().describe("Descrição/observações do caso."),
    case_area: z.string().max(100).optional().describe("Área do direito (ex: trabalhista, previdenciario)."),
    kanban_column_id: z.string().uuid().optional().describe("Coluna do funil de destino."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    const phone = normalizePhone(input.phone);
    const variants = phoneVariants(input.phone);

    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", resolved.companyId)
      .or(variants.flatMap((v) => [`phone.eq.${v}`, `whatsapp.eq.${v}`]).join(","))
      .limit(1);

    const payload: Record<string, unknown> = {
      name: input.name,
      phone,
      whatsapp: phone,
      ...(input.email ? { email: input.email } : {}),
      ...(input.cpf ? { cpf: input.cpf } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.case_area ? { case_area: input.case_area } : {}),
      ...(input.kanban_column_id ? { kanban_column_id: input.kanban_column_id } : {}),
    };

    if (existing?.[0]) {
      const { data, error } = await supabase
        .from("leads")
        .update(payload as never)
        .eq("id", existing[0].id)
        .select("id, name, phone, status, kanban_column_id")
        .maybeSingle();
      if (error) return errorResult(error.message);
      return jsonResult({ merged: true, lead: data }, { lead: data, merged: true });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({ ...payload, company_id: resolved.companyId } as never)
      .select("id, name, phone, status, kanban_column_id")
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult({ merged: false, lead: data }, { lead: data, merged: false });
  },
});

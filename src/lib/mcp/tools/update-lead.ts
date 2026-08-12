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
  name: "update_lead",
  title: "Atualizar lead",
  description:
    "Atualiza dados de um lead existente: nome, e-mail, CPF, status, temperatura (score), área do caso, valor estimado ou observações.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    lead_id: z.string().uuid().describe("Id do lead a atualizar."),
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(255).optional(),
    cpf: z.string().trim().max(20).optional(),
    status: z.string().optional().describe("Novo status do lead."),
    lead_score: z.enum(["hot", "warm", "cold"]).optional(),
    case_area: z.string().max(100).optional(),
    value: z.number().nonnegative().optional().describe("Valor estimado da causa."),
    notes: z.string().max(4000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const { company_id: _ignored, lead_id, ...fields } = input;
    const payload = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(payload).length === 0) return errorResult("Nenhum campo para atualizar.");

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .update(payload as never)
      .eq("id", lead_id)
      .eq("company_id", resolved.companyId)
      .select("id, name, phone, email, status, lead_score, case_area, value")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Lead não encontrado ou sem permissão de edição.");
    return jsonResult({ lead: data }, { lead: data });
  },
});

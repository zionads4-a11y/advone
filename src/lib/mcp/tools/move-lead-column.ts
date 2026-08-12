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
  name: "move_lead_column",
  title: "Mover lead no funil",
  description:
    "Move um lead para outra coluna do funil Kanban. A coluna precisa pertencer ao mesmo escritório do lead.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    lead_id: z.string().uuid(),
    kanban_column_id: z.string().uuid().describe("Coluna de destino (ver list_funnel_columns)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    const { data: column } = await supabase
      .from("kanban_columns")
      .select("id, name, is_won, is_lost")
      .eq("id", input.kanban_column_id)
      .eq("company_id", resolved.companyId)
      .maybeSingle();
    if (!column) return errorResult("Coluna não encontrada neste escritório.");

    const { data, error } = await supabase
      .from("leads")
      .update({ kanban_column_id: column.id })
      .eq("id", input.lead_id)
      .eq("company_id", resolved.companyId)
      .select("id, name, kanban_column_id")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Lead não encontrado ou sem permissão.");
    return jsonResult({ lead: data, column }, { lead: data, column });
  },
});

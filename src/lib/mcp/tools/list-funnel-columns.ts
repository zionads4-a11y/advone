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
  name: "list_funnel_columns",
  title: "Listar funis e colunas",
  description:
    "Lista os quadros (funis) e colunas do Kanban comercial do escritório, com contagem de leads por coluna. Use os ids para mover leads.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    const [{ data: boards }, { data: columns, error }] = await Promise.all([
      supabase.from("kanban_boards").select("id, name").eq("company_id", resolved.companyId),
      supabase
        .from("kanban_columns")
        .select("id, name, position, board_id, is_won, is_lost, is_urgent, is_meeting_held")
        .eq("company_id", resolved.companyId)
        .order("position", { ascending: true }),
    ]);
    if (error) return errorResult(error.message);

    const boardList = boards ?? [];
    const grouped = [
      ...boardList.map((b) => ({
        board_id: b.id,
        board_name: b.name,
        columns: (columns ?? []).filter((c) => c.board_id === b.id),
      })),
      {
        board_id: null,
        board_name: "Sem quadro",
        columns: (columns ?? []).filter((c) => !c.board_id),
      },
    ].filter((g) => g.columns.length > 0);

    return jsonResult({ funnels: grouped }, { funnels: grouped });
  },
});

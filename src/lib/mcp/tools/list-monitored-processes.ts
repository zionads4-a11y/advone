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
  name: "list_monitored_processes",
  title: "Listar processos monitorados",
  description:
    "Lista os processos judiciais monitorados do escritório (número CNJ, cliente, tribunal, última movimentação e status previsto).",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    search: z.string().optional().describe("Busca por nome do cliente, CPF ou número CNJ."),
    only_active: z.boolean().default(true),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("monitored_processes")
      .select(
        "id, numero_cnj, client_name, client_cpf, tribunal_sigla, area, classe, assunto, polo_ativo, polo_passivo, status_predito, quantidade_movimentacoes, data_ultima_movimentacao, last_checked_at, is_active",
        { count: "exact" },
      )
      .eq("company_id", resolved.companyId)
      .order("data_ultima_movimentacao", { ascending: false, nullsFirst: false })
      .limit(input.limit);

    if (input.only_active) query = query.eq("is_active", true);
    if (input.search) {
      const term = input.search.replace(/[%,]/g, "");
      query = query.or(
        `client_name.ilike.%${term}%,client_cpf.ilike.%${term}%,numero_cnj.ilike.%${term}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ total: count ?? 0, processos: data ?? [] }, { processos: data ?? [] });
  },
});

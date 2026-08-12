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
  name: "get_process_status",
  title: "Situação do processo",
  description:
    "Retorna a situação atual de um processo monitorado pelo número CNJ, com as últimas movimentações em ordem cronológica, para explicar em linguagem simples o que aconteceu.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    numero_cnj: z.string().trim().min(15).max(30).describe("Número CNJ do processo (com ou sem máscara)."),
    movements_limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const digits = input.numero_cnj.replace(/\D/g, "");
    const supabase = supabaseForUser(ctx);
    const { data: processes, error } = await supabase
      .from("monitored_processes")
      .select("*")
      .eq("company_id", resolved.companyId)
      .limit(500);
    if (error) return errorResult(error.message);

    const processo = (processes ?? []).find((p) => p.numero_cnj.replace(/\D/g, "") === digits);
    if (!processo) {
      return errorResult(
        "Processo não encontrado no monitoramento deste escritório. Cadastre o processo no AdvOne para acompanhá-lo.",
      );
    }

    const { data: movimentacoes } = await supabase
      .from("process_movements")
      .select("movement_date, movement_type, content, source_name, source_grau, source_provider")
      .eq("monitored_process_id", processo.id)
      .order("movement_date", { ascending: false })
      .limit(input.movements_limit);

    return jsonResult({
      processo: {
        numero_cnj: processo.numero_cnj,
        cliente: processo.client_name,
        tribunal: processo.tribunal_sigla,
        area: processo.area,
        classe: processo.classe,
        assunto: processo.assunto,
        polo_ativo: processo.polo_ativo,
        polo_passivo: processo.polo_passivo,
        status_predito: processo.status_predito,
        total_movimentacoes: processo.quantidade_movimentacoes,
        ultima_movimentacao_em: processo.data_ultima_movimentacao,
        ultima_verificacao: processo.last_checked_at,
      },
      movimentacoes: (movimentacoes ?? []).reverse(),
    });
  },
});

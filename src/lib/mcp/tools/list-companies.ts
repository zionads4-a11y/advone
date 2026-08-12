import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_companies",
  title: "Listar escritórios",
  description:
    "Lista os escritórios (empresas) que o usuário conectado pode acessar no AdvOne. Use o id retornado como company_id nas outras tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, plan, service_mode, is_active")
      .order("name", { ascending: true });
    if (error) return errorResult(error.message);
    return jsonResult({ total: data?.length ?? 0, companies: data ?? [] }, { companies: data ?? [] });
  },
});

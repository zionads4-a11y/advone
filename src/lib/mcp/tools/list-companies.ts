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
      .select("id, name, billing_model, service_mode, practice_specialty, message_quota_monthly, messages_used_current_period")
      .order("name", { ascending: true });
    if (error) return errorResult(error.message);
    return jsonResult({ total: data?.length ?? 0, companies: data ?? [] }, { companies: data ?? [] });
  },
});

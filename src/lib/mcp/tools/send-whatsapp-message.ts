import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser,
  supabaseProjectUrl,
  notAuthenticated,
  errorResult,
  jsonResult,
  resolveCompanyId,
  normalizePhone,
} from "../supabase";

export default defineTool({
  name: "send_whatsapp_message",
  title: "Enviar mensagem WhatsApp",
  description:
    "Envia uma mensagem de WhatsApp para um contato pelo número conectado do escritório. Atenção: envia de verdade ao cliente e desativa o bot naquela conversa (assume atendimento humano). Confirme com o usuário antes de disparar.",
  inputSchema: {
    company_id: z.string().uuid().optional(),
    phone: z.string().trim().min(8).max(20).describe("Destinatário com DDI+DDD+número."),
    message: z.string().trim().min(1).max(4000).describe("Texto da mensagem."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const resolved = await resolveCompanyId(ctx, input.company_id);
    if ("error" in resolved) return errorResult(resolved.error);

    const token = ctx.getToken();
    if (!token) return notAuthenticated();

    const res = await fetch(`${supabaseProjectUrl()}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        company_id: resolved.companyId,
        phone: normalizePhone(input.phone),
        message: input.message,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ToolError(
        `Falha ao enviar (${res.status}): ${(body as { error?: string }).error ?? "erro desconhecido"}`,
      );
    }
    return jsonResult({ enviado: true, message_id: (body as { message_id?: string }).message_id ?? null });
  },
});

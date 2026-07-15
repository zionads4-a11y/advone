// Notifica advogado via WhatsApp quando um lead é atribuído a ele
// ou quando é mencionado em uma nota interna do lead.
// Chamado por triggers do banco (trg_notify_lawyer_on_assignment / trg_notify_user_on_mention).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendText } from "../_shared/whatsappProvider.ts";

const APP_URL = Deno.env.get("APP_PUBLIC_URL") || "https://advone.online";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { lead_id, user_id, company_id, kind, message } = await req.json();
    if (!lead_id || !user_id || !company_id) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Telefone do advogado
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user_id)
      .maybeSingle();

    const phone = (profile?.phone || "").replace(/\D/g, "");
    if (!phone || phone.length < 10) {
      return new Response(JSON.stringify({ ok: false, reason: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Dados do lead
    const { data: lead } = await supabase
      .from("leads")
      .select("name, phone, area_direito, case_area, tipo_caso_detalhado")
      .eq("id", lead_id)
      .maybeSingle();

    // 3) Config WhatsApp da empresa
    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();
    if (!config) {
      return new Response(JSON.stringify({ ok: false, reason: "no_whatsapp_config" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const area = lead?.area_direito || lead?.case_area || "não informada";
    const firstName = (profile?.full_name || "").split(" ")[0] || "";
    const link = `${APP_URL}/leads`;

    let text: string;
    if (kind === "mention") {
      text =
`💬 Olá${firstName ? " " + firstName : ""}, você foi mencionado numa conversa interna sobre o lead *${lead?.name || "sem nome"}*.

"${(message || "").slice(0, 300)}"

Abra: ${link}`;
    } else {
      text =
`🔔 Olá${firstName ? " " + firstName : ""}, um novo lead foi atribuído a você.

👤 *${lead?.name || "Sem nome"}*
📱 ${lead?.phone || "-"}
⚖️ Área: ${area}
${lead?.tipo_caso_detalhado ? "📌 " + lead.tipo_caso_detalhado + "\n" : ""}
Acesse: ${link}`;
    }

    const result = await sendText(config as any, phone, text);

    // Log em audit_logs
    await supabase.from("audit_logs").insert({
      company_id,
      user_id,
      entity_type: "lead",
      entity_id: lead_id,
      action: kind === "mention" ? "mention_notified" : "assignment_notified",
      new_values: { phone, ok: result.ok, error: result.error ?? null },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-lawyer-assigned] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

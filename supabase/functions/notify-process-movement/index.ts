// Notifica advogado responsável, estagiários do card e gerentes da empresa
// via WhatsApp (UaZapi) quando o Escavador registra uma nova movimentação
// em um processo que tem card no Kanban.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function sendWhatsapp(instanceId: string, token: string, phoneRaw: string, message: string) {
  const phone = (phoneRaw || "").replace(/\D/g, "");
  if (!phone || !instanceId || !token) return;
  try {
    await fetch(
      `https://ziondigital.uazapi.com/instance/send-text/${instanceId}?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      }
    );
  } catch (e) {
    console.error("uazapi error", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { card_id, company_id, snippet } = await req.json();
    if (!card_id || !company_id) {
      return new Response(JSON.stringify({ error: "missing card_id or company_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = admin();

    const { data: card } = await sb
      .from("process_cards")
      .select("id, title, client_name, cnj_number, responsible_id")
      .eq("id", card_id)
      .maybeSingle();
    if (!card) return new Response(JSON.stringify({ ok: false, reason: "card not found" }), { headers: corsHeaders });

    // Recipients: responsible + team + gerentes da empresa
    const userIds = new Set<string>();
    if (card.responsible_id) userIds.add(card.responsible_id);

    const { data: team } = await sb
      .from("process_card_team").select("user_id").eq("card_id", card_id);
    (team || []).forEach((t: any) => t.user_id && userIds.add(t.user_id));

    // gerentes da empresa
    const { data: companyUsers } = await sb
      .from("client_companies").select("user_id").eq("company_id", company_id);
    const cuIds = (companyUsers || []).map((c: any) => c.user_id).filter(Boolean);
    if (cuIds.length) {
      const { data: gerentes } = await sb
        .from("user_roles").select("user_id").in("user_id", cuIds).eq("role", "gerente");
      (gerentes || []).forEach((g: any) => userIds.add(g.user_id));
    }

    if (userIds.size === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profiles } = await sb
      .from("profiles").select("user_id, full_name, whatsapp, phone")
      .in("user_id", Array.from(userIds));

    const { data: cfg } = await sb
      .from("whatsapp_configs")
      .select("zapi_instance_id, zapi_token")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!cfg?.zapi_instance_id || !cfg?.zapi_token) {
      return new Response(JSON.stringify({ ok: false, reason: "no whatsapp config" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const title = card.title || card.client_name || "Processo";
    const message =
      `⚖️ *Nova movimentação processual*\n\n` +
      `📋 *${title}*\n` +
      (card.cnj_number ? `🔢 ${card.cnj_number}\n` : "") +
      (card.client_name && card.title ? `👤 ${card.client_name}\n` : "") +
      `\n📌 ${snippet || "Nova movimentação detectada"}\n\n` +
      `Abra o card no Kanban de Processos para analisar (juntada de documento, apelação, etc).`;

    let sent = 0;
    for (const p of (profiles || [])) {
      const phone = (p as any).whatsapp || (p as any).phone;
      if (!phone) continue;
      await sendWhatsapp(cfg.zapi_instance_id, cfg.zapi_token, phone, message);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("notify-process-movement error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

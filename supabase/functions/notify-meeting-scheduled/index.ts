import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVER_URL = "https://ziondigital.uazapi.com";

function formatBR(date: Date) {
  // Convert to Brasília (UTC-3)
  const br = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const d = br.getUTCDate().toString().padStart(2, "0");
  const m = (br.getUTCMonth() + 1).toString().padStart(2, "0");
  const y = br.getUTCFullYear();
  const h = br.getUTCHours().toString().padStart(2, "0");
  const min = br.getUTCMinutes().toString().padStart(2, "0");
  return { date: `${d}/${m}/${y}`, time: `${h}:${min}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reminder_id } = await req.json();
    if (!reminder_id) {
      return new Response(JSON.stringify({ error: "reminder_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch reminder
    const { data: reminder } = await supabase
      .from("lead_reminders")
      .select("id, lead_id, company_id, due_at, reminder_type, title")
      .eq("id", reminder_id)
      .maybeSingle();

    if (!reminder || reminder.reminder_type !== "meeting") {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead
    const { data: lead } = await supabase
      .from("leads")
      .select("name, cpf, cpf_cliente_final, phone, whatsapp")
      .eq("id", reminder.lead_id)
      .maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({ skipped: "no lead" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company + whatsapp config
    const [{ data: company }, { data: config }] = await Promise.all([
      supabase.from("companies").select("name, whatsapp").eq("id", reminder.company_id).maybeSingle(),
      supabase
        .from("whatsapp_configs")
        .select("zapi_token, zapi_instance_id, alert_whatsapp")
        .eq("company_id", reminder.company_id)
        .maybeSingle(),
    ]);

    if (!config?.zapi_token && !config?.zapi_instance_id) {
      console.log("No whatsapp config for company", reminder.company_id);
      return new Response(JSON.stringify({ skipped: "no config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alertNumber = config?.alert_whatsapp || company?.whatsapp;
    if (!alertNumber) {
      console.log("No alert number for company", reminder.company_id);
      return new Response(JSON.stringify({ skipped: "no alert number" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date, time } = formatBR(new Date(reminder.due_at));
    const cpf = lead.cpf_cliente_final || lead.cpf || "não informado";
    const leadPhone = lead.whatsapp || lead.phone || "não informado";

    const message =
      `🔔 *Novo agendamento confirmado*\n\n` +
      `📅 *Data:* ${date}\n` +
      `⏰ *Horário:* ${time}\n` +
      `👤 *Cliente:* ${lead.name}\n` +
      `🆔 *CPF:* ${cpf}\n` +
      `📱 *Contato:* ${leadPhone}` +
      (reminder.title ? `\n📝 *Compromisso:* ${reminder.title}` : "") +
      `\n\n💡 _Lembre-se de acessar a agenda do AdvOne para marcar novas atividades, conferir os horários disponíveis e manter seus compromissos sempre atualizados._`;

    const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN") || "";
    const instanceParam = encodeURIComponent(config.zapi_instance_id);
    const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);

    const sendResp = await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        admintoken: ADMIN_TOKEN,
      },
      body: JSON.stringify({ number: alertNumber, text: message }),
    });

    const sendText = await sendResp.text();
    if (!sendResp.ok) {
      console.error("Failed to send meeting alert:", sendText);
      return new Response(JSON.stringify({ error: "send failed", details: sendText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Meeting alert sent to ${alertNumber} for reminder ${reminder_id}`);
    return new Response(JSON.stringify({ sent: true, to: alertNumber }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err, "unknown");
    console.error("notify-meeting-scheduled error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

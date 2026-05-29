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
      .select("id, lead_id, company_id, due_at, reminder_type, title, created_by")
      .eq("id", reminder_id)
      .maybeSingle();

    if (!reminder || reminder.reminder_type !== "meeting") {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Só notifica quando o agendamento foi criado pela IA (sentinel UUID).
    // Agendamentos manuais (feitos pelo próprio advogado/operador na agenda) não disparam alerta.
    const AI_SENTINEL = "00000000-0000-0000-0000-000000000000";
    if (reminder.created_by !== AI_SENTINEL) {
      console.log(`Skipping manual meeting alert for reminder ${reminder_id} (created_by=${reminder.created_by})`);
      return new Response(JSON.stringify({ skipped: "manual creation" }), {
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

    // Fetch company, whatsapp config and niche-specific routing
    const [{ data: company }, { data: config }, { data: qualification }] = await Promise.all([
      supabase.from("companies").select("name, whatsapp").eq("id", reminder.company_id).maybeSingle(),
      supabase
        .from("whatsapp_configs")
        .select("zapi_token, zapi_instance_id, alert_whatsapp")
        .eq("company_id", reminder.company_id)
        .maybeSingle(),
      supabase
        .from("lead_qualification_answers")
        .select("niche")
        .eq("lead_id", reminder.lead_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!config?.zapi_token && !config?.zapi_instance_id) {
      console.log("No whatsapp config for company", reminder.company_id);
      return new Response(JSON.stringify({ skipped: "no config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determina o(s) destinatário(s):
    // 1) número específico do nicho (se cadastrado e ativo)
    // 2) fallback: alert_whatsapp da empresa ou whatsapp principal
    const recipients: { number: string; label: string }[] = [];
    const leadNiche = qualification?.niche || null;

    if (leadNiche) {
      const { data: nicheAlert } = await supabase
        .from("company_niche_alerts")
        .select("whatsapp, lawyer_name")
        .eq("company_id", reminder.company_id)
        .eq("niche", leadNiche)
        .eq("is_active", true)
        .maybeSingle();
      if (nicheAlert?.whatsapp) {
        recipients.push({
          number: nicheAlert.whatsapp,
          label: nicheAlert.lawyer_name || `advogado ${leadNiche}`,
        });
      }
    }

    if (recipients.length === 0) {
      const fallback = config?.alert_whatsapp || company?.whatsapp;
      if (!fallback) {
        console.log("No alert number for company", reminder.company_id);
        return new Response(JSON.stringify({ skipped: "no alert number" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      recipients.push({ number: fallback, label: "empresa" });
    }

    const { date, time } = formatBR(new Date(reminder.due_at));
    const cpf = lead.cpf_cliente_final || lead.cpf || "não informado";
    const leadPhone = lead.whatsapp || lead.phone || "não informado";

    // ===== Resumo da conversa via IA =====
    // Pega últimas 30 mensagens do lead e gera resumo executivo curto.
    let conversationSummary = "";
    try {
      const phoneForLookup = lead.whatsapp || lead.phone;
      if (phoneForLookup) {
        const { data: msgs } = await supabase
          .from("whatsapp_messages")
          .select("direction, sender_name, message_text, timestamp")
          .eq("company_id", reminder.company_id)
          .eq("phone", String(phoneForLookup).replace(/\D/g, ""))
          .order("timestamp", { ascending: true })
          .limit(30);

        if (msgs && msgs.length > 0) {
          const transcript = msgs
            .map((m: any) => {
              const who = m.direction === "incoming" ? "Cliente" : (m.sender_name === "IA" ? "IA" : "Atendente");
              return `[${who}]: ${m.message_text || "[mídia]"}`;
            })
            .join("\n");

          const openaiKey = Deno.env.get("OPENAI_API_KEY");
          const lovableKey = Deno.env.get("LOVABLE_API_KEY");

          // Prefere Lovable AI (grátis); cai pra OpenAI se faltar
          const aiUrl = lovableKey
            ? "https://ai.gateway.lovable.dev/v1/chat/completions"
            : "https://api.openai.com/v1/chat/completions";
          const aiKey = lovableKey || openaiKey;
          const aiModel = lovableKey ? "google/gemini-2.5-flash-lite" : "gpt-5-mini";

          if (aiKey) {
            const sumResp = await fetch(aiUrl, {
              method: "POST",
              headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: aiModel,
                messages: [
                  {
                    role: "system",
                    content:
                      "Você resume conversas de WhatsApp entre uma SDR jurídica (IA) e um cliente. Gere um resumo CURTO (máx. 5 bullets) cobrindo: tipo de caso, dados informados pelo cliente, principais dores/objetivos e qualquer ponto crítico. Português, objetivo, sem floreios. Sem saudação no início. Use bullets com '•'.",
                  },
                  { role: "user", content: `Conversa:\n${transcript}` },
                ],
              }),
            });
            if (sumResp.ok) {
              const sumData = await sumResp.json();
              const txt = sumData.choices?.[0]?.message?.content?.trim();
              if (txt) conversationSummary = txt;
            } else {
              console.error("Summary AI failed:", sumResp.status, await sumResp.text());
            }
          }
        }
      }
    } catch (sumErr) {
      console.error("Erro ao gerar resumo da conversa:", sumErr);
    }

    const message =
      `🔔 *Novo Agendamento Confirmado*\n\n` +
      `📅 *Data:* ${date} (Segunda-feira)\n` +
      `⏰ *Horário:* ${time}\n` +
      `👤 *Cliente:* ${lead.name}\n` +
      `📱 *Contato:* ${leadPhone}` +
      (reminder.title ? `\n📝 *Compromisso:* ${reminder.title}` : "") +
      `\n\n💡 O cliente já foi notificado.`;

    const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN") || "";
    const instanceParam = encodeURIComponent(config.zapi_instance_id);
    const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);

    const results: { to: string; ok: boolean; details?: string }[] = [];
    for (const r of recipients) {
      const sendResp = await fetch(
        `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", admintoken: ADMIN_TOKEN },
          body: JSON.stringify({ number: r.number, text: message }),
        }
      );
      const sendText = await sendResp.text();
      if (!sendResp.ok) {
        console.error(`Failed to send meeting alert to ${r.label} (${r.number}):`, sendText);
        results.push({ to: r.number, ok: false, details: sendText });
      } else {
        console.log(`Meeting alert sent to ${r.label} (${r.number}) for reminder ${reminder_id}`);
        results.push({ to: r.number, ok: true });
      }
    }

    const allOk = results.every((r) => r.ok);
    return new Response(JSON.stringify({ sent: allOk, niche: leadNiche, results }), {
      status: allOk ? 200 : 500,
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

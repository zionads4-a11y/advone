import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";
import { REMINDER_WINDOWS, formatDateBR, formatTimeBR } from "./_logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVER_URL = "https://ziondigital.uazapi.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch upcoming meetings (next 7 hours) that are not completed
    const now = new Date();
    const maxFuture = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const { data: reminders, error } = await supabase
      .from("lead_reminders")
      .select("id, lead_id, company_id, title, due_at, reminder_type, reminder_6h_sent, reminder_2h_sent, reminder_30m_sent, lawyer_3h_sent, lawyer_30m_sent")
      .eq("completed", false)
      .eq("reminder_type", "meeting")
      .gte("due_at", now.toISOString())
      .lte("due_at", maxFuture.toISOString())
      .limit(100);

    if (error) {
      console.error("Error fetching reminders:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const reminder of reminders) {
      const dueAt = new Date(reminder.due_at);
      // Convert to Brasília time (UTC-3)
      const dueBrasilia = new Date(dueAt.getTime() - 3 * 60 * 60 * 1000);
      const hoursUntil = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Get lead info
      const { data: lead } = await supabase
        .from("leads")
        .select("name, phone, whatsapp")
        .eq("id", reminder.lead_id)
        .single();

      if (!lead) continue;

      const phone = lead.whatsapp || lead.phone;
      if (!phone) continue;

      const leadName = lead.name.split(" ")[0]; // First name only

      // Get WhatsApp config
      const { data: config } = await supabase
        .from("whatsapp_configs")
        .select("zapi_instance_id, zapi_token")
        .eq("company_id", reminder.company_id)
        .maybeSingle();

      if (!config) continue;

      const dateStr = formatDateBR(dueBrasilia);
      const timeStr = formatTimeBR(dueBrasilia);

      // Carrega configuração customizada da empresa (tempos + textos)
      const { data: customWindows } = await supabase
        .from("company_meeting_reminder_config")
        .select("window_key, minutes_before, message_text, enabled")
        .eq("company_id", reminder.company_id);

      const customByKey = new Map<string, { minutes_before: number; message_text: string; enabled: boolean }>();
      for (const c of (customWindows || [])) {
        customByKey.set(c.window_key, c);
      }

      for (const window of REMINDER_WINDOWS) {
        // Check if already sent
        if ((reminder as any)[window.column] === true) continue;

        // Mapeia coluna -> chave de janela ('reminder_6h_sent' -> 'reminder_6h')
        const windowKey = window.column.replace(/_sent$/, "");
        const custom = customByKey.get(windowKey);

        // Se a empresa desabilitou esta janela, pula
        if (custom && custom.enabled === false) continue;

        // Tempo (minutos antes) — usa custom se houver, senão calcula do range padrão (média)
        let minutesBefore: number;
        if (custom) {
          minutesBefore = custom.minutes_before;
        } else {
          minutesBefore = Math.round(((window.hoursBeforeMin + window.hoursBeforeMax) / 2) * 60);
        }

        // Tolerância de ±15 minutos em torno do alvo (cron roda a cada 5-10min)
        const minutesUntil = (dueAt.getTime() - now.getTime()) / (1000 * 60);
        const tolerance = 15;
        const lowerBound = custom ? minutesBefore - tolerance : window.hoursBeforeMin * 60;
        const upperBound = custom ? minutesBefore + tolerance : window.hoursBeforeMax * 60;

        if (minutesUntil < lowerBound || minutesUntil > upperBound) continue;

        // Texto: customizado (com placeholders) ou template default
        const messageText = custom
          ? custom.message_text
              .replaceAll("{nome}", leadName)
              .replaceAll("{data}", dateStr)
              .replaceAll("{horario}", timeStr)
          : window.getMessage(leadName, dateStr, timeStr);

        try {
          const sendUrl = `${SERVER_URL}/send/text`;
          const sendResponse = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "token": config.zapi_token || config.zapi_instance_id,
            },
            body: JSON.stringify({ number: phone, body: messageText }),
          });

          if (sendResponse.ok) {
            const sendResult = await sendResponse.json();

            // Mark as sent
            await supabase
              .from("lead_reminders")
              .update({ [window.column]: true })
              .eq("id", reminder.id);

            // Store outgoing message
            await supabase.from("whatsapp_messages").insert({
              company_id: reminder.company_id,
              lead_id: reminder.lead_id,
              phone,
              message_text: messageText,
              direction: "outgoing",
              sender_name: "Lembrete",
              message_id_external: sendResult.messageId || null,
              timestamp: new Date().toISOString(),
            });

            console.log(`Reminder ${window.column} sent for lead ${reminder.lead_id}`);
            sent++;
          } else {
            console.error(`Failed to send ${window.column} for reminder ${reminder.id}:`, await sendResponse.text());
          }
        } catch (err) {
          console.error(`Error sending ${window.column}:`, err);
        }
      }

      // ===== Lembretes para o(s) ADVOGADO(s) =====
      // 2 janelas: 3h antes e 30min antes da reunião.
      const LAWYER_WINDOWS = [
        {
          column: "lawyer_3h_sent" as const,
          minutesBefore: 180,
          tolerance: 20,
          label: "3h",
        },
        {
          column: "lawyer_30m_sent" as const,
          minutesBefore: 30,
          tolerance: 12,
          label: "30min",
        },
      ];

      const pendingLawyerWindows = LAWYER_WINDOWS.filter((w) => {
        if ((reminder as any)[w.column] === true) return false;
        const minutesUntil = (dueAt.getTime() - now.getTime()) / (1000 * 60);
        return (
          minutesUntil >= w.minutesBefore - w.tolerance &&
          minutesUntil <= w.minutesBefore + w.tolerance
        );
      });

      if (pendingLawyerWindows.length > 0) {
        // Resolve destinatários: nicho específico OU alert_whatsapp/companies.whatsapp.
        const recipients: { number: string; label: string }[] = [];

        const { data: qualification } = await supabase
          .from("lead_qualification_answers")
          .select("niche")
          .eq("lead_id", reminder.lead_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

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
          const { data: alertConf } = await supabase
            .from("whatsapp_configs")
            .select("alert_whatsapp")
            .eq("company_id", reminder.company_id)
            .maybeSingle();
          const { data: companyRow } = await supabase
            .from("companies")
            .select("whatsapp, name")
            .eq("id", reminder.company_id)
            .maybeSingle();
          const fallback = alertConf?.alert_whatsapp || companyRow?.whatsapp;
          if (fallback) {
            recipients.push({ number: fallback, label: "empresa" });
          }
        }

        if (recipients.length > 0) {
          const { data: companyName } = await supabase
            .from("companies")
            .select("name")
            .eq("id", reminder.company_id)
            .maybeSingle();
          const _ = companyName; // not used in template, kept for future

          for (const lw of pendingLawyerWindows) {
            const lawyerMessage =
              `🔔 *Lembrete de reunião — ${lw.label} antes*\n\n` +
              `📅 *Data:* ${dateStr}\n` +
              `⏰ *Horário:* ${timeStr}\n` +
              `👤 *Cliente:* ${lead.name}\n` +
              `📱 *Contato do cliente:* ${phone}` +
              (reminder.title ? `\n📝 *Compromisso:* ${reminder.title}` : "") +
              `\n\n💡 _Prepare-se: confira o histórico do lead no AdvOne antes do horário._`;

            let allOk = true;
            for (const r of recipients) {
              try {
                const sendResp = await fetch(`${SERVER_URL}/send/text`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "token": config.zapi_token || config.zapi_instance_id,
                  },
                  body: JSON.stringify({ number: r.number, body: lawyerMessage }),
                });
                if (!sendResp.ok) {
                  allOk = false;
                  console.error(
                    `Failed to send lawyer ${lw.label} alert to ${r.label} (${r.number}):`,
                    await sendResp.text()
                  );
                } else {
                  console.log(
                    `Lawyer ${lw.label} alert sent to ${r.label} (${r.number}) for reminder ${reminder.id}`
                  );
                  sent++;
                }
              } catch (err) {
                allOk = false;
                console.error(`Error sending lawyer ${lw.label} alert:`, err);
              }
            }

            if (allOk) {
              await supabase
                .from("lead_reminders")
                .update({ [lw.column]: true })
                .eq("id", reminder.id);
            }
          }
        } else {
          console.log(
            `No lawyer recipient configured for company ${reminder.company_id} (reminder ${reminder.id})`
          );
        }
      }
    }

    console.log(`Reminders processed: ${sent} sent`);

    return new Response(
      JSON.stringify({ processed: reminders.length, sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Reminder processing error:", error);
    const errorMessage = getErrorMessage(error, "Unknown error");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

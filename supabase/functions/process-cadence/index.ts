import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CADENCE_MESSAGES: Record<number, string> = {
  1: "Oi! Vi que você ainda não conseguiu responder 😊\nPosso esclarecer alguma dúvida sobre o seu caso?",
  2: "Passando por aqui novamente 😊\nAinda faz sentido conversar com um advogado sobre sua situação?",
  3: "Dependendo do seu caso, pode ser importante agir rápido.\nPosso te encaixar na agenda para uma análise 👇",
  4: "Oi! Só passando mais uma vez 😊\nA consulta é gratuita e sem compromisso. Quer que eu agende para você?",
  5: "Última mensagem, prometo 😅\nSe ainda precisar falar com um advogado sobre seu caso, é só me responder.",
};

// Inactivity nudge messages during active conversation
const INACTIVITY_NUDGES: { minutesAfter: number; message: string }[] = [
  {
    minutesAfter: 30,
    message: "Oi! Ainda estou por aqui 😊\n\nSe tiver qualquer dúvida, pode me perguntar. Estou aqui pra te ajudar!",
  },
  {
    minutesAfter: 90,
    message: "Ei, tudo bem? 🙂\n\nVi que a gente estava conversando… se quiser continuar, é só me responder!\n\nPosso te ajudar a agendar uma análise gratuita do seu caso.",
  },
  {
    minutesAfter: 150,
    message: "Oi! Passando aqui de novo 😊\n\nSeu caso pode ter solução, sabia? Muita gente na mesma situação já conseguiu resolver.\n\nQuer que eu te encaixe na agenda? É rápido e sem compromisso!",
  },
  {
    minutesAfter: 180,
    message: "Última mensagem por hoje, prometo 😅\n\nSe mudar de ideia, é só me chamar aqui. A consulta é gratuita e o advogado analisa seu caso pessoalmente.\n\nEstou por aqui! 🙂",
  },
];

const MAX_CADENCE_ATTEMPTS = 5;

async function sendWhatsAppMessage(
  config: any,
  phone: string,
  text: string
): Promise<any> {
  const SERVER_URL = "https://ziondigital.uazapi.com";
  const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ADMIN_TOKEN) headers["admintoken"] = ADMIN_TOKEN;

  const instanceParam = encodeURIComponent(config.zapi_instance_id);
  const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);
  const sendUrl = `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`;

  const response = await fetch(sendUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ number: phone, text }),
  });

  if (response.ok) {
    return await response.json();
  }
  console.error("Send failed:", response.status, await response.text());
  return null;
}

async function processInactivityNudges(supabase: any) {
  let nudgesSent = 0;

  // Get all companies with AI enabled
  const { data: configs } = await supabase
    .from("whatsapp_configs")
    .select("company_id, zapi_instance_id, zapi_token, ai_enabled, ai_auto_reply")
    .eq("ai_enabled", true)
    .eq("ai_auto_reply", true);

  if (!configs || configs.length === 0) return nudgesSent;

  for (const config of configs) {
    try {
      // Find leads in active conversation (status = contacted, bot not disabled)
      const { data: activeLeads } = await supabase
        .from("leads")
        .select("id, phone, whatsapp, name, bot_disabled")
        .eq("company_id", config.company_id)
        .eq("status", "contacted")
        .eq("bot_disabled", false);

      if (!activeLeads || activeLeads.length === 0) continue;

      for (const lead of activeLeads) {
        const phone = lead.whatsapp || lead.phone;
        if (!phone) continue;

        // Get the last 2 messages for this conversation
        const { data: lastMessages } = await supabase
          .from("whatsapp_messages")
          .select("direction, timestamp, sender_name")
          .eq("company_id", config.company_id)
          .eq("phone", phone)
          .order("timestamp", { ascending: false })
          .limit(2);

        if (!lastMessages || lastMessages.length === 0) continue;

        const lastMsg = lastMessages[0];

        // Only nudge if last message was OUTGOING (bot/IA sent, lead didn't reply)
        if (lastMsg.direction !== "outgoing") continue;

        // Don't nudge if last message was already a nudge
        if (lastMsg.sender_name === "Nudge") continue;

        const lastMsgTime = new Date(lastMsg.timestamp).getTime();
        const now = Date.now();
        const minutesSinceLastMsg = (now - lastMsgTime) / (1000 * 60);

        // Count how many nudges were already sent for this conversation today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: nudgesSentToday } = await supabase
          .from("whatsapp_messages")
          .select("id, timestamp")
          .eq("company_id", config.company_id)
          .eq("phone", phone)
          .eq("sender_name", "Nudge")
          .gte("timestamp", todayStart.toISOString())
          .order("timestamp", { ascending: false });

        const nudgeCount = nudgesSentToday?.length || 0;

        // Already sent all 4 nudges today — stop
        if (nudgeCount >= INACTIVITY_NUDGES.length) continue;

        // Find the next nudge to send based on time elapsed
        const nextNudge = INACTIVITY_NUDGES[nudgeCount];
        if (!nextNudge) continue;

        // Check if enough time has passed for this nudge level
        if (minutesSinceLastMsg < nextNudge.minutesAfter) continue;

        // Also check that we haven't sent a nudge in the last 25 minutes (avoid spam)
        if (nudgesSentToday && nudgesSentToday.length > 0) {
          const lastNudgeTime = new Date(nudgesSentToday[0].timestamp).getTime();
          const minutesSinceLastNudge = (now - lastNudgeTime) / (1000 * 60);
          if (minutesSinceLastNudge < 25) continue;
        }

        // Send the nudge — replace {nome} with actual lead name
        const nudgeText = nextNudge.message.replace(/\{nome\}/g, lead.name || "");
        const result = await sendWhatsAppMessage(config, phone, nudgeText);

        if (result) {
          await supabase.from("whatsapp_messages").insert({
            company_id: config.company_id,
            lead_id: lead.id,
            phone,
            message_text: nudgeText,
            direction: "outgoing",
            sender_name: "Nudge",
            message_id_external: result.messageId || result.key?.id || null,
            timestamp: new Date().toISOString(),
          });

          console.log(`Nudge ${nudgeCount + 1}/4 sent to ${phone} (${minutesSinceLastMsg.toFixed(0)}min inactive)`);
          nudgesSent++;
        }
      }
    } catch (err) {
      console.error("Inactivity nudge error for company:", config.company_id, err);
    }
  }

  return nudgesSent;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== PART 1: Process scheduled cadence messages ==========
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("cadence_messages")
      .select("id, company_id, lead_id, phone, day_number, message_text")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error("Error fetching cadence messages:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;

    for (const msg of (pendingMessages || [])) {
      try {
        // Check if lead has responded since cadence was created
        const { data: recentIncoming } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("company_id", msg.company_id)
          .eq("phone", msg.phone)
          .eq("direction", "incoming")
          .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentIncoming && recentIncoming.length > 0) {
          await supabase
            .from("cadence_messages")
            .update({ status: "cancelled" })
            .eq("lead_id", msg.lead_id)
            .eq("status", "pending");
          skipped++;
          continue;
        }

        // Check if lead status changed
        const { data: lead } = await supabase
          .from("leads")
          .select("status, bot_disabled, name")
          .eq("id", msg.lead_id)
          .single();

        if (lead && (lead.status !== "new" || lead.bot_disabled)) {
          await supabase
            .from("cadence_messages")
            .update({ status: "cancelled" })
            .eq("lead_id", msg.lead_id)
            .eq("status", "pending");
          skipped++;
          continue;
        }

        const { data: config } = await supabase
          .from("whatsapp_configs")
          .select("zapi_instance_id, zapi_token, scheduling_link, office_name, practice_area")
          .eq("company_id", msg.company_id)
          .maybeSingle();

        if (!config) {
          await supabase
            .from("cadence_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
          continue;
        }

        // Analyze conversation with AI before sending follow-up
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          try {
            const { data: conversationMsgs } = await supabase
              .from("whatsapp_messages")
              .select("message_text, direction, sender_name")
              .eq("company_id", msg.company_id)
              .eq("phone", msg.phone)
              .order("timestamp", { ascending: false })
              .limit(20);

            const history = (conversationMsgs || []).reverse().map((m: any) =>
              `${m.direction === "incoming" ? "Lead" : (m.sender_name || "Bot")}: ${m.message_text || ""}`
            ).join("\n");

            if (history.trim()) {
              const aiAnalysis = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash-lite",
                  messages: [
                    {
                      role: "system",
                      content: `Você é um analista de leads. Analise a conversa abaixo e responda APENAS com um JSON: {"action": "continue" | "lost", "reason": "motivo breve"}

Responda "continue" se:
- O lead demonstrou interesse mas parou de responder (normal, vale tentar follow-up)
- A conversa foi curta e não houve rejeição explícita
- O lead pediu para falar depois ou disse que estava ocupado

Responda "lost" se:
- O lead disse EXPLICITAMENTE que NÃO quer ser contatado
- O lead pediu para parar de enviar mensagens
- O lead disse que já resolveu o problema
- O lead foi grosseiro ou bloqueou
- O lead disse que não tem interesse

Na DÚVIDA, responda "continue".`
                    },
                    { role: "user", content: `Conversa:\n${history}` }
                  ],
                }),
              });

              if (aiAnalysis.ok) {
                const aiData = await aiAnalysis.json();
                const content = aiData.choices?.[0]?.message?.content || "";
                
                // Extract JSON from response
                const jsonMatch = content.match(/\{[^}]+\}/);
                if (jsonMatch) {
                  try {
                    const decision = JSON.parse(jsonMatch[0]);
                    if (decision.action === "lost") {
                      console.log(`AI decided lead ${msg.lead_id} is lost: ${decision.reason}`);
                      
                      // Mark as lost
                      const { data: lostColumn } = await supabase
                        .from("kanban_columns")
                        .select("id")
                        .eq("company_id", msg.company_id)
                        .eq("is_lost", true)
                        .maybeSingle();

                      await supabase.from("leads").update({
                        status: "lost",
                        notes: `[IA - Follow-up] Lead descartado: ${decision.reason}`,
                        ...(lostColumn ? { kanban_column_id: lostColumn.id } : {}),
                      }).eq("id", msg.lead_id);

                      // Cancel all pending cadence
                      await supabase
                        .from("cadence_messages")
                        .update({ status: "cancelled" })
                        .eq("lead_id", msg.lead_id)
                        .eq("status", "pending");

                      skipped++;
                      continue;
                    }
                  } catch { /* parse error, continue normally */ }
                }
              }
            }
          } catch (aiErr) {
            console.error("AI cadence analysis error:", aiErr);
            // Continue with normal follow-up on AI error
          }
        }

        let messageText = msg.message_text || CADENCE_MESSAGES[msg.day_number] || CADENCE_MESSAGES[1];
        // Replace {nome} with actual lead name
        if (lead?.name) {
          messageText = messageText.replace(/\{nome\}/g, lead.name);
        }
        if ((config as any).scheduling_link) {
          messageText += `\n\n${(config as any).scheduling_link}`;
        }

        const result = await sendWhatsAppMessage(config, msg.phone, messageText);

        if (result) {
          await supabase
            .from("cadence_messages")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", msg.id);

          await supabase.from("whatsapp_messages").insert({
            company_id: msg.company_id,
            lead_id: msg.lead_id,
            phone: msg.phone,
            message_text: messageText,
            direction: "outgoing",
            sender_name: "Cadência",
            message_id_external: result.messageId || null,
            timestamp: new Date().toISOString(),
          });

          // Novo funil: pos 0=Em Atendimento, pos 1..5=1º a 5º Follow-UP
          // day_number 1 → pos 1 (1º Follow-UP), ..., day_number 5 → pos 5 (5º Follow-UP)
          const targetPosition = Math.min(msg.day_number, 5);
          const { data: targetColumn } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", msg.company_id)
            .eq("position", targetPosition)
            .maybeSingle();

          if (targetColumn) {
            await supabase.from("leads").update({
              kanban_column_id: targetColumn.id,
            }).eq("id", msg.lead_id);
          }

          if (msg.day_number >= MAX_CADENCE_ATTEMPTS) {
            const { data: lostColumn } = await supabase
              .from("kanban_columns")
              .select("id")
              .eq("company_id", msg.company_id)
              .eq("is_lost", true)
              .maybeSingle();

            if (lostColumn) {
              await supabase.from("leads").update({
                kanban_column_id: lostColumn.id,
                status: "lost",
                notes: "[Cadência] Lead não respondeu após 5 tentativas de contato",
              }).eq("id", msg.lead_id);
            }
          }

          sent++;
        } else {
          await supabase
            .from("cadence_messages")
            .update({ status: "failed" })
            .eq("id", msg.id);
        }
      } catch (err) {
        console.error("Error processing cadence message:", msg.id, err);
        await supabase
          .from("cadence_messages")
          .update({ status: "failed" })
          .eq("id", msg.id);
      }
    }

    // ========== PART 2: Process inactivity nudges ==========
    const nudgesSent = await processInactivityNudges(supabase);

    console.log(`Cadence: ${sent} sent, ${skipped} skipped | Nudges: ${nudgesSent} sent`);

    return new Response(
      JSON.stringify({
        cadence: { processed: (pendingMessages || []).length, sent, skipped },
        nudges: { sent: nudgesSent },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Cadence processing error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

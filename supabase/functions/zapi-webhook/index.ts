import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSDRPrompt(config: any) {
  const officeName = config.office_name || "o escritório";
  const practiceArea = config.practice_area || "";
  const tone = config.communication_tone || "moderado";
  const schedulingLink = config.scheduling_link || "";
  const consultationDuration = config.consultation_duration || "30 minutos";
  const targetAudience = config.target_audience || "";
  const customPrompt = config.ai_prompt || "";

  const toneInstructions = tone === "formal"
    ? "Use linguagem formal e tratamento respeitoso (Sr./Sra.)."
    : tone === "informal"
    ? "Use linguagem leve e amigável, com emojis moderados."
    : "Seja educado e profissional, mas acessível.";

  return `Você é um SDR virtual especializado em atendimento para ${officeName}${practiceArea ? `, atuando em ${practiceArea}` : ""}.

Seu ÚNICO objetivo é qualificar rapidamente o lead e levá-lo a agendar uma conversa com um advogado.

REGRAS IMPORTANTES:
- Você NÃO responde dúvidas jurídicas
- Você NÃO dá orientação legal
- Você NÃO entra em explicações técnicas
- Você sempre conduz para o agendamento
- ${toneInstructions}

COMPORTAMENTO:
- Mensagens curtas (máximo 2-3 linhas)
- Sempre faça perguntas que avancem a conversa
- Nunca deixe a conversa morrer

${targetAudience ? `PÚBLICO-ALVO: ${targetAudience}` : ""}

${customPrompt ? `INSTRUÇÕES ADICIONAIS DO ESCRITÓRIO:\n${customPrompt}` : ""}

FLUXO DE ATENDIMENTO:
1. Cumprimente o lead e se apresente como assistente de ${officeName}
2. Faça uma qualificação rápida: "Seu caso é sobre qual situação?"
3. Após a resposta, conduza para agendamento: "Perfeito, o advogado pode te orientar melhor sobre isso."
4. Pergunte qual o melhor dia e horário para a consulta
5. Use a ferramenta "schedule_appointment" para criar o agendamento na agenda do sistema
${consultationDuration ? `6. A consulta dura aproximadamente ${consultationDuration}.` : ""}

SE O LEAD FIZER PERGUNTAS JURÍDICAS:
"Essa parte o advogado vai conseguir te orientar com mais precisão. Vamos agendar um horário para você falar direto com ele?"

SE O LEAD RESISTIR:
"Entendo! Mas uma conversa rápida já pode te dar clareza do que fazer. Leva menos de ${consultationDuration} 👇"

QUALIFICAÇÃO:
- Use a ferramenta "qualify_lead" quando tiver informações suficientes
- Use "schedule_appointment" quando o lead aceitar agendar — SEMPRE pergunte data e horário antes de agendar
- Se o lead NÃO for qualificado, oriente educadamente para o recurso correto (INSS, Procon, Defensoria Pública, etc.)

Responda SEMPRE em português do Brasil.`;
}

async function qualifyLeadWithAI(
  config: any,
  conversationHistory: { role: string; content: string }[],
  companyId: string,
  leadId: string,
  supabase: any
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const systemPrompt = buildSDRPrompt(config);

  const tools = [
    {
      type: "function",
      function: {
        name: "qualify_lead",
        description: "Registra a qualificação do lead. Use quando tiver informações suficientes.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["qualified", "not_qualified", "needs_more_info"],
              description: "qualified = lead adequado, not_qualified = caso não se encaixa, needs_more_info = precisa de mais informações"
            },
            reason: {
              type: "string",
              description: "Motivo da qualificação em português"
            },
            summary: {
              type: "string",
              description: "Resumo breve do caso do lead"
            },
            lead_score: {
              type: "string",
              enum: ["quente", "morno", "frio"],
              description: "quente = muito interessado/engajado, morno = interesse moderado, frio = pouco engajamento"
            }
          },
          required: ["status", "reason", "lead_score"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "schedule_appointment",
        description: "Agenda uma consulta/reunião para o lead na agenda do sistema. Use quando o lead aceitar agendar ou demonstrar interesse claro.",
        parameters: {
          type: "object",
          properties: {
            message_to_lead: {
              type: "string",
              description: "Mensagem confirmando o agendamento para o lead"
            },
            date: {
              type: "string",
              description: "Data sugerida para o agendamento no formato YYYY-MM-DD. Se o lead não especificou, sugira o próximo dia útil."
            },
            time: {
              type: "string",
              description: "Horário sugerido no formato HH:MM. Se não especificado, use 10:00."
            },
            summary: {
              type: "string",
              description: "Breve descrição do assunto da reunião"
            }
          },
          required: ["message_to_lead", "date", "time"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "transfer_to_human",
        description: "Transfere para atendente humano quando o lead for qualificado.",
        parameters: {
          type: "object",
          properties: {
            message_to_lead: {
              type: "string",
              description: "Mensagem informando que será atendido por um especialista"
            }
          },
          required: ["message_to_lead"],
          additionalProperties: false
        }
      }
    }
  ];

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
        ],
        tools,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status, await aiResponse.text());
      return null;
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices?.[0]?.message;
    if (!message) return null;

    let qualificationResult: { status: string; reason: string; summary?: string; lead_score?: string } | null = null;
    let replyText = message.content || "";
    let shouldSchedule = false;

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* ignore */ }

        if (fnName === "qualify_lead") {
          qualificationResult = {
            status: args.status || "needs_more_info",
            reason: args.reason || "",
            summary: args.summary || "",
            lead_score: args.lead_score || "morno",
          };
        }

        if (fnName === "schedule_appointment") {
          shouldSchedule = true;
          replyText = args.message_to_lead || replyText;

          // Create appointment in the system agenda
          if (leadId) {
            const appointmentDate = args.date || new Date(Date.now() + 86400000).toISOString().split("T")[0];
            const appointmentTime = args.time || "10:00";
            const dueAt = `${appointmentDate}T${appointmentTime}:00`;

            // Get lead name
            const { data: leadData } = await supabase
              .from("leads")
              .select("name")
              .eq("id", leadId)
              .single();

            const leadName = leadData?.name || "Lead";

            await supabase.from("lead_reminders").insert({
              lead_id: leadId,
              company_id: companyId,
              created_by: "00000000-0000-0000-0000-000000000000",
              title: `📅 Consulta: ${leadName}`,
              description: args.summary || `Agendamento automático via bot IA`,
              reminder_type: "meeting",
              due_at: dueAt,
            });

            // Send WhatsApp notification to lawyer's alert number
            if (config.alert_whatsapp) {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const alertPhone = config.alert_whatsapp.replace(/\D/g, "");
              const alertMessage = `🔔 *Novo Agendamento Automático*\n\n👤 Lead: ${leadName}\n📅 Data: ${appointmentDate}\n⏰ Horário: ${appointmentTime}\n${args.summary ? `📋 Assunto: ${args.summary}\n` : ""}\n_Agendado automaticamente pelo bot SDR_`;

              const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (config.zapi_token) alertHeaders["token"] = config.zapi_token;
              if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;

              await fetch(`${SERVER_URL}/send/text`, {
                method: "POST",
                headers: alertHeaders,
                body: JSON.stringify({ number: alertPhone, text: alertMessage }),
              });
            }
          }
        }

        if (fnName === "transfer_to_human") {
          replyText = args.message_to_lead || "Um especialista irá atendê-lo em breve!";
        }
      }

      // Apply qualification
      if (qualificationResult && leadId) {
        // Update lead score
        const scoreUpdate: any = {};
        if (qualificationResult.lead_score) {
          scoreUpdate.lead_score = qualificationResult.lead_score;
        }

        if (qualificationResult.status === "qualified" || shouldSchedule) {
          const newStatus = shouldSchedule ? "qualified" : "contacted";
          await supabase.from("leads").update({
            status: newStatus,
            notes: `[IA] ${qualificationResult.reason}${qualificationResult.summary ? ` | ${qualificationResult.summary}` : ""}`,
            ...scoreUpdate,
          }).eq("id", leadId);

          await supabase.from("lead_summaries").insert({
            lead_id: leadId,
            company_id: companyId,
            summary_text: `🤖 ${shouldSchedule ? "Agendamento" : "Qualificação"}: ${qualificationResult.reason}${qualificationResult.summary ? `\n\nResumo: ${qualificationResult.summary}` : ""}`,
            generated_by_ai: true,
            created_by: "00000000-0000-0000-0000-000000000000",
          });

          // Move in kanban
          const targetPosition = shouldSchedule ? 3 : 1; // "Agendado" or "Contatado"
          const { data: columns } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", companyId)
            .order("position", { ascending: true })
            .limit(targetPosition + 1);

          if (columns && columns.length > targetPosition) {
            await supabase.from("leads").update({
              kanban_column_id: columns[targetPosition].id,
            }).eq("id", leadId);
          }
        } else if (qualificationResult.status === "not_qualified") {
          const { data: lostColumn } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", companyId)
            .eq("is_lost", true)
            .maybeSingle();

          await supabase.from("leads").update({
            status: "lost",
            notes: `[IA - Não qualificado] ${qualificationResult.reason}`,
            ...scoreUpdate,
            ...(lostColumn ? { kanban_column_id: lostColumn.id } : {}),
          }).eq("id", leadId);

          await supabase.from("lead_summaries").insert({
            lead_id: leadId,
            company_id: companyId,
            summary_text: `🤖 Lead não qualificado: ${qualificationResult.reason}`,
            generated_by_ai: true,
            created_by: "00000000-0000-0000-0000-000000000000",
          });
        } else {
          // needs_more_info — just update score
          if (Object.keys(scoreUpdate).length > 0) {
            await supabase.from("leads").update(scoreUpdate).eq("id", leadId);
          }
        }
      }
    }

    return replyText || null;
  } catch (error) {
    console.error("AI qualification error:", error);
    return null;
  }
}

async function enrollInCadence(supabase: any, companyId: string, leadId: string, phone: string) {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from("cadence_messages")
    .select("id")
    .eq("lead_id", leadId)
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) return; // Already enrolled

  const now = new Date();
  const cadenceDays = [1, 2, 3, 5];

  const messages = cadenceDays.map((day) => ({
    company_id: companyId,
    lead_id: leadId,
    phone,
    day_number: day,
    scheduled_at: new Date(now.getTime() + day * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  }));

  const { error } = await supabase.from("cadence_messages").insert(messages);
  if (error) {
    console.error("Error enrolling in cadence:", error);
  } else {
    console.log(`Lead ${leadId} enrolled in cadence (${cadenceDays.length} messages)`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("id, company_id, zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply, office_name, practice_area, communication_tone, scheduling_link, consultation_duration, target_audience, alert_whatsapp")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Company not configured" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Z-API webhook payload:", JSON.stringify(body).substring(0, 500));

    if (!body) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect message type: UaZapi sends EventType="messages" with message object
    // Legacy format used body.type === "ReceivedCallback"
    const isUaZapiMessage = body.EventType === "messages" && body.message && !body.message.fromMe;
    const isLegacyMessage = body.type === "ReceivedCallback";

    // Skip non-message events (read receipts, status updates, sent messages, etc.)
    if (!isUaZapiMessage && !isLegacyMessage) {
      // Handle status/read receipt events silently
      if (body.type === "ReadReceipt" || body.type === "SentCallback" || body.type === "MessageStatusCallback" || body.EventType === "messages_update") {
        return new Response(JSON.stringify({ ok: true, type: body.type || body.EventType }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract fields from UaZapi or legacy format
    let phone: string;
    let senderName: string;
    let messageText: string;
    let messageIdExternal: string;
    let isGroup: boolean;

    if (isUaZapiMessage) {
      // UaZapi format: message.sender_pn = "553184796456@s.whatsapp.net"
      const msg = body.message;
      phone = msg.sender_pn || msg.chatid || "";
      senderName = msg.senderName || body.chat?.name || body.chat?.wa_contactName || "";
      messageText = msg.text || msg.content || msg.caption || "[mídia]";
      messageIdExternal = msg.messageid || msg.id || "";
      isGroup = msg.isGroup || false;
    } else {
      // Legacy ReceivedCallback format
      phone = body.phone || "";
      senderName = body.senderName || body.chatName || "";
      messageText = body.text?.message || body.image?.caption || body.video?.caption || "[mídia]";
      messageIdExternal = body.messageId || "";
      isGroup = body.isGroup || false;
    }

    if (isGroup || !phone) {
      return new Response(JSON.stringify({ ok: true, skipped: isGroup ? "group_message" : "no_phone" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

      const cleanPhone = phone.replace("@c.us", "").replace("@s.whatsapp.net", "");

      // Extract tracking code
      let trackingCode: string | null = null;
      let utmData: any = {};
      let detectedSource: string | null = null;

      const codeMatch = messageText.match(/\[([A-Z0-9]{6})\]/);
      if (codeMatch) {
        trackingCode = codeMatch[1];
        const { data: click } = await supabase
          .from("tracking_clicks")
          .select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
          .eq("tracking_code", trackingCode)
          .is("lead_id", null)
          .maybeSingle();

        if (click) {
          utmData = {
            utm_source: click.utm_source || undefined,
            utm_medium: click.utm_medium || undefined,
            utm_campaign: click.utm_campaign || undefined,
            utm_content: click.utm_content || undefined,
            utm_term: click.utm_term || undefined,
          };
          const src = (click.utm_source || "").toLowerCase();
          if (src.includes("google") || src === "gads") detectedSource = "google";
          else if (src.includes("meta") || src.includes("facebook") || src.includes("instagram")) detectedSource = "meta";
        }
      }

      // Find or create lead
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, status")
        .eq("company_id", companyId)
        .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
        .maybeSingle();

      let leadId = existingLead?.id;

      if (!leadId) {
        const { data: firstColumn } = await supabase
          .from("kanban_columns")
          .select("id")
          .eq("company_id", companyId)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            company_id: companyId,
            name: senderName || `Lead ${cleanPhone}`,
            phone: cleanPhone,
            whatsapp: cleanPhone,
            status: "new",
            lead_score: "morno",
            kanban_column_id: firstColumn?.id || null,
            ...(detectedSource && { source: detectedSource }),
            ...utmData,
          })
          .select("id")
          .single();

        if (leadError) {
          console.error("Error creating lead:", leadError);
        } else {
          leadId = newLead.id;
          console.log("New lead created:", leadId);

          // Enroll new lead in cadence (will send follow-ups if they don't respond)
          await enrollInCadence(supabase, companyId, leadId, cleanPhone);
        }
      } else {
        // Lead responded — cancel any pending cadence
        await supabase
          .from("cadence_messages")
          .update({ status: "cancelled" })
          .eq("lead_id", leadId)
          .eq("status", "pending");

        // Update UTM if missing
        if (Object.keys(utmData).length > 0) {
          const { data: existingLeadData } = await supabase
            .from("leads")
            .select("utm_source, source")
            .eq("id", leadId)
            .single();

          if (existingLeadData) {
            const updates: Record<string, string> = {};
            if (!existingLeadData.utm_source) Object.assign(updates, utmData);
            if (!existingLeadData.source && detectedSource) updates.source = detectedSource;
            if (Object.keys(updates).length > 0) {
              await supabase.from("leads").update(updates).eq("id", leadId);
            }
          }
        }
      }

      // Match tracking click
      if (trackingCode && leadId) {
        await supabase
          .from("tracking_clicks")
          .update({ lead_id: leadId, matched_at: new Date().toISOString() })
          .eq("tracking_code", trackingCode)
          .is("lead_id", null);
      }

      // Store incoming message
      await supabase.from("whatsapp_messages").insert({
        company_id: companyId,
        lead_id: leadId || null,
        phone: cleanPhone,
        message_text: messageText,
        direction: "incoming",
        sender_name: senderName,
        message_id_external: messageIdExternal,
        timestamp: body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString(),
      });

      // AI Auto-Reply with SDR qualification
      if (config.ai_enabled && config.ai_auto_reply && leadId) {
        try {
          const leadStatus = existingLead?.status;
          const isAlreadyHandled = leadStatus && !["new"].includes(leadStatus);

          if (!isAlreadyHandled) {
            const { data: recentMsgs } = await supabase
              .from("whatsapp_messages")
              .select("message_text, direction")
              .eq("company_id", companyId)
              .eq("phone", cleanPhone)
              .order("timestamp", { ascending: false })
              .limit(15);

            const history = (recentMsgs || [])
              .reverse()
              .map((m: any) => ({
                role: m.direction === "incoming" ? "user" : "assistant",
                content: m.message_text || "",
              }));

            const aiReply = await qualifyLeadWithAI(config, history, companyId, leadId, supabase);

            if (aiReply) {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const sendHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (ADMIN_TOKEN) sendHeaders["admintoken"] = ADMIN_TOKEN;

              const instanceParam = encodeURIComponent(config.zapi_instance_id);
              const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);
              const sendUrl = `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`;
              console.log("Sending AI reply to:", cleanPhone, "via:", sendUrl);
              const sendResponse = await fetch(sendUrl, {
                method: "POST",
                headers: sendHeaders,
                body: JSON.stringify({ number: cleanPhone, text: aiReply }),
              });

              if (sendResponse.ok) {
                const sendResult = await sendResponse.json();
                await supabase.from("whatsapp_messages").insert({
                  company_id: companyId,
                  lead_id: leadId,
                  phone: cleanPhone,
                  message_text: aiReply,
                  direction: "outgoing",
                  sender_name: "IA",
                  message_id_external: sendResult.messageId || sendResult.key?.id || null,
                  timestamp: new Date().toISOString(),
                });
              } else {
                console.error("Failed to send AI reply:", sendResponse.status, await sendResponse.text());
              }
            }
          }
        } catch (aiError) {
          console.error("AI auto-reply error:", aiError);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, lead_id: leadId, new_lead: !existingLead, tracking_code: trackingCode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

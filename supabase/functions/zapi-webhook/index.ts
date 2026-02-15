import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function qualifyLeadWithAI(
  config: any,
  conversationHistory: { role: string; content: string }[],
  companyId: string,
  leadId: string,
  supabase: any
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const systemPrompt = `${config.ai_prompt || "Você é um atendente virtual. Seja cordial e objetivo."}

INSTRUÇÕES IMPORTANTES DE QUALIFICAÇÃO:
- Você é um agente de triagem. Seu objetivo é entender rapidamente se o lead é adequado para o escritório.
- Faça perguntas objetivas para qualificar o lead (máximo 3-4 perguntas).
- Quando tiver informação suficiente, use a ferramenta "qualify_lead" para registrar sua análise.
- Se o lead for qualificado, use a ferramenta "transfer_to_human" para encaminhar ao atendente.
- Se o lead NÃO for qualificado, explique educadamente que o caso não se encaixa no perfil do escritório e use "qualify_lead" com status "not_qualified".
- Seja sempre cordial e profissional.
- NÃO fique respondendo muitas perguntas do lead. Foque em qualificar rapidamente.
- Responda SEMPRE em português do Brasil.`;

  const tools = [
    {
      type: "function",
      function: {
        name: "qualify_lead",
        description: "Registra a qualificação do lead após análise da conversa. Use quando tiver informações suficientes para decidir se o lead é adequado.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["qualified", "not_qualified", "needs_more_info"],
              description: "qualified = lead adequado para o escritório, not_qualified = caso não se encaixa, needs_more_info = precisa de mais informações"
            },
            reason: {
              type: "string",
              description: "Motivo da qualificação em português (ex: 'Cliente com mais de 2 anos de vínculo, demitido sem justa causa')"
            },
            summary: {
              type: "string",
              description: "Resumo breve do caso do lead em português"
            }
          },
          required: ["status", "reason"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "transfer_to_human",
        description: "Transfere o atendimento para um atendente humano. Use quando o lead for qualificado e precisar de atendimento especializado.",
        parameters: {
          type: "object",
          properties: {
            message_to_lead: {
              type: "string",
              description: "Mensagem final para o lead informando que será atendido por um especialista"
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
      console.error("AI qualification error:", aiResponse.status, await aiResponse.text());
      return null;
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const message = choice?.message;

    if (!message) return null;

    // Process tool calls if any
    let qualificationResult: { status: string; reason: string; summary?: string } | null = null;
    let transferMessage: string | null = null;
    let replyText = message.content || "";

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(toolCall.function?.arguments || "{}");
        } catch { /* ignore parse errors */ }

        if (fnName === "qualify_lead") {
          qualificationResult = {
            status: args.status || "needs_more_info",
            reason: args.reason || "",
            summary: args.summary || "",
          };
          console.log("Lead qualification result:", JSON.stringify(qualificationResult));
        }

        if (fnName === "transfer_to_human") {
          transferMessage = args.message_to_lead || "Um especialista irá atendê-lo em breve!";
        }
      }

      // Apply qualification to lead
      if (qualificationResult && leadId) {
        if (qualificationResult.status === "qualified") {
          // Move to "contacted" status
          await supabase.from("leads").update({
            status: "contacted",
            notes: `[IA] ${qualificationResult.reason}${qualificationResult.summary ? ` | ${qualificationResult.summary}` : ""}`,
          }).eq("id", leadId);

          // Create a summary
          await supabase.from("lead_summaries").insert({
            lead_id: leadId,
            company_id: companyId,
            summary_text: `🤖 Qualificação automática: ${qualificationResult.reason}${qualificationResult.summary ? `\n\nResumo: ${qualificationResult.summary}` : ""}`,
            generated_by_ai: true,
            created_by: "00000000-0000-0000-0000-000000000000",
          });

          // Move to second kanban column (typically "Contatado")
          const { data: columns } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", companyId)
            .order("position", { ascending: true })
            .limit(2);

          if (columns && columns.length >= 2) {
            await supabase.from("leads").update({
              kanban_column_id: columns[1].id,
            }).eq("id", leadId);
          }

          console.log("Lead qualified and moved:", leadId);
        } else if (qualificationResult.status === "not_qualified") {
          // Mark as lost
          const { data: lostColumn } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", companyId)
            .eq("is_lost", true)
            .maybeSingle();

          await supabase.from("leads").update({
            status: "lost",
            notes: `[IA - Não qualificado] ${qualificationResult.reason}`,
            ...(lostColumn ? { kanban_column_id: lostColumn.id } : {}),
          }).eq("id", leadId);

          await supabase.from("lead_summaries").insert({
            lead_id: leadId,
            company_id: companyId,
            summary_text: `🤖 Lead não qualificado: ${qualificationResult.reason}`,
            generated_by_ai: true,
            created_by: "00000000-0000-0000-0000-000000000000",
          });

          console.log("Lead not qualified:", leadId);
        }
      }

      // If transfer requested, use the transfer message as reply
      if (transferMessage) {
        replyText = transferMessage;
      }
    }

    return replyText || null;
  } catch (error) {
    console.error("AI qualification error:", error);
    return null;
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

    // Get company_id from URL path: /zapi-webhook?company_id=xxx
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      console.error("Missing company_id parameter");
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify this company has a WhatsApp config
    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("id, company_id, zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config) {
      console.error("No WhatsApp config found for company:", companyId);
      return new Response(JSON.stringify({ error: "Company not configured" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Z-API webhook payload:", JSON.stringify(body));

    // Z-API sends different event types
    if (!body || !body.type) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.type === "ReceivedCallback") {
      const phone = body.phone || "";
      const senderName = body.senderName || body.chatName || "";
      const messageText = body.text?.message || body.image?.caption || body.video?.caption || "[mídia]";
      const messageIdExternal = body.messageId || "";
      const isGroup = body.isGroup || false;

      // Skip group messages
      if (isGroup) {
        return new Response(JSON.stringify({ ok: true, skipped: "group_message" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!phone) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_phone" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean phone number
      const cleanPhone = phone.replace("@c.us", "").replace("@s.whatsapp.net", "");

      // Try to extract tracking code from message [XXXXXX]
      let trackingCode: string | null = null;
      let utmData: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string } = {};
      let detectedSource: string | null = null;

      const codeMatch = messageText.match(/\[([A-Z0-9]{6})\]/);
      if (codeMatch) {
        trackingCode = codeMatch[1];
        console.log("Tracking code found in message:", trackingCode);

        const { data: click } = await supabase
          .from("tracking_clicks")
          .select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tracking_link_id")
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
          console.log("UTM data from tracking click:", JSON.stringify(utmData));

          const src = (click.utm_source || "").toLowerCase();
          if (src.includes("google") || src === "gads" || src === "googleads") {
            detectedSource = "google";
          } else if (src.includes("meta") || src.includes("facebook") || src.includes("instagram") || src === "fb" || src === "ig") {
            detectedSource = "meta";
          }
        }
      }

      // Check if lead exists for this phone + company
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, status")
        .eq("company_id", companyId)
        .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
        .maybeSingle();

      let leadId = existingLead?.id;

      // If no lead exists, create one automatically
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
            kanban_column_id: firstColumn?.id || null,
            ...(detectedSource && { source: detectedSource }),
            ...(utmData.utm_source && { utm_source: utmData.utm_source }),
            ...(utmData.utm_medium && { utm_medium: utmData.utm_medium }),
            ...(utmData.utm_campaign && { utm_campaign: utmData.utm_campaign }),
            ...(utmData.utm_content && { utm_content: utmData.utm_content }),
            ...(utmData.utm_term && { utm_term: utmData.utm_term }),
          })
          .select("id")
          .single();

        if (leadError) {
          console.error("Error creating lead:", leadError);
        } else {
          leadId = newLead.id;
          console.log("New lead created:", leadId, "for phone:", cleanPhone);
        }
      } else if (Object.keys(utmData).length > 0) {
        const { data: existingLeadData } = await supabase
          .from("leads")
          .select("utm_source, source")
          .eq("id", leadId)
          .single();

        if (existingLeadData) {
          const updates: Record<string, string> = {};
          if (!existingLeadData.utm_source) {
            if (utmData.utm_source) updates.utm_source = utmData.utm_source;
            if (utmData.utm_medium) updates.utm_medium = utmData.utm_medium;
            if (utmData.utm_campaign) updates.utm_campaign = utmData.utm_campaign;
            if (utmData.utm_content) updates.utm_content = utmData.utm_content;
            if (utmData.utm_term) updates.utm_term = utmData.utm_term;
          }
          if (!existingLeadData.source && detectedSource) {
            updates.source = detectedSource;
          }
          if (Object.keys(updates).length > 0) {
            await supabase.from("leads").update(updates).eq("id", leadId);
          }
        }
      }

      // Match tracking click to lead
      if (trackingCode && leadId) {
        await supabase
          .from("tracking_clicks")
          .update({ lead_id: leadId, matched_at: new Date().toISOString() })
          .eq("tracking_code", trackingCode)
          .is("lead_id", null);
      }

      // Store the incoming message
      const { error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          lead_id: leadId || null,
          phone: cleanPhone,
          message_text: messageText,
          direction: "incoming",
          sender_name: senderName,
          message_id_external: messageIdExternal,
          timestamp: body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString(),
        });

      if (msgError) {
        console.error("Error storing message:", msgError);
      }

      // AI Auto-Reply with Qualification
      if (config.ai_enabled && config.ai_auto_reply && leadId) {
        try {
          // Check if lead is already qualified/contacted - if so, skip AI (human is handling)
          const leadStatus = existingLead?.status;
          const isAlreadyHandled = leadStatus && !["new"].includes(leadStatus);

          if (!isAlreadyHandled) {
            // Get recent conversation history for context
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
              // Send reply via Z-API
              const sendUrl = `https://api.z-api.io/instances/${config.zapi_instance_id}/token/${config.zapi_token}/send-text`;
              const sendResponse = await fetch(sendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleanPhone, message: aiReply }),
              });

              if (sendResponse.ok) {
                const sendResult = await sendResponse.json();
                await supabase.from("whatsapp_messages").insert({
                  company_id: companyId,
                  lead_id: leadId || null,
                  phone: cleanPhone,
                  message_text: aiReply,
                  direction: "outgoing",
                  sender_name: "IA",
                  message_id_external: sendResult.messageId || null,
                  timestamp: new Date().toISOString(),
                });
                console.log("AI qualification reply sent to:", cleanPhone);
              } else {
                console.error("Failed to send AI reply via Z-API:", await sendResponse.text());
              }
            }
          } else {
            console.log("Lead already handled (status:", leadStatus, "), skipping AI auto-reply");
          }
        } catch (aiError) {
          console.error("AI auto-reply error:", aiError);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, lead_id: leadId, new_lead: !existingLead, tracking_code: trackingCode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For sent messages (outgoing)
    if (body.type === "SentCallback" || body.type === "MessageStatusCallback") {
      return new Response(JSON.stringify({ ok: true, type: body.type }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default response
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

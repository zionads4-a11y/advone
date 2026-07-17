import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { log } from "../_shared/logger.ts";
import { sendText, sendMedia } from "../_shared/whatsappProvider.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }


  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const accessToken = authHeader.replace("Bearer ", "").trim();
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(accessToken);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { company_id, phone, message, action, media_url, media_type } = body;

    // Input Validation
    if (typeof company_id !== "string" || !company_id.match(/^[0-9a-f-]{36}$/)) {
      return new Response(JSON.stringify({ error: "company_id inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (phone && (typeof phone !== "string" || phone.length > 20)) {
      return new Response(JSON.stringify({ error: "phone inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message && (typeof message !== "string" || message.length > 4096)) {
      return new Response(JSON.stringify({ error: "mensagem muito longa (max 4096)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Multi-tenant check: admins/members bypass; others must belong to the company
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const isPrivileged = roleSet.has("admin") || roleSet.has("member");

    if (!isPrivileged) {
      const { data: membership } = await adminClient
        .from("client_companies")
        .select("id")
        .eq("user_id", userId)
        .eq("company_id", company_id)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Sem acesso a esta empresa" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Rate Limiting
    const isAllowed = await checkRateLimit(adminClient, userId, "send-whatsapp", 200);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Limite de envio atingido (200/hora)." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Get WhatsApp config for this company (supports UaZapi + Meta Cloud)
    const { data: config } = await adminClient
      .from("whatsapp_configs")
      .select("provider, zapi_instance_id, zapi_token, meta_phone_number_id, meta_access_token, ai_enabled, ai_prompt, ai_auto_reply")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "WhatsApp não configurado para esta empresa" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: suggest AI response
    if (action === "ai_suggest") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get recent messages for context
      const { data: recentMessages } = await adminClient
        .from("whatsapp_messages")
        .select("message_text, direction, timestamp")
        .eq("company_id", company_id)
        .eq("phone", phone)
        .order("timestamp", { ascending: false })
        .limit(10);

      const conversationHistory = (recentMessages || [])
        .reverse()
        .map((m) => ({
          role: m.direction === "incoming" ? "user" : "assistant",
          content: m.message_text || "",
        }));

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: config.ai_prompt || "Você é um atendente virtual. Seja cordial e objetivo.",
            },
            ...conversationHistory,
          ],
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições IA excedido. Tente novamente em instantes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errorText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Erro na IA" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const suggestion = aiData.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ suggestion }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: send message (text or media)
    if (!phone) {
      return new Response(JSON.stringify({ error: "phone é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message && !media_url) {
      return new Response(JSON.stringify({ error: "message ou media_url é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let zapiResult: any = {};
    let messageIdExternal: string | null = null;

    if (media_url) {
      const result = await sendMedia(config as any, phone, media_url, message || undefined, media_type);
      if (!result.ok) {
        console.error("WhatsApp send-media error:", result.status, result.error);
        return new Response(JSON.stringify({ error: "Erro ao enviar mídia via WhatsApp", details: result.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      zapiResult = result.raw || {};
      messageIdExternal = result.message_id ?? null;
    } else {
      const result = await sendText(config as any, phone, message);
      if (!result.ok) {
        console.error("WhatsApp send-text error:", result.status, result.error);
        return new Response(JSON.stringify({ error: "Erro ao enviar mensagem via WhatsApp", details: result.error }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      zapiResult = result.raw || {};
      messageIdExternal = result.message_id ?? null;
    }

    // Store outgoing message in database and update lead status
    const { error: msgError } = await adminClient
      .from("whatsapp_messages")
      .insert({
        company_id,
        phone,
        message_text: media_url ? (message ? `${message}\n📎 ${media_url}` : `📎 ${media_url}`) : message,
        direction: "outgoing",
        sender_name: "Atendente",
        message_id_external: messageIdExternal || zapiResult.messageId || zapiResult.key?.id || null,
        timestamp: new Date().toISOString(),
      });

    if (msgError) {
      console.error("Error storing outgoing message:", msgError);
    }

    // Disable bot and mark as read when human intervenes
    const { error: leadUpdateError } = await adminClient
      .from("leads")
      .update({ 
        bot_disabled: true,
        is_unread: false 
      })
      .eq("company_id", company_id)
      .or(`phone.eq.${phone},whatsapp.eq.${phone}`);

    if (leadUpdateError) {
      console.error("Error updating lead status:", leadUpdateError);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: messageIdExternal || zapiResult.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-whatsapp:", error);
    const errorMessage = getErrorMessage(error, "Erro desconhecido");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

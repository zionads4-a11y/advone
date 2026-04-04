import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, phone, message, action, media_url, media_type } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get Z-API config for this company
    const { data: config } = await adminClient
      .from("whatsapp_configs")
      .select("zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Z-API não configurada para esta empresa" }), {
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
          model: "google/gemini-3-flash-preview",
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

    const SERVER_URL = "https://ziondigital.uazapi.com";
    const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");

    const buildHeaders = () => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.zapi_token) headers["token"] = config.zapi_token;
      if (ADMIN_TOKEN) headers["admintoken"] = ADMIN_TOKEN;
      return headers;
    };

    let zapiResult: any;

    if (media_url) {
      // Send file/video/image via UaZapi
      const mediaBody: any = {
        chatId: `${phone}@c.us`,
        mediaUrl: media_url,
      };
      if (message) mediaBody.caption = message;

      const zapiResponse = await fetch(`${SERVER_URL}/send/media`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(mediaBody),
      });

      if (!zapiResponse.ok) {
        const errorText = await zapiResponse.text();
        console.error("UaZapi send-media error:", zapiResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Erro ao enviar mídia via WhatsApp", details: errorText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      zapiResult = await zapiResponse.json();
    } else {
      // Send text via UaZapi
      const zapiResponse = await fetch(`${SERVER_URL}/send/text?${buildParams()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone,
          message: message,
        }),
      });

      if (!zapiResponse.ok) {
        const errorText = await zapiResponse.text();
        console.error("UaZapi send-text error:", zapiResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Erro ao enviar mensagem via WhatsApp", details: errorText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      zapiResult = await zapiResponse.json();
    }

    // Store outgoing message in database
    const { error: msgError } = await adminClient
      .from("whatsapp_messages")
      .insert({
        company_id,
        phone,
        message_text: media_url ? (message ? `${message}\n📎 ${media_url}` : `📎 ${media_url}`) : message,
        direction: "outgoing",
        sender_name: "Atendente",
        message_id_external: zapiResult.messageId || zapiResult.key?.id || null,
        timestamp: new Date().toISOString(),
      });

    if (msgError) {
      console.error("Error storing outgoing message:", msgError);
    }

    return new Response(
      JSON.stringify({ success: true, message_id: zapiResult.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-whatsapp:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

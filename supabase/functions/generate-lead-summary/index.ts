import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ---- Authentication ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lead_id, company_id } = await req.json();

    if (!lead_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "lead_id e company_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Authorization: verifica se usuário pertence à empresa (ou é admin) ----
    const admin = createClient(supabaseUrl, supabaseKey);
    const [{ data: membership }, { data: roleRow }] = await Promise.all([
      admin.from("client_companies").select("company_id").eq("user_id", userId).eq("company_id", company_id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    ]);
    const isAdmin = roleRow?.role === "admin";
    if (!isAdmin && !membership) {
      return new Response(JSON.stringify({ error: "Acesso negado a esta empresa" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch WhatsApp messages for this lead's phone
    let messages: any[] = [];
    if (lead.phone || lead.whatsapp) {
      const phone = lead.phone || lead.whatsapp;
      const { data: messageRows } = await admin
        .from("whatsapp_messages")
        .select("direction, sender_name, message_text, timestamp")
        .eq("company_id", company_id)
        .eq("phone", phone)
        .order("timestamp", { ascending: true })
        .limit(50);
      messages = messageRows ?? [];
    }

    // Build context for AI
    const leadContext = `Lead: ${lead.name}
Email: ${lead.email || "N/A"}
Telefone: ${lead.phone || "N/A"}
WhatsApp: ${lead.whatsapp || "N/A"}
Status: ${lead.status}
Valor: R$ ${lead.value || 0}
Origem: ${lead.source || "N/A"}
Criado em: ${lead.created_at}`;

    const messagesContext = messages.length > 0
      ? messages
          .map(
            (m: any) =>
              `[${m.direction === "incoming" ? "Cliente" : "Atendente"}${m.sender_name === "IA" ? " (IA)" : ""}] ${m.message_text || "[mídia]"}`
          )
          .join("\n")
      : "Nenhuma mensagem de WhatsApp encontrada.";

    const prompt = `Você é um assistente de CRM. Analise os dados do lead e o histórico de conversas no WhatsApp abaixo e gere um resumo executivo conciso e profissional em português.

O resumo deve incluir:
1. Contexto geral do lead (quem é, como chegou)
2. Status atual da negociação
3. Principais pontos discutidos nas conversas
4. Próximos passos sugeridos

Dados do Lead:
${leadContext}

Histórico de Conversas:
${messagesContext}

Gere o resumo de forma clara e objetiva, em no máximo 200 palavras.`;

    // Call Lovable AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um assistente de CRM especializado em resumos de conversas." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) {
      return new Response(
        JSON.stringify({ error: "Falha ao gerar resumo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

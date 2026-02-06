import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead_id, company_id } = await req.json();

    if (!lead_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "lead_id e company_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch lead info
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const leadRes = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${lead_id}&select=*`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const leads = await leadRes.json();
    const lead = leads[0];

    if (!lead) {
      return new Response(
        JSON.stringify({ error: "Lead não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch WhatsApp messages for this lead's phone
    let messages: any[] = [];
    if (lead.phone || lead.whatsapp) {
      const phone = lead.phone || lead.whatsapp;
      const msgRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_messages?company_id=eq.${company_id}&phone=eq.${encodeURIComponent(phone)}&order=timestamp.asc&limit=50`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }
      );
      messages = await msgRes.json();
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

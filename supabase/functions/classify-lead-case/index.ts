import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id, company_id } = await req.json();
    if (!lead_id || !company_id) {
      return new Response(JSON.stringify({ error: "lead_id e company_id obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lead
    const leadRes = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${lead_id}&select=*`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const lead = (await leadRes.json())[0];
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empresa (nicho)
    const compRes = await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${company_id}&select=practice_specialty,name`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const company = (await compRes.json())[0] || {};

    // Mensagens
    const phone = lead.phone || lead.whatsapp;
    let messages: any[] = [];
    if (phone) {
      const msgRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_messages?company_id=eq.${company_id}&phone=eq.${encodeURIComponent(phone)}&order=timestamp.asc&limit=80`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      messages = await msgRes.json();
    }

    const conversation = messages.length
      ? messages.map((m: any) => `[${m.direction === "incoming" ? "CLIENTE" : "ESCRITÓRIO"}] ${m.message_text || "[mídia]"}`).join("\n")
      : "(sem conversa registrada)";

    const systemPrompt = `Você é um analista jurídico especializado em triagem de casos. Sua tarefa é classificar o assunto/caso de um lead com base nos dados e na conversa.

Áreas possíveis: previdenciario, trabalhista, civil, consumidor, familia, criminal, tributario, empresarial, imobiliario, outro.
Urgências: alta (prazo curto, audiência marcada, benefício cortado), media (situação importante mas sem prazo crítico), baixa (consulta exploratória).

Responda EXCLUSIVAMENTE chamando a função classify_case com os campos preenchidos. Se faltar informação, use "desconhecido" no campo e baixa confiança.`;

    const userPrompt = `Nicho do escritório: ${company.practice_specialty || "geral"}
Nome do lead: ${lead.name || "?"}
Mensagem inicial / observação: ${lead.notes || lead.case_summary_short || "(nenhuma)"}

CONVERSA WHATSAPP:
${conversation}`;

    const tools = [{
      type: "function",
      function: {
        name: "classify_case",
        description: "Classifica o caso jurídico do lead",
        parameters: {
          type: "object",
          properties: {
            case_area: { type: "string", description: "Área do direito" },
            case_subtype: { type: "string", description: "Tipo específico (ex: aposentadoria por idade, rescisão indireta, indenização por danos morais)" },
            case_urgency: { type: "string", enum: ["alta", "media", "baixa"] },
            case_estimated_value: { type: "number", description: "Valor potencial estimado da causa em R$. Use 0 se não for possível estimar." },
            case_keywords: { type: "array", items: { type: "string" }, description: "3 a 7 palavras-chave do caso" },
            case_summary_short: { type: "string", description: "Resumo do assunto em 1 linha (máx 120 chars)" },
            case_next_action: { type: "string", description: "Próxima ação recomendada para o advogado (1 frase)" },
            case_confidence: { type: "number", description: "Confiança 0 a 1" },
          },
          required: ["case_area", "case_subtype", "case_urgency", "case_summary_short", "case_next_action", "case_confidence"],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "classify_case" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requisições. Tente novamente em instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "IA não retornou classificação" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);

    const update = {
      case_area: args.case_area || null,
      case_subtype: args.case_subtype || null,
      case_urgency: args.case_urgency || null,
      case_estimated_value: typeof args.case_estimated_value === "number" ? args.case_estimated_value : null,
      case_keywords: Array.isArray(args.case_keywords) ? args.case_keywords : null,
      case_summary_short: args.case_summary_short || null,
      case_next_action: args.case_next_action || null,
      case_confidence: typeof args.case_confidence === "number" ? args.case_confidence : null,
      case_classified_at: new Date().toISOString(),
      case_classified_by: "ai",
    };

    const upRes = await fetch(`${supabaseUrl}/rest/v1/leads?id=eq.${lead_id}`, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(update),
    });

    if (!upRes.ok) {
      const txt = await upRes.text();
      return new Response(JSON.stringify({ error: `Falha ao salvar: ${txt}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, classification: update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

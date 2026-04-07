import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
  const triageOptions: any[] = Array.isArray(config.triage_options) ? config.triage_options : [];

  const toneInstructions = tone === "formal"
    ? "Use linguagem formal e tratamento respeitoso (Sr./Sra.)."
    : tone === "informal"
    ? "Use linguagem leve e amigável, com emojis moderados."
    : "Seja educado e profissional, mas acessível.";

  let triagemBlock = "";

  if (triageOptions.length > 0) {
    const menuItems = triageOptions.map((opt: any, i: number) => {
      const emoji = opt.emoji || `${i + 1}️⃣`;
      return `"${emoji} ${opt.label}"`;
    }).join("\n");

    const scripts = triageOptions.map((opt: any, i: number) => {
      const emoji = opt.emoji || `${i + 1}️⃣`;
      const questions = (opt.questions || []).filter((q: string) => q.trim()).map((q: string) => `- Pergunte: "${q}"`).join("\n");
      const closing = opt.closing_message ? `- Conduza: "${opt.closing_message}"` : `- Conduza para agendamento: "Vamos agendar uma análise do seu caso? Leva uns ${consultationDuration}."`;
      const keywords = (opt.keyword_triggers || []).join(", ");
      return `📌 ASSUNTO ${i + 1} - ${opt.label}${keywords ? ` (palavras-chave: ${keywords})` : ""}:\n${questions}\n${closing}`;
    }).join("\n\n");

    triagemBlock = `
TRIAGEM INICIAL OBRIGATÓRIA:
Na PRIMEIRA interação com o lead, após se apresentar, envie o menu de assuntos. Envie assim (cada número em mensagem separada se possível):

"Para eu entender melhor como posso te ajudar, me diz qual desses assuntos tem a ver com o seu caso:"

${menuItems}

Aguarde a resposta do lead. Ele pode responder com o número ou descrever o problema. Identifique o assunto e siga o script correspondente.

SCRIPT POR ASSUNTO:

${scripts}

SE O LEAD NÃO SE ENCAIXAR EM NENHUM ASSUNTO:
- Pergunte mais detalhes sobre o problema
- Se realmente não for da área: "Entendo! Esse assunto foge um pouco da nossa especialidade, mas posso te indicar buscar o recurso adequado. Boa sorte! 🤞"
`;
  }

  const hasTriagem = triageOptions.length > 0;

  return `Você é um SDR virtual especializado em atendimento para ${officeName}${practiceArea ? `, atuando em ${practiceArea}` : ""}.

Seu ÚNICO objetivo é qualificar rapidamente o lead e levá-lo a agendar uma conversa com um advogado.

REGRAS IMPORTANTES:
- Você NÃO responde dúvidas jurídicas
- Você NÃO dá orientação legal
- Você NÃO entra em explicações técnicas
- Você sempre conduz para o agendamento
- ${toneInstructions}

COMPORTAMENTO:
- Envie mensagens CURTAS e SEPARADAS, como uma pessoa real no WhatsApp
- Cada mensagem deve ter NO MÁXIMO 1-2 linhas
- Use parágrafos separados (linha em branco) para cada ideia — o sistema vai enviar cada parte como mensagem individual
- NUNCA envie um textão. Quebre em pequenas mensagens naturais
- Sempre faça perguntas que avancem a conversa
- Nunca deixe a conversa morrer
- Use emojis com moderação para parecer amigável

${targetAudience ? `PÚBLICO-ALVO: ${targetAudience}` : ""}

${customPrompt ? `INSTRUÇÕES ADICIONAIS DO ESCRITÓRIO:\n${customPrompt}` : ""}
${triagemBlock}
FLUXO DE ATENDIMENTO:
1. Cumprimente o lead e se apresente como assistente de ${officeName}
${hasTriagem ? "2. Envie o MENU DE TRIAGEM (obrigatório)" : "2. Faça uma qualificação rápida: \"Seu caso é sobre qual situação?\""}
3. Após identificar o assunto, siga o script correspondente
4. Conduza para agendamento: "Perfeito, o advogado pode te orientar melhor sobre isso."
5. Pergunte qual o melhor dia e horário para a consulta
${consultationDuration ? `6. A consulta dura aproximadamente ${consultationDuration}.` : ""}

SE O LEAD FIZER PERGUNTAS JURÍDICAS:
"Essa parte o advogado vai conseguir te orientar com mais precisão. Vamos agendar um horário para você falar direto com ele?"

SE O LEAD RESISTIR:
"Entendo! Mas uma conversa rápida já pode te dar clareza do que fazer. Leva menos de ${consultationDuration} 👇"

IMPORTANTE: Este é um MODO DE TESTE. Responda normalmente como faria com um lead real, mas não execute ações reais (qualificação, agendamento). Apenas simule a conversa.

Responda SEMPRE em português do Brasil.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, messages } = await req.json();
    if (!company_id || !messages) {
      return new Response(JSON.stringify({ error: "company_id e messages são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS for config lookup
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Get company config
    const { data: config } = await adminClient
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Configuração do bot não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSDRPrompt(config);

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
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "Sem resposta da IA";

    // Split into natural messages like the real bot does
    const parts = splitIntoNaturalMessages(reply);

    return new Response(JSON.stringify({ reply, parts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("test-bot-chat error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function splitIntoNaturalMessages(text: string): string[] {
  if (!text || text.length <= 120) return [text];

  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const messages: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= 150) {
      messages.push(para);
      continue;
    }

    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => l.length <= 150)) {
      messages.push(...lines);
      continue;
    }

    const sentences = para.match(/[^.!?]+[.!?]+[\s]*/g) || [para];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 150 && currentChunk) {
        messages.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) messages.push(currentChunk.trim());
  }

  return messages.filter(Boolean);
}

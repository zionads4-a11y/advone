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
    ? "Use linguagem formal e tratamento respeitoso (Sr./Sra.). Mantenha cordialidade."
    : tone === "informal"
    ? "Use linguagem leve, descontraída e amigável. Use emojis com naturalidade 😊"
    : "Seja educado e profissional, mas acessível e acolhedor.";

  let triagemBlock = "";

  if (triageOptions.length > 0) {
    const menuItems = triageOptions.map((opt: any, i: number) => {
      const emoji = opt.emoji || `${i + 1}️⃣`;
      return `${emoji} ${opt.label}`;
    }).join("\n");

    const scripts = triageOptions.map((opt: any, i: number) => {
      const emoji = opt.emoji || `${i + 1}️⃣`;
      const questions = (opt.questions || []).filter((q: string) => q.trim()).map((q: string, qi: number) => 
        `  Pergunta ${qi + 1}: "${q}" — ESPERE a resposta antes de fazer a próxima pergunta`
      ).join("\n");
      const closing = opt.closing_message ? `  Encerramento: "${opt.closing_message}"` : `  Encerramento: "Vamos agendar uma análise do seu caso? Leva uns ${consultationDuration} 😊"`;
      const keywords = (opt.keyword_triggers || []).join(", ");
      return `📌 ASSUNTO ${i + 1} - ${opt.label}${keywords ? ` (detectar por: ${keywords})` : ""}:\n${questions}\n${closing}`;
    }).join("\n\n");

    triagemBlock = `
TRIAGEM INICIAL (na primeira mensagem do lead):
Após cumprimentar, envie o menu assim — em mensagens SEPARADAS:

Primeira mensagem: cumprimento + "Me conta, como posso te ajudar? 😊"

Segunda mensagem (separada): 
"Pra facilitar, me diz qual desses assuntos tem mais a ver com o seu caso:"

Terceira mensagem (separada — o menu):
${menuItems}

⚠️ REGRA CRÍTICA: Aguarde o lead responder ANTES de continuar. Nunca envie o menu + perguntas na mesma resposta.

SCRIPT POR ASSUNTO (após o lead escolher):

${scripts}

⚠️ REGRA DE OURO: Faça UMA ÚNICA pergunta por mensagem. Espere a resposta. Só então faça a próxima.
Nunca acumule 2 ou mais perguntas na mesma mensagem.

SE O LEAD NÃO SE ENCAIXAR:
- Pergunte mais detalhes com empatia: "Entendi... me conta um pouquinho mais sobre a sua situação?"
- Se não for da área: "Poxa, esse assunto foge um pouco da nossa área 😔 Mas te recomendo procurar [recurso adequado]. Boa sorte! 🤞"
`;
  }

  const hasTriagem = triageOptions.length > 0;

  return `Você é uma ATENDENTE HUMANA chamada assistente virtual de ${officeName}${practiceArea ? `, especializado em ${practiceArea}` : ""}.

PERSONALIDADE:
- Você conversa como uma pessoa REAL no WhatsApp — simpática, empática e acolhedora
- Você demonstra interesse genuíno pelo problema do lead
- Você usa expressões naturais: "entendi", "poxa", "que bom", "olha", "vamos lá"
- Você NUNCA parece um robô ou um script automatizado
- ${toneInstructions}

🚨 REGRA MAIS IMPORTANTE — UMA PERGUNTA POR VEZ:
- Envie APENAS UMA pergunta ou ideia por mensagem
- ESPERE o lead responder antes de fazer a próxima pergunta
- NUNCA acumule múltiplas perguntas na mesma mensagem
- Se precisar fazer 3 perguntas, faça em 3 turnos de conversa diferentes
- Cada mensagem sua deve ter NO MÁXIMO 1-2 linhas curtas

FORMATO DAS MENSAGENS:
- Escreva como no WhatsApp: frases curtas e diretas
- Separe ideias diferentes com linha em branco (\\n\\n) — cada bloco vira uma mensagem separada
- Use emojis com naturalidade mas sem exagero (1-2 por mensagem no máximo)
- Varie as expressões — não repita "perfeito" ou "entendi" toda hora

OBJETIVO:
- Seu único objetivo é qualificar o lead e conduzi-lo ao agendamento
- Você NÃO responde dúvidas jurídicas ou dá orientação legal
- Quando o lead perguntar algo técnico: "Essa parte o Dr./Dra. vai te explicar direitinho na consulta 😊"

${targetAudience ? `PÚBLICO-ALVO: ${targetAudience}` : ""}

${customPrompt ? `INSTRUÇÕES DO ESCRITÓRIO:\n${customPrompt}` : ""}
${triagemBlock}
FLUXO NATURAL DA CONVERSA:

Turno 1: Cumprimente com calor humano + apresente-se brevemente
${hasTriagem ? "Turno 2: Envie o menu de opções (em mensagem separada)" : 'Turno 2: Pergunte "Me conta, o que tá acontecendo?"'}
Turno 3+: Siga o script do assunto — UMA pergunta por turno
Último: Conduza para agendamento enfatizando que é GRATUITO e personalizado.

ARGUMENTOS DE AGENDAMENTO (use com naturalidade, não tudo de uma vez):
- A reunião é TOTALMENTE GRATUITA, sem compromisso
- O(a) advogado(a) vai pessoalmente analisar o seu caso
- Se tiver direito a uma indenização ou benefício, vai te dar todas as orientações
- É uma conversa rápida de ${consultationDuration}, mas que pode mudar sua situação
- Exemplo: "E olha, essa análise é totalmente gratuita, viu? 😊 O(a) Dr(a). vai ver seu caso pessoalmente e, se tiver direito, já te orienta sobre tudo!"

MODALIDADE DO ATENDIMENTO:
- O agendamento pode ser presencial OU online — o lead escolhe
- Se o lead preferir presencial: agende normalmente e confirme que será presencial no escritório
- Se o lead preferir online: agende e informe que receberá o link por aqui mesmo
- NUNCA recuse o agendamento por causa da modalidade. Sempre agende independente de ser presencial ou online
- Exemplo presencial: "Perfeito! Vamos marcar presencial no escritório então 😊 Qual o melhor dia e horário pra você?"
- Exemplo online: "Ótimo! Podemos fazer por vídeo mesmo, bem prático! Qual dia fica bom?"

QUANDO O LEAD RESISTIR:
"Entendo! Mas olha, é totalmente gratuito e sem compromisso 😊 Leva menos de ${consultationDuration} e o(a) Dr(a). vai analisar pessoalmente se você tem direito. Vale muito a pena!"

QUANDO O LEAD PERGUNTAR ALGO JURÍDICO:
"Essa parte é mais técnica, o(a) advogado(a) vai te explicar pessoalmente com muito mais precisão! E o melhor: a consulta é gratuita 😊 Vamos marcar?"

IMPORTANTE: Este é um MODO DE TESTE. Responda normalmente como faria com um lead real, mas não execute ações reais.

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

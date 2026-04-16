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

📆 DATA E HORA ATUAL: Hoje é ${new Date(getNowBrasilia()).toLocaleDateString("pt-BR", { weekday: "long" })}, ${getTodayBrasilia()} (${String(getNowBrasilia().getHours()).padStart(2,"0")}:${String(getNowBrasilia().getMinutes()).padStart(2,"0")} horário de Brasília). USE ESTA DATA COMO REFERÊNCIA.

⏰ HORÁRIO DE FUNCIONAMENTO (REGRA OBRIGATÓRIA):
- Agendamentos SOMENTE entre 08:00 e 17:00 (horário de Brasília)
- NUNCA sugira horários antes das 08:00 ou após as 17:00
- NUNCA mencione "início da noite" ou "noite" como opção — o escritório NÃO funciona à noite
- NUNCA diga "nosso atendimento é de segunda a sexta" ou mencione dias de funcionamento de forma genérica
- Se já for depois das 17:00, NÃO ofereça horários para hoje — ofereça para o próximo dia útil

📅 ABORDAGEM DE AGENDAMENTO (REGRA OBRIGATÓRIA):
- Quando for agendar, SEMPRE transmita URGÊNCIA e IMPORTÂNCIA: "Como o seu caso é urgente, podemos agendar já pra amanhã!"
- Pergunte a preferência de turno: "Você prefere na parte da manhã ou da tarde?"
- Depois use check_availability para buscar horários reais
- Ofereça EXATAMENTE 2 opções concretas: UMA de manhã (08:00-12:00) e UMA à tarde (13:00-17:00)
- Formato: "Tenho esses horários pra você:\\n\\n📅 Manhã: [dia], dia [DD/MM] às [HH:MM]\\n📅 Tarde: [dia], dia [DD/MM] às [HH:MM]\\n\\nQual fica melhor pra você? 😊"
- Se só houver horários em um turno, ofereça 2 opções desse turno
- Quando o lead escolher, use "schedule_appointment" para confirmar
- Após confirmar, envie: "Pronto, agendado! ✅ [detalhes]"
- NUNCA invente horários sem antes consultar a disponibilidade
- FUSO HORÁRIO: Todos os horários são no horário de Brasília (BRT)

QUANDO O LEAD RESISTIR:
"Entendo! Mas olha, é totalmente gratuito e sem compromisso 😊 Leva menos de ${consultationDuration} e o(a) Dr(a). vai analisar pessoalmente se você tem direito."

QUALIFICAÇÃO (ferramentas disponíveis):
- "check_availability": SEMPRE use antes de sugerir horários
- "schedule_appointment": Use APÓS o lead escolher um horário
- "qualify_lead": Use quando souber o suficiente sobre o caso
- "transfer_to_human": Quando necessário

IMPORTANTE: Este é um MODO DE TESTE. As ferramentas retornam dados reais da agenda, mas agendamentos NÃO são criados de verdade.

Responda SEMPRE em português do Brasil.`;
}

function getNowBrasilia(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function getTodayBrasilia(): string {
  const b = getNowBrasilia();
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

async function getAvailableSlots(supabase: any, companyId: string, dateStr: string) {
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const date = new Date(dateStr + "T12:00:00Z");
  const dayOfWeek = date.getUTCDay();
  const dayKey = dayKeys[dayOfWeek];
  const dayName = dayNames[dayOfWeek];

  const { data: company } = await supabase
    .from("companies")
    .select("business_hours")
    .eq("id", companyId)
    .single();

  const businessHours: any = company?.business_hours || {};
  let slots: string[] = [];

  const dayConfig = businessHours[dayKey];
  
  // Support both formats: array of {open,close} or {enabled, shifts:[{start,end}]}
  if (Array.isArray(dayConfig) && dayConfig.length > 0) {
    for (const shift of dayConfig) {
      const start = shift.open || shift.start;
      const end = shift.close || shift.end;
      if (!start || !end) continue;
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m < endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
  } else if (dayConfig && typeof dayConfig === "object" && dayConfig.enabled !== false) {
    const shifts = dayConfig.shifts || [];
    for (const shift of shifts) {
      const start = shift.open || shift.start;
      const end = shift.close || shift.end;
      if (!start || !end) continue;
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      for (let m = startMin; m < endMin; m += 30) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
      }
    }
  }

  // Fallback only if NO business hours configured at all for the company
  const hasAnyConfig = Object.keys(businessHours).length > 0;
  if (slots.length === 0 && !hasAnyConfig && dayOfWeek >= 1 && dayOfWeek <= 5) {
    for (let h = 8; h < 12; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
    for (let h = 13; h < 17; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
  }

  // Enforce 08:00-17:00 hard limit regardless of business hours config
  slots = slots.filter(s => {
    const [h, m] = s.split(":").map(Number);
    const mins = h * 60 + m;
    return mins >= 480 && mins < 1020; // 08:00 to 17:00
  });

  // Filter out past slots + 2h minimum advance for today (Brasilia time)
  const todayBR = getTodayBrasilia();
  if (dateStr === todayBR) {
    const nowBR = getNowBrasilia();
    const minMinutes = (nowBR.getHours() * 60 + nowBR.getMinutes()) + 120; // +2 hours
    slots = slots.filter(s => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= minMinutes;
    });
  }

  // Query existing appointments for this Brasilia day (UTC-3: 03:00Z to next day 02:59Z)
  const nextDay = new Date(new Date(dateStr + "T12:00:00Z").getTime() + 86400000).toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("lead_reminders")
    .select("due_at")
    .eq("company_id", companyId)
    .gte("due_at", dateStr + "T03:00:00Z")
    .lt("due_at", nextDay + "T03:00:00Z")
    .eq("completed", false);

  const bookedTimes = new Set(
    (existing || []).map((r: any) => {
      const d = new Date(r.due_at);
      const brTime = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return `${String(brTime.getHours()).padStart(2, "0")}:${String(brTime.getMinutes()).padStart(2, "0")}`;
    })
  );

  return { date: dateStr, dayName, slots: slots.filter(s => !bookedTimes.has(s)) };
}

function getNextAvailableDays(count: number, includeToday: boolean = true): string[] {
  const days: string[] = [];
  const nowBR = getNowBrasilia();
  let d = includeToday ? new Date(nowBR) : new Date(nowBR.getTime() + 86400000);
  while (days.length < count) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d = new Date(d.getTime() + 86400000);
  }
  return days;
}

function splitIntoNaturalMessages(text: string): string[] {
  if (!text || text.length <= 120) return [text];
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const messages: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= 150) { messages.push(para); continue; }
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => l.length <= 150)) { messages.push(...lines); continue; }
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, messages } = await req.json();
    if (!company_id || !messages) {
      return new Response(JSON.stringify({ error: "company_id e messages são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: config } = await adminClient
      .from("whatsapp_configs")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Configuração do bot não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSDRPrompt(config);

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Verifica horários disponíveis na agenda para uma data específica. SEMPRE use antes de sugerir horários.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Data no formato YYYY-MM-DD" }
            },
            required: ["date"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "schedule_appointment",
          description: "Agenda uma consulta. Use SOMENTE APÓS o lead escolher um horário.",
          parameters: {
            type: "object",
            properties: {
              message_to_lead: { type: "string", description: "Mensagem de confirmação" },
              date: { type: "string", description: "Data YYYY-MM-DD" },
              time: { type: "string", description: "Horário HH:MM" },
              summary: { type: "string", description: "Assunto da reunião" },
              modality: { type: "string", enum: ["presencial", "online"] },
              unit: { type: "string", description: "Nome da unidade/escritório (se presencial)" }
            },
            required: ["message_to_lead", "date", "time"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "qualify_lead",
          description: "Registra qualificação do lead.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["qualified", "not_qualified", "needs_more_info"] },
              reason: { type: "string" },
              lead_score: { type: "string", enum: ["quente", "morno", "frio"] }
            },
            required: ["status", "reason", "lead_score"],
            additionalProperties: false
          }
        }
      }
    ];

    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let reply = "";
    let toolActions: any[] = [];
    let maxIterations = 3;

    while (maxIterations > 0) {
      maxIterations--;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: aiMessages,
          tools,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const message = aiData.choices?.[0]?.message;
      if (!message) break;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        reply = message.content || "Sem resposta da IA";
        break;
      }

      aiMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* */ }

        let toolResult: any = {};

        if (fnName === "check_availability") {
          let dateToCheck = args.date || getNextAvailableDays(1)[0];
          const availability = await getAvailableSlots(adminClient, company_id, dateToCheck);

          if (availability.slots.length === 0) {
            const nextDays = getNextAvailableDays(3);
            const alternatives: any[] = [];
            for (const nd of nextDays) {
              if (nd === dateToCheck) continue;
              const alt = await getAvailableSlots(adminClient, company_id, nd);
              if (alt.slots.length > 0) { alternatives.push(alt); if (alternatives.length >= 2) break; }
            }
            const formattedDate = formatDateDMY(dateToCheck);
            toolResult = { requested_date: formattedDate, available_slots: [], message: `Sem horários em ${availability.dayName}`, alternatives };
          } else {
            const formattedDate = formatDateDMY(dateToCheck);
            toolResult = { date: formattedDate, day_name: availability.dayName, available_slots: availability.slots, total_available: availability.slots.length };
          }
          toolActions.push({ tool: "check_availability", result: toolResult });
        }

        if (fnName === "schedule_appointment") {
          reply = args.message_to_lead || reply;
          toolResult = { success: true, message: "[TESTE] Agendamento simulado com sucesso", date: args.date, time: args.time, modality: args.modality || "online", unit: args.unit || "" };
          toolActions.push({ tool: "schedule_appointment", result: toolResult });
        }

        if (fnName === "qualify_lead") {
          toolResult = { success: true, status: args.status };
          toolActions.push({ tool: "qualify_lead", result: toolResult });
        }

        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    const parts = splitIntoNaturalMessages(reply);

    return new Response(JSON.stringify({ reply, parts, tool_actions: toolActions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("test-bot-chat error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

AGENDAMENTO INTELIGENTE (OBRIGATÓRIO):
- Quando o lead aceitar agendar, SEMPRE use a ferramenta "check_availability" PRIMEIRO para ver os horários disponíveis
- PRIORIDADE: Tente agendar para HOJE MESMO se houver horários disponíveis (mínimo 2h de antecedência)
- Se não houver horário hoje, ofereça o PRÓXIMO DIA ÚTIL mais cedo possível
- Use a data que o lead sugeriu, ou hoje/próximo dia útil se não especificou
- Após receber os horários, ofereça EXATAMENTE 2 opções ao lead
- Formato da oferta: "Tenho esses horários disponíveis pra você:\\n\\n📅 Opção 1: [dia da semana], dia [DD/MM] às [HH:MM]\\n📅 Opção 2: [dia da semana], dia [DD/MM] às [HH:MM]\\n\\nQual fica melhor pra você? 😊"
- Quando o lead escolher uma opção, use "schedule_appointment" para confirmar
- Após confirmar, envie uma mensagem simpática: "Pronto, agendado! ✅ [detalhes]"
- NUNCA invente horários sem antes consultar a disponibilidade
- FUSO HORÁRIO: Todos os horários são no horário de Brasília (BRT)

QUANDO O LEAD RESISTIR:
"Entendo! Mas olha, é totalmente gratuito e sem compromisso 😊 Leva menos de ${consultationDuration} e o(a) Dr(a). vai analisar pessoalmente se você tem direito. Vale muito a pena!"

QUANDO O LEAD PERGUNTAR ALGO JURÍDICO:
"Essa parte é mais técnica, o(a) advogado(a) vai te explicar pessoalmente com muito mais precisão! E o melhor: a consulta é gratuita 😊 Vamos marcar?"

QUALIFICAÇÃO (ferramentas disponíveis):
- "check_availability": SEMPRE use antes de sugerir horários. Informe a data desejada.
- "schedule_appointment": Use APÓS o lead escolher um horário das opções oferecidas
- "qualify_lead": Use quando souber o suficiente sobre o caso
- "transfer_to_human": Quando necessário transferir para atendente humano

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

async function getAvailableSlots(supabase: any, companyId: string, dateStr: string): Promise<{ date: string; dayName: string; slots: string[] }> {
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

  const hasAnyConfig = Object.keys(businessHours).length > 0;
  if (slots.length === 0 && !hasAnyConfig && dayOfWeek >= 1 && dayOfWeek <= 5) {
    for (let h = 9; h < 12; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
    for (let h = 14; h < 18; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
  }

  // Filter out past slots + 2h minimum advance for today (Brasilia time)
  const todayBR = getTodayBrasilia();
  if (dateStr === todayBR) {
    const nowBR = getNowBrasilia();
    const minMinutes = (nowBR.getHours() * 60 + nowBR.getMinutes()) + 120;
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
        name: "check_availability",
        description: "Verifica horários disponíveis na agenda para uma data específica. SEMPRE use antes de sugerir horários ao lead.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Data para verificar disponibilidade no formato YYYY-MM-DD. Se o lead não especificou, use o próximo dia útil."
            }
          },
          required: ["date"],
          additionalProperties: false
        }
      }
    },
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
            reason: { type: "string", description: "Motivo da qualificação em português" },
            summary: { type: "string", description: "Resumo breve do caso do lead" },
            lead_score: { type: "string", enum: ["quente", "morno", "frio"], description: "quente = muito interessado, morno = moderado, frio = pouco engajamento" }
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
        description: "Agenda uma consulta/reunião para o lead. Use SOMENTE APÓS o lead escolher um horário das opções apresentadas.",
        parameters: {
          type: "object",
          properties: {
            message_to_lead: { type: "string", description: "Mensagem confirmando o agendamento para o lead" },
            date: { type: "string", description: "Data escolhida pelo lead no formato YYYY-MM-DD" },
            time: { type: "string", description: "Horário escolhido pelo lead no formato HH:MM" },
            summary: { type: "string", description: "Breve descrição do assunto da reunião" },
            modality: { type: "string", enum: ["presencial", "online"], description: "Modalidade escolhida pelo lead" },
            unit: { type: "string", description: "Nome da unidade/escritório escolhida pelo lead (se presencial)" }
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
        description: "Transfere para atendente humano quando necessário.",
        parameters: {
          type: "object",
          properties: {
            message_to_lead: { type: "string", description: "Mensagem informando que será atendido por um especialista" }
          },
          required: ["message_to_lead"],
          additionalProperties: false
        }
      }
    }
  ];

  try {
    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
    ];

    let replyText = "";
    let qualificationResult: { status: string; reason: string; summary?: string; lead_score?: string } | null = null;
    let shouldSchedule = false;
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
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
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

      // If no tool calls, we have the final text response
      if (!message.tool_calls || message.tool_calls.length === 0) {
        replyText = message.content || "";
        break;
      }

      // Process tool calls
      aiMessages.push(message);
      let hasCheckAvailability = false;

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* ignore */ }

        let toolResult: any = {};

        if (fnName === "check_availability") {
          hasCheckAvailability = true;
          let dateToCheck = args.date;
          if (!dateToCheck) {
            dateToCheck = getNextAvailableDays(1)[0];
          }
          const availability = await getAvailableSlots(supabase, companyId, dateToCheck);

          // If no slots on requested day, also check next 2 business days
          if (availability.slots.length === 0) {
            const nextDays = getNextAvailableDays(3);
            const alternatives: any[] = [];
            for (const nd of nextDays) {
              if (nd === dateToCheck) continue;
              const alt = await getAvailableSlots(supabase, companyId, nd);
              if (alt.slots.length > 0) {
                alternatives.push(alt);
                if (alternatives.length >= 2) break;
              }
            }
            toolResult = {
              requested_date: dateToCheck,
              requested_day: availability.dayName,
              available_slots: [],
              message: `Não há horários disponíveis em ${availability.dayName} (${dateToCheck}).`,
              alternatives
            };
          } else {
            toolResult = {
              date: dateToCheck,
              day_name: availability.dayName,
              available_slots: availability.slots,
              total_available: availability.slots.length
            };
          }
        }

        if (fnName === "qualify_lead") {
          qualificationResult = {
            status: args.status || "needs_more_info",
            reason: args.reason || "",
            summary: args.summary || "",
            lead_score: args.lead_score || "morno",
          };
          toolResult = { success: true, status: args.status };
        }

        if (fnName === "schedule_appointment") {
          shouldSchedule = true;
          replyText = args.message_to_lead || "";

          if (leadId) {
            const appointmentDate = args.date || getNextAvailableDays(1)[0];
            const appointmentTime = args.time || "10:00";
            const dueAt = `${appointmentDate}T${appointmentTime}:00-03:00`;
            const modality = args.modality || "online";

            const { data: leadData } = await supabase
              .from("leads")
              .select("name, phone, whatsapp")
              .eq("id", leadId)
              .single();

            const leadName = leadData?.name || "Lead";
            const leadPhone = leadData?.whatsapp || leadData?.phone || cleanPhone || "Não informado";
            const unitName = args.unit || "";

            await supabase.from("lead_reminders").insert({
              lead_id: leadId,
              company_id: companyId,
              created_by: "00000000-0000-0000-0000-000000000000",
              title: `📅 Consulta ${modality === "presencial" ? "presencial" : "online"}: ${leadName}`,
              description: args.summary || `Agendamento automático via bot IA (${modality})${unitName ? ` - Unidade: ${unitName}` : ""}`,
              reminder_type: "meeting",
              due_at: dueAt,
            });

            // Notify lawyer
            if (config.alert_whatsapp) {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const alertPhone = config.alert_whatsapp.replace(/\D/g, "");
              const modalityLabel = modality === "presencial" ? "🏢 Presencial" : "💻 Online (vídeo)";
              const unitLine = modality === "presencial" && unitName ? `🏢 Unidade: ${unitName}\n` : "";
              const alertMessage = `🔔 *Novo Agendamento Automático*\n\n👤 Nome: ${leadName}\n📱 Telefone: ${leadPhone}\n📅 Data: ${appointmentDate}\n⏰ Horário: ${appointmentTime}\n📍 Modalidade: ${modalityLabel}\n${unitLine}${args.summary ? `📋 Assunto: ${args.summary}\n` : ""}\n_Agendado automaticamente pelo bot SDR_`;

              const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;

              const instanceParam = encodeURIComponent(config.zapi_instance_id || "");
              const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id || "");
              await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                method: "POST",
                headers: alertHeaders,
                body: JSON.stringify({ number: alertPhone, text: alertMessage }),
              });
            }
          }
          toolResult = { success: true, message: "Agendamento criado com sucesso" };
        }

        if (fnName === "transfer_to_human") {
          replyText = args.message_to_lead || "Um especialista irá atendê-lo em breve!";
          toolResult = { success: true };
        }

        // Add tool result to messages for next iteration
        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // If we got a schedule or transfer (action tools), and there's a reply, break
      if ((shouldSchedule || replyText) && !hasCheckAvailability) {
        break;
      }
      // Otherwise loop — the AI needs to generate text after seeing tool results
    }

    // Apply qualification results
    if (qualificationResult && leadId) {
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

        const targetPosition = shouldSchedule ? 6 : 5;
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
        if (Object.keys(scoreUpdate).length > 0) {
          await supabase.from("leads").update(scoreUpdate).eq("id", leadId);
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
  // Attempt 1: 30 minutes after first contact
  // Attempts 2-5: every 24 hours after the previous
  const delaysMs = [
    30 * 60 * 1000,           // 30 min
    24 * 60 * 60 * 1000,      // +24h (day 1)
    2 * 24 * 60 * 60 * 1000,  // +48h (day 2)
    3 * 24 * 60 * 60 * 1000,  // +72h (day 3)
    4 * 24 * 60 * 60 * 1000,  // +96h (day 4)
  ];

  const messages = delaysMs.map((delayMs, i) => ({
    company_id: companyId,
    lead_id: leadId,
    phone,
    day_number: i + 1,
    scheduled_at: new Date(now.getTime() + delayMs).toISOString(),
    status: "pending",
  }));

  const { error } = await supabase.from("cadence_messages").insert(messages);
  if (error) {
    console.error("Error enrolling in cadence:", error);
  } else {
    console.log(`Lead ${leadId} enrolled in cadence (${messages.length} messages, first in 30min)`);
  }
}

/**
 * Splits an AI response into multiple natural WhatsApp messages.
 * Rules:
 * - Split on double newlines (paragraphs)
 * - If a paragraph is still long (>150 chars), split on sentences
 * - Keep emojis and short phrases together
 * - Never split mid-sentence
 */
function splitIntoNaturalMessages(text: string): string[] {
  if (!text || text.length <= 120) return [text];

  // First split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const messages: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= 150) {
      messages.push(para);
      continue;
    }

    // Split long paragraphs by single newlines first
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => l.length <= 150)) {
      // Each line becomes a message
      messages.push(...lines);
      continue;
    }

    // Split by sentence boundaries (. ! ?)
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
    if (currentChunk.trim()) {
      messages.push(currentChunk.trim());
    }
  }

  // Ensure we don't have too many tiny messages — merge very short consecutive ones
  const merged: string[] = [];
  for (const msg of messages) {
    if (merged.length > 0 && merged[merged.length - 1].length < 40 && msg.length < 40) {
      merged[merged.length - 1] += "\n" + msg;
    } else {
      merged.push(msg);
    }
  }

  return merged.length > 0 ? merged : [text];
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
      .select("id, company_id, zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply, office_name, practice_area, communication_tone, scheduling_link, consultation_duration, target_audience, alert_whatsapp, triage_options")
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

        // Auto-move lead to "Em Atendimento" (position 1) if still in first column
        if (existingLead?.status === "new") {
          const { data: columns } = await supabase
            .from("kanban_columns")
            .select("id")
            .eq("company_id", companyId)
            .order("position", { ascending: true })
            .limit(2);

          if (columns && columns.length > 1) {
            await supabase.from("leads").update({
              kanban_column_id: columns[1].id,
              status: "contacted",
            }).eq("id", leadId);
            console.log(`Lead ${leadId} auto-moved to Em Atendimento`);
          }
        }

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

              // Split AI reply into multiple natural messages
              const splitMessages = splitIntoNaturalMessages(aiReply);
              console.log(`Sending ${splitMessages.length} message(s) to:`, cleanPhone);

              for (let i = 0; i < splitMessages.length; i++) {
                const chunk = splitMessages[i].trim();
                if (!chunk) continue;

                // Simulate typing delay (1-3s based on message length)
                if (i > 0) {
                  const delayMs = Math.min(1000 + chunk.length * 30, 3500);
                  await new Promise((r) => setTimeout(r, delayMs));
                }

                const sendResponse = await fetch(sendUrl, {
                  method: "POST",
                  headers: sendHeaders,
                  body: JSON.stringify({ number: cleanPhone, text: chunk }),
                });

                if (sendResponse.ok) {
                  const sendResult = await sendResponse.json();
                  await supabase.from("whatsapp_messages").insert({
                    company_id: companyId,
                    lead_id: leadId,
                    phone: cleanPhone,
                    message_text: chunk,
                    direction: "outgoing",
                    sender_name: "IA",
                    message_id_external: sendResult.messageId || sendResult.key?.id || null,
                    timestamp: new Date().toISOString(),
                  });
                } else {
                  console.error("Failed to send AI reply chunk:", sendResponse.status, await sendResponse.text());
                }
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

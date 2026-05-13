import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { chatCompletion, getCompanyAIConfig } from "../_shared/aiClient.ts";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSDRPrompt(config: any) {
  const company = config.companies;
  const officeName = config.office_name || company?.name || "o escritório";
  const practiceArea = config.practice_area || "";
  const tone = config.communication_tone || "moderado";
  const botName = company?.bot_name || "Laura";
  const botRole = company?.bot_role_description || "atendente virtual";
  const consultationDuration = config.consultation_duration || "30 minutos";
  const targetAudience = config.target_audience || "";
  const customPrompt = config.ai_prompt || "";

  const cpfRegraOuro = `
═══════════════════════════════════════
🚫 REGRA DE OURO (MUITO IMPORTANTE)
═══════════════════════════════════════
NUNCA, JAMAIS, peça o CPF do cliente. Nem o RG. Peça apenas o NOME COMPLETO no final do agendamento. Se o cliente perguntar se precisa de CPF, diga que não é necessário agora. Esta regra é absoluta.
`;
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
TRIAGEM INICIAL (Somente para clientes NOVOS):
Após o lead confirmar que é um CASO NOVO, envie o menu assim:

Primeira mensagem: "Perfeito! Me conta, como posso te ajudar? 😊"

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

  return `${cpfRegraOuro}
Você é ${botName}, ${botRole} de ${officeName}${practiceArea ? `, especializado em ${practiceArea}` : ""}.

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
- Seu objetivo principal é qualificar o lead e conduzi-lo ao agendamento
- Você NÃO dá orientação jurídica vinculante (nunca diga "você tem direito" ou "vai ganhar a causa")
- MAS você PODE dar explicações conceituais curtas sobre termos jurídicos quando o lead perguntar

🎓 QUANDO O LEAD PERGUNTAR ALGO JURÍDICO OU SOBRE PROCESSO (ex: "andamento de processo", "como está meu caso", "o que significa X"):

⚠️ REGRA DE INTELIGÊNCIA:
1️⃣ Se o lead perguntar sobre "andamento", "meu processo", "meu caso" ou demonstrar que já é cliente, ASSUMA que ele é cliente. NUNCA pergunte "você já é cliente?". Peça o NOME COMPLETO e use lookup_existing_client.
2️⃣ Se o lead SÓ disse o nome ou a intenção ainda não estiver clara: você DEVE perguntar obrigatoriamente: "Prazer! Você já é nosso cliente ou precisa de ajuda com um caso novo? 😊". NUNCA use "Como posso te ajudar?" sem antes saber se é cliente.

⚠️ IMPORTANTE: Se o lead diz "quero saber do meu processo", pular a pergunta "você já é cliente?" é obrigatório. Se ele só disse o nome, a pergunta é obrigatória.

FLUXO DE ABERTURA:

PASSO 1: Cumprimente e pergunte o nome.
Exemplo: "Olá! Seja bem-vindo ao escritório. Eu sou ${botName}, sua assistente virtual. Como posso te chamar? 😊"

PASSO 2 (Após o lead dizer o nome):
- Você DEVE perguntar obrigatoriamente: "Prazer, [Nome]! Você já é nosso cliente ou precisa de ajuda com um caso novo? 😊"
- EXCEÇÃO: Se ele já falou de processo, pule para a busca.


${targetAudience ? `PÚBLICO-ALVO: ${targetAudience}` : ""}

${customPrompt ? `INSTRUÇÕES DO ESCRITÓRIO:\n${customPrompt}` : ""}
${triagemBlock}
FLUXO NATURAL DA CONVERSA:

Turno 1: Cumprimente com calor humano + pergunte o nome do lead.
Turno 2: Após o nome, se a intenção não for clara, pergunte obrigatoriamente: "Você já é nosso cliente ou precisa de ajuda com um caso novo? 😊" Se for sobre processo, peça o nome completo para busca.
Turno 3: Se for cliente novo, pergunte "Me conta, o que tá acontecendo?" e siga o script de qualificação.
Turno 4+: Siga o script de qualificação — UMA pergunta por turno.
Último: Conduza para agendamento. APÓS o lead aceitar o horário sugerido, peça o NOME COMPLETO.

🚫 REGRA ABSOLUTA: NUNCA peça o CPF ou RG. Peça apenas o NOME COMPLETO no final, após o agendamento ser aceito. Se o cliente perguntar se precisa de CPF, diga que não é necessário agora.

📆 DATA E HORA ATUAL: Hoje é ${new Date(getNowBrasilia()).toLocaleDateString("pt-BR", { weekday: "long" })}, ${getTodayBrasilia()} (${String(getNowBrasilia().getHours()).padStart(2,"0")}:${String(getNowBrasilia().getMinutes()).padStart(2,"0")} horário de Brasília). O ANO ATUAL É ${getNowBrasilia().getFullYear()}. NUNCA use anos passados ao agendar. Sempre OFEREÇA O PRIMEIRO HORÁRIO LIVRE retornado por check_availability — não invente horários. Se o lead não disser data, omita "date" em check_availability (o sistema usa o próximo dia útil).

⏰ HORÁRIO DE FUNCIONAMENTO (REGRA OBRIGATÓRIA):
- Agendamentos SOMENTE entre 08:00 e 17:00 (horário de Brasília)
- NUNCA sugira horários antes das 08:00 ou após as 17:00
- NUNCA mencione "início da noite" ou "noite" como opção — o escritório NÃO funciona à noite
- Se já for depois das 17:00, NÃO ofereça horários para hoje — ofereça para o próximo dia útil

🔒 CAPTURA OBRIGATÓRIA DE NOME COMPLETO (SOMENTE APÓS ACEITE DO HORÁRIO):
- APÓS o lead aceitar o horário sugerido, peça o NOME COMPLETO (mín. 3 palavras).
- Use tom cordial: "Perfeito! 🙂 Pra já deixar tudo certinho no nosso sistema antes de finalizar, você poderia gentilmente me informar seu *nome completo*, por favor?"
- Quando receber, chame register_client_name passando full_name e agradeça.
- 🚫 NUNCA PEÇA CPF.

📅 ABORDAGEM DE AGENDAMENTO (REGRA OBRIGATÓRIA):
- Quando for agendar, SEMPRE transmita URGÊNCIA e IMPORTÂNCIA: "Como o seu caso é urgente, podemos agendar já pra amanhã!"
- Pergunte a preferência de turno: "Você prefere na parte da manhã ou da tarde?"
- Depois use check_availability para buscar horários reais
- Ofereça SEMPRE 2 opções concretas: UMA de manhã (entre 08:00 e 12:00) e UMA à tarde (entre 13:00 e 17:00).
- Formato: "Tenho esses horários pra você:\\n\\n📅 Manhã: [dia], dia [DD/MM] às [HH:MM]\\n📅 Tarde: [dia], dia [DD/MM] às [HH:MM]\\n\\nQual fica melhor pra você? 😊"
- Se o lead solicitar um horário específico que não foi oferecido, RESPEITE a escolha dele agendando no horário que ele falar ou no horário mais próximo disponível caso o escolhido esteja ocupado.
- IMPORTANTE: SEMPRE use datas no formato DD/MM/YYYY (ex: 16/04/2026). NUNCA use formato YYYY-MM-DD.
- Se só houver horários em um turno, ofereça 2 opções desse turno.
- Quando o lead escolher, use "schedule_appointment" para confirmar.
- Após confirmar, envie: "Pronto, agendado! ✅ [detalhes]"
- NUNCA invente horários sem antes consultar a disponibilidade
- FUSO HORÁRIO: Todos os horários são no horário de Brasília (BRT)

QUANDO O LEAD RESISTIR:
"Entendo! Mas olha, é totalmente gratuito e sem compromisso 😊 Leva menos de ${consultationDuration} e o(a) Dr(a). vai analisar pessoalmente se você tem direito."

QUALIFICAÇÃO (ferramentas disponíveis):
- "check_availability": SEMPRE use antes de sugerir horários
- "schedule_appointment": Use APÓS o lead escolher um horário
- "qualify_lead": Use quando souber o suficiente sobre o caso
- "lookup_existing_client": Use para buscar andamento de processo de clientes
- "transfer_to_human": Quando necessário

IMPORTANTE: Este é um MODO DE TESTE. As ferramentas retornam dados reais da agenda, mas agendamentos NÃO são criados de verdade.

Responda SEMPRE em português do Brasil.`;
}

function getNowBrasilia(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "0";
  let h = Number(get("hour"));
  if (h === 24) h = 0;
  return new Date(
    Number(get("year")), Number(get("month")) - 1, Number(get("day")),
    h, Number(get("minute")), Number(get("second"))
  );
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
    for (let h = 8; h < 12; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
    for (let h = 13; h < 17; h++) { slots.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`); }
  }

  slots = slots.filter(s => {
    const [h, m] = s.split(":").map(Number);
    const mins = h * 60 + m;
    return mins >= 480 && mins < 1020;
  });

  const todayBR = getTodayBrasilia();
  if (dateStr === todayBR) {
    const nowBR = getNowBrasilia();
    const minMinutes = (nowBR.getHours() * 60 + nowBR.getMinutes()) + 120;
    slots = slots.filter(s => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + m >= minMinutes;
    });
  }

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
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      return fmt.format(new Date(r.due_at));
    })
  );

  return { date: formatDateDMY(dateStr), dayName, slots: slots.filter(s => !bookedTimes.has(s)) };
}

function formatDateDMY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function isValidFullName(raw: string): boolean {
  if (!raw) return false;
  const parts = String(raw).trim().split(/\s+/).filter(p => p.length >= 2 && /^[A-Za-zÀ-ÿ'-]+$/.test(p));
  return parts.length >= 3;
}

function isValidCPF(cpf: string): boolean {
  const str = String(cpf).replace(/\D/g, "");
  if (str.length !== 11 || /^(\d)\1{10}$/.test(str)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(str.charAt(i)) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(str.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(str.charAt(i)) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(str.charAt(10))) return false;
  return true;
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

function sanitizeDate(rawDate: string | undefined | null): string {
  const fallback = getNextAvailableDays(1, false)[0];
  if (!rawDate) return fallback;
  let s = String(rawDate).trim();
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) s = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const [y, m, d] = s.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (isNaN(parsed.getTime())) return fallback;
  const nowBR = getNowBrasilia();
  const todayMid = new Date(nowBR.getFullYear(), nowBR.getMonth(), nowBR.getDate()).getTime();
  const oneYearAhead = todayMid + 365 * 86400000;
  if (parsed.getTime() < todayMid || parsed.getTime() > oneYearAhead) return fallback;
  return s;
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
      .select(`
        *,
        companies (name, bot_name, bot_role_description)
      `)
      .eq("company_id", company_id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Configuração do bot não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiConfig = await getCompanyAIConfig(company_id);
    // 🛡️ Ambiente de teste: SEMPRE força modelo leve para evitar estouro de TPM (rate limit).
    // Gemini Flash Lite tem limites altíssimos e é praticamente gratuito.
    const forceProvider = aiConfig.use_openai_for_testing ? "openai" as const : "lovable" as const;
    const forceModel = aiConfig.use_openai_for_testing ? "gpt-4o-mini" : "google/gemini-2.5-flash-lite";

    let systemPrompt = buildSDRPrompt(config);
    if (aiConfig.custom_system_prompt) {
      systemPrompt += `\n\n--- INSTRUÇÕES ADICIONAIS DO ESCRITÓRIO ---\n${aiConfig.custom_system_prompt}`;
    }

    const tools = [
      {
        type: "function",
        function: {
          name: "register_client_name",
          description: "Registra o nome completo do lead no sistema. Use apenas APÓS o lead aceitar o agendamento.",
          parameters: {
            type: "object",
            properties: {
              full_name: { type: "string", description: "Nome COMPLETO (mínimo 3 palavras: nome + sobrenomes)" }
            },
            required: ["full_name"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Verifica horários disponíveis.",
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
          description: "Agenda uma consulta. Use SOMENTE APÓS register_client_name + lead escolher horário.",
          parameters: {
            type: "object",
            properties: {
              message_to_lead: { type: "string" },
              date: { type: "string" },
              time: { type: "string" },
              summary: { type: "string" },
              modality: { type: "string", enum: ["presencial", "online"] },
              unit: { type: "string" }
            },
            required: ["message_to_lead", "date", "time"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "lookup_existing_client",
          description: "Busca cliente no sistema CRM para ver andamento de processo.",
          parameters: {
            type: "object",
            properties: {
              client_full_name: { type: "string" },
              subject: { type: "string", enum: ["andamento_processo", "outro"] }
            },
            required: ["client_full_name", "subject"]
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
    let cpfRegistered = "";
    let maxIterations = 3;
    let lastAiData: any = null;

    while (maxIterations > 0) {
      maxIterations--;

      let aiData: any;
      try {
        aiData = await chatCompletion({
          companyId: company_id,
          forceProvider,
          forceModel,
          messages: aiMessages,
          tools,
          fallbackModel: "google/gemini-2.5-flash-lite",
          allowOpenAIFallback: true,
        });
        lastAiData = aiData;
      } catch (e) {
        const msg = getErrorMessage(e);
        console.error("AI error:", msg);
        // Detecta status code embutido na mensagem (formato "AI lovable 429: ...")
        const statusMatch = msg.match(/\b(\d{3})\b/);
        const status = statusMatch ? Number(statusMatch[1]) : 500;
        let userMsg = "Erro ao processar resposta da IA";
        if (status === 429) userMsg = "Limite de requisições atingido. Aguarde alguns segundos e tente novamente.";
        else if (status === 402) userMsg = "Créditos da IA esgotados. Adicione créditos no workspace para continuar.";
        return new Response(JSON.stringify({ error: userMsg, detail: msg }), {
          status: status === 429 || status === 402 ? status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

        if (fnName === "register_client_name") {
          const fullName = String(args.full_name || "").trim();
          const nameOk = isValidFullName(fullName);
          if (!nameOk) {
            toolResult = { success: false, error: "Nome incompleto. Peça nome COMPLETO com sobrenomes (≥3 palavras)." };
          } else {
            cpfRegistered = "NAME_REGISTERED"; // Reusing the variable to track name instead of CPF
            toolResult = { success: true, full_name: fullName, message: "[TESTE] Nome completo registrado. Já pode agendar." };
          }
          toolActions.push({ tool: "register_client_name", result: toolResult });
        }

        if (fnName === "check_availability") {
          const dateToCheck = sanitizeDate(args.date);
          const availability = await getAvailableSlots(adminClient, company_id, dateToCheck);
          toolResult = {
            date: availability.date,
            day_name: availability.dayName,
            slots: availability.slots,
            instruction: `Ofereça estes horários ao lead: ${availability.slots.slice(0, 5).join(", ")}...`,
          };
          toolActions.push({ tool: "check_availability", result: toolResult });
        }

        if (fnName === "schedule_appointment") {
          if (!cpfRegistered) {
            toolResult = { success: false, error: "NAME_REQUIRED", message: "[TESTE] Bloqueado: registre o nome completo do cliente primeiro via register_client_name." };
          } else {
            reply = args.message_to_lead || reply;
            toolResult = { success: true, message: "[TESTE] Agendamento simulado com sucesso", date: sanitizeDate(args.date), time: args.time, modality: args.modality || "online", unit: args.unit || "", cpf: cpfRegistered };
          }
          toolActions.push({ tool: "schedule_appointment", result: toolResult });
        }

        if (fnName === "lookup_existing_client") {
          toolResult = { success: true, message: `[TESTE] Cliente ${args.client_full_name} localizado. Notificando o advogado sobre o pedido de andamento.` };
          reply = `Entendi! Já localizei aqui o seu cadastro. Vou avisar o advogado agora mesmo que você pediu o andamento do seu processo e logo ele te dá um retorno por aqui, tá bom? 😊`;
          toolActions.push({ tool: "lookup_existing_client", result: toolResult });
        }

        aiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    const parts = splitIntoNaturalMessages(reply);

    return new Response(JSON.stringify({
      reply,
      parts,
      tool_actions: toolActions,
      ai_provider: lastAiData?._provider ?? forceProvider ?? aiConfig.provider,
      ai_model: lastAiData?._model ?? forceModel ?? aiConfig.model,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("test-bot-chat error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

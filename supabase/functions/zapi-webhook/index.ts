import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSDRPrompt(config: any, leadName?: string, offices: any[] = []) {
  const officeName = config.office_name || "o escritório";
  const practiceArea = config.practice_area || "";
  const tone = config.communication_tone || "moderado";
  const customPrompt = (config.ai_prompt || "").trim();

  // Se o prompt customizado começar com "Você é", assumimos que é o prompt completo
  // gerado pelo construtor dinâmico e o usamos diretamente.
  if (customPrompt.startsWith("Você é")) {
    return customPrompt;
  }

  // 🏢 Endereços DINÂMICOS — sem endereço cadastrado = SOMENTE online
  const activeOffices = (offices || []).filter((o: any) => o && o.is_active !== false);
  const officesCount = activeOffices.length;
  const hasOffices = officesCount > 0;

  let modalidadeBlock: string;
  let unitParamHint: string;
  if (!hasOffices) {
    // Sem endereço cadastrado → SOMENTE ONLINE. Bot não pergunta nem oferece presencial.
    modalidadeBlock =
      `🟢 MODALIDADE — SOMENTE ONLINE (este escritório NÃO possui endereço cadastrado, atendimento é 100% online):\\n` +
      `   • REGRA CRÍTICA: Você NÃO atende presencial. NÃO pergunte se o lead prefere online ou presencial.\\n` +
      `   • REGRA CRÍTICA: NÃO ofereça atendimento presencial em hipótese alguma.\\n` +
      `   • Apenas confirme: "Como o nosso atendimento para o seu caso é 100% online (por videochamada), podemos seguir com o agendamento? 🙂" e, após o "sim", pergunte o horário.\\n` +
      `   • Em schedule_appointment use sempre modality="online" e unit="Online".`;
    unitParamHint = `unit="Online"`;
  } else if (officesCount === 1) {
    const only = activeOffices[0];
    const enderecoLinhas = [
      `*${only.name}*`,
      `📍 ${only.address}`,
      only.complement ? `🏢 ${only.complement}` : null,
      only.reference_point ? `🗺️ ${only.reference_point}` : null,
      only.maps_url ? `🔗 ${only.maps_url}` : null,
    ].filter(Boolean).join("\\n");
    modalidadeBlock =
      `🟢 MODALIDADE — pergunte UMA vez só (este escritório atende online E presencial):\\n` +
      `   "Você prefere que essa conversa seja online (por videochamada) ou presencial aqui no escritório? 🙂"\\n` +
      `   • Se ONLINE: confirme e siga pro horário.\\n` +
      `   • Se PRESENCIAL: envie em mensagem separada o endereço da unidade:\\n` +
      `     "Perfeito! 🙂 Nosso escritório fica aqui:\\n\\n${enderecoLinhas}"\\n` +
      `   • NUNCA invente outro endereço. Use SÓ esse.\\n` +
      `   • Em schedule_appointment use modality="online"|"presencial" e unit="${only.name}" ou "Online".`;
    unitParamHint = `unit="${only.name}" ou "Online"`;
  } else {
    const lista = activeOffices
      .map((o: any, i: number) => `${i + 1}️⃣ *${o.name}* — 📍 ${o.address}`)
      .join("\\n");
    const unitNames = activeOffices.map((o: any) => `"${o.name}"`).join(" OU ");
    modalidadeBlock =
      `🟢 MODALIDADE — pergunte UMA vez só (este escritório atende online E presencial):\\n` +
      `   "Você prefere que essa conversa seja online (por videochamada) ou presencial em uma das nossas unidades? 🙂"\\n` +
      `   • Se ONLINE: confirme e siga pro horário.\\n` +
      `   • Se PRESENCIAL, pergunte qual unidade fica melhor:\\n` +
      `     "Temos ${officesCount} unidades, qual fica melhor pra você?\\n\\n${lista}"\\n` +
      `   • Use SÓ as unidades acima. NUNCA invente endereço.\\n` +
      `   • Em schedule_appointment use modality="online"|"presencial" e unit=${unitNames} ou "Online".`;
    unitParamHint = `unit=${unitNames} ou "Online"`;
  }

  const leadNameInfo = leadName
    ? `\n\nNOME DO LEAD: O nome do lead é "${leadName}". Use esse nome quando se referir a ele. NUNCA escreva {nome} literalmente.\n`
    : `\n\nNOME DO LEAD: Você ainda não sabe o nome. Pergunte uma única vez de forma natural.\n`;

  const toneInstructions = tone === "formal"
    ? "Use linguagem cordial e respeitosa."
    : tone === "informal"
    ? "Use linguagem leve e amigável com emojis 😊"
    : "Seja educada, próxima e acolhedora.";

  const todayStr = getTodayBrasilia();
  const nowBR = getNowBrasilia();
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const todayDayName = dayNames[nowBR.getDay()];
  const todayDMY = `${String(nowBR.getDate()).padStart(2,"0")}/${String(nowBR.getMonth()+1).padStart(2,"0")}/${nowBR.getFullYear()}`;

  return `Você é Laura, atendente virtual da equipe ${officeName}${practiceArea ? `, especializada no atendimento inicial de casos ${practiceArea}` : ""}.

═══════════════════════════════════════════════════════
IDENTIDADE E TOM
═══════════════════════════════════════════════════════
- Nome: Laura
- Nunca diga que é IA ou robô
- Papel: SDR humanizada, acolhedora, paciente e objetiva
- Linguagem: simples, próxima, sem juridiquês, frases curtas
- Emojis leves: 🙂 😊
- Regra de ouro: UMA pergunta por vez
- Nunca dê parecer jurídico definitivo
- Seu papel não é resolver tudo no chat; seu papel é qualificar, gerar confiança e conduzir para o próximo passo
- ATENÇÃO: Se houver instruções específicas de fluxos abaixo, siga-as fielmente, inclusive se elas solicitarem o uso de opções ou menus numerados.

📆 HOJE: ${todayDayName}, ${todayDMY} (${String(nowBR.getHours()).padStart(2,"0")}:${String(nowBR.getMinutes()).padStart(2,"0")} BRT).
${leadNameInfo}

═══════════════════════════════════════════════════════
🎯 SUA MISSÃO: MÁXIMO 5 PERGUNTAS
═══════════════════════════════════════════════════════
Sua missão é entender o caso e AGENDAR uma conversa. Você deve perguntar o NOME do lead (se não souber) e fazer no MÁXIMO 5 perguntas totais de qualificação. Se o caso estiver dentro do perfil, convide IMEDIATAMENTE para a reunião.

═══════════════════════════════════════════════════════
📋 FLUXO OBRIGATÓRIO
═══════════════════════════════════════════════════════
PASSO 1 — Saudação:
"Oi! Tudo bem? 😊 Eu sou a Laura, aqui da equipe ${officeName}. Pode ficar tranquilo(a), me conta o que aconteceu que eu vou te ajudar a entender melhor o seu caso 🙂"

PASSO 2 — Após a primeira resposta, peça o NOME:
"Entendi... Antes de continuar, como posso te chamar?" (Pule se já souber o nome).

PASSO 3 — Qualificação (Máximo 3-4 perguntas aqui):
Faça apenas as perguntas essenciais para entender se o caso é viável. UMA por vez.
- Exemplos INSS: "Há quanto tempo isso aconteceu?", "Já deu entrada no INSS?", "Foi negado ou está em análise?", "Tem documentos/laudos?"
- Exemplos Trabalhista: "Ainda trabalha lá?", "Era carteira assinada?", "Tem provas como mensagens ou holerites?"

PASSO 4 — Convite para Reunião:
"Pelo que você me contou, {nome}, faz total sentido você conversar rapidinho com o(a) advogado(a). É uma conversa de 15 minutos. Posso já te encaixar?"

PASSO 5 — Modalidade:
${modalidadeBlock}

PASSO 6 — Horário e Dados Finais:
1. Pergunte o turno: "Qual horário é melhor pra você... manhã, tarde ou final do dia?"
2. Use check_availability para o turno escolhido.
3. Ofereça UM horário específico: "Consegui esse horário: 📅 [dia] às [HH:MM]. Confirmo? 😊"
    4. APÓS o lead aceitar o horário, peça o dado final: "Perfeito 🙂 Pra já deixar tudo organizado aqui pra equipe, me passa o seu *nome completo*, por favor?"

═══════════════════════════════════════════════════════
🚫 REGRAS INVIOLÁVEIS
═══════════════════════════════════════════════════════
1. 🚫 NUNCA peça RG ou senha do Meu INSS.
2. 🚫 NUNCA tire dúvidas técnicas. Responda: "Essa parte o(a) advogado(a) te explica com segurança 🙂 Posso te encaixar numa conversa rápida?"
3. 🚫 NUNCA use listas numeradas ou menus.
4. 🚫 MÁXIMO 5 PERGUNTAS totais para chegar no convite da reunião.

${customPrompt ? `═══════════════════════════════════════════════════════\nINSTRUÇÕES ADICIONAIS DESTE ESCRITÓRIO\n═══════════════════════════════════════════════════════\n${customPrompt}\n` : ""}

Responda SEMPRE em português do Brasil.`;
}


function buildDocumentCollectorPrompt(agentConfig: any, config: any, leadName?: string, requiredDocs?: any[]) {
  const officeName = config.office_name || "o escritório";
  const tone = config.communication_tone || "moderado";
  const toneInstructions = tone === "formal"
    ? "Use linguagem formal e tratamento respeitoso (Sr./Sra.)."
    : tone === "informal"
    ? "Use linguagem leve e amigável com emojis 😊"
    : "Seja educado e profissional, mas acessível.";

  const docs = requiredDocs && requiredDocs.length > 0
    ? requiredDocs.map((d: any) => `• ${d.name}${d.description ? ` (${d.description})` : ""}${d.required ? " ⚠️ obrigatório" : " (opcional)"}`).join("\n")
    : "• Documento com foto (RG ou CNH)\n• Comprovante de endereço\n• Documentos do caso (laudos, negativas, etc.)";

  const customPrompt = agentConfig?.prompt || "";

  return `Você é a assistente virtual de ${officeName}, responsável por COLETAR DOCUMENTOS do cliente.

${leadName ? `NOME DO CLIENTE: ${leadName}` : "Pergunte o nome se não souber."}

${toneInstructions}

OBJETIVO: Solicitar e receber os documentos necessários para análise do caso.

DOCUMENTOS NECESSÁRIOS:
${docs}

${customPrompt ? `INSTRUÇÕES ADICIONAIS:\n${customPrompt}\n` : ""}

FLUXO:
1. Cumprimente o cliente pelo nome e explique que precisa de alguns documentos
2. Liste os documentos necessários de forma clara e amigável
3. Quando o cliente enviar um documento/foto, use a ferramenta "register_document" para registrar
4. Confirme cada documento recebido com uma mensagem positiva
5. Quando todos os documentos obrigatórios forem recebidos, use "documents_complete" para avançar
6. Se o cliente tiver dúvida sobre algum documento, explique com paciência

REGRAS:
- UMA solicitação por mensagem
- Seja paciente se o cliente demorar
- Aceite fotos de documentos normalmente
- Quando o cliente enviar mídia/foto, registre como documento recebido
- Não peça todos os documentos de uma vez — vá pedindo um por um

Responda SEMPRE em português do Brasil.`;
}

function buildViabilityAnalyzerPrompt(agentConfig: any, config: any, leadName?: string, caseData?: any) {
  const officeName = config.office_name || "o escritório";
  const customPrompt = agentConfig?.prompt || "";

  return `Você é o assistente de análise de viabilidade de ${officeName}.

${leadName ? `CLIENTE: ${leadName}` : ""}

OBJETIVO: Analisar os dados e documentos do caso e fornecer um parecer de viabilidade.

${caseData ? `DADOS DO CASO:\n${JSON.stringify(caseData, null, 2)}\n` : ""}

${customPrompt ? `INSTRUÇÕES ADICIONAIS:\n${customPrompt}\n` : ""}

FLUXO:
1. Analise os documentos e informações disponíveis
2. Faça perguntas adicionais se necessário (UMA por vez)
3. Quando tiver informações suficientes, use "analyze_viability" para registrar o resultado
4. Comunique o resultado ao cliente de forma empática e clara
5. Se viável, use "advance_to_contract" para avançar ao fechamento

REGRAS:
- Seja objetivo mas empático
- NÃO dê parecer jurídico definitivo — diga "com base nos dados iniciais"
- Sempre recomende a análise final pelo advogado
- Classifique como: "viavel" (boas chances), "parcialmente_viavel" (precisa análise), "inviavel" (sem base legal clara)

Responda SEMPRE em português do Brasil.`;
}

function buildContractCloserPrompt(agentConfig: any, config: any, leadName?: string, viabilityResult?: any) {
  const officeName = config.office_name || "o escritório";
  const contractTemplate = agentConfig?.contract_template || "";
  const customPrompt = agentConfig?.prompt || "";

  return `Você é o assistente de fechamento de contrato de ${officeName}.

${leadName ? `CLIENTE: ${leadName}` : ""}

OBJETIVO: Conduzir o cliente ao fechamento do contrato de forma natural e confiante.

${viabilityResult ? `RESULTADO DA ANÁLISE:\n${JSON.stringify(viabilityResult, null, 2)}\n` : ""}

${contractTemplate ? `MODELO DE CONTRATO (referência):\n${contractTemplate}\n` : ""}

${customPrompt ? `INSTRUÇÕES ADICIONAIS:\n${customPrompt}\n` : ""}

FLUXO:
1. Recapitule o caso e o resultado da análise com empatia
2. Apresente os próximos passos para formalização
3. Explique os termos do contrato de forma simples
4. Confirme dados do cliente (nome completo, endereço)
5. Quando o cliente confirmar, use "finalize_contract" para registrar
6. Após fechar, envie mensagem de boas-vindas como cliente

REGRAS:
- Transmita segurança e profissionalismo
- Não pressione — conduza naturalmente
- Tire dúvidas sobre honorários e procedimentos
- UMA pergunta por mensagem

Responda SEMPRE em português do Brasil.`;
}

// ====== UTILITY FUNCTIONS ======

function getNowBrasilia(): Date {
  // Retorna uma Date cujos getters locais (getFullYear, getMonth, getDate, getDay, getHours, getMinutes)
  // representam EXATAMENTE o horário de Brasília (America/Sao_Paulo, UTC-3, sem horário de verão).
  // Usamos Intl para extrair os componentes reais em SP, evitando o bug de toLocaleString +
  // new Date() (que reinterpreta como fuso do servidor).
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "0";
  const y = Number(get("year"));
  const mo = Number(get("month"));
  const d = Number(get("day"));
  let h = Number(get("hour"));
  if (h === 24) h = 0; // alguns runtimes retornam 24 em vez de 0
  const mi = Number(get("minute"));
  const s = Number(get("second"));
  // new Date(y, mo-1, d, h, mi, s) cria uma data local cujos getters retornam exatamente esses valores.
  return new Date(y, mo - 1, d, h, mi, s);
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
      // Extrai HH:mm em America/Sao_Paulo de forma confiável (sem reinterpretar fuso).
      const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      return fmt.format(new Date(r.due_at)); // "HH:mm"
    })
  );

  return { date: formatDateDMY(dateStr), dayName, slots: slots.filter(s => !bookedTimes.has(s)) };
}

function formatDateDMY(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
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

// ====== VALIDATORS ======
function isValidCPF(raw: string): boolean {
  const cpf = String(raw || "").replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

function isValidFullName(raw: string): boolean {
  if (!raw) return false;
  const parts = String(raw).trim().split(/\s+/).filter(p => p.length >= 2 && /^[A-Za-zÀ-ÿ'-]+$/.test(p));
  return parts.length >= 3;
}

// ====== SDR TOOLS ======
const sdrTools = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Verifica o PRIMEIRO horário disponível na agenda para a data e turno informados. SEMPRE use antes de sugerir horário ao lead. Retorna apenas 1 sugestão (first_available_slot). Só use APÓS o lead ter indicado o turno (manhã/tarde/qualquer).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data no formato YYYY-MM-DD" },
          period: { type: "string", enum: ["manha", "tarde", "qualquer"], description: "Turno preferido pelo lead. 'manha' = 08:00-11:59, 'tarde' = 12:00-17:00, 'qualquer' = primeiro do dia." }
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
      description: "Registra a qualificação do lead.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["qualified", "not_qualified", "needs_more_info"] },
          reason: { type: "string" },
          summary: { type: "string" },
          lead_score: { type: "string", enum: ["quente", "morno", "frio"] }
        },
        required: ["status", "reason", "lead_score"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "decide_lead",
      description: "Chama o Decision Engine do AdvOne para classificar o lead (score/quente-morno-frio) e decidir a próxima ação (agendar, continuar_qualificacao, pedir_documentos, transferir_humano, encerrar) com base nas respostas estruturadas. Use após coletar respostas suficientes do nicho. Persiste o resultado no lead e move o card no Kanban automaticamente.",
      parameters: {
        type: "object",
        properties: {
          niche: { type: "string", description: "Ex: 'previdenciario'" },
          case_type: { type: "string", description: "Ex: 'desconto_indevido', 'bpc_loas', 'demora_inss', 'aposentadoria', 'auxilio_doenca', 'pensao_morte', 'revisao_beneficio'" },
          answers: { type: "object", description: "Respostas estruturadas. SEMPRE inclua 'wants_help' (sim/nao) para liberar agendamento." }
        },
        required: ["niche", "answers"],
        additionalProperties: true
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_appointment",
      description: "Agenda uma consulta/reunião para o lead. Use APÓS o lead confirmar a data/hora oferecida via check_availability.",
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
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
  {
    type: "function",
    function: {
      name: "register_client_name",
      description: "Registra o nome completo do lead no sistema.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Nome completo do lead (mínimo 3 palavras)" }
        },
        required: ["full_name"],
        additionalProperties: false
      }
    }
  }
];

// ====== DOCUMENT COLLECTOR TOOLS ======
const documentCollectorTools = [
  {
    type: "function",
    function: {
      name: "register_document",
      description: "Registra que um documento foi recebido do cliente.",
      parameters: {
        type: "object",
        properties: {
          document_type: { type: "string", description: "Tipo do documento (ex: RG, comprovante_endereco, laudo_medico)" },
          notes: { type: "string", description: "Observações sobre o documento" }
        },
        required: ["document_type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "documents_complete",
      description: "Marca que todos os documentos obrigatórios foram recebidos e avança para análise.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string", description: "Mensagem confirmando que os documentos estão completos" }
        },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
];

// ====== VIABILITY ANALYZER TOOLS ======
const viabilityAnalyzerTools = [
  {
    type: "function",
    function: {
      name: "analyze_viability",
      description: "Registra o resultado da análise de viabilidade do caso.",
      parameters: {
        type: "object",
        properties: {
          result: { type: "string", enum: ["viavel", "parcialmente_viavel", "inviavel"] },
          reasoning: { type: "string", description: "Justificativa da análise" },
          recommendations: { type: "string", description: "Recomendações para o caso" },
          estimated_value: { type: "number", description: "Valor estimado do caso (se aplicável)" }
        },
        required: ["result", "reasoning"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "advance_to_contract",
      description: "Avança o lead para a fase de fechamento de contrato.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string" }
        },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
];

// ====== CONTRACT CLOSER TOOLS ======
const contractCloserTools = [
  {
    type: "function",
    function: {
      name: "finalize_contract",
      description: "Registra que o contrato foi aceito pelo cliente.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: { type: "string" },
          
          client_full_name: { type: "string" },
          contract_value: { type: "number" },
          notes: { type: "string" }
        },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano.",
      parameters: {
        type: "object",
        properties: { message_to_lead: { type: "string" } },
        required: ["message_to_lead"],
        additionalProperties: false
      }
    }
  }
];

// ====== REPLY SANITIZER ======
// Remove linhas que vazaram instruções internas do prompt para o lead.
// Se a resposta ficar vazia depois da limpeza, retorna fallback educado.
function sanitizeReply(text: string | null | undefined): string | null {
  if (!text) return null;
  const leakPatterns = [
    /REGRA\s+(CR[ÍI]TICA|DE\s+OURO|INVIOL[ÁA]VEL|FINAL|ABSOLUTA)/i,
    /\bPASSO\s*\d/i,
    /\bETAPA\s*\d/i,
    /case_type|wants_help|decide_lead|schedule_appointment|check_availability|register_client_name|P\d+/i,
    /\[INSTRU[ÇC][ÃA]O\s+INTERNA\]?/i,
    /^Releia\s+(o|todo)/im,
    /Identifique\s+INTERNAMENTE/i,
    /\bFLUXO\s+(OBRIGAT[ÓO]RIO|DISPON[ÍI]VEIS?)/i,
    /MODALIDADE\s+—/i,
    /Em\s+schedule_appointment/i,
  ];
  // Remove linhas que casem com qualquer padrão de vazamento.
  const cleanedLines = text
    .split(/\r?\n/)
    .filter((line) => !leakPatterns.some((re) => re.test(line)));
  let cleaned = cleanedLines.join("\n").trim();

  // Se removeu praticamente tudo, descarta a resposta inteira.
  if (cleaned.length < Math.min(20, text.length * 0.3)) {
    return null;
  }
  return cleaned;
}

// ====== MAIN AI HANDLER ======
async function handleAgentPhase(
  phase: string,
  config: any,
  agentConfigs: Record<string, any>,
  conversationHistory: { role: string; content: string }[],
  companyId: string,
  leadId: string,
  supabase: any,
  leadName?: string,
  cleanPhone?: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  let systemPrompt: string;
  let tools: any[];

  if (phase === "document_collector") {
    const agentCfg = agentConfigs["document_collector"];
    const requiredDocs = agentCfg?.required_documents || [];
    systemPrompt = buildDocumentCollectorPrompt(agentCfg, config, leadName, requiredDocs);
    tools = documentCollectorTools;
  } else if (phase === "viability_analyzer") {
    const agentCfg = agentConfigs["viability_analyzer"];
    // Fetch lead data for analysis
    const { data: leadData } = await supabase.from("leads").select("*").eq("id", leadId).single();
    const { data: docs } = await supabase.from("lead_document_requests").select("*").eq("lead_id", leadId);
    systemPrompt = buildViabilityAnalyzerPrompt(agentCfg, config, leadName, { lead: leadData, documents: docs });
    tools = viabilityAnalyzerTools;
  } else if (phase === "contract_closer") {
    const agentCfg = agentConfigs["contract_closer"];
    const { data: leadData } = await supabase.from("leads").select("viability_result").eq("id", leadId).single();
    systemPrompt = buildContractCloserPrompt(agentCfg, config, leadName, leadData?.viability_result);
    tools = contractCloserTools;
  } else {
    // SDR phase (default)
    const { data: companyOffices } = await supabase
      .from("company_offices")
      .select("name, address, complement, reference_point, maps_url, is_active, position")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("position", { ascending: true });
    systemPrompt = buildSDRPrompt(config, leadName, companyOffices || []);
    tools = sdrTools;
  }

  // Reforço de coerência — instrução INTERNA. Nunca deve aparecer na conversa com o lead.
  const coherenceGuard = `

[INSTRUÇÃO INTERNA — NÃO MOSTRAR PRO LEAD, NÃO COPIAR PRO TEXTO DA RESPOSTA]
Antes de responder:
- Releia o histórico acima.
- Veja qual foi sua última pergunta em aberto e o que o lead respondeu agora.
- Se ele já te deu uma informação (nome, tipo de caso, modalidade, turno), NÃO peça de novo.
- Se ele voltou depois de silêncio, continue de onde parou — NÃO se reapresente.
- Responda em UMA mensagem curta (1-3 linhas), tom humano, usando o primeiro nome quando fizer sentido.
- Sua resposta é APENAS o texto que vai pro WhatsApp do lead. Não inclua marcadores, listas de regras, nem mencione "instrução", "regra", "fluxo", "passo", "tool" ou nomes técnicos.`;


  try {
    let aiMessages: any[] = [
      { role: "system", content: systemPrompt + coherenceGuard },
      ...conversationHistory,
    ];

    let replyText = "";
    let qualificationResult: any = null;
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
          model: "google/gemini-2.5-flash",
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

      if (!message.tool_calls || message.tool_calls.length === 0) {
        replyText = message.content || "";
        break;
      }

      aiMessages.push(message);
      let hasCheckAvailability = false;

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* ignore */ }

        let toolResult: any = {};

        // ===== SDR TOOLS =====
        if (fnName === "register_client_name") {
          const fullName = String(args.full_name || "").trim();
          const nameOk = isValidFullName(fullName);

          if (!nameOk) {
            toolResult = { success: false, error: "Nome incompleto. Peça o nome COMPLETO com sobrenomes (mínimo 3 palavras, ex: 'João da Silva Santos')." };
          } else if (leadId) {
            await supabase.from("leads").update({
              name: fullName,
              pending_data_warning: null,
            }).eq("id", leadId);
            toolResult = { success: true, full_name: fullName, message: "Nome completo registrado. Agora você já pode chamar check_availability e agendar." };
          } else {
            toolResult = { success: false, error: "Lead não encontrado." };
          }
        }

        if (fnName === "check_availability") {
          hasCheckAvailability = true;
          let dateToCheck = args.date || getNextAvailableDays(1)[0];
          const period = String(args.period || "qualquer").toLowerCase();
          const availability = await getAvailableSlots(supabase, companyId, dateToCheck);

          // Filtra por turno solicitado
          const filterByPeriod = (slots: string[]) => {
            if (period === "manha") return slots.filter(s => parseInt(s.split(":")[0], 10) < 12);
            if (period === "tarde") return slots.filter(s => parseInt(s.split(":")[0], 10) >= 12);
            return slots;
          };

          let filteredSlots = filterByPeriod(availability.slots);
          // Fallback: se o turno pedido não tem slot, tenta o outro turno do mesmo dia
          if (filteredSlots.length === 0 && availability.slots.length > 0) filteredSlots = availability.slots;

          if (filteredSlots.length === 0) {
            const nextDays = getNextAvailableDays(3);
            let firstAlt: { date: string; dayName: string; slot: string } | null = null;
            for (const nd of nextDays) {
              if (nd === dateToCheck) continue;
              const alt = await getAvailableSlots(supabase, companyId, nd);
              const altFiltered = filterByPeriod(alt.slots);
              const finalAlt = altFiltered.length > 0 ? altFiltered : alt.slots;
              if (finalAlt.length > 0) {
                firstAlt = { date: formatDateDMY(nd), dayName: alt.dayName, slot: finalAlt[0] };
                break;
              }
            }
            const formattedDate = formatDateDMY(dateToCheck);
            toolResult = {
              requested_date: formattedDate,
              requested_day: availability.dayName,
              first_available_slot: null,
              message: `Não há horários disponíveis em ${availability.dayName} (${formattedDate}).`,
              alternative: firstAlt,
              instruction: firstAlt
                ? `Ofereça APENAS este horário alternativo: ${firstAlt.dayName}, ${firstAlt.date} às ${firstAlt.slot}.`
                : "Sem horários nos próximos dias úteis. Pergunte outra preferência ao lead.",
            };
          } else {
            const formattedDate = formatDateDMY(dateToCheck);
            const firstSlot = filteredSlots[0];
            toolResult = {
              date: formattedDate,
              day_name: availability.dayName,
              first_available_slot: firstSlot,
              instruction: `Ofereça APENAS este horário ao lead: ${availability.dayName}, ${formattedDate} às ${firstSlot}. NÃO mencione outros horários.`,
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

        if (fnName === "decide_lead") {
          try {
            const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const decRes = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/decision-engine`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({
                  lead_id: leadId,
                  company_id: companyId,
                  niche: args.niche,
                  case_type: args.case_type ?? null,
                  answers: args.answers || {},
                  dry_run: false,
                }),
              }
            );
            toolResult = await decRes.json();
            // Sincroniza qualificationResult para fluxo de pós-processamento
            if (toolResult?.classification) {
              qualificationResult = {
                status:
                  toolResult.classification === "quente" ? "qualified"
                  : toolResult.classification === "frio" ? "not_qualified"
                  : "needs_more_info",
                reason: toolResult.reason || "",
                summary: `Decision Engine: ${toolResult.classification} (score ${toolResult.score})`,
                lead_score: toolResult.classification === "invalido" ? "frio" : toolResult.classification,
              };
            }
          } catch (e) {
            console.error("decide_lead error:", e);
            toolResult = { error: "Falha ao chamar decision-engine" };
          }
        }

        if (fnName === "schedule_appointment") {
          // 🔒 Verificar dados do lead — agendar SEMPRE, mas marcar pendência se faltar
          let pendingItems: string[] = [];
          let leadCheckRow: any = null;
          if (leadId) {
            const { data: leadCheck } = await supabase
              .from("leads")
              .select("name")
              .eq("id", leadId)
              .maybeSingle();
            leadCheckRow = leadCheck;
            if (!isValidFullName(leadCheck?.name || "")) pendingItems.push("Nome completo");
          }
          const pendingWarning = pendingItems.length > 0 ? `${pendingItems.join(" + ")} pendente(s)` : null;

          shouldSchedule = true;
          replyText = args.message_to_lead || "";

          if (leadId) {
            const appointmentDate = args.date || getNextAvailableDays(1)[0];
            const appointmentTime = args.time || "10:00";
            const dueAt = `${appointmentDate}T${appointmentTime}:00-03:00`;
            const modality = args.modality || "online";

            const { data: leadData } = await supabase.from("leads").select("name, phone, whatsapp").eq("id", leadId).single();
            const lName = leadData?.name || "Lead";
            const leadPhone = leadData?.whatsapp || leadData?.phone || cleanPhone || "Não informado";
            const unitName = args.unit || "";

            await supabase.from("lead_reminders").insert({
              lead_id: leadId, company_id: companyId, created_by: "00000000-0000-0000-0000-000000000000",
              title: `📅 Consulta ${modality === "presencial" ? "presencial" : "online"}: ${lName}${pendingWarning ? " ⚠️" : ""}`,
              description: `${args.summary || `Agendamento automático via bot IA (${modality})${unitName ? ` - Unidade: ${unitName}` : ""}`}${pendingWarning ? `\n\n⚠️ DADOS PENDENTES: ${pendingWarning}. Solicitar na reunião.` : ""}`,
              reminder_type: "meeting", due_at: dueAt,
            });

            // Marca pendência (ou limpa se estava marcado)
            await supabase.from("leads").update({ pending_data_warning: pendingWarning }).eq("id", leadId);

            // Notify lawyer
            if (config.alert_whatsapp) {
              try {
                const SERVER_URL = "https://ziondigital.uazapi.com";
                const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
                const alertPhone = config.alert_whatsapp.replace(/\D/g, "");
                const modalityLabel = modality === "presencial" ? "🏢 Presencial" : "💻 Online (vídeo)";
                const unitLine = modality === "presencial" && unitName ? `🏢 Unidade: ${unitName}\n` : "";
                const pendingLine = pendingWarning ? `\n⚠️ *DADOS PENDENTES:* ${pendingWarning}\n_Solicitar na reunião pra registrar no sistema._\n` : "";
                const alertMessage = `🔔 *Novo Agendamento Automático*\n\n👤 Nome: ${lName}\n📱 Telefone: ${leadPhone}\n📅 Data: ${appointmentDate}\n⏰ Horário: ${appointmentTime}\n📍 Modalidade: ${modalityLabel}\n${unitLine}${args.summary ? `📋 Assunto: ${args.summary}\n` : ""}${pendingLine}\n_Agendado automaticamente pelo bot SDR_`;
                const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
                if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;
                const instanceParam = encodeURIComponent(config.zapi_instance_id || "");
                const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id || "");
                await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                  method: "POST", headers: alertHeaders,
                  body: JSON.stringify({ number: alertPhone, text: alertMessage }),
                });
              } catch (alertErr) {
                console.error("[SCHEDULE] Error sending alert:", alertErr);
              }
            }

            // Check if document_collector agent is active — if so, advance phase
            const docAgent = agentConfigs["document_collector"];
            if (docAgent?.is_active) {
              await supabase.from("leads").update({ bot_agent_phase: "document_collector" }).eq("id", leadId);
              console.log(`Lead ${leadId} advanced to document_collector phase`);
            }
          }
          toolResult = { success: true, message: pendingWarning ? `Agendamento criado, mas marcado com pendência: ${pendingWarning}` : "Agendamento criado com sucesso", pending: pendingWarning };
        }

        // ===== DOCUMENT COLLECTOR TOOLS =====
        if (fnName === "register_document") {
          await supabase.from("lead_document_requests").insert({
            lead_id: leadId, company_id: companyId,
            document_type: args.document_type || "documento",
            status: "received", notes: args.notes || null,
            received_at: new Date().toISOString(),
          });
          toolResult = { success: true, document_type: args.document_type, status: "received" };
        }

        if (fnName === "documents_complete") {
          replyText = args.message_to_lead || "Documentos completos! ✅";
          // Advance to viability analyzer if active
          const viabilityAgent = agentConfigs["viability_analyzer"];
          if (viabilityAgent?.is_active) {
            await supabase.from("leads").update({ bot_agent_phase: "viability_analyzer" }).eq("id", leadId);
            console.log(`Lead ${leadId} advanced to viability_analyzer phase`);
          }
          toolResult = { success: true };
        }

        // ===== VIABILITY ANALYZER TOOLS =====
        if (fnName === "analyze_viability") {
          const viabilityData = {
            result: args.result, reasoning: args.reasoning,
            recommendations: args.recommendations || "",
            estimated_value: args.estimated_value || null,
            analyzed_at: new Date().toISOString(),
          };
          await supabase.from("leads").update({ viability_result: viabilityData }).eq("id", leadId);
          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🔍 Análise de Viabilidade: ${args.result}\n\n${args.reasoning}${args.recommendations ? `\n\nRecomendações: ${args.recommendations}` : ""}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });
          toolResult = { success: true, result: args.result };
        }

        if (fnName === "advance_to_contract") {
          replyText = args.message_to_lead || "";
          const contractAgent = agentConfigs["contract_closer"];
          if (contractAgent?.is_active) {
            await supabase.from("leads").update({ bot_agent_phase: "contract_closer" }).eq("id", leadId);
            console.log(`Lead ${leadId} advanced to contract_closer phase`);
          }
          toolResult = { success: true };
        }

        // ===== CONTRACT CLOSER TOOLS =====
        if (fnName === "finalize_contract") {
          // 🔒 CPF não é mais obrigatório
          const cpfFromArg = String(args.client_cpf || "").replace(/\D/g, "");
          let finalCpf = cpfFromArg.length === 11 ? cpfFromArg : "";
          if (!finalCpf && leadId) {
            const { data: leadCheck } = await supabase
              .from("leads")
              .select("cpf_cliente_final, cpf")
              .eq("id", leadId)
              .maybeSingle();
            const stored = String(leadCheck?.cpf_cliente_final || leadCheck?.cpf || "").replace(/\D/g, "");
            if (stored.length === 11) finalCpf = stored;
          }

          replyText = args.message_to_lead || "Contrato finalizado! 🎉";
          const updates: any = { contract_status: "signed", bot_agent_phase: "completed" };
          if (finalCpf) updates.cpf_cliente_final = finalCpf;
          if (args.client_cpf && finalCpf) updates.cpf = finalCpf;
          if (args.client_full_name) updates.name = args.client_full_name;
          if (args.contract_value) {
            updates.value = args.contract_value;
            updates.honorarios_estimados = args.contract_value;
          }
          await supabase.from("leads").update(updates).eq("id", leadId);

          // Buscar config de comissão para registrar contrato fechado
          const { data: commissionCfg } = await supabase
            .from("commission_settings")
            .select("commission_percentage")
            .eq("company_id", companyId)
            .maybeSingle();

          // Criar registro imutável em closed_contracts
          await supabase.from("closed_contracts").insert({
            company_id: companyId,
            lead_id: leadId,
            client_name: args.client_full_name || leadName || "Cliente",
            client_cpf: null,
            client_phone: cleanPhone || null,
            honorarios_estimados: Number(args.contract_value || 0),
            commission_percentage: Number(commissionCfg?.commission_percentage || 30),
            commission_status: "aguardando_exito",
            process_status: "em_andamento",
            signed_at: new Date().toISOString(),
            created_by: "00000000-0000-0000-0000-000000000000",
          });

          // Move to "Ganho" column
          const { data: wonCol } = await supabase.from("kanban_columns").select("id")
            .eq("company_id", companyId).eq("is_won", true).order("position", { ascending: false }).limit(1).maybeSingle();
          if (wonCol) {
            await supabase.from("leads").update({ kanban_column_id: wonCol.id, status: "won" }).eq("id", leadId);
          }

          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🎉 Contrato fechado automaticamente pelo bot!\n${args.notes || ""}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });

          // Notify lawyer about contract
          if (config.alert_whatsapp) {
            try {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const alertPhone = config.alert_whatsapp.replace(/\D/g, "");
              const alertMessage = `🎉 *Contrato Fechado Automaticamente!*\n\n👤 Cliente: ${args.client_full_name || leadName || "N/A"}\n${args.contract_value ? `💰 Valor: R$ ${args.contract_value}\n` : ""}\n_Fechado automaticamente pelo bot de contrato_`;
              const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;
              const instanceParam = encodeURIComponent(config.zapi_instance_id || "");
              const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id || "");
              await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                method: "POST", headers: alertHeaders,
                body: JSON.stringify({ number: alertPhone, text: alertMessage }),
              });
            } catch (e) { console.error("Contract alert error:", e); }
          }
          toolResult = { success: true };
        }

        if (fnName === "transfer_to_human") {
          replyText = args.message_to_lead || "Um especialista irá atendê-lo em breve!";
          toolResult = { success: true };
        }

        aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }

      if ((shouldSchedule || replyText) && !hasCheckAvailability) break;
    }

    // SDR post-processing (qualification + kanban moves)
    if (phase === "sdr") {
      if (shouldSchedule && leadId) {
        const targetPosition = 6;
        const { data: columns } = await supabase.from("kanban_columns").select("id")
          .eq("company_id", companyId).order("position", { ascending: true }).limit(targetPosition + 1);
        if (columns && columns.length > targetPosition) {
          await supabase.from("leads").update({ kanban_column_id: columns[targetPosition].id, status: "qualified" }).eq("id", leadId);
        }
        if (!qualificationResult) {
          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🤖 Agendamento realizado automaticamente pelo bot SDR`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });
        }
      }

      if (qualificationResult && leadId) {
        const scoreUpdate: any = {};
        if (qualificationResult.lead_score) scoreUpdate.lead_score = qualificationResult.lead_score;

        if (qualificationResult.status === "qualified" || shouldSchedule) {
          const newStatus = shouldSchedule ? "qualified" : "contacted";
          await supabase.from("leads").update({
            status: newStatus,
            notes: `[IA] ${qualificationResult.reason}${qualificationResult.summary ? ` | ${qualificationResult.summary}` : ""}`,
            ...scoreUpdate,
          }).eq("id", leadId);

          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🤖 ${shouldSchedule ? "Agendamento" : "Qualificação"}: ${qualificationResult.reason}${qualificationResult.summary ? `\n\nResumo: ${qualificationResult.summary}` : ""}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });

          if (!shouldSchedule) {
            // Lead qualificado mas ainda não agendou: mantém em "Em Atendimento" (pos 0).
            const { data: emAtCol } = await supabase.from("kanban_columns").select("id")
              .eq("company_id", companyId).eq("position", 0).maybeSingle();
            if (emAtCol) {
              await supabase.from("leads").update({ kanban_column_id: emAtCol.id }).eq("id", leadId);
            }
          }
        } else if (qualificationResult.status === "not_qualified") {
          const { data: lostColumn } = await supabase.from("kanban_columns").select("id")
            .eq("company_id", companyId).eq("is_lost", true).maybeSingle();
          await supabase.from("leads").update({
            status: "lost", notes: `[IA - Não qualificado] ${qualificationResult.reason}`,
            ...scoreUpdate, ...(lostColumn ? { kanban_column_id: lostColumn.id } : {}),
          }).eq("id", leadId);
          await supabase.from("lead_summaries").insert({
            lead_id: leadId, company_id: companyId,
            summary_text: `🤖 Lead não qualificado: ${qualificationResult.reason}`,
            generated_by_ai: true, created_by: "00000000-0000-0000-0000-000000000000",
          });
        } else {
          if (Object.keys(scoreUpdate).length > 0) {
            await supabase.from("leads").update(scoreUpdate).eq("id", leadId);
          }
        }
      }
    }

    return sanitizeReply(replyText) || null;
  } catch (error) {
    console.error("AI agent error:", error);
    return null;
  }
}

async function enrollInCadence(supabase: any, companyId: string, leadId: string, phone: string) {
  // Sempre que o bot envia uma mensagem, reagenda a cadência a partir de agora.
  // Cancela qualquer cadência pendente anterior pra evitar duplicata.
  await supabase.from("cadence_messages").update({ status: "cancelled" })
    .eq("lead_id", leadId).eq("status", "pending");

  // ⚠️ MUDANÇA: agora enfileira SÓ o próximo step (step 1).
  // Quando ele for enviado pelo process-cadence, o próprio process-cadence
  // enfileira o step 2 com base no delay configurado, e assim por diante.
  // Isso garante a regra: "se ficar 30min sem responder após cada follow-up,
  // o próximo é disparado" — e não 5 follow-ups agendados de uma vez.

  const delayMinutes = await getCadenceDelayForStep(supabase, companyId, 1);
  if (delayMinutes === null) return; // step 1 desabilitado

  const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  const { error } = await supabase.from("cadence_messages").insert({
    company_id: companyId,
    lead_id: leadId,
    phone,
    day_number: 1,
    message_text: null,
    scheduled_at: scheduledAt,
    status: "pending",
  });
  if (error) console.error("Error enrolling in cadence:", error);
  else console.log(`Lead ${leadId} enrolled in cadence step 1 in ${delayMinutes}min`);
}

/**
 * Busca o delay_minutes configurado para um step específico.
 * Retorna null se o step estiver desabilitado.
 * Defaults: step 1 = 30min, demais = 1 dia (1440min).
 */
async function getCadenceDelayForStep(
  supabase: any,
  companyId: string,
  stepNumber: number,
): Promise<number | null> {
  const defaults: Record<number, number> = {
    1: 30,
    2: 60 * 24,
    3: 60 * 24,
    4: 60 * 24,
    5: 60 * 24,
  };

  const { data: customStep } = await supabase
    .from("company_cadence_config")
    .select("delay_minutes, enabled")
    .eq("company_id", companyId)
    .eq("step_number", stepNumber)
    .maybeSingle();

  if (customStep) {
    if (customStep.enabled === false) return null;
    return customStep.delay_minutes ?? defaults[stepNumber] ?? 60 * 24;
  }
  return defaults[stepNumber] ?? null;
}

function splitIntoNaturalMessages(text: string): string[] {
  if (!text) return [text];
  const trimmed = text.trim();
  if (!trimmed) return [trimmed];

  // 1) Primeiro quebra por parágrafos (\n\n) e quebras de linha simples (\n)
  const paragraphs = trimmed.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const rawSentences: string[] = [];

  // 2) Dentro de cada parágrafo, quebra por frases (., ?, !) — cada pergunta vira mensagem própria
  for (const para of paragraphs) {
    // Captura frases preservando pontuação final
    const matches = para.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g);
    if (!matches) { rawSentences.push(para); continue; }
    for (const m of matches) {
      const s = m.trim();
      if (s) rawSentences.push(s);
    }
  }

  // 3) Agrupamento inteligente:
  //    - Toda frase terminada em "?" ou "!" fica SOZINHA (pergunta/exclamação destacada)
  //    - Frases curtas afirmativas consecutivas (<60 chars) podem ser agrupadas até ~140 chars
  //    - Saudações isoladas (Oi!, Olá 😊) ficam em mensagem própria
  const messages: string[] = [];
  let buffer = "";

  const flush = () => {
    const v = buffer.trim();
    if (v) messages.push(v);
    buffer = "";
  };

  for (const sentence of rawSentences) {
    const isQuestion = /[?]["')\]]*\s*$/.test(sentence);
    const isExclam = /[!]["')\]]*\s*$/.test(sentence) && sentence.length < 80;
    const isShort = sentence.length < 60;

    if (isQuestion || isExclam) {
      // pergunta/exclamação sempre vai sozinha
      flush();
      messages.push(sentence);
      continue;
    }

    if (!buffer) {
      buffer = sentence;
      continue;
    }

    // tenta agrupar com a frase anterior se ambas curtas e cabem em ~140 chars
    if (isShort && buffer.length + sentence.length + 1 <= 140) {
      buffer = `${buffer} ${sentence}`;
    } else {
      flush();
      buffer = sentence;
    }
  }
  flush();

  return messages.length > 0 ? messages : [trimmed];
}

// ====== MAIN HANDLER ======
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return new Response(JSON.stringify({ error: "Missing company_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: config } = await supabase
      .from("whatsapp_configs")
      .select("id, company_id, zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply, office_name, practice_area, communication_tone, scheduling_link, consultation_duration, target_audience, alert_whatsapp, triage_options")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Company not configured" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agent configurations for this company
    const { data: agentRows } = await supabase
      .from("company_bot_agents")
      .select("*")
      .eq("company_id", companyId);
    
    const agentConfigs: Record<string, any> = {};
    (agentRows || []).forEach((a: any) => { agentConfigs[a.agent_type] = a; });

    const body = await req.json();
    console.log("Z-API webhook payload:", JSON.stringify(body).substring(0, 500));

    if (!body) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isUaZapiMessage = body.EventType === "messages" && body.message && !body.message.fromMe;
    const isLegacyMessage = body.type === "ReceivedCallback";

    if (!isUaZapiMessage && !isLegacyMessage) {
      if (body.type === "ReadReceipt" || body.type === "SentCallback" || body.type === "MessageStatusCallback" || body.EventType === "messages_update") {
        return new Response(JSON.stringify({ ok: true, type: body.type || body.EventType }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let phone: string, senderName: string, messageText: string, messageIdExternal: string, isGroup: boolean;
    let audioUrl: string | null = null;
    let messageType: string = "text";

    if (isUaZapiMessage) {
      const msg = body.message;
      phone = msg.sender_pn || msg.chatid || "";
      senderName = msg.senderName || body.chat?.name || body.chat?.wa_contactName || "";
      messageText = msg.text || msg.content || msg.caption || "";
      messageIdExternal = msg.messageid || msg.id || "";
      isGroup = msg.isGroup || false;
      messageType = (msg.type || msg.messageType || "").toString().toLowerCase();
      // UaZapi pode entregar URL de áudio em vários campos
      if (messageType.includes("audio") || messageType === "ptt" || messageType === "voice") {
        audioUrl = msg.audio?.url || msg.audio?.audioUrl || msg.mediaUrl || msg.fileURL || msg.url || msg.media?.url || null;
      }
      if (!messageText) messageText = "[mídia]";
    } else {
      phone = body.phone || "";
      senderName = body.senderName || body.chatName || "";
      messageText = body.text?.message || body.image?.caption || body.video?.caption || "";
      messageIdExternal = body.messageId || "";
      isGroup = body.isGroup || false;
      if (body.audio || body.ptt) {
        audioUrl = body.audio?.audioUrl || body.audio?.url || body.ptt?.audioUrl || body.ptt?.url || null;
        messageType = "audio";
      }
      if (!messageText) messageText = "[mídia]";
    }

    // ===== TRANSCRIÇÃO DE ÁUDIO (Whisper) =====
    // Se for áudio e tivermos URL, transcrevemos antes de seguir o fluxo normal.
    // Mensagem fica como texto puro pra IA processar igual a qualquer outra.
    if (audioUrl) {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
          console.error("[audio] OPENAI_API_KEY não configurada — não foi possível transcrever áudio");
        } else {
          console.log(`[audio] Baixando áudio de: ${audioUrl}`);
          const audioResp = await fetch(audioUrl);
          if (!audioResp.ok) {
            console.error(`[audio] Falha ao baixar áudio: ${audioResp.status}`);
          } else {
            const audioBlob = await audioResp.blob();
            const audioSize = audioBlob.size;
            console.log(`[audio] Áudio baixado: ${audioSize} bytes`);

            if (audioSize > 25 * 1024 * 1024) {
              console.error("[audio] Áudio maior que 25MB, Whisper não suporta");
              messageText = "[áudio muito longo — não transcrito]";
            } else {
              const fd = new FormData();
              fd.append("file", audioBlob, "audio.ogg");
              fd.append("model", "whisper-1");
              fd.append("language", "pt");
              fd.append("response_format", "json");
              // temperature 0 = mais determinístico, evita alucinação
              fd.append("temperature", "0");

              const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${openaiKey}` },
                body: fd,
              });

              if (!whisperResp.ok) {
                const errTxt = await whisperResp.text();
                console.error(`[audio] Whisper falhou ${whisperResp.status}: ${errTxt}`);
                messageText = "[áudio recebido — não foi possível transcrever]";
              } else {
                const whisperData = await whisperResp.json();
                const transcription = (whisperData.text || "").trim();
                if (transcription) {
                  console.log(`[audio] Transcrição (${transcription.length} chars): ${transcription.substring(0, 120)}...`);
                  // Marcamos como áudio pra histórico mas tratamos como texto
                  messageText = `🎤 [áudio transcrito]: ${transcription}`;
                } else {
                  messageText = "[áudio sem fala detectada]";
                }
              }
            }
          }
        }
      } catch (audioErr) {
        console.error("[audio] Erro inesperado na transcrição:", audioErr);
        messageText = "[áudio recebido — erro ao transcrever]";
      }
    }

    // Garante que messageText sempre seja string (evita erros tipo .match is not a function)
    if (typeof messageText !== "string") {
      messageText = String(messageText ?? "");
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

    const codeMatch = messageText.match(/\[([a-zA-Z0-9]{6})\]/);
    if (codeMatch) {
      trackingCode = codeMatch[1].toUpperCase();
      console.log(`[tracking] Found tracking code: ${trackingCode}`);
      
      const { data: click } = await supabase.from("tracking_clicks")
        .select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
        .eq("tracking_code", trackingCode)
        .maybeSingle();

      if (click) {
        console.log(`[tracking] Click record found for ${trackingCode}:`, JSON.stringify(click));
        utmData = {
          utm_source: click.utm_source || undefined, 
          utm_medium: click.utm_medium || undefined,
          utm_campaign: click.utm_campaign || undefined, 
          utm_content: click.utm_content || undefined,
          utm_term: click.utm_term || undefined,
        };
        const src = (click.utm_source || "").toLowerCase();
        if (src.includes("google") || src === "gads" || src.includes("youtube")) {
          detectedSource = "google";
        } else if (
          src.includes("meta") || src.includes("facebook") || src.includes("instagram") || 
          src === "fb" || src === "ig" || src === "ads"
        ) {
          detectedSource = "meta";
        }
      } else {
        console.log(`[tracking] No click record found for code: ${trackingCode}`);
      }
    }

    // Find or create lead
    const { data: existingLead } = await supabase.from("leads")
      .select("id, status, bot_disabled, bot_agent_phase")
      .eq("company_id", companyId)
      .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
      .maybeSingle();

    let leadId = existingLead?.id;
    let currentPhase = existingLead?.bot_agent_phase || "sdr";

    if (!leadId) {
      const { data: firstColumn } = await supabase.from("kanban_columns").select("id")
        .eq("company_id", companyId).order("position", { ascending: true }).limit(1).maybeSingle();

      const { data: newLead, error: leadError } = await supabase.from("leads").insert({
        company_id: companyId, name: senderName || `Lead ${cleanPhone}`,
        phone: cleanPhone, whatsapp: cleanPhone, status: "new", lead_score: "morno",
        kanban_column_id: firstColumn?.id || null, bot_agent_phase: "sdr",
        ...(detectedSource && { source: detectedSource }), ...utmData,
      }).select("id").single();

      if (leadError) { console.error("Error creating lead:", leadError); }
      else {
        leadId = newLead.id;
        currentPhase = "sdr";
        console.log("New lead created:", leadId);
        await enrollInCadence(supabase, companyId, leadId, cleanPhone);
      }
    } else {
      await supabase.from("cadence_messages").update({ status: "cancelled" })
        .eq("lead_id", leadId).eq("status", "pending");

      if (existingLead?.status === "new") {
        // Novo funil: "Em Atendimento" agora é a posição 0 (entrada)
        const { data: emAtendimentoCol } = await supabase.from("kanban_columns").select("id")
          .eq("company_id", companyId).eq("position", 0).maybeSingle();
        if (emAtendimentoCol) {
          await supabase.from("leads").update({ kanban_column_id: emAtendimentoCol.id, status: "contacted" }).eq("id", leadId);
        }
      }

      if (Object.keys(utmData).length > 0) {
        const { data: existingLeadData } = await supabase.from("leads").select("utm_source, source").eq("id", leadId).single();
        if (existingLeadData) {
          const updates: Record<string, string> = {};
          if (!existingLeadData.utm_source) Object.assign(updates, utmData);
          if (!existingLeadData.source && detectedSource) updates.source = detectedSource;
          if (Object.keys(updates).length > 0) await supabase.from("leads").update(updates).eq("id", leadId);
        }
      }
    }

    if (trackingCode && leadId) {
      await supabase.from("tracking_clicks").update({ lead_id: leadId, matched_at: new Date().toISOString() })
        .eq("tracking_code", trackingCode).is("lead_id", null);
    }

    // Deduplicate
    if (messageIdExternal) {
      const { data: existingMsg } = await supabase.from("whatsapp_messages").select("id")
        .eq("message_id_external", messageIdExternal).maybeSingle();
      if (existingMsg) {
        return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Store incoming message
    const incomingTimestamp = body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString();
    await supabase.from("whatsapp_messages").insert({
      company_id: companyId, lead_id: leadId || null, phone: cleanPhone,
      message_text: messageText, direction: "incoming", sender_name: senderName,
      message_id_external: messageIdExternal,
      timestamp: incomingTimestamp,
    });

    // AI Auto-Reply with multi-agent support
    if (config.ai_enabled && config.ai_auto_reply && leadId && !existingLead?.bot_disabled) {
      try {
        const leadStatus = existingLead?.status;
        // Bot continues for active phases, stops for completed
        const isCompleted = currentPhase === "completed";
        const isAlreadyHandled = leadStatus && !["new", "contacted", "qualified", "negotiating"].includes(leadStatus);

        if (!isCompleted && !isAlreadyHandled) {
          // Determine effective phase: if agent for current phase is not active, use SDR
          let effectivePhase = currentPhase;
          if (effectivePhase !== "sdr" && !agentConfigs[effectivePhase]?.is_active) {
            effectivePhase = "sdr";
          }

          // 🔒 DEBOUNCE / DEDUPLICAÇÃO POR LEAD
          // Problema: lead manda 2-3 mensagens em rajada ("Oi", "Sim", "tô interessado").
          // Cada webhook dispara uma execução paralela e a Laura responde 3 vezes a mesma coisa.
          //
          // Solução: aguarda 7s para "agrupar" rajada. Antes de chamar a IA, verifica se chegou
          // mensagem MAIS NOVA do lead após esta. Se sim, desiste — a execução mais recente
          // vai responder com o histórico completo (incluindo todas as mensagens da rajada).
          await new Promise((r) => setTimeout(r, 7000));

          const { data: newerMsg } = await supabase.from("whatsapp_messages")
            .select("id, timestamp")
            .eq("company_id", companyId)
            .eq("phone", cleanPhone)
            .eq("direction", "incoming")
            .gt("timestamp", incomingTimestamp)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (newerMsg) {
            console.log(`[debounce] Pulando resposta para ${cleanPhone}: chegou msg mais nova (${newerMsg.timestamp}) após esta (${incomingTimestamp}). A execução mais recente responderá.`);
            return new Response(
              JSON.stringify({ ok: true, lead_id: leadId, debounced: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const { data: leadData } = await supabase.from("leads").select("name").eq("id", leadId).single();
          const currentLeadName = leadData?.name || senderName || undefined;

          // Lê as últimas 30 mensagens (mesmo tamanho usado em process-cadence) para garantir
          // que a IA tenha contexto completo da conversa antes de responder com coerência.
          const { data: recentMsgs } = await supabase.from("whatsapp_messages")
            .select("message_text, direction").eq("company_id", companyId)
            .eq("phone", cleanPhone).order("timestamp", { ascending: false }).limit(30);

          const history = (recentMsgs || []).reverse().map((m: any) => ({
            role: m.direction === "incoming" ? "user" : "assistant",
            content: m.message_text || "",
          }));

          const aiReply = await handleAgentPhase(
            effectivePhase, config, agentConfigs, history,
            companyId, leadId, supabase, currentLeadName, cleanPhone
          );

          const SERVER_URL = "https://ziondigital.uazapi.com";
          const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
          const sendHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (ADMIN_TOKEN) sendHeaders["admintoken"] = ADMIN_TOKEN;

          const instanceParam = encodeURIComponent(config.zapi_instance_id);
          const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);
          const sendUrl = `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`;

          if (aiReply) {
            const splitMessages = splitIntoNaturalMessages(aiReply);
            console.log(`[${effectivePhase}] Sending ${splitMessages.length} message(s) to:`, cleanPhone);

            for (let i = 0; i < splitMessages.length; i++) {
              const chunk = splitMessages[i].trim();
              if (!chunk) continue;

              // Delay aleatório entre 4 e 8 segundos antes de cada mensagem (humaniza o bot)
              const delayMs = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
              console.log(`[${effectivePhase}] Aguardando ${delayMs}ms antes de enviar msg ${i + 1}/${splitMessages.length}`);
              await new Promise((r) => setTimeout(r, delayMs));

              const sendResponse = await fetch(sendUrl, {
                method: "POST", headers: sendHeaders,
                body: JSON.stringify({ number: cleanPhone, text: chunk }),
              });

              if (sendResponse.ok) {
                const sendResult = await sendResponse.json();
                await supabase.from("whatsapp_messages").insert({
                  company_id: companyId, lead_id: leadId, phone: cleanPhone,
                  message_text: chunk, direction: "outgoing", sender_name: "IA",
                  message_id_external: sendResult.messageId || sendResult.key?.id || null,
                  timestamp: new Date().toISOString(),
                });
              } else {
                console.error("Failed to send AI reply:", sendResponse.status, await sendResponse.text());
              }
            }
            // Bot acabou de responder → reagenda cadência baseada em agora.
            // Se o lead ficar 30+ min sem responder, dispara o 1º Follow-UP.
            if (leadId) {
              await enrollInCadence(supabase, companyId, leadId, cleanPhone);
            }
          } else {
            // 🆘 FALLBACK: IA falhou (timeout, rate-limit, loop sem texto). Envia ponte humana
            // pra não deixar o lead em silêncio + alerta o gerente.
            console.error(`[${effectivePhase}] AI returned null for lead ${leadId}. Sending fallback message + alerting manager.`);
            const fallbackText = "Deixa eu olhar isso aqui com calma e já te respondo, tá bom? 🙏";
            try {
              const fbResp = await fetch(sendUrl, {
                method: "POST", headers: sendHeaders,
                body: JSON.stringify({ number: cleanPhone, text: fallbackText }),
              });
              if (fbResp.ok) {
                const fbResult = await fbResp.json();
                await supabase.from("whatsapp_messages").insert({
                  company_id: companyId, lead_id: leadId, phone: cleanPhone,
                  message_text: fallbackText, direction: "outgoing", sender_name: "IA (fallback)",
                  message_id_external: fbResult.messageId || fbResult.key?.id || null,
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (fbErr) {
              console.error("Fallback message send error:", fbErr);
            }

            // Mesmo no fallback, reagenda cadência: bot enviou algo, relógio reinicia.
            if (leadId) {
              await enrollInCadence(supabase, companyId, leadId, cleanPhone);
            }

            // Alerta gerente
            if (config.alert_whatsapp) {
              try {
                const alertPhone = String(config.alert_whatsapp).replace(/\D/g, "");
                const lastMsg = history.length > 0 ? history[history.length - 1].content : "(sem texto)";
                const alertText = `⚠️ *Lead sem resposta da IA*\n\n👤 ${currentLeadName || "Lead"}\n📱 ${cleanPhone}\n\n💬 Última msg do lead:\n_"${String(lastMsg).substring(0, 300)}"_\n\nA IA não conseguiu responder. Por favor assumir manualmente.`;
                await fetch(sendUrl.replace(`token=${tokenParam}`, `token=${tokenParam}`), {
                  method: "POST", headers: sendHeaders,
                  body: JSON.stringify({ number: alertPhone, text: alertText }),
                });
              } catch (alertErr) {
                console.error("Alert manager error:", alertErr);
              }
            }
          }
        }
      } catch (aiError) {
        console.error("AI auto-reply error:", aiError);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, lead_id: leadId, new_lead: !existingLead, tracking_code: trackingCode, agent_phase: currentPhase }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = getErrorMessage(error, "Unknown error");
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

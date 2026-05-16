import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";
import { isBrazilianHolidayStr } from "../_shared/holidays.ts";
import { webhookCorsHeaders as corsHeaders } from "../_shared/cors.ts";
import { log } from "../_shared/logger.ts";


// ====== PROMPT BUILDERS ======
function buildSDRPrompt(
  config: any,
  leadName: string | undefined,
  offices: any[] = [],
  flowsBlock: string = "",
  triageBlock: string = "",
  timezone: string = "America/Sao_Paulo",
): string {
  const company = config.companies;
  const officeName = config.office_name || company?.name || "o escritório";
  const customPrompt = (config.ai_prompt || "").trim();
  const botName = company?.bot_name || "Laura";
  const botRole = company?.bot_role_description || "atendente virtual";

  const lostBlock = `\n[TRAVA: DESISTÊNCIA] Se manifestar desinteresse ('não quero', 'resolvi'), chame mark_lead_lost e despeça-se.`;

  if (customPrompt.startsWith("Você é")) {
    return customPrompt + lostBlock + (flowsBlock ? `\n[FLUXOS]\n${flowsBlock}` : "") + (triageBlock ? `\n[TRIAGEM]\n${triageBlock}` : "");
  }

  const activeOffices = (offices || []).filter((o: any) => o && o.is_active !== false);
  const officesCount = activeOffices.length;
  
  let modalidadeBlock: string;
  if (officesCount === 0) {
    modalidadeBlock = "Atendimento 100% ONLINE. Não ofereça presencial.";
  } else {
    const list = activeOffices.map((o: any) => `- ${o.name}: ${o.address}`).join("\n");
    modalidadeBlock = `Ofereça ONLINE ou PRESENCIAL nas unidades:\n${list}`;
  }

  const nowBR = getNowBrasilia(timezone);
  const today = `${String(nowBR.getDate()).padStart(2, "0")}/${String(nowBR.getMonth() + 1).padStart(2, "0")}/${nowBR.getFullYear()}`;

  return `Você é ${botName}, ${botRole} de ${officeName}.
[IDENTIDADE] Tom: ${config.communication_tone || "moderado"}. Emojis leves. Frases curtas. 1 pergunta por vez. Nunca diga que é robô.
[REGRAS CRÍTICAS] 
1. 🚫 PROIBIDO pedir CPF/RG/Senha INSS.
2. 🚫 NÃO agende antes de qualificar (perguntas P1, P2, P3).
3. 🚫 Valores: diga que a 1ª conversa é GRATUITA.
4. Data de hoje: ${today}. Não use anos passados. Use horários de check_availability.
[FLUXO]
1. Peça o NOME (se não souber).
2. APÓS o nome: Você DEVE perguntar imediatamente: "Prazer! Você já é nosso cliente ou precisa de ajuda com um caso novo? 😊". 
⚠️ EXCEÇÃO: Se o lead JÁ mencionou na primeira mensagem que quer saber de "processo", "andamento" ou "meu caso", PULE a pergunta acima e vá direto para o Passo 3.
3. Se cliente ou andamento: use lookup_existing_client (pede Nome+CPF). NÃO ofereça novo serviço.
4. Se novo: peça para explicar o caso e faça qualificação.
5. Pós-qualificação: Ofereça agendamento gratuito.
6. Agendamento: Pergunte turno -> check_availability -> Ofereça 2 opções -> Se aceitar, peça NOME COMPLETO -> chame register_client_name e schedule_appointment.
[MODALIDADE] ${modalidadeBlock}
${lostBlock}${flowsBlock ? `\n[FLUXOS]\n${flowsBlock}` : ""}${triageBlock ? `\n[TRIAGEM]\n${triageBlock}` : ""}${company?.decision_rules ? `\n[REGRAS]\n${company.decision_rules}` : ""}${customPrompt ? `\n[CUSTOM]\n${customPrompt}` : ""}
Responda em PT-BR.`;
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
function getNowBrasilia(timeZone: string = "America/Sao_Paulo"): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone,
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
  if (h === 24) h = 0;
  const mi = Number(get("minute"));
  const s = Number(get("second"));
  return new Date(y, mo - 1, d, h, mi, s);
}

function getTodayBrasilia(timeZone: string = "America/Sao_Paulo"): string {
  const b = getNowBrasilia(timeZone);
  return `${b.getFullYear()}-${String(b.getMonth() + 1).padStart(2, "0")}-${String(b.getDate()).padStart(2, "0")}`;
}

async function getAvailableSlots(supabase: any, companyId: string, dateStr: string, timezone: string = "America/Sao_Paulo"): Promise<{ date: string; dayName: string; slots: string[] }> {
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  const date = new Date(dateStr + "T12:00:00Z");
  const dayOfWeek = date.getUTCDay();
  const dayKey = dayKeys[dayOfWeek];
  const dayName = dayNames[dayOfWeek];

  // 🇧🇷 Feriado nacional: não oferecer agendamento
  if (isBrazilianHolidayStr(dateStr)) {
    return { date: formatDateDMY(dateStr), dayName, slots: [] };
  }

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

  const todayBR = getTodayBrasilia(timezone);
  if (dateStr === todayBR) {
    const nowBR = getNowBrasilia(timezone);
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
        timeZone: timezone,
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

function getNextAvailableDays(count: number, includeToday: boolean = true, timezone: string = "America/Sao_Paulo"): string[] {
  const days: string[] = [];
  const nowBR = getNowBrasilia(timezone);
  let d = includeToday ? new Date(nowBR) : new Date(nowBR.getTime() + 86400000);
  while (days.length < count) {
    const dow = d.getDay();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dow >= 1 && dow <= 5 && !isBrazilianHolidayStr(dateStr)) {
      days.push(dateStr);
    }
    d = new Date(d.getTime() + 86400000);
  }
  return days;
}

/**
 * Sanitiza data passada pela IA: se vier no passado, num ano errado, ou inválida,
 * substitui pelo próximo dia útil. Aceita YYYY-MM-DD ou DD/MM/YYYY.
 */
function sanitizeDate(rawDate: string | undefined | null, timezone: string = "America/Sao_Paulo"): string {
  const fallback = getNextAvailableDays(1, false, timezone)[0];
  if (!rawDate) return fallback;
  let s = String(rawDate).trim();
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) s = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  const [y, m, d] = s.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (isNaN(parsed.getTime())) return fallback;
  const nowBR = getNowBrasilia(timezone);
  const todayMid = new Date(nowBR.getFullYear(), nowBR.getMonth(), nowBR.getDate()).getTime();
  const oneYearAhead = todayMid + 365 * 86400000;
  const parsedMid = parsed.getTime();
  if (parsedMid < todayMid || parsedMid > oneYearAhead) return fallback;
  // Se a data cair em feriado nacional ou fim de semana, avança para próximo dia útil
  const dow = parsed.getDay();
  if (dow === 0 || dow === 6 || isBrazilianHolidayStr(s)) return fallback;
  return s;
}

// ====== VALIDATORS ======
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
  },
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
  },
  {
    type: "function",
    function: {
      name: "mark_lead_lost",
      description:
        "Marca o lead como PERDIDO e ENCERRA o atendimento automaticamente. Use SEMPRE que o lead manifestar desinteresse, desistência ou recusa explícita ou implícita, como por exemplo: 'não quero mais', 'não tenho interesse', 'desisti', 'vou querer não', 'pode parar', 'não preciso mais', 'mudei de ideia', 'já resolvi', 'já contratei outro advogado', 'não vou seguir', 'obrigado, mas não', 'estou só pesquisando' ou qualquer variação semelhante. Após chamar esta tool, envie UMA única mensagem curta de despedida cordial (sem perguntar mais nada, sem oferecer ajuda futura como pergunta) e o bot ficará desativado para este lead.",
      parameters: {
        type: "object",
        properties: {
          message_to_lead: {
            type: "string",
            description:
              "Mensagem curta e cordial de despedida (1 frase). Ex: 'Sem problemas, fico à disposição se precisar 🙂' ou 'Tudo bem, agradeço o contato. Tenha um ótimo dia!'"
          },
          reason: {
            type: "string",
            description: "Motivo curto da perda. Ex: 'Lead disse que não quer mais', 'Já contratou outro advogado', 'Mudou de ideia'."
          }
        },
        required: ["message_to_lead", "reason"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "lookup_existing_client",
      description: "Verifica se o cliente já existe no sistema CRM ou se possui processos sendo monitorados pelo escritório. Peça o NOME COMPLETO e o CPF do cliente antes de chamar. Esta tool notifica o advogado responsável e desativa o bot para o contato.",
      parameters: {
        type: "object",
        properties: {
          client_full_name: { type: "string", description: "Nome completo do cliente" },
          client_cpf: { type: "string", description: "CPF do cliente (opcional, mas recomendado)" },
          subject: { type: "string", enum: ["andamento_processo", "outro"], description: "Assunto do contato" },
          message_summary: { type: "string", description: "Breve resumo do que o cliente deseja" }
        },
        required: ["client_full_name", "subject"],
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
  const cleanedLines = text
    .split(/\r?\n/)
    .filter((line) => !leakPatterns.some((re) => re.test(line)));
  const cleaned = cleanedLines.join("\n").trim();
  if (cleaned.length < Math.min(20, text.length * 0.3)) return null;
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
  cleanPhone?: string,
  flowsBlock?: string,
  triageBlock?: string,
  timezone: string = "America/Sao_Paulo",
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  let systemPrompt: string;
  let tools: any[];

  // 🏢 Buscar offices para validação e prompts
  const { data: companyOffices, error: officesError } = await supabase
    .from("company_offices")
    .select("name, address, complement, reference_point, maps_url, is_active, position")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (officesError) console.error("[SDR] Erro ao buscar offices:", officesError.message);

  if (phase === "document_collector") {
    const agentCfg = agentConfigs["document_collector"];
    const requiredDocs = agentCfg?.required_documents || [];
    systemPrompt = buildDocumentCollectorPrompt(agentCfg, config, leadName, requiredDocs);
    tools = documentCollectorTools;
  } else if (phase === "viability_analyzer") {
    const agentCfg = agentConfigs["viability_analyzer"];
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
    systemPrompt = buildSDRPrompt(config, leadName, companyOffices || [], flowsBlock || "", triageBlock || "", timezone);
    tools = sdrTools;
    if (config?.debug_mode) {
      console.log("[SDR PROMPT DEBUG]", JSON.stringify({
        companyId,
        flowsCount: flowsBlock ? flowsBlock.split("\n\n").length : 0,
        hasTriageOptions: !!triageBlock,
        promptLength: systemPrompt.length,
      }));
    }
  }

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
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt + coherenceGuard },
      ...conversationHistory,
    ];

    let replyText = "";
    let qualificationResult: any = null;
    let shouldSchedule = false;
    let maxIterations = 3;

    while (maxIterations > 0) {
      maxIterations--;

      // 🔁 Retry: 1 tentativa extra em caso de 429/5xx ou resposta vazia
      let aiResponse: Response | null = null;
      let aiData: any = null;
      let message: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          const errBody = await aiResponse.text();
          console.error(`[handleAgentPhase] AI gateway error (attempt ${attempt}/2) phase=${phase} lead=${leadId} status=${aiResponse.status}: ${errBody.slice(0, 500)}`);
          if (attempt < 2 && (aiResponse.status === 429 || aiResponse.status >= 500)) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          return null;
        }

        aiData = await aiResponse.json();
        message = aiData.choices?.[0]?.message;
        if (message) break;

        console.error(`[handleAgentPhase] AI returned empty message (attempt ${attempt}/2) phase=${phase} lead=${leadId}: ${JSON.stringify(aiData).slice(0, 500)}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
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
          const dateToCheck = sanitizeDate(args.date, timezone);
          const period = String(args.period || "qualquer").toLowerCase();
          const availability = await getAvailableSlots(supabase, companyId, dateToCheck, timezone);

          const filterByPeriod = (slots: string[]) => {
            if (period === "manha") return slots.filter(s => parseInt(s.split(":")[0], 10) < 12);
            if (period === "tarde") return slots.filter(s => parseInt(s.split(":")[0], 10) >= 12);
            return slots;
          };

          let filteredSlots = filterByPeriod(availability.slots);
          if (filteredSlots.length === 0 && availability.slots.length > 0) filteredSlots = availability.slots;

          if (filteredSlots.length === 0) {
            const nextDays = getNextAvailableDays(3, true, timezone);
            let firstAlt: { date: string; dayName: string; slot: string } | null = null;
            for (const nd of nextDays) {
              if (nd === dateToCheck) continue;
              const alt = await getAvailableSlots(supabase, companyId, nd, timezone);
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

        if (fnName === "decide_lead") {
          // 🛡️ Prevenção de qualificação duplicada: se o lead já tiver um score definitivo e não for SDR, evitamos re-classificar
          const { data: existingLead } = await supabase.from("leads").select("lead_score, bot_agent_phase").eq("id", leadId).maybeSingle();
          if (existingLead?.lead_score && existingLead?.bot_agent_phase && existingLead.bot_agent_phase !== "sdr") {
            toolResult = { success: true, classification: existingLead.lead_score, note: "O lead já foi classificado anteriormente." };
          } else {
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
            if (toolResult?.classification) {
              const classification = toolResult.classification;
              qualificationResult = {
                status:
                  classification === "quente" ? "qualified"
                  : classification === "frio" ? "not_qualified"
                  : "needs_more_info",
                reason: toolResult.reason || "",
                summary: `Decision Engine: ${classification} (score ${toolResult.score})`,
                lead_score: classification === "invalido" ? "frio" : classification,
              };

              // 🔔 Notificação por Área (Nicho)
              // Se for lead quente ou morno, notifica o advogado responsável
              if ((classification === "quente" || classification === "morno") && args.niche) {
                try {
                  const { data: nicheAlert } = await supabase
                    .from("company_niche_alerts")
                    .select("whatsapp, lawyer_name")
                    .eq("company_id", companyId)
                    .eq("niche", args.niche)
                    .eq("is_active", true)
                    .maybeSingle();

                  if (nicheAlert?.whatsapp) {
                    const { data: leadInfo } = await supabase.from("leads").select("name").eq("id", leadId).single();
                    const leadNameDisplay = leadInfo?.name || "Lead Novo";
                    
                    const SERVER_URL = "https://ziondigital.uazapi.com";
                    const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
                    const alertPhone = String(nicheAlert.whatsapp).replace(/\D/g, "");
                    const instanceId = config.zapi_instance_id;
                    const tokenParam = encodeURIComponent(config.zapi_token || instanceId || "");
                    const instanceParam = encodeURIComponent(instanceId || "");
                    
                    const alertMessage = `🔥 *Novo Lead Qualificado (${args.niche})*\n\n👤 Cliente: ${leadNameDisplay}\n📈 Score: ${classification.toUpperCase()}\n⚖️ Área: ${args.niche}\n📝 Motivo: ${toolResult.reason || "N/A"}\n\n_O lead acaba de ser classificado como ${classification} pelo Decision Engine._`;

                    const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
                    if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;

                    await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                      method: "POST", headers: alertHeaders,
                      body: JSON.stringify({ number: alertPhone, text: alertMessage }),
                    });
                  }
                } catch (e) {
                  console.error("Niche alert notification error:", e);
                }
              }
            }
            } catch (e) {
              console.error("decide_lead error:", e);
              toolResult = { error: "Falha ao chamar decision-engine" };
            }
          }
        }

        if (fnName === "schedule_appointment") {
          const pendingItems: string[] = [];
          let leadCurrentName = "";
          if (leadId) {
            const { data: leadCheck } = await supabase
              .from("leads")
              .select("name")
              .eq("id", leadId)
              .maybeSingle();
            leadCurrentName = leadCheck?.name || "";
            if (!isValidFullName(leadCurrentName)) pendingItems.push("Nome completo");
          }
          const pendingWarning = pendingItems.length > 0 ? `${pendingItems.join(" + ")} pendente(s)` : null;

          // 🛑 BLOQUEIO: nunca agendar sem NOME COMPLETO. Força o bot a pedir antes.
          if (!isValidFullName(leadCurrentName)) {
            toolResult = {
              success: false,
              error: "NOME_COMPLETO_OBRIGATORIO",
              instruction: "Antes de agendar, peça o NOME COMPLETO do lead (nome + sobrenome, mínimo 3 palavras). Use exatamente: \"Perfeito 🙂 Pra já deixar tudo organizado aqui pra equipe, me passa o seu *nome completo*, por favor?\". Quando receber, chame register_client_name e SÓ DEPOIS chame schedule_appointment de novo."
            };
            // não seta shouldSchedule, não cria reminder — deixa o loop seguir e o modelo gerar a pergunta do nome
          } else {

          shouldSchedule = true;
          // Mensagem padronizada de confirmação (data/hora/nome) — substitui qualquer texto do modelo
          const _confirmDate = sanitizeDate(args.date, timezone);
          const _confirmTime = args.time || "10:00";
          const _confirmDateBR = formatDateDMY(_confirmDate);
          replyText = `Perfeito, ${leadCurrentName.split(" ")[0]} 🙂\n\nAgendamento confirmado:\n📅 ${_confirmDateBR}\n⏰ ${_confirmTime}\n👤 ${leadCurrentName}\n\nA equipe já entra em contato com você no horário marcado. Qualquer coisa, é só me chamar por aqui 💙`;

          if (leadId) {
            const appointmentDate = sanitizeDate(args.date, timezone);
            const appointmentTime = args.time || "10:00";
            const dueAt = `${appointmentDate}T${appointmentTime}:00-03:00`;
            let modality = args.modality || "online";
            let unitName = args.unit || "";

            // 🛡️ Validação de Modality e Unit (evita alucinação de endereços)
            const activeOfficesList = companyOffices || [];
            const hasOffices = activeOfficesList.length > 0;

            if (!hasOffices) {
              modality = "online";
              unitName = "Online";
            } else if (modality === "presencial") {
              const matchedOffice = activeOfficesList.find((o: any) => o.name.toLowerCase().trim() === unitName.toLowerCase().trim());
              if (matchedOffice) {
                unitName = matchedOffice.name;
              } else {
                unitName = activeOfficesList[0].name;
              }
            } else {
              modality = "online";
              unitName = "Online";
            }

            const { data: leadData } = await supabase.from("leads").select("name, phone, whatsapp").eq("id", leadId).single();
            const lName = leadData?.name || "Lead";
            const leadPhone = leadData?.whatsapp || leadData?.phone || cleanPhone || "Não informado";

            // 🛡️ Anti-duplicata: não cria 2 reminders pro mesmo lead no mesmo horário (±5min)
            const dueAtMs = new Date(dueAt).getTime();
            const fromIso = new Date(dueAtMs - 5 * 60 * 1000).toISOString();
            const toIso = new Date(dueAtMs + 5 * 60 * 1000).toISOString();
            const { data: existingReminder } = await supabase
              .from("lead_reminders")
              .select("id")
              .eq("lead_id", leadId)
              .eq("reminder_type", "meeting")
              .gte("due_at", fromIso)
              .lte("due_at", toIso)
              .maybeSingle();

            if (!existingReminder) {
              await supabase.from("lead_reminders").insert({
                lead_id: leadId, company_id: companyId, created_by: "00000000-0000-0000-0000-000000000000",
                title: `📅 Consulta ${modality === "presencial" ? "presencial" : "online"}: ${lName}`,
                description: `${args.summary || `Agendamento automático via bot IA (${modality})${unitName ? ` - Unidade: ${unitName}` : ""}`}`,
                reminder_type: "meeting", due_at: dueAt,
              });
            } else {
              console.log(`[SCHEDULE] Skipped duplicate reminder for lead ${leadId} at ${dueAt}`);
            }

            await supabase.from("leads").update({ pending_data_warning: pendingWarning }).eq("id", leadId);

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

            const docAgent = agentConfigs["document_collector"];
            if (docAgent?.is_active) {
              await supabase.from("leads").update({ bot_agent_phase: "document_collector" }).eq("id", leadId);
              console.log(`Lead ${leadId} advanced to document_collector phase`);
            }
          }
          toolResult = { success: true, message: "Agendamento criado com sucesso", pending: null };
          }
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
          replyText = args.message_to_lead || "Contrato finalizado! 🎉";
          const updates: any = { contract_status: "signed", bot_agent_phase: "completed" };
          if (args.client_full_name) updates.name = args.client_full_name;
          if (args.contract_value) {
            updates.value = args.contract_value;
            updates.honorarios_estimados = args.contract_value;
          }
          await supabase.from("leads").update(updates).eq("id", leadId);

          const { data: commissionCfg } = await supabase
            .from("commission_settings")
            .select("commission_percentage")
            .eq("company_id", companyId)
            .maybeSingle();

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

          if (config.alert_whatsapp) {
            try {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const alertPhone = String(config.alert_whatsapp).replace(/\D/g, "");
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
          if (leadId) {
            await supabase.from("leads").update({ bot_disabled: true, is_unread: true }).eq("id", leadId);
          }
          toolResult = { success: true };
        }

        if (fnName === "mark_lead_lost") {
          replyText = args.message_to_lead || "Sem problemas, agradeço o contato. Fico à disposição se precisar! 🙂";
          const reason = args.reason || "Lead manifestou desinteresse";
          qualificationResult = {
            status: "not_qualified",
            reason,
            summary: `Lead encerrado pelo bot (mark_lead_lost): ${reason}`,
            lead_score: "frio",
          };
          // Desativa o bot para este lead — evita novas mensagens automáticas
          if (leadId) {
            try {
              await supabase.from("leads").update({ bot_disabled: true }).eq("id", leadId);
            } catch (e) { console.error("mark_lead_lost: failed disabling bot", e); }
          }
          toolResult = { success: true, lead_marked_lost: true };
        }


        if (fnName === "lookup_existing_client") {
          const { client_full_name, client_cpf, subject, message_summary } = args;
          
          // 1. Tentar localizar o lead/cliente no CRM
          const { data: leadClient } = await supabase
            .rpc("find_client_by_name", { 
              _company_id: companyId, 
              _search_name: String(client_full_name).trim() 
            })
            .maybeSingle();

          // 2. Tentar localizar processos monitorados e pegar movimentações recentes
          let monitoredProcesses: any[] = [];
          if (client_cpf) {
            const cleanCpf = client_cpf.replace(/\D/g, "");
            const { data: procs } = await supabase
              .from("monitored_processes")
              .select(`
                numero_cnj, 
                tribunal_sigla, 
                data_ultima_movimentacao, 
                polo_ativo, 
                polo_passivo,
                status_predito,
                case_movements (
                  descricao,
                  data_movimentacao
                )
              `)
              .eq("company_id", companyId)
              .eq("client_cpf", cleanCpf)
              .eq("is_active", true);
            
            // Pega apenas os 2 processos mais relevantes/recentes para não estourar o contexto
            monitoredProcesses = (procs || []).map(p => ({
              ...p,
              recent_movements: (p.case_movements || [])
                .sort((a: any, b: any) => new Date(b.data_movimentacao).getTime() - new Date(a.data_movimentacao).getTime())
                .slice(0, 2)
            }));
          }

          let lastSummary = "";
          if (leadClient) {
            const { data: summary } = await supabase
              .from("lead_summaries")
              .select("summary_text")
              .eq("lead_id", leadClient.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            lastSummary = summary?.summary_text || "";
          }

          // Notifica advogado responsável
          if (config.alert_whatsapp) {
            try {
              const SERVER_URL = "https://ziondigital.uazapi.com";
              const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
              const alertPhone = String(config.client_support_responsible_phone || config.alert_whatsapp).replace(/\D/g, "");
              const instanceId = config.zapi_instance_id;
              const companyWhatsapp = String(config.whatsapp || "").replace(/\D/g, "");
              
              const processesText = monitoredProcesses.length > 0 
                ? `\n⚖️ *Processos Monitorados (${monitoredProcesses.length}):*\n` + monitoredProcesses.map(p => `- ${p.numero_cnj} (${p.tribunal_sigla})`).join("\n")
                : "\n⚠️ Nenhum processo monitorado por CPF encontrado.";

              const alertMessage = `👥 *Atendimento a Cliente Existente*\n\n👤 Cliente: ${client_full_name || leadClient?.name || "N/A"}\n📝 Assunto: ${subject === "andamento_processo" ? "Andamento de Processo" : "Outro Assunto"}\n💬 Resumo: ${message_summary || "(sem resumo)"}\n\n${leadClient ? "✅ Localizado no CRM" : "⚠️ Não localizado no CRM"}${processesText}\n\n_O bot foi desativado para este contato._`;
              
              const alertHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (ADMIN_TOKEN) alertHeaders["admintoken"] = ADMIN_TOKEN;
              const instanceParam = encodeURIComponent(instanceId || "");
              const tokenParam = encodeURIComponent(config.zapi_token || instanceId || "");
              
              const finalRecipient = alertPhone === companyWhatsapp ? "me" : alertPhone;

              await fetch(`${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`, {
                method: "POST", headers: alertHeaders,
                body: JSON.stringify({ number: finalRecipient, text: alertMessage }),
              });

              if (alertPhone === String(config.whatsapp || "").replace(/\D/g, "")) {
                await fetch(`${SERVER_URL}/chat/unread?instance=${instanceParam}&token=${tokenParam}`, {
                  method: "POST", headers: alertHeaders,
                  body: JSON.stringify({ number: cleanPhone, unread: true }),
                });
              }
            } catch (e) { console.error("Client lookup alert error:", e); }
          }

          // Desativa o bot para o lead e marca como não lida no CRM
          if (leadId) {
            await supabase.from("leads").update({ bot_disabled: true, is_unread: true }).eq("id", leadId);
          }

          toolResult = { 
            success: true, 
            found_in_crm: !!leadClient,
            monitored_processes_found: monitoredProcesses.length,
            processes_info: monitoredProcesses.map(p => ({
              numero: p.numero_cnj,
              tribunal: p.tribunal_sigla,
              ultima_movimentacao: p.data_ultima_movimentacao,
              resumo_movimentacoes: p.recent_movements.map((m: any) => m.descricao).join(" | ")
            })),
            instruction: "Se encontrou processos, faça um resumo MUITO SIMPLES e amigável da última movimentação encontrada para o cliente. Diga que o Dr. Daniel e a equipe estão acompanhando tudo de perto e que o advogado responsável já foi avisado para dar um retorno detalhado em breve. Seja acolhedor e passe segurança."
          };
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

// ====== CADENCE ======
async function enrollInCadence(supabase: any, companyId: string, leadId: string, phone: string) {
  await supabase.from("cadence_messages").update({ status: "cancelled" })
    .eq("lead_id", leadId).eq("status", "pending");

  const delayMinutes = await getCadenceDelayForStep(supabase, companyId, 1);
  if (delayMinutes === null) return;

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

async function getCadenceDelayForStep(
  supabase: any,
  companyId: string,
  stepNumber: number,
): Promise<number | null> {
  const defaults: Record<number, number> = {
    1: 30, 2: 60 * 24, 3: 60 * 24, 4: 60 * 24, 5: 60 * 24,
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

// ====== MESSAGE SPLITTER ======
// Normaliza texto para comparação de similaridade (remove acentos/pontuação/case)
function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Similaridade simples baseada em palavras compartilhadas (Jaccard)
function similarityRatio(a: string, b: string): number {
  const wa = new Set(normalizeForCompare(a).split(" ").filter(w => w.length > 2));
  const wb = new Set(normalizeForCompare(b).split(" ").filter(w => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return inter / union;
}

// Remove chunks muito parecidos entre si (>= 65% similaridade) mantendo o primeiro
function dedupeChunks(chunks: string[]): string[] {
  const out: string[] = [];
  for (const c of chunks) {
    const norm = normalizeForCompare(c);
    if (!norm) continue;
    const isDup = out.some(prev => {
      const pNorm = normalizeForCompare(prev);
      if (pNorm === norm) return true;
      // Frases curtas viram duplicata se compartilham >70% das palavras
      if (similarityRatio(prev, c) >= 0.65) return true;
      return false;
    });
    if (!isDup) out.push(c);
  }
  return out;
}

function splitIntoNaturalMessages(text: string): string[] {
  if (!text) return [text];
  const trimmed = text.trim();
  if (!trimmed) return [trimmed];

  const paragraphs = trimmed.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const rawSentences: string[] = [];

  for (const para of paragraphs) {
    const matches = para.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g);
    if (!matches) { rawSentences.push(para); continue; }
    for (const m of matches) {
      const s = m.trim();
      if (s) rawSentences.push(s);
    }
  }

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
      flush();
      messages.push(sentence);
      continue;
    }

    if (!buffer) {
      buffer = sentence;
      continue;
    }

    if (isShort && buffer.length + sentence.length + 1 <= 140) {
      buffer = `${buffer} ${sentence}`;
    } else {
      flush();
      buffer = sentence;
    }
  }
  flush();

  const final = messages.length > 0 ? dedupeChunks(messages) : [trimmed];
  return final;
}

// ====== MAIN HANDLER ======
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expectedToken = Deno.env.get("ZAPI_WEBHOOK_SECRET");
    if (expectedToken) {
      const received = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
      if (received !== expectedToken && received !== `Bearer ${expectedToken}`) {
        log("warn", "zapi-webhook", "Unauthorized attempt");
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }
    }

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
      .select(`
        id, company_id, zapi_instance_id, zapi_token, ai_enabled, ai_prompt, ai_auto_reply, 
        office_name, practice_area, communication_tone, scheduling_link, consultation_duration, 
        target_audience, alert_whatsapp, triage_options, debug_mode,
        companies (name, bot_name, bot_role_description, timezone, decision_rules, billing_model)
      `)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ error: "Company not configured" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // FIX 1: buscar fluxos ativos uma única vez por request
    const { data: flows, error: flowsError } = await supabase
      .from("company_bot_flows")
      .select("flow_key, label, custom_prompt_block, position")
      .eq("company_id", companyId)
      .eq("enabled", true)
      .order("position", { ascending: true });
    if (flowsError) console.error("[flows] Erro ao buscar fluxos:", flowsError.message);
    const flowsBlock = flows?.length
      ? flows.map((f: any) => (f.custom_prompt_block?.trim() || "").trim()).filter(Boolean).join("\n\n")
      : "";

    // FIX 2: montar bloco de triage_options uma única vez por request
    const triageOptions = (config as any).triage_options || [];
    const triageBlock = Array.isArray(triageOptions) && triageOptions.length
      ? `Qualifique o lead APENAS se ele mencionar uma das situações abaixo:\n` +
        triageOptions
          .map((t: any) => `- ${t.label || t.name || ""}${t.keywords?.length ? ` (palavras-chave: ${t.keywords.join(", ")})` : ""}`)
          .join("\n") +
        `\n\nSe a demanda NÃO bater com nenhuma dessas situações, classifique como "not_qualified" e encerre com empatia.\nSe bater, classifique como "qualified" e convide para a reunião.`
      : "";

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
    const isUaZapiSentMessage = body.EventType === "messages" && body.message && body.message.fromMe;
    const isLegacyMessage = body.type === "ReceivedCallback";

    // Handle human intervention from phone (fromMe = true)
    if (isUaZapiSentMessage) {
      const sentPhone = (body.message.phone || body.phone || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
      if (sentPhone) {
        const cleanSentPhone = sentPhone.replace(/\D/g, "");
        const messageId = body.message.messageId || body.message.id;
        
        // 🛡️ Anti-race condition: check if we just sent an IA message to this phone in the last 10s
        const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
        const { data: recentBotMsg } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("phone", cleanSentPhone)
          .eq("direction", "outgoing")
          .ilike("sender_name", "IA%")
          .gt("created_at", tenSecondsAgo)
          .limit(1)
          .maybeSingle();

        // If no recent bot message found, it's human intervention
        if (!recentBotMsg) {
          console.log(`[human-intervention] Detected manual message from phone for ${cleanSentPhone}, disabling bot.`);
          await supabase.from("leads")
            .update({ bot_disabled: true, is_unread: false })
            .or(`phone.eq.${cleanSentPhone},whatsapp.eq.${cleanSentPhone}`);
        }
      }
      
      return new Response(JSON.stringify({ ok: true, type: "sent_message_handled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    let audioMetadata: { wasAudio: boolean; duration: number | null; isShort: boolean; isMinimal: boolean } | null = null;
    let messageType: string = "text";

    if (isUaZapiMessage) {
      const msg = body.message;
      phone = msg.sender_pn || msg.chatid || "";
      senderName = msg.senderName || body.chat?.name || body.chat?.wa_contactName || "";
      messageText = msg.text || msg.content || msg.caption || "";
      messageIdExternal = msg.messageid || msg.id || "";
      isGroup = msg.isGroup || false;
      messageType = (msg.type || msg.messageType || "").toString().toLowerCase();
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
    if (audioUrl) {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
          console.error("[audio] OPENAI_API_KEY não configurada");
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
              console.error("[audio] Áudio maior que 25MB");
              messageText = "[áudio muito longo — não transcrito]";
            } else {
              const fd = new FormData();
              fd.append("file", audioBlob, "audio.ogg");
              fd.append("model", "whisper-1");
              fd.append("language", "pt");
              fd.append("response_format", "verbose_json");
              fd.append("prompt", "advogado processo INSS aposentadoria benefício previdenciário trabalhista demissão");
              fd.append("temperature", "0");

              const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${openaiKey}` },
                body: fd,
              });

              if (!whisperResp.ok) {
                const errTxt = await whisperResp.text();
                console.error(`[audio] Whisper falhou ${whisperResp.status}: ${errTxt}`);
                messageText = "[O lead enviou um áudio que não pude entender. Peça educadamente que repita por texto ou envie novamente.]";
              } else {
                const whisperData = await whisperResp.json();
                const transcription = (whisperData.text || "").trim();
                const audioDuration = whisperData.duration || null;
                
                if (transcription) {
                  console.log(`[audio] Transcrição (${transcription.length} chars): ${transcription.substring(0, 120)}...`);
                  messageText = transcription; // SEM prefixo "🎤 [áudio transcrito]:"
                  const wordCount = transcription.split(/\s+/).length;
                  audioMetadata = {
                    wasAudio: true,
                    duration: audioDuration,
                    isShort: audioDuration != null && audioDuration < 5,
                    isMinimal: wordCount <= 3,
                  };
                } else {
                  messageText = "[O lead enviou um áudio silencioso ou inaudível. Pergunte gentilmente se pode repetir.]";
                }
              }
            }
          }
        }
      } catch (audioErr) {
        console.error("[audio] Erro inesperado na transcrição:", audioErr);
        messageText = "[O lead enviou um áudio que não pude entender. Peça educadamente que repita por texto ou envie novamente.]";
      }
    }

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

    // Store incoming message and mark as unread
    const incomingTimestamp = body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString();
    await supabase.from("whatsapp_messages").insert({
      company_id: companyId, lead_id: leadId || null, phone: cleanPhone,
      message_text: messageText, direction: "incoming", sender_name: senderName,
      message_id_external: messageIdExternal,
      timestamp: incomingTimestamp,
    });

    if (leadId) {
      await supabase.from("leads").update({ is_unread: true }).eq("id", leadId);
    }

    // AI Auto-Reply with multi-agent support
    const isPlanCompleto = config.companies?.billing_model === 'plan_completo' || config.companies?.billing_model === 'crm_full' || config.companies?.billing_model === 'ia_only' || config.companies?.billing_model === 'plan_free';
    if (config.ai_enabled && config.ai_auto_reply && leadId && !existingLead?.bot_disabled && isPlanCompleto) {
      try {
        const leadStatus = existingLead?.status;
        const isCompleted = currentPhase === "completed";
        const isAlreadyHandled = leadStatus && !["new", "contacted", "qualified", "negotiating"].includes(leadStatus);

        if (!isCompleted && !isAlreadyHandled) {
          let effectivePhase = currentPhase;
          if (effectivePhase !== "sdr" && !agentConfigs[effectivePhase]?.is_active) {
            effectivePhase = "sdr";
          }

          // Debounce 7s para agrupar rajada
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
            console.log(`[debounce] Pulando resposta para ${cleanPhone}: chegou msg mais nova.`);
            return new Response(
              JSON.stringify({ ok: true, lead_id: leadId, debounced: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const { data: leadData } = await supabase.from("leads").select("name").eq("id", leadId).single();
          const currentLeadName = leadData?.name || senderName || undefined;

          const { data: recentMsgs } = await supabase.from("whatsapp_messages")
            .select("message_text, direction").eq("company_id", companyId)
            .eq("phone", cleanPhone).order("timestamp", { ascending: false }).limit(30);

          const history = (recentMsgs || []).reverse().map((m: any) => ({
            role: m.direction === "incoming" ? "user" : "assistant",
            content: m.message_text || "",
          }));

          // Injetar contexto de áudio no histórico
          if (audioMetadata?.wasAudio && history.length > 0) {
            const lastIdx = history.length - 1;
            if (history[lastIdx].role === "user") {
              const durationNote = audioMetadata.duration
                ? ` (${Math.round(audioMetadata.duration)}s)`
                : "";
              const hint = audioMetadata.isMinimal ? " [resposta curta — seja conciso]" : "";
              history[lastIdx].content = `[interno: msg veio de áudio${durationNote}${hint}] ${history[lastIdx].content}`;
            }
          }

          const aiReply = await handleAgentPhase(
            effectivePhase, config, agentConfigs, history,
            companyId, leadId, supabase, currentLeadName, cleanPhone,
            flowsBlock, triageBlock,
            (config.companies as any)?.timezone || "America/Sao_Paulo"
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

              const delayMs = Math.floor(Math.random() * (8000 - 4000 + 1)) + 4000;
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
            if (leadId) {
              await enrollInCadence(supabase, companyId, leadId, cleanPhone);
            }
          } else {
            console.error(`[${effectivePhase}] AI returned null for lead ${leadId}. Sending fallback.`);
            // 🤖 Fallback inteligente: se for a 1ª interação (sem msg nossa anterior), usa abertura padrão da Laura
            // pra qualificar o lead em vez do texto genérico que mata a conversa.
            const hasPreviousOutgoing = (recentMsgs || []).some((m: any) => m.direction === "outgoing");
            const firstName = (currentLeadName || "").trim().split(/\s+/)[0] || "";
            const fallbackText = hasPreviousOutgoing
              ? "Deixa eu olhar isso aqui com calma e já te respondo, tá bom? 🙏"
              : `Oi${firstName ? `, ${firstName}` : ""}! Tudo bem? 😊 Sou a Laura, aqui da equipe do escritório. Me conta rapidinho o que está acontecendo no seu caso pra eu já te ajudar da melhor forma 🙂`;
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

            if (leadId) {
              await enrollInCadence(supabase, companyId, leadId, cleanPhone);
            }

            if (config.alert_whatsapp) {
              try {
                const alertPhone = String(config.alert_whatsapp).replace(/\D/g, "");
                const lastMsg = history.length > 0 ? history[history.length - 1].content : "(sem texto)";
                const alertText = `⚠️ *Lead sem resposta da IA*\n\n👤 ${currentLeadName || "Lead"}\n📱 ${cleanPhone}\n\n💬 Última msg do lead:\n_"${String(lastMsg).substring(0, 300)}"_\n\nA IA não conseguiu responder. Por favor assumir manualmente.`;
                await fetch(sendUrl, {
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

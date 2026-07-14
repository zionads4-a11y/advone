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
  const customPrompt = (config.ai_prompt || "").trim()
    .replace(/^\s*\d+\.\s*⚠️\s*CONFIRMAR O ASSUNTO:.*$/gmi, "7. ⚠️ IDENTIFICAÇÃO INTERNA DO CASO: identifique o assunto pelo histórico. NÃO confirme o assunto e NÃO peça para contar mais se já houver contexto.")
    .replace(/mín(?:imo|\.)?\s*3\s+palavras/gi, "nome + sobrenome")
    .replace(/mín\.\s*3\s+palavras/gi, "nome + sobrenome");
  const botName = company?.bot_name || "Laura";
  const botRole = company?.bot_role_description || "atendente virtual";

  const lostBlock = `\n[TRAVA: DESISTÊNCIA — REGRA RÍGIDA]
SÓ chame mark_lead_lost quando o lead RECUSAR EXPLICITAMENTE o serviço. Exemplos válidos: 'não quero mais', 'desisti', 'não tenho interesse', 'já contratei outro advogado', 'já resolvi por fora', 'pode parar', 'mudei de ideia e não vou seguir'.
NUNCA chame mark_lead_lost se o lead apenas disser que está ocupado, sem tempo, vai pensar, vai ver depois, está em reunião, dirigindo, no trabalho, ou pedir para falar mais tarde. Frases como 'tô ocupado(a)', 'agora não posso', 'depois te respondo', 'me liga mais tarde', 'tô no serviço', 'vou pensar', 'preciso ver com a família', 'só estou pesquisando preço' → NÃO são desistência. Responda com leveza ('Tranquilo, fico no aguardo então 🙂') e o sistema de follow-up cuidará do resto.
Lead silencioso (não respondeu) TAMBÉM não é desistência — a cadência automática chama de volta. Só marque lost com recusa em palavras claras.`;

  const _nowBR = getNowBrasilia(timezone);
  const _hourBR = _nowBR.getHours();
  const _todayStr = `${String(_nowBR.getDate()).padStart(2, "0")}/${String(_nowBR.getMonth() + 1).padStart(2, "0")}/${_nowBR.getFullYear()}`;
  const _nowTimeStr = `${String(_hourBR).padStart(2, "0")}:${String(_nowBR.getMinutes()).padStart(2, "0")}`;
  const _periodoStr =
    _hourBR >= 5 && _hourBR < 12 ? "manhã (use 'bom dia')"
    : _hourBR >= 12 && _hourBR < 18 ? "tarde (use 'boa tarde')"
    : "noite (use 'boa noite')";
  const timeHeader = `\n[HORÁRIO ATUAL — Brasília]\nHoje é ${_todayStr}, agora são ${_nowTimeStr}. Estamos no período da ${_periodoStr}. SEMPRE cumprimente e se despeça de acordo com o período do dia. NUNCA diga "bom dia" à tarde/noite, nem "boa tarde" de manhã/noite, nem "tenha um bom dia" à noite.`;

  if (customPrompt.startsWith("Você é")) {
    const globalConversationFixes = `

[CORREÇÃO GERAL ADVONE — PRIORIDADE MÁXIMA]
1. NUNCA diga "perdão", "desculpa" ou "me desculpa" sem erro real. Se o lead demorou para responder, continue normalmente do ponto em que parou.
2. Se sua última pergunta foi confirmar um horário oferecido e o lead respondeu "pode sim", "sim", "confirmo", "ok", "fechado", "pode ser" ou equivalente, isso É ACEITE DO HORÁRIO. Avance para registrar/agendar; NÃO volte a confirmar assunto, modalidade ou intenção.
3. Se o lead já aceitou conversar/agendar, NÃO faça mais perguntas de qualificação e NÃO peça para "contar mais". Vá direto para o próximo passo do agendamento.
4. Aceite nome com nome + sobrenome. NÃO exija 3 palavras. Ex.: "Daniel Manaces" é nome suficiente para agendar.
5. Ao pedir nome no final, peça UMA vez, sem pedir CPF/RG/senha/processo, e sem repetir se o lead já informou nome + sobrenome.
6. É proibido usar frases como "Você quer falar sobre X, certo?" ou "Pode me contar um pouco mais?" quando o assunto já foi identificado.
7. Fluxo de agendamento correto: turno → check_availability → oferecer horário → se o lead aceitar, pedir/registrar nome completo se ainda faltar → schedule_appointment.`;
    return customPrompt + globalConversationFixes + timeHeader + lostBlock + (flowsBlock ? `\n[FLUXOS]\n${flowsBlock}` : "") + (triageBlock ? `\n[TRIAGEM]\n${triageBlock}` : "");
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
  const hourBR = nowBR.getHours();
  const nowTime = `${String(hourBR).padStart(2, "0")}:${String(nowBR.getMinutes()).padStart(2, "0")}`;
  const periodo =
    hourBR >= 5 && hourBR < 12 ? "manhã (use 'bom dia')"
    : hourBR >= 12 && hourBR < 18 ? "tarde (use 'boa tarde')"
    : "noite (use 'boa noite')";


  return `Você é ${botName}, ${botRole} de ${officeName}.
[OBJETIVO PRINCIPAL]
- Seu foco total é: ATENDER o lead com rapidez, FILTRAR (qualificar) o caso e AGENDAR uma reunião.
- Não perca o foco em converter o lead em um agendamento.
[PERSONALIDADE]
- Fale como pessoa real: "olha", "hm", "pois é", "vou te falar"
- Varie expressões — NUNCA repita "Entendi!" ou "Perfeito!" em msgs seguidas
- Banco de variações: ["Entendi", "Tá certo", "Hmm, entendi", "Ah sim", "Certo", "Olha só", "Faz sentido", "Boa"]
- Tom: ${config.communication_tone || "moderado"}. Emojis leves (max 1 por msg). Frases curtas (1-3 linhas).
- Nunca diga que é robô, IA ou assistente virtual.
[ÁUDIO]
- Quando o lead envia áudio, NUNCA mencione "transcrição", "áudio transcrito" ou termos técnicos.
- Responda como se tivesse OUVIDO naturalmente: "Entendi o que você falou..." / "Sobre o que você mencionou..."
- Áudios são more emocionais — tenha paciência, não peça pra repetir a menos que esteja realmente confuso.
- Para respostas curtas de áudio ("sim", "ok"), seja igualmente breve.
[EMPATIA]
- Se o lead demonstrar sofrimento, NUNCA responda com pergunta imediatamente.
- Primeiro valide: "Poxa, que situação..." ou "Sinto muito por isso..." → DEPOIS pergunte.
- Medo → "Fica tranquilo(a), é pra isso que a gente tá aqui."
- Raiva → "Tem razão de ficar indignado(a)."
- Desespero → "Vamos resolver isso juntos."
- Confusão → "Calma, vou te explicar de um jeito simples."
[REGRAS CRÍTICAS]
1. [REGRA PRINCIPAL ADVONE] Se o lead já explicar o problema (negativa, benefício, saúde, perícia, renda, documentos ou tempo), você está PROIBIDO de repetir perguntas ou reconfirmar intenção.
2. [PROIBIDO] NUNCA pergunte "Você quer falar sobre X, certo?" ou "Pode me contar um pouco mais?" se ele já deu o contexto.
3. [CERTO] Valide emocionalmente e continue naturalmente: "Entendi, {nome} 😕" e vá direto para o que falta.
4. PROIBIDO pedir CPF/RG/Senha INSS ou NÚMERO DE PROCESSO.
5. NUNCA peça para o cliente enviar o processo ou perguntar "qual o número do seu processo?".
6. NÃO agende antes de entender o caso (mínimo: saber o problema).
7. Valores: diga que a 1ª conversa é GRATUITA e sem compromisso.
8. Data de hoje: ${today}. Agora são ${nowTime} (horário de Brasília) — período da ${periodo}. SEMPRE use a saudação correta ao período; NUNCA diga "bom dia" à tarde/noite nem "tenha um bom dia" à noite. Horários só via check_availability.
9. UMA pergunta por vez. Máximo 3 linhas por mensagem.
10. Se o cliente confirmou ("Isso", "Sim", "Exato"), você deve avançar para o próximo passo.
11. NUNCA diga "perdão", "desculpa" ou "me desculpa" só porque o lead demorou para responder. Silêncio/pausa não é erro: continue exatamente de onde parou.
12. Se sua última pergunta foi "Podemos agendar para esse horário?" e o lead respondeu afirmativamente, considere o horário aceito. Não reconfirme assunto/modalidade; peça/registre o nome se faltar e conclua o agendamento.
13. Aceite nome com nome + sobrenome. Não exija 3 palavras para agendar.
[FLUXO CONVERSACIONAL]
1. Cumprimente e descubra o nome naturalmente (não como formulário).
2. Se já é cliente → lookup_existing_client. Se caso novo → passo 3.
   EXCEÇÃO: Se mencionou "processo"/"andamento"/"meu caso" → lookup direto.
3. QUALIFICAÇÃO NATURAL:
    - [TRAVA DE REPETIÇÃO] Nunca pergunte o que o cliente já respondeu. Se ele disse "o bpc está demorando", você já sabe o que está acontecendo. Não peça para ele "contar mais" de forma genérica.
    - Se o cliente já trouxe o problema na primeira mensagem, você deve IMEDIATAMENTE validar emocionalmente ("Poxa, entendi, 6 meses sem resposta é muito tempo...") e avançar para a próxima pergunta de qualificação ou agendamento.
    - Se o cliente falar que tem um processo, use lookup_existing_client para tentar localizar.
4. SINAIS QUENTES: "urgente", "prazo", "amanhã", "socorro", "preciso resolver", "negado", "corte" → pule perguntas genéricas e foque na validação emocional seguida de agendamento ou coleta de dados críticos.
 5. AGENDAMENTO: Pergunte turno preferido → check_availability → ofereça horário → se o lead aceitar, peça NOME COMPLETO apenas se ainda faltar → register_client_name + schedule_appointment.
6. OBJEÇÕES (seja leve mas persistente):
   - "Vou pensar" → "Claro! A conversa com o doutor é sem compromisso. Quer que reserve e se mudar de ideia me avisa?"
   - "Depois eu vejo" → "Tranquilo! Só fica ligado que [prazo legal se aplicável]. Me chama quando quiser 😊"
   - "É caro?" → "Essa primeira conversa é gratuita. O doutor explica tudo sem compromisso."
7. URGÊNCIA LEGAL: Se caso tem prazo (prescrição, recurso), mencione: "Importante: esse tipo de caso tem prazo. Bom que tá correndo atrás."
[TRAVA: DESISTÊNCIA — REGRA RÍGIDA]
SÓ chame mark_lead_lost com recusa EXPLÍCITA: 'não quero mais', 'desisti', 'não tenho interesse', 'já contratei outro', 'já resolvi'.
NÃO marque lost se for: 'tô ocupado', 'agora não', 'depois te respondo', 'me liga mais tarde', 'vou pensar', 'preciso ver com a família', 'tô no trabalho/dirigindo', 'só pesquisando preço'. Nesses casos responda com leveza e deixe a cadência de follow-up agir. Silêncio também NÃO é desistência.
[MODALIDADE] ${modalidadeBlock}
${flowsBlock ? `\n[FLUXOS]\n${flowsBlock}` : ""}${triageBlock ? `\n[TRIAGEM]\n${triageBlock}` : ""}${company?.decision_rules ? `\n[REGRAS]\n${company.decision_rules}` : ""}${customPrompt ? `\n[CUSTOM]\n${customPrompt}` : ""}
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
- EVITE perguntas redundantes ou confirmações óbvias de intenção que o lead já expressou.
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
- EVITE perguntas redundantes ou confirmações óbvias de intenção que o lead já expressou.
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
- EVITE perguntas redundantes ou confirmações óbvias de intenção que o lead já expressou.
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

/**
 * Verifica se AGORA está dentro do horário de expediente configurado em companies.business_hours.
 * - Formato aceito: { monday: [{open:"08:00", close:"18:00"}, ...], ... } ou { monday: {shifts:[...]}}
 * - Se o dia não tiver turnos configurados (array vazio) → fora do expediente (bot pode responder).
 * - Feriado nacional brasileiro → fora do expediente (bot pode responder).
 * - Se business_hours estiver totalmente vazio → assumimos "sem expediente definido" = fora do expediente.
 */
function isWithinBusinessHoursNow(businessHours: any, timezone: string = "America/Sao_Paulo"): boolean {
  if (!businessHours || typeof businessHours !== "object" || Object.keys(businessHours).length === 0) {
    return false;
  }
  const now = getNowBrasilia(timezone);
  const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayKey = dayKeys[now.getDay()];
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (isBrazilianHolidayStr(todayStr)) return false;

  const dayCfg = businessHours[dayKey];
  let shifts: any[] = [];
  if (Array.isArray(dayCfg)) shifts = dayCfg;
  else if (dayCfg && typeof dayCfg === "object" && dayCfg.enabled !== false) shifts = dayCfg.shifts || [];

  if (!shifts.length) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const shift of shifts) {
    const start = shift.open || shift.start;
    const end = shift.close || shift.end;
    if (!start || !end) continue;
    const [sh, sm] = String(start).split(":").map(Number);
    const [eh, em] = String(end).split(":").map(Number);
    const s = sh * 60 + (sm || 0);
    const e = eh * 60 + (em || 0);
    if (nowMin >= s && nowMin < e) return true;
  }
  return false;
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
  return parts.length >= 2;
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
          full_name: { type: "string", description: "Nome completo do lead (nome + sobrenome; não exija 3 palavras)" }
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
        "Marca o lead como PERDIDO e ENCERRA o atendimento. Use SOMENTE quando o lead RECUSAR EXPLICITAMENTE o serviço com frases inequívocas como: 'não quero mais', 'não tenho interesse', 'desisti', 'pode parar', 'não preciso mais', 'mudei de ideia e não vou seguir', 'já contratei outro advogado', 'já resolvi por fora'. ⚠️ NÃO use esta tool se o lead apenas disser que está ocupado, sem tempo, no trabalho, dirigindo, em reunião, vai pensar, vai ver com a família, pediu para responder depois, ou disse que está 'só pesquisando preço'. NÃO use por silêncio do lead (a cadência automática cuida disso). Em caso de dúvida, NÃO chame — prefira deixar o lead em follow-up. Após chamar, envie UMA mensagem curta de despedida cordial.",
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
      description: "Localiza o processo/cliente no CRM ou nos processos monitorados. SEMPRE peça NOME COMPLETO e CPF ao cliente na MESMA mensagem ANTES de chamar. Ambos são obrigatórios.",
      parameters: {
        type: "object",
        properties: {
          client_full_name: { type: "string", description: "Nome completo do cliente" },
          client_cpf: { type: "string", description: "CPF do cliente (obrigatório, só dígitos ou formatado)" },
          subject: { type: "string", enum: ["andamento_processo", "outro"], description: "Assunto do contato" },
          message_summary: { type: "string", description: "Breve resumo do que o cliente deseja" }
        },
        required: ["client_full_name", "client_cpf", "subject"],
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
    /^\s*(perd[ãa]o|desculpa|me desculpa)[,!\.\s]*/i,
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
  clientContextBlock?: string,
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
- Se a mensagem do lead veio de áudio, NUNCA diga "vi no seu áudio" ou "na transcrição". Responda como se fosse texto normal.
- Para áudios curtos (marcados [resposta curta]), responda em 1 linha.
- Sua resposta é APENAS o texto que vai pro WhatsApp do lead. Não inclua marcadores, listas de regras, nem mencione "instrução", "regra", "fluxo", "passo", "tool" ou nomes técnicos.`;

  try {
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt + (clientContextBlock || "") + coherenceGuard },
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
            toolResult = { success: false, error: "Nome incompleto. Peça nome e sobrenome (ex: 'João Silva'). Não peça desculpas e não exija 3 palavras." };
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
              // Apenas leads QUENTES geram alerta ao advogado — mornos/frios seguem no fluxo silenciosamente.
              // Também evita duplicidade: só notifica se ainda não havia score definido (primeira classificação).
              const alreadyClassified = !!existingLead?.lead_score;
              if (classification === "quente" && !alreadyClassified && args.niche) {
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
                    
                    const alertMessage = `🔥 *Novo Lead Qualificado (${args.niche})*\n\n👤 Cliente: ${leadNameDisplay}\n📈 Score: ${classification.toUpperCase()}\n⚖️ Área: ${args.niche}\n📝 Motivo: ${toolResult.reason || "N/A"}`;

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
              instruction: "Antes de agendar, peça o NOME COMPLETO do lead (nome + sobrenome). Use exatamente: \"Perfeito 🙂 Pra já deixar tudo organizado aqui pra equipe, me passa o seu *nome completo*, por favor?\". Não diga perdão/desculpa. Quando receber nome + sobrenome, chame register_client_name e SÓ DEPOIS chame schedule_appointment de novo."
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
          const { data: leadClientBase } = await supabase
            .rpc("find_client_by_name", {
              _company_id: companyId,
              _search_name: String(client_full_name).trim()
            })
            .maybeSingle();
          // Buscar assigned_to (advogado responsável) do lead encontrado
          let leadClient: any = leadClientBase;
          if (leadClientBase?.id) {
            const { data: full } = await supabase
              .from("leads")
              .select("id, name, assigned_to")
              .eq("id", leadClientBase.id)
              .maybeSingle();
            if (full) leadClient = full;
          }

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
          let pendingDocs: any[] = [];
          let upcomingMeetings: any[] = [];
          if (leadClient) {
            const { data: summary } = await supabase
              .from("lead_summaries")
              .select("summary_text")
              .eq("lead_id", leadClient.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            lastSummary = summary?.summary_text || "";

            // Documentos pendentes (ainda não recebidos/aprovados)
            const { data: docs } = await supabase
              .from("lead_document_requests")
              .select("document_type, status, notes, requested_at")
              .eq("lead_id", leadClient.id)
              .in("status", ["requested", "pending", "rejected"])
              .order("requested_at", { ascending: false })
              .limit(10);
            pendingDocs = docs || [];

            // Próximas audiências / compromissos (futuros e não realizados)
            const nowIso = new Date().toISOString();
            const { data: meets } = await supabase
              .from("lead_reminders")
              .select("title, description, due_at, reminder_type")
              .eq("lead_id", leadClient.id)
              .eq("completed", false)
              .eq("meeting_held", false)
              .gte("due_at", nowIso)
              .order("due_at", { ascending: true })
              .limit(5);
            upcomingMeetings = meets || [];
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

              const docsText = pendingDocs.length > 0
                ? `\n📄 *Documentos pendentes (${pendingDocs.length}):*\n` + pendingDocs.map((d: any) => `- ${d.document_type}${d.status ? ` (${d.status})` : ""}`).join("\n")
                : "";

              const meetingsText = upcomingMeetings.length > 0
                ? `\n📅 *Próximos compromissos:*\n` + upcomingMeetings.map((m: any) => {
                    const dt = new Date(m.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
                    return `- ${dt} — ${m.title}`;
                  }).join("\n")
                : "";

              const alertMessage = `👥 *Atendimento a Cliente Existente*\n\n👤 Cliente: ${client_full_name || leadClient?.name || "N/A"}\n📝 Assunto: ${subject === "andamento_processo" ? "Andamento de Processo" : "Outro Assunto"}\n💬 Solicitação: ${message_summary || "(sem resumo)"}\n\n${leadClient ? "✅ Localizado no CRM" : "⚠️ Não localizado no CRM"}${processesText}${docsText}${meetingsText}\n\n_O bot foi desativado para este contato._`;
              
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

          const foundInSystem = !!leadClient || monitoredProcesses.length > 0 || pendingDocs.length > 0 || upcomingMeetings.length > 0;

          // Buscar nome do advogado responsável para personalizar a resposta
          let responsibleLawyerName = "";
          const assignedTo = leadClient?.assigned_to;
          if (assignedTo) {
            const { data: lp } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", assignedTo)
              .maybeSingle();
            responsibleLawyerName = lp?.full_name || "";
          }
          if (!responsibleLawyerName) {
            responsibleLawyerName = (config.companies as any)?.owner_name
              || config.office_name
              || "responsável";
          }

          // Só desativa o bot se REALMENTE precisa de handoff humano
          // (assunto ≠ andamento, OU processo foi encontrado). Se subject=andamento e
          // não encontrou nada, o bot deve responder a mensagem de "fase inicial".
          const shouldHandoffHuman = subject !== "andamento_processo" || foundInSystem;
          if (leadId && shouldHandoffHuman) {
            await supabase.from("leads").update({ bot_disabled: true, is_unread: true }).eq("id", leadId);
          }

          toolResult = {
            success: true,
            found_in_system: foundInSystem,
            found_in_crm: !!leadClient,
            monitored_processes_found: monitoredProcesses.length,
            responsible_lawyer_name: responsibleLawyerName,
            processes_info: monitoredProcesses.map(p => ({
              numero: p.numero_cnj,
              tribunal: p.tribunal_sigla,
              ultima_movimentacao: p.data_ultima_movimentacao,
              resumo_movimentacoes: p.recent_movements.map((m: any) => m.descricao).join(" | ")
            })),
            pending_documents: pendingDocs.map((d: any) => ({
              tipo: d.document_type,
              status: d.status,
              observacao: d.notes || null,
            })),
            upcoming_meetings: upcomingMeetings.map((m: any) => ({
              titulo: m.title,
              descricao: m.description || null,
              data_hora: m.due_at,
              data_hora_br: new Date(m.due_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }),
              tipo: m.reminder_type,
            })),
            instruction: foundInSystem
              ? `Responda ao cliente em UMA mensagem curta, acolhedora e em linguagem simples (PROIBIDO juridiquês — nada de "autos", "citação", "despacho", "trânsito em julgado", "intimação", "conclusos", etc.). Monte a resposta apenas com os blocos que tiverem dados:

BLOCO A — "Sobre o seu processo" (só se houver processos_info):
  • "O que aconteceu de mais recente:" — traduza a última movimentação em 1 linha simples (ex.: "o juiz pediu mais documentos", "marcaram uma audiência", "a outra parte foi avisada"). Se for técnica demais, diga só "o processo está andando normalmente".
  • "Próximos passos:" — 1 a 3 bullets curtos do que costuma vir depois nessa fase, em linguagem do dia a dia.

BLOCO B — "📄 Documentos pendentes" (só se pending_documents não estiver vazio):
  liste em bullets os tipos de documento que ainda faltam, ex.: "• RG • Comprovante de endereço". Peça gentilmente pra enviar quando puder.

BLOCO C — "📅 Próximos compromissos" (só se upcoming_meetings não estiver vazio):
  liste em bullets cada compromisso no formato "• 15/07 às 14:00 — Audiência" usando data_hora_br. Lembre o cliente de anotar.

Feche com UMA frase: "O(a) advogado(a) ${responsibleLawyerName} e a equipe estão acompanhando tudo de pertinho e te avisam assim que tiver novidade. 🙂"

REGRAS: NÃO cite número de processo, tribunal, nem termos técnicos. NÃO invente datas nem fatos. Se um bloco não tiver dados, simplesmente OMITA aquele bloco (não escreva "não há documentos pendentes" nem "sem compromissos").`
              : `Nenhum processo foi localizado para este CPF. Responda EXATAMENTE (adaptando o primeiro nome do cliente): "Seu processo ainda está na fase inicial. O(a) advogado(a) ${responsibleLawyerName} vai entrar em contato assim que houver novas atualizações. Se preferir, você também pode nos chamar por aqui novamente sempre que precisar. 🙂". NÃO chame transfer_to_human, NÃO diga "vou avisar o advogado agora", NÃO agende reunião.`
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
        target_audience, alert_whatsapp, triage_options, debug_mode, bot_only_after_hours,
        companies (name, bot_name, bot_role_description, timezone, decision_rules, billing_model, shared_whatsapp_number, business_hours)
      `)
      .eq("company_id", companyId)
      .maybeSingle();

    // Auth: UaZapi does NOT send custom headers on webhook calls. We accept:
    //  - header `x-webhook-secret`/`authorization` matching global ZAPI_WEBHOOK_SECRET
    //  - header `token`/`x-instance-token` matching the per-company zapi_token
    //  - URL query `?token=...` or `?webhook_secret=...` matching either of the above
    //    (recommended for UaZapi: append &token=<zapi_token> to the webhook URL)
    const hdrSecret = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const hdrInstanceToken = req.headers.get("token") || req.headers.get("x-instance-token");
    const qsToken = url.searchParams.get("token") || url.searchParams.get("webhook_secret");
    const matchesGlobal = !!expectedToken && (
      hdrSecret === expectedToken ||
      hdrSecret === `Bearer ${expectedToken}` ||
      qsToken === expectedToken
    );
    const matchesInstance = !!config?.zapi_token && (
      hdrInstanceToken === config.zapi_token ||
      hdrSecret === config.zapi_token ||
      hdrSecret === `Bearer ${config.zapi_token}` ||
      qsToken === config.zapi_token
    );
    if (!matchesGlobal && !matchesInstance) {
      log("warn", "zapi-webhook", "Unauthorized attempt", {
        companyId,
        hasGlobal: !!expectedToken,
        hasInstanceHdr: !!hdrInstanceToken,
        hasQsToken: !!qsToken,
      });
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

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
    console.log("Z-API webhook payload:", JSON.stringify(body).substring(0, 1500));

    if (!body) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect fromMe across UaZapi field-name variants
    const rawMsg: any = body.message || {};
    const fromMeFlag = Boolean(
      rawMsg.fromMe ?? rawMsg.FromMe ?? rawMsg.fromme ?? rawMsg.isFromMe ?? rawMsg.from_me ?? false
    );

    const isUaZapiMessage = body.EventType === "messages" && body.message && !fromMeFlag;
    const isUaZapiSentMessage = body.EventType === "messages" && body.message && fromMeFlag;
    const isLegacyMessage = body.type === "ReceivedCallback";

    // Handle human intervention from phone (fromMe = true)
    if (isUaZapiSentMessage) {
      const sentPhone = (
        rawMsg.sender_pn || rawMsg.chatid || rawMsg.phone || body.phone || body.chat?.id || ""
      ).toString().replace("@c.us", "").replace("@s.whatsapp.net", "").replace("@lid", "");
      const sentMsgId = rawMsg.messageid || rawMsg.id || rawMsg.message_id || "";
      console.log(`[human-intervention?] fromMe=true phone=${sentPhone} msgId=${sentMsgId}`);

      if (sentPhone) {
        const cleanSentPhone = sentPhone.replace(/\D/g, "");

        // 🛡️ Anti-eco: se esse messageid foi enviado pelo bot/atendente via API, ignora
        let isBotEcho = false;
        if (sentMsgId) {
          const { data: knownMsg } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("message_id_external", sentMsgId)
            .limit(1)
            .maybeSingle();
          if (knownMsg) isBotEcho = true;
        }

        // Fallback: se nos últimos 8s saiu mensagem da IA pra esse número, ainda é eco
        if (!isBotEcho) {
          const eightSecAgo = new Date(Date.now() - 8000).toISOString();
          const { data: recentBotMsg } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("phone", cleanSentPhone)
            .eq("direction", "outgoing")
            .ilike("sender_name", "IA%")
            .gt("created_at", eightSecAgo)
            .limit(1)
            .maybeSingle();
          if (recentBotMsg) isBotEcho = true;
        }

        if (!isBotEcho) {
          console.log(`[human-intervention] Manual message detected for ${cleanSentPhone}, disabling bot.`);
          await supabase.from("leads")
            .update({ bot_disabled: true, is_unread: false })
            .eq("company_id", companyId)
            .or(`phone.eq.${cleanSentPhone},whatsapp.eq.${cleanSentPhone}`);

          // Registra a mensagem manual no histórico
          await supabase.from("whatsapp_messages").insert({
            company_id: companyId,
            phone: cleanSentPhone,
            message_text: rawMsg.text || rawMsg.content || rawMsg.caption || "[mensagem manual]",
            direction: "outgoing",
            sender_name: "Atendente",
            message_id_external: sentMsgId || null,
            timestamp: new Date().toISOString(),
          });

          // Cancela cadências pendentes
          const { data: leadToCancel } = await supabase.from("leads")
            .select("id")
            .eq("company_id", companyId)
            .or(`phone.eq.${cleanSentPhone},whatsapp.eq.${cleanSentPhone}`)
            .maybeSingle();

          if (leadToCancel?.id) {
            await supabase.from("cadence_messages")
              .update({ status: "cancelled" })
              .eq("lead_id", leadToCancel.id)
              .eq("status", "pending");
          }
        } else {
          console.log(`[human-intervention] Ignored bot echo for ${cleanSentPhone}`);
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
    let imageUrl: string | null = null;
    let documentUrl: string | null = null;
    let documentFilename: string | null = null;
    let documentMime: string | null = null;
    let audioMetadata: { wasAudio: boolean; duration: number | null; isShort: boolean; isMinimal: boolean } | null = null;
    let messageType: string = "text";


    // Helper: extrai texto de campos que podem vir como string OU objeto
    // (UaZapi às vezes manda {message: "..."} ou {body: "..."} ou button/list reply)
    const extractText = (v: unknown): string => {
      if (v == null) return "";
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      if (typeof v === "object") {
        const o = v as Record<string, unknown>;
        const candidates = [
          o.message, o.text, o.body, o.caption, o.content,
          o.selectedDisplayText, o.selectedButtonId, o.selectedRowId,
          o.title, o.displayText,
        ];
        for (const c of candidates) {
          if (typeof c === "string" && c.trim()) return c;
        }
        return "";
      }
      return "";
    };

    if (isUaZapiMessage) {
      const msg = body.message;
      phone = msg.sender_pn || msg.chatid || "";
      senderName = msg.senderName || body.chat?.name || body.chat?.wa_contactName || "";
      messageText =
        extractText(msg.text) ||
        extractText(msg.content) ||
        extractText(msg.caption) ||
        extractText(msg.body) ||
        extractText(msg.buttonsResponseMessage) ||
        extractText(msg.listResponseMessage) ||
        extractText(msg.templateButtonReplyMessage) ||
        extractText(msg.interactiveResponseMessage) ||
        "";
      messageIdExternal = msg.messageid || msg.id || "";
      isGroup = msg.isGroup || false;
      messageType = (msg.type || msg.messageType || "").toString().toLowerCase();
      if (messageType.includes("audio") || messageType === "ptt" || messageType === "voice") {
        audioUrl = msg.audio?.url || msg.audio?.audioUrl || msg.mediaUrl || msg.fileURL || msg.url || msg.media?.url || null;
      }
      if (messageType.includes("image") || messageType.includes("photo") || messageType.includes("sticker")) {
        imageUrl = msg.image?.url || msg.image?.imageUrl || msg.photo?.url || msg.mediaUrl || msg.fileURL || msg.url || msg.media?.url || null;
      }
      if (messageType.includes("document") || messageType.includes("file") || messageType.includes("pdf")) {
        documentUrl = msg.document?.url || msg.document?.documentUrl || msg.file?.url || msg.mediaUrl || msg.fileURL || msg.url || msg.media?.url || null;
        documentFilename = msg.document?.filename || msg.document?.fileName || msg.file?.filename || msg.filename || msg.fileName || null;
        documentMime = msg.document?.mimetype || msg.document?.mimeType || msg.mimetype || msg.mimeType || null;
      }
      if (!messageText) messageText = "[mídia]";
    } else {
      phone = body.phone || "";
      senderName = body.senderName || body.chatName || "";
      messageText =
        extractText(body.text) ||
        extractText(body.image?.caption) ||
        extractText(body.video?.caption) ||
        extractText(body.document?.caption) ||
        extractText(body.buttonsResponseMessage) ||
        extractText(body.listResponseMessage) ||
        "";
      messageIdExternal = body.messageId || "";
      isGroup = body.isGroup || false;
      if (body.audio || body.ptt) {
        audioUrl = body.audio?.audioUrl || body.audio?.url || body.ptt?.audioUrl || body.ptt?.url || null;
        messageType = "audio";
      }
      if (body.image) {
        imageUrl = body.image?.imageUrl || body.image?.url || null;
        messageType = "image";
      }
      if (body.document) {
        documentUrl = body.document?.documentUrl || body.document?.url || null;
        documentFilename = body.document?.fileName || body.document?.filename || null;
        documentMime = body.document?.mimeType || body.document?.mimetype || null;
        messageType = "document";
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

    // ===== VISÃO DE IMAGEM (GPT-4o-mini) — OCR de RG/CNH, laudos, prints de negativa INSS, etc. =====
    if (imageUrl) {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiKey) {
          console.error("[image] OPENAI_API_KEY não configurada");
          messageText = "[O lead enviou uma imagem. Agradeça e diga que a equipe vai analisar em seguida.]";
        } else {
          console.log(`[image] Analisando imagem: ${imageUrl}`);
          const caption = messageText && messageText !== "[mídia]" ? messageText : "";
          const visionResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              max_tokens: 800,
              messages: [
                {
                  role: "system",
                  content: "Você analisa imagens enviadas por leads a um escritório de advocacia (previdenciário, trabalhista, cível). Descreva objetivamente em PT-BR o que a imagem mostra. Se for documento (RG, CNH, CTPS, contracheque, carta do INSS, laudo, extrato, print de app Meu INSS, holerite, contrato), extraia TODOS os textos, números, datas e valores relevantes de forma estruturada. Se for foto pessoal/lesão/local, descreva o que é visível. Máx 500 palavras. Não invente dados.",
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: caption ? `Legenda do lead: "${caption}". Analise a imagem:` : "Analise a imagem enviada pelo lead:" },
                    { type: "image_url", image_url: { url: imageUrl } },
                  ],
                },
              ],
            }),
          });
          if (!visionResp.ok) {
            const errTxt = await visionResp.text();
            console.error(`[image] Vision falhou ${visionResp.status}: ${errTxt}`);
            messageText = "[O lead enviou uma imagem que não consegui analisar. Peça educadamente que descreva ou reenvie.]";
          } else {
            const visionData = await visionResp.json();
            const desc = (visionData.choices?.[0]?.message?.content || "").trim();
            if (desc) {
              console.log(`[image] Descrição: ${desc.substring(0, 150)}...`);
              messageText = `📷 [imagem recebida do lead${caption ? ` — legenda: "${caption}"` : ""}]\nConteúdo extraído:\n${desc}`;
            } else {
              messageText = "[O lead enviou uma imagem sem conteúdo legível. Peça que reenvie com mais nitidez.]";
            }
          }
        }
      } catch (imgErr) {
        console.error("[image] Erro inesperado:", imgErr);
        messageText = "[O lead enviou uma imagem que não consegui analisar. Peça educadamente que descreva ou reenvie.]";
      }
    }

    // ===== DOCUMENTOS (PDF / DOCX / etc.) — extrai texto de PDFs pequenos via OpenAI Files API =====
    if (documentUrl) {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        const fname = documentFilename || "documento";
        const caption = messageText && messageText !== "[mídia]" && !messageText.startsWith("📷") ? messageText : "";
        const isPdf = (documentMime || "").includes("pdf") || fname.toLowerCase().endsWith(".pdf");

        if (!openaiKey || !isPdf) {
          console.log(`[doc] Documento não-PDF ou sem chave: ${fname} (${documentMime})`);
          messageText = `📎 [documento recebido do lead: "${fname}"${caption ? ` — legenda: "${caption}"` : ""}]\nRegistre como documento recebido e siga o fluxo (não é possível ler o conteúdo automaticamente).`;
        } else {
          console.log(`[doc] Baixando PDF: ${documentUrl}`);
          const docResp = await fetch(documentUrl);
          if (!docResp.ok) throw new Error(`download falhou ${docResp.status}`);
          const docBlob = await docResp.blob();
          if (docBlob.size > 15 * 1024 * 1024) {
            messageText = `📎 [documento recebido: "${fname}" — muito grande para análise automática]${caption ? ` Legenda: "${caption}"` : ""}. Registre como recebido.`;
          } else {
            const b64 = btoa(new Uint8Array(await docBlob.arrayBuffer()).reduce((s, b) => s + String.fromCharCode(b), ""));
            const dataUrl = `data:application/pdf;base64,${b64}`;
            const docAiResp = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 1200,
                messages: [
                  { role: "system", content: "Você analisa documentos jurídicos enviados por leads (contratos, carta do INSS, sentença, laudo médico, holerite, CTPS, extrato). Resuma em PT-BR: (1) tipo de documento, (2) partes/envolvidos, (3) datas e valores relevantes, (4) o que o documento diz na prática. Máx 600 palavras. Não invente." },
                  { role: "user", content: [
                    { type: "text", text: `Arquivo: ${fname}${caption ? ` — Legenda: "${caption}"` : ""}. Analise:` },
                    { type: "file", file: { filename: fname, file_data: dataUrl } },
                  ]},
                ],
              }),
            });
            if (!docAiResp.ok) {
              const t = await docAiResp.text();
              console.error(`[doc] AI falhou ${docAiResp.status}: ${t}`);
              messageText = `📎 [documento recebido: "${fname}"] Não foi possível ler automaticamente. Registre como recebido.`;
            } else {
              const dj = await docAiResp.json();
              const summary = (dj.choices?.[0]?.message?.content || "").trim();
              messageText = summary
                ? `📎 [documento recebido do lead: "${fname}"${caption ? ` — legenda: "${caption}"` : ""}]\nResumo do conteúdo:\n${summary}`
                : `📎 [documento recebido: "${fname}"] sem conteúdo extraível.`;
            }
          }
        }
      } catch (docErr) {
        console.error("[doc] Erro inesperado:", docErr);
        messageText = `📎 [documento recebido do lead${documentFilename ? `: "${documentFilename}"` : ""}] Não foi possível ler o conteúdo. Registre como recebido e siga o fluxo.`;
      }
    }

    // ===== OCR ESTRUTURADO — RG, CNH, CTPS, HOLERITE (auto-preenche cadastro do cliente) =====
    // Roda em paralelo ao resumo genérico; só ativa fluxo de revisão se doc_type ∈ {rg,cnh,ctps,holerite}.
    let ocrStructured: {
      doc_type: string;
      confidence: number;
      human_summary: string;
      fields: Record<string, string | null>;
    } | null = null;

    if (imageUrl || documentUrl) {
      try {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        if (openaiKey) {
          const isPdf = !!documentUrl && ((documentMime || "").includes("pdf") || (documentFilename || "").toLowerCase().endsWith(".pdf"));
          const userContent: any[] = [
            { type: "text", text: "Classifique este documento e extraia todos os campos legíveis. Retorne JSON estrito." }
          ];
          if (imageUrl) {
            userContent.push({ type: "image_url", image_url: { url: imageUrl } });
          } else if (isPdf && documentUrl) {
            try {
              const r = await fetch(documentUrl);
              if (r.ok) {
                const buf = new Uint8Array(await r.arrayBuffer());
                if (buf.byteLength <= 15 * 1024 * 1024) {
                  const b64 = btoa(buf.reduce((s, b) => s + String.fromCharCode(b), ""));
                  userContent.push({ type: "file", file: { filename: documentFilename || "doc.pdf", file_data: `data:application/pdf;base64,${b64}` } });
                }
              }
            } catch (_e) { /* ignore */ }
          }

          if (userContent.length > 1) {
            const structResp = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0,
                max_tokens: 900,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `Você é um extrator OCR jurídico brasileiro. Analise a imagem/PDF e retorne JSON com o formato:
{
 "doc_type": "rg" | "cnh" | "ctps" | "holerite" | "outro",
 "confidence": 0.0-1.0,
 "human_summary": "resumo curto do que foi lido (2-4 linhas)",
 "fields": {
   "name": string|null,               // nome completo
   "cpf": string|null,                // apenas dígitos ou formato 000.000.000-00
   "rg": string|null,                 // número RG com órgão emissor se visível
   "birth_date": string|null,         // DD/MM/AAAA
   "nacionalidade": string|null,
   "estado_civil": string|null,
   "profissao": string|null,          // ou cargo (holerite/CTPS)
   "pis_pasep": string|null,          // CTPS/holerite
   "cnh_categoria": string|null,      // CNH
   "cnh_validade": string|null,       // CNH DD/MM/AAAA
   "empregador": string|null,         // CTPS/holerite (razão social)
   "empregador_cnpj": string|null,
   "admissao": string|null,           // CTPS DD/MM/AAAA
   "salario_base": string|null,       // holerite/CTPS ex "R$ 2.500,00"
   "salario_liquido": string|null,    // holerite
   "competencia": string|null,        // holerite MM/AAAA
   "endereco_rua": string|null,
   "endereco_numero": string|null,
   "endereco_bairro": string|null,
   "endereco_cidade": string|null,
   "endereco_estado": string|null,    // UF
   "endereco_cep": string|null
 }
}
REGRAS:
- Só preencha campos com dados VISÍVEIS. Nunca invente. Se não achar, use null.
- doc_type = "rg" para RG/Carteira de Identidade; "cnh" para CNH/Carteira de Motorista; "ctps" para Carteira de Trabalho; "holerite" para contracheque/folha de pagamento; senão "outro".
- confidence baixa (<0.5) se a imagem estiver ilegível ou não for documento reconhecível.
- Responda APENAS JSON válido.`,
                  },
                  { role: "user", content: userContent },
                ],
              }),
            });

            if (structResp.ok) {
              const sj = await structResp.json();
              const raw = sj.choices?.[0]?.message?.content || "";
              try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object" && parsed.doc_type) {
                  ocrStructured = {
                    doc_type: String(parsed.doc_type).toLowerCase(),
                    confidence: Number(parsed.confidence ?? 0),
                    human_summary: String(parsed.human_summary || ""),
                    fields: parsed.fields || {},
                  };
                  console.log(`[ocr-struct] type=${ocrStructured.doc_type} conf=${ocrStructured.confidence}`);
                }
              } catch (pe) {
                console.error("[ocr-struct] JSON parse fail:", pe, raw.slice(0, 200));
              }
            } else {
              console.error("[ocr-struct] request fail", structResp.status, await structResp.text());
            }
          }
        }
      } catch (e) {
        console.error("[ocr-struct] erro:", e);
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

    // ===== APROVAÇÃO DE OCR PELO OPERADOR (via WhatsApp do escritório) =====
    // Formato esperado: "OK <TOKEN>" ou "APROVAR <TOKEN>" ou "CORRIGIR <TOKEN> <texto>"
    // Enviado pelo número cadastrado em whatsapp_configs.alert_whatsapp.
    try {
      const alertRaw = (config.alert_whatsapp || "").replace(/\D/g, "");
      const senderRaw = cleanPhone.replace(/\D/g, "");
      const isOperator = alertRaw && (
        senderRaw === alertRaw ||
        senderRaw === `55${alertRaw}` ||
        `55${senderRaw}` === alertRaw ||
        senderRaw.endsWith(alertRaw.slice(-10)) ||
        alertRaw.endsWith(senderRaw.slice(-10))
      );
      if (isOperator) {
        const approvalMatch = messageText.match(/\b(OK|APROVAR|CONFIRMAR|CONFIRMO|LIBERAR)\s+([A-Z0-9]{5,8})\b/i);
        const rejectMatch = messageText.match(/\b(CORRIGIR|REJEITAR|REFAZER)\s+([A-Z0-9]{5,8})\b/i);
        const token = (approvalMatch?.[2] || rejectMatch?.[2] || "").toUpperCase();
        if (token) {
          const { data: pendingLead } = await supabase.from("leads")
            .select("id, name, phone, whatsapp, ocr_document_type")
            .eq("company_id", companyId).eq("ocr_review_token", token).maybeSingle();
          if (pendingLead) {
            const approved = !!approvalMatch;
            await supabase.from("leads").update({
              ocr_pending_review: false,
              ocr_review_token: null,
              ...(approved ? {} : { ocr_extracted_data: null }),
            }).eq("id", pendingLead.id);

            const SERVER_URL = "https://ziondigital.uazapi.com";
            const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
            const sendHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (ADMIN_TOKEN) sendHeaders["admintoken"] = ADMIN_TOKEN;
            const sendUrl = `${SERVER_URL}/send/text?instance=${encodeURIComponent(config.zapi_instance_id)}&token=${encodeURIComponent(config.zapi_token || config.zapi_instance_id)}`;
            const ackText = approved
              ? `✅ OCR aprovado para ${pendingLead.name || "lead"} (${pendingLead.ocr_document_type?.toUpperCase() || "documento"}). Laura liberada para enviar o parecer.`
              : `↩️ OCR de ${pendingLead.name || "lead"} descartado. Peça ao lead para reenviar o documento.`;
            await fetch(sendUrl, { method: "POST", headers: sendHeaders, body: JSON.stringify({ number: cleanPhone, text: ackText }) });

            // Se aprovado, dá um empurrão na Laura enviando um "hint" interno pro lead (mensagem-sistema no histórico)
            if (approved && (pendingLead.phone || pendingLead.whatsapp)) {
              await supabase.from("whatsapp_messages").insert({
                company_id: companyId, lead_id: pendingLead.id, phone: pendingLead.phone || pendingLead.whatsapp,
                message_text: `[sistema] OCR revisado e aprovado pelo operador. Prossiga com o parecer usando os dados extraídos.`,
                direction: "incoming", sender_name: "sistema",
                timestamp: new Date().toISOString(),
              });
            }

            return new Response(JSON.stringify({ ok: true, ocr_review: approved ? "approved" : "rejected", lead_id: pendingLead.id }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    } catch (opErr) {
      console.error("[ocr-approval] erro:", opErr);
    }



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
      .select("id, status, bot_disabled, bot_agent_phase, ocr_pending_review, is_client")

      .eq("company_id", companyId)
      .or(`phone.eq.${cleanPhone},whatsapp.eq.${cleanPhone}`)
      .maybeSingle();

    // ✨ ENTERPRISE: número compartilhado + cliente existente → roteia p/ Laura modo cliente
    const sharedWhatsApp = (config as any)?.companies?.shared_whatsapp_number === true;
    if (existingLead?.is_client && sharedWhatsApp) {
      try {
        const routerUrl = `${supabaseUrl}/functions/v1/laura-client-router`;
        await fetch(routerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            company_id: companyId,
            client_lead_id: existingLead.id,
            phone: cleanPhone,
            message: messageText,
            channel: "whatsapp",
          }),
        });
        console.log(`[client-router] Roteado cliente ${existingLead.id} para Laura modo cliente.`);
      } catch (e) {
        console.error("[client-router] Falha ao invocar laura-client-router:", e);
      }
      return new Response(
        JSON.stringify({ ok: true, routed_to: "client_conversations", lead_id: existingLead.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // ===== APLICA OCR ESTRUTURADO NO LEAD + ABRE REVISÃO PELO OPERADOR =====
    const RECOGNIZED_TYPES = ["rg", "cnh", "ctps", "holerite"];
    if (leadId && ocrStructured && RECOGNIZED_TYPES.includes(ocrStructured.doc_type) && ocrStructured.confidence >= 0.4) {
      try {
        const f = ocrStructured.fields || {};
        const patch: Record<string, any> = {};
        const setIfEmpty = async (col: string, val: any) => {
          if (val == null || val === "") return;
          patch[col] = val;
        };
        // Só sobrescreve campos vazios do lead — nunca apaga dado já cadastrado.
        const { data: leadNow } = await supabase.from("leads").select(
          "name, cpf_cliente_final, rg, nacionalidade, estado_civil, profissao, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep"
        ).eq("id", leadId).maybeSingle();
        const isEmpty = (v: any) => v == null || String(v).trim() === "";
        if (leadNow) {
          if (isEmpty(leadNow.name) && f.name) patch.name = f.name;
          if (isEmpty(leadNow.cpf_cliente_final) && f.cpf) patch.cpf_cliente_final = String(f.cpf).replace(/\D/g, "");
          if (isEmpty(leadNow.rg) && f.rg) patch.rg = f.rg;
          if (isEmpty(leadNow.nacionalidade) && f.nacionalidade) patch.nacionalidade = f.nacionalidade;
          if (isEmpty(leadNow.estado_civil) && f.estado_civil) patch.estado_civil = f.estado_civil;
          if (isEmpty(leadNow.profissao) && f.profissao) patch.profissao = f.profissao;
          if (isEmpty(leadNow.endereco_rua) && f.endereco_rua) patch.endereco_rua = f.endereco_rua;
          if (isEmpty(leadNow.endereco_numero) && f.endereco_numero) patch.endereco_numero = f.endereco_numero;
          if (isEmpty(leadNow.endereco_bairro) && f.endereco_bairro) patch.endereco_bairro = f.endereco_bairro;
          if (isEmpty(leadNow.endereco_cidade) && f.endereco_cidade) patch.endereco_cidade = f.endereco_cidade;
          if (isEmpty(leadNow.endereco_estado) && f.endereco_estado) patch.endereco_estado = String(f.endereco_estado).toUpperCase().slice(0, 2);
          if (isEmpty(leadNow.endereco_cep) && f.endereco_cep) patch.endereco_cep = f.endereco_cep;
        }

        const token = Math.random().toString(36).replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6) || "REV" + Date.now().toString(36).toUpperCase().slice(-3);
        patch.ocr_pending_review = true;
        patch.ocr_extracted_data = { ...ocrStructured, applied_patch: Object.keys(patch) };
        patch.ocr_document_type = ocrStructured.doc_type;
        patch.ocr_review_token = token;
        patch.ocr_last_extracted_at = new Date().toISOString();

        await supabase.from("leads").update(patch).eq("id", leadId);

        // Monta resumo pro operador
        const fieldLines = Object.entries(f)
          .filter(([, v]) => v != null && String(v).trim() !== "")
          .map(([k, v]) => `• ${k}: ${v}`).join("\n");
        const leadDisplayName = (leadNow?.name && !leadNow.name.startsWith("Lead ")) ? leadNow.name : (f.name || cleanPhone);
        const alertMsg = `📄 *Documento recebido de ${leadDisplayName}*
Tipo: *${ocrStructured.doc_type.toUpperCase()}* (confiança ${(ocrStructured.confidence * 100).toFixed(0)}%)

${ocrStructured.human_summary}

*Campos extraídos:*
${fieldLines || "(nenhum campo estruturado)"}

Responda:
✅ *OK ${token}* — para aprovar e liberar a Laura
↩️ *CORRIGIR ${token}* — para descartar e pedir reenvio`;

        const alertRawTo = (config.alert_whatsapp || "").replace(/\D/g, "");
        if (alertRawTo) {
          const to = alertRawTo.startsWith("55") ? alertRawTo : `55${alertRawTo}`;
          const SERVER_URL = "https://ziondigital.uazapi.com";
          const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
          const sendHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (ADMIN_TOKEN) sendHeaders["admintoken"] = ADMIN_TOKEN;
          const sendUrl = `${SERVER_URL}/send/text?instance=${encodeURIComponent(config.zapi_instance_id)}&token=${encodeURIComponent(config.zapi_token || config.zapi_instance_id)}`;
          await fetch(sendUrl, { method: "POST", headers: sendHeaders, body: JSON.stringify({ number: to, text: alertMsg }) });
          console.log(`[ocr] revisão pendente enviada para ${to} token=${token} lead=${leadId}`);
        } else {
          console.warn("[ocr] alert_whatsapp não configurado — OCR salvo mas operador não foi notificado.");
        }

        // Bloqueia Laura até o operador aprovar
        return new Response(JSON.stringify({ ok: true, ocr_pending: true, doc_type: ocrStructured.doc_type, token, lead_id: leadId }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (applyErr) {
        console.error("[ocr] falha ao aplicar/notificar:", applyErr);
      }
    }

    // AI Auto-Reply with multi-agent support
    const bm = config.companies?.billing_model;
    const isPlanCompleto = bm === 'plan_completo' || bm === 'crm_full' || bm === 'ia_only' || bm === 'plan_free' || bm === 'plan_zionads' || bm === 'plan_ia' || (bm?.startsWith?.('plan_ia_') ?? false);

    // ⏰ "Bot só fora do horário comercial": se ligado, pula IA quando estamos DENTRO do expediente
    const afterHoursOnly = !!(config as any).bot_only_after_hours;
    const tz = config.companies?.timezone || "America/Sao_Paulo";
    const bh = (config.companies as any)?.business_hours || {};
    const withinBH = isWithinBusinessHoursNow(bh, tz);
    if (afterHoursOnly && withinBH) {
      console.log(`[after-hours] Dentro do expediente (${tz}) e bot_only_after_hours=true → equipe humana atende, IA silenciada.`);
      return new Response(
        JSON.stringify({ ok: true, lead_id: leadId, skipped: "within_business_hours" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (config.ai_enabled && config.ai_auto_reply && leadId && !existingLead?.bot_disabled && !existingLead?.ocr_pending_review && isPlanCompleto) {

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

          const { data: leadData } = await supabase
            .from("leads")
            .select("name, is_client, cpf_cliente_final, assigned_to")
            .eq("id", leadId)
            .single();
          const currentLeadName = leadData?.name || senderName || undefined;

          // Contexto de cliente existente — orienta o bot a NÃO perguntar "é cliente?" e
          // a responder com boas-vindas quando este contato já é cliente cadastrado.
          let clientContextBlock: string | undefined;
          if (leadData?.is_client) {
            let lawyerName = "";
            if (leadData?.assigned_to) {
              const { data: lawyerProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", leadData.assigned_to)
                .maybeSingle();
              lawyerName = lawyerProfile?.full_name || "";
            }
            if (!lawyerName) {
              lawyerName = (config.companies as any)?.owner_name
                || (config.office_name || "")
                || "responsável";
            }
            const cpfCad = leadData?.cpf_cliente_final ? ` (CPF cadastrado: ${leadData.cpf_cliente_final})` : "";
            clientContextBlock = `

═══════════════════════════════════════════════════════
👤 CONTEXTO INTERNO — ESTE CONTATO JÁ É CLIENTE DO ESCRITÓRIO
═══════════════════════════════════════════════════════
Nome: ${currentLeadName || "(cliente cadastrado)"}${cpfCad}
Advogado(a) responsável: ${lawyerName}

REGRAS INVIOLÁVEIS PARA ESTE CONTATO:
1. 🚫 NÃO pergunte "você já é cliente ou é seu primeiro contato?". Ele JÁ é cliente.
2. ✅ SEMPRE que ele iniciar a conversa (ex.: "oi", "boa tarde"), responda em UMA mensagem:
   "Olá, ${currentLeadName?.split(" ")[0] || "tudo bem"}! 😊 Como posso te ajudar hoje?" — e AGUARDE.
3. 🚫 NÃO ofereça agendamento, NÃO faça qualificação (P1/P2/P3), NÃO chame decide_lead.
4. Se ele pedir andamento do processo / novidade / audiência / sentença / pagamento:
   a) Peça em UMA única mensagem: "Pra eu localizar seu processo aqui no sistema, me confirma seu *nome completo* e o *CPF*, por favor 🙂"
   b) Aguarde o nome completo E o CPF (os dois juntos).
   c) Chame OBRIGATORIAMENTE a tool \`lookup_existing_client\` passando client_full_name, client_cpf, subject="andamento_processo" e message_summary.
   d) Se a tool retornar found_in_system=false OU monitored_processes_found=0, responda EXATAMENTE (adaptando só o nome do advogado):
      "Seu processo ainda está na fase inicial. O(a) advogado(a) ${lawyerName} vai entrar em contato assim que houver novas atualizações. Se preferir, você também pode nos chamar por aqui novamente sempre que precisar. 🙂"
      NÃO chame transfer_to_human depois dessa resposta. NÃO diga "vou avisar o advogado".
   e) Se retornar found_in_system=true, faça um resumo simples e amigável e finalize com gentileza.
5. Se o assunto NÃO for andamento de processo (ex.: dúvida sobre pagamento, documento, agendar reunião de acompanhamento):
   a) Peça nome completo + CPF na mesma mensagem, chame \`lookup_existing_client\` com subject="outro" e message_summary.
   b) Depois, avise cordialmente que a equipe/advogado(a) responsável dará retorno em breve.
`;
          }

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
            (config.companies as any)?.timezone || "America/Sao_Paulo",
            clientContextBlock
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

              const baseDelay = 2000;
              const perChar = 40; // ms por caractere (~25 WPM)
              const delay = Math.min(baseDelay + (chunk.length * perChar), 8000);
              const jitter = Math.floor(Math.random() * 800) - 400;
              await new Promise((r) => setTimeout(r, Math.max(1500, delay + jitter)));

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

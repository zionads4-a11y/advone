import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSDRPrompt(config: any, leadName?: string) {
  const officeName = config.office_name || "o escritório";
  const practiceArea = config.practice_area || "";
  const tone = config.communication_tone || "moderado";
  const schedulingLink = config.scheduling_link || "";
  const consultationDuration = config.consultation_duration || "30 minutos";
  const targetAudience = config.target_audience || "";
  const customPrompt = config.ai_prompt || "";
  const triageOptions: any[] = Array.isArray(config.triage_options) ? config.triage_options : [];
  const leadNameInfo = leadName ? `\n\nNOME DO LEAD: O nome do lead é "${leadName}". Use este nome sempre que se referir a ele. NUNCA escreva {nome} literalmente — use "${leadName}" diretamente.\n` : `\n\nNOME DO LEAD: Você ainda não sabe o nome do lead. Pergunte o nome antes de personalizar as mensagens. NUNCA escreva {nome} literalmente.\n`;

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
Envie a saudação e o menu em mensagens SEPARADAS usando quebras de parágrafo (\\n\\n):

Bloco 1 (saudação acolhedora):
"Oi! Tudo bem? 😊

Seja bem-vindo(a)!

Eu sou a assistente virtual de ${officeName}${practiceArea ? `, especializado em ${practiceArea}` : ""}.

Pode ficar tranquilo(a), vou te ajudar a entender o que pode estar acontecendo no seu caso."

Bloco 2 (menu — mensagem separada):
"Me conta uma coisa 👇

Qual dessas situações mais parece com a sua?

${menuItems}

Pode me responder com o número ou escrevendo, como preferir 🙂"

⚠️ REGRA CRÍTICA: Aguarde o lead responder ANTES de continuar. Nunca envie o menu + perguntas na mesma resposta.

APÓS O LEAD ESCOLHER UMA OPÇÃO:
- Responda com empatia e validação do problema antes de continuar
- Peça o NOME do lead antes de iniciar as perguntas de qualificação
- Exemplo BPC: "Entendi 😊\\n\\nVamos falar sobre o BPC/LOAS então.\\n\\nAntes de continuar, como posso te chamar?"
- Exemplo RMC: "Certo, entendi…\\n\\nEsses descontos no benefício realmente preocupam muita gente.\\n\\nMe fala seu nome pra gente continuar?"
- Exemplo Demora: "Entendi… essa demora do INSS acaba sendo bem desgastante mesmo.\\n\\nMe diz seu nome pra eu te ajudar melhor 🙂"

APÓS SABER O NOME:
"Prazer, {nome}! 😊\\n\\nVou te fazer algumas perguntinhas rápidas, tá? É só pra entender melhor sua situação e te orientar da forma certa."

SCRIPT POR ASSUNTO (após o lead escolher):

${scripts}

⚠️ REGRA DE OURO: Faça UMA ÚNICA pergunta por mensagem. Espere a resposta. Só então faça a próxima.
Nunca acumule 2 ou mais perguntas na mesma mensagem.

GATILHO EMOCIONAL (usar após coletar informações, antes do agendamento):
- Valide a dor do lead: "Obrigado por me explicar, {nome}."
- Crie identificação: "Olha… muita gente passa exatamente por essa situação e acaba [consequência negativa] sem nem entender o motivo."
- Dê esperança: "Mas em vários casos dá sim pra reverter isso ou conseguir [benefício]."
- Autoridade: "O(a) Dr(a). já acompanha esse tipo de situação há muitos anos e costuma analisar isso com bastante cuidado."

PEDIDO DE DOCUMENTOS (usar com naturalidade):
- "Se você puder, me ajuda com uma coisa?"
- "Pra gente te orientar com mais segurança, seria importante dar uma olhada em alguns documentos."
- "Pode enviar por aqui mesmo:\\n\\n• documento com foto\\n• comprovante de endereço\\n• CadÚnico (se tiver)\\n• laudos médicos (se aplicável)\\n• negativa do INSS (se tiver)"
- "Assim a equipe já consegue fazer uma análise inicial pra você 🙂"
- ⚠️ Peça documentos em mensagem SEPARADA, de forma leve e opcional

SE O LEAD NÃO SE ENCAIXAR:
- Pergunte mais detalhes com empatia: "Entendi... me conta um pouquinho mais sobre a sua situação?"
- Se não for da área: "Poxa, esse assunto foge um pouco da nossa área 😔 Mas te recomendo procurar [recurso adequado]. Boa sorte! 🤞"
`;
  }

  const hasTriagem = triageOptions.length > 0;

  const todayStr = getTodayBrasilia();
  const nowBR = getNowBrasilia();
  const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const todayDayName = dayNames[nowBR.getDay()];

  return `Você é uma ATENDENTE HUMANA — a assistente virtual de ${officeName}${practiceArea ? `, especializado em ${practiceArea}` : ""}.

📆 DATA E HORA ATUAL: Hoje é ${todayDayName}, ${todayStr} (${String(nowBR.getHours()).padStart(2,"0")}:${String(nowBR.getMinutes()).padStart(2,"0")} horário de Brasília). USE ESTA DATA COMO REFERÊNCIA para "hoje", "amanhã", etc. NUNCA invente datas.
${leadNameInfo}
PERSONALIDADE E HUMANIZAÇÃO:
- Você conversa como uma pessoa REAL no WhatsApp — simpática, empática e acolhedora
- Você demonstra interesse genuíno pelo problema do lead
- Use expressões naturais e variadas: "entendi", "poxa", "que bom", "olha", "vamos lá", "me conta", "fica tranquilo(a)"
- Você NUNCA parece um robô ou um script automatizado
- Chame o lead pelo NOME assim que souber (torna a conversa pessoal)
- Mostre que está ouvindo: repita/reformule o que o lead disse antes de responder
- ${toneInstructions}

🚨 REGRA MAIS IMPORTANTE — UMA PERGUNTA POR VEZ:
- Envie APENAS UMA pergunta ou ideia por mensagem
- ESPERE o lead responder antes de fazer a próxima pergunta
- NUNCA acumule múltiplas perguntas na mesma mensagem
- Se precisar fazer 3 perguntas, faça em 3 turnos de conversa diferentes
- Cada mensagem sua deve ter NO MÁXIMO 2-3 linhas curtas

FORMATO DAS MENSAGENS (QUEBRAS INTELIGENTES):
- Escreva como no WhatsApp: frases curtas e diretas
- Separe ideias diferentes com linha em branco (\\n\\n) — cada bloco vira uma mensagem separada
- Use emojis com naturalidade mas sem exagero (1-2 por mensagem no máximo)
- Varie as expressões — NUNCA repita "perfeito", "entendi" ou "certo" consecutivamente
- Limite cada bloco a ~150 caracteres para simular digitação natural
- Quebre mensagens longas em 2-3 blocos menores separados por \\n\\n

TÉCNICAS DE ENVOLVIMENTO:
- Faça transições suaves entre perguntas: "E mais uma coisinha 🙏", "Agora me conta só pra eu entender melhor…"
- Use "fechamentos parciais": valide a resposta antes de seguir ("Entendi, {nome}… isso é bem comum mesmo.")
- Gere curiosidade: "Vou te contar uma coisa…", "Sabia que muita gente não sabe disso?"
- Crie urgência leve: "O ideal é analisar logo porque…"

OBJETIVO:
- Seu objetivo principal é qualificar o lead e conduzi-lo ao agendamento
- Você NÃO dá orientação jurídica vinculante (nunca diga "você tem direito" ou "vai ganhar a causa")
- MAS você PODE dar explicações conceituais curtas sobre termos jurídicos quando o lead perguntar — desde que siga a regra "QUANDO O LEAD PERGUNTAR ALGO JURÍDICO CONCEITUAL" (perguntar primeiro se já é cliente)

${targetAudience ? `PÚBLICO-ALVO: ${targetAudience}` : ""}

${customPrompt ? `INSTRUÇÕES DO ESCRITÓRIO:\n${customPrompt}` : ""}
${triagemBlock}
FLUXO NATURAL DA CONVERSA:

Turno 1: Saudação calorosa e acolhedora + apresentação breve
${hasTriagem ? "Turno 2: Menu de triagem (em mensagem separada)" : 'Turno 2: Pergunte "Me conta, o que tá acontecendo?"'}
Turno 3: Validação empática da escolha + pedir o nome
Turno 4: Saudação personalizada ("Prazer, {nome}!") + iniciar qualificação
Turnos seguintes: UMA pergunta por turno, seguindo o script do assunto
Penúltimo: Gatilho emocional + pedido de documentos (opcional)
Último: Conduza para agendamento enfatizando que é GRATUITO e personalizado

📅 AGENDAMENTO HUMANIZADO:
- Transição suave: "Perfeito, {nome} 🙂\\n\\nCom base no que você me falou, o ideal agora é uma conversa com a equipe pra te orientar direitinho."
- Pergunte a modalidade: "Como você prefere ser atendido?\\n\\n1️⃣ Online\\n2️⃣ Presencial"
- Após confirmar o agendamento: "Perfeito!\\n\\nJá vou encaminhar seu atendimento e você recebe a confirmação em instantes 🙂\\n\\nQualquer dúvida, pode me chamar por aqui."

⏰ HORÁRIO DE FUNCIONAMENTO (REGRA OBRIGATÓRIA):
- Agendamentos SOMENTE entre 08:00 e 17:00 (horário de Brasília)
- NUNCA sugira horários antes das 08:00 ou após as 17:00
- NUNCA mencione "início da noite" ou "noite" como opção — o escritório NÃO funciona à noite
- NUNCA diga "nosso atendimento é de segunda a sexta" ou mencione dias de funcionamento de forma genérica
- ATENÇÃO À HORA ATUAL: Agora são ${String(nowBR.getHours()).padStart(2,"0")}:${String(nowBR.getMinutes()).padStart(2,"0")}. Se for depois das 17:00, NÃO ofereça horários para hoje
- Se for antes das 08:00, os agendamentos de hoje só começam às 08:00

🔒 CAPTURA OBRIGATÓRIA DE NOME COMPLETO + CPF (SEMPRE ANTES DE AGENDAR):
- REGRA INVIOLÁVEL: ANTES de oferecer QUALQUER horário ou chamar check_availability/schedule_appointment, você DEVE OBRIGATORIAMENTE pedir, de forma educada e gentil: NOME COMPLETO (com sobrenomes — mínimo 3 palavras, ex: "João da Silva Santos") e CPF.
- Use SEMPRE um tom cordial, simpático e respeitoso. Nunca soe burocrático ou exigente.
- Mensagem padrão (use esta abordagem educada): "Que ótimo! 😊 Pra eu já deixar tudo certinho e organizado no nosso sistema antes de marcar seu horário, você poderia gentilmente me informar seu *nome completo* (com todos os sobrenomes) e o seu *CPF*, por favor?\\n\\nFica registrado com total sigilo, só com a gente. 🔒"
- Se o lead mandar só o primeiro nome ou nome incompleto (menos de 3 palavras), peça com muita educação: "Imagina, sem problemas! 😊 Só pra deixar tudo corretinho no sistema, você poderia me passar seu nome COMPLETO, com todos os sobrenomes, por gentileza?"
- Se vier só o CPF sem o nome (ou vice-versa), peça o que falta com cordialidade: "Perfeito, anotei! 🙂 Só falta seu *[nome completo / CPF]*, pode me passar por favor?"
- Quando receber CPF + nome completo, IMEDIATAMENTE chame a tool register_client_cpf passando AMBOS (cpf e full_name).
- INSISTA EDUCADAMENTE até 2 vezes para coletar os dados antes de agendar. Apenas se o lead recusar firmemente nas duas tentativas, você PODE prosseguir com o agendamento — avisando: "Sem problemas! Vou agendar pra você então. Só vou precisar confirmar seu nome completo e CPF na hora da reunião pra registrar o atendimento, combinado? 😊"
- A tool schedule_appointment funciona mesmo sem CPF/nome, mas marca o lead com pendência. SEMPRE PREFIRA coletar antes.

📅 ABORDAGEM DE AGENDAMENTO (REGRA OBRIGATÓRIA — fluxo exato):
1) Logo após registrar nome + CPF via register_client_cpf, envie EXATAMENTE estas duas frases (em mensagens SEPARADAS, sem juntar):
   • "Já estou registrando tudo aqui no sistema, [primeiro nome]. ✅"
   • "Podemos agendar a conversa com a Dra.? Qual o melhor horário pra você? 🙂"
2) Aguarde a resposta do lead com a preferência (ex: "amanhã de manhã", "hoje à tarde", "sexta às 14h", "qualquer horário").
3) Chame check_availability passando a data preferida (ou a próxima data útil se ele não citar).
4) **OFEREÇA SEMPRE APENAS 1 HORÁRIO** — o PRIMEIRO horário disponível mais próximo da preferência do lead (ou o primeiro do turno pedido, ou o primeiro do dia se ele disse "qualquer horário"). NUNCA liste 2 ou mais opções. NUNCA dê listas do tipo "Manhã: X / Tarde: Y".
5) Formato da oferta (mensagem única, curta): "Consegui esse horário pra você: 📅 [dia da semana], [DD/MM] às [HH:MM]. Confirmo pra você? 😊"
6) Se o lead recusar esse horário, pergunte "Qual horário ficaria melhor então?" e repita o ciclo, sempre oferecendo apenas o PRIMEIRO slot disponível compatível com a nova preferência.
7) Quando o lead confirmar, chame schedule_appointment com a data + hora exatas e responda: "Pronto, agendado! ✅ [dia], [DD/MM] às [HH:MM]."
8) IMPORTANTE: SEMPRE use datas no formato DD/MM/YYYY nas mensagens. NUNCA use YYYY-MM-DD.
9) NUNCA invente horários sem antes consultar check_availability.
10) FUSO HORÁRIO: Todos os horários são no horário de Brasília (BRT).

QUANDO O LEAD RESISTIR:
"Entendo! Mas olha, é totalmente gratuito e sem compromisso 😊 Leva menos de ${consultationDuration} e o(a) Dr(a). vai analisar pessoalmente se você tem direito. Vale muito a pena!"

🎓 QUANDO O LEAD PERGUNTAR ALGO JURÍDICO CONCEITUAL (ex: "o que é antecipação de tutela", "o que significa preclusão", "como funciona BPC", "o que é RMC", andamento de processo, decisão judicial, termos técnicos):

⚠️ REGRA INVIOLÁVEL — ANTES DE EXPLICAR QUALQUER DÚVIDA TÉCNICA, PERGUNTE SE JÁ É CLIENTE:
1️⃣ Primeiro turno (sempre): valide a dúvida com empatia E pergunte se já é cliente do escritório, em UMA mensagem curta.
   Exemplo: "Boa pergunta! 😊\\n\\nAntes de te explicar direitinho, me conta: você já é cliente aqui de ${officeName}, ou tá entrando em contato pela primeira vez?"

2️⃣ Se o lead disser que JÁ É CLIENTE:
   - NÃO explique o termo jurídico você mesma. Diga que vai transferir para a equipe responsável pelo caso.
   - "Entendi! 🙂\\n\\nComo já é cliente, vou pedir pra equipe responsável pelo seu processo te explicar com precisão o que essa decisão significa no seu caso específico, tá?\\n\\nUm momento que já te encaminho 🙏"
   - Em seguida chame a tool transfer_to_human com motivo "Cliente existente solicitando esclarecimento jurídico sobre o processo".

3️⃣ Se o lead disser que NÃO é cliente / é a primeira vez:
   - Dê uma explicação CURTA, didática e em linguagem simples (2-3 frases, sem juridiquês).
   - Exemplo para "antecipação de tutela": "Antecipação de tutela é quando o juiz concede um pedido logo no começo do processo, antes da decisão final, geralmente em casos urgentes. Quando NÃO é concedida, o processo continua normalmente e o juiz analisa tudo até a sentença final 🙂"
   - Em seguida, conduza com naturalidade para o agendamento: "Mas olha… cada caso tem detalhes próprios.\\n\\nSe quiser, o(a) Dr(a). pode analisar a sua situação numa conversa rápida e gratuita. Posso já deixar marcado pra você?"

4️⃣ Se o lead não souber responder se é cliente ou não:
   - Trate como NÃO cliente (item 3) e siga para agendamento.

⚠️ NUNCA dê opinião jurídica vinculante, nunca diga "você tem direito" ou "vai ganhar". Apenas explique o conceito de forma educativa e direcione ao agendamento.

⏰ LEMBRETES (quando aplicável):
- "Oi, {nome}! 😊\\n\\nPassando pra te lembrar do seu atendimento com a equipe daqui a pouco.\\n\\nSe puder, deixa seus documentos por perto, isso ajuda bastante.\\n\\nTe esperamos!"

🔁 FOLLOW-UP (quando o lead parou de responder):
- "Oi! 😊\\n\\nFiquei aqui pensando se você ainda precisa de ajuda com seu caso…\\n\\nSe quiser, me conta o que está acontecendo que eu te ajudo por aqui."

QUALIFICAÇÃO (ferramentas disponíveis):
- "check_availability": SEMPRE use antes de sugerir horários. Informe a data desejada.
- "schedule_appointment": Use APÓS o lead escolher um horário das opções apresentadas
- "qualify_lead": Use quando souber o suficiente sobre o caso
- "transfer_to_human": Quando necessário transferir para atendente humano

Responda SEMPRE em português do Brasil.`;
}

// ====== AGENT PROMPTS ======

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
    : "• Documento com foto (RG ou CNH)\n• CPF\n• Comprovante de endereço\n• Documentos do caso (laudos, negativas, etc.)";

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
4. Confirme dados do cliente (nome completo, CPF, endereço)
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
      const d = new Date(r.due_at);
      const brTime = new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      return `${String(brTime.getHours()).padStart(2, "0")}:${String(brTime.getMinutes()).padStart(2, "0")}`;
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
      name: "register_client_cpf",
      description: "Registra CPF + nome completo do cliente final. Use SEMPRE que o lead enviar esses dados. PREFERENCIALMENTE antes de schedule_appointment para evitar marcar o lead com pendência.",
      parameters: {
        type: "object",
        properties: {
          cpf: { type: "string", description: "CPF do cliente final, apenas números (11 dígitos válidos)" },
          full_name: { type: "string", description: "Nome COMPLETO do cliente (mínimo 3 palavras: nome + sobrenome do meio + último sobrenome). Ex: 'João da Silva Santos'" }
        },
        required: ["cpf", "full_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Verifica o PRIMEIRO horário disponível na agenda para a data e turno informados. SEMPRE use antes de sugerir horário ao lead. Retorna apenas 1 sugestão (first_available_slot). ATENÇÃO: só use APÓS ter registrado o CPF via register_client_cpf.",
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
      name: "schedule_appointment",
      description: "Agenda uma consulta/reunião para o lead. PRÉ-REQUISITO OBRIGATÓRIO: o CPF do cliente já deve ter sido registrado via register_client_cpf. Caso contrário, a chamada será rejeitada.",
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
          document_type: { type: "string", description: "Tipo do documento (ex: RG, CPF, comprovante_endereco, laudo_medico)" },
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
          client_cpf: { type: "string" },
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
    systemPrompt = buildSDRPrompt(config, leadName);
    tools = sdrTools;
  }

  try {
    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
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
          model: "google/gemini-2.5-flash-lite",
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
        if (fnName === "register_client_cpf") {
          const rawCpf = String(args.cpf || "").replace(/\D/g, "");
          const fullName = String(args.full_name || "").trim();
          const cpfOk = isValidCPF(rawCpf);
          const nameOk = isValidFullName(fullName);

          if (!cpfOk && !nameOk) {
            toolResult = { success: false, error: "CPF e nome inválidos. Peça novamente — CPF precisa ter 11 dígitos válidos e nome completo precisa ter pelo menos 3 palavras (nome + sobrenomes)." };
          } else if (!cpfOk) {
            toolResult = { success: false, error: "CPF inválido. Os dígitos não conferem — peça novamente, com calma." };
          } else if (!nameOk) {
            toolResult = { success: false, error: "Nome incompleto. Peça o nome COMPLETO com sobrenomes (mínimo 3 palavras, ex: 'João da Silva Santos')." };
          } else if (leadId) {
            await supabase.from("leads").update({
              cpf_cliente_final: rawCpf,
              name: fullName,
              pending_data_warning: null,
            }).eq("id", leadId);
            toolResult = { success: true, cpf_registered: rawCpf, full_name: fullName, message: "CPF e nome completo registrados. Agora você já pode chamar check_availability e agendar." };
          } else {
            toolResult = { success: false, error: "Lead não encontrado." };
          }
        }

        if (fnName === "check_availability") {
          hasCheckAvailability = true;
          let dateToCheck = args.date || getNextAvailableDays(1)[0];
          const availability = await getAvailableSlots(supabase, companyId, dateToCheck);

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
            const formattedDate = formatDateDMY(dateToCheck);
            toolResult = { requested_date: formattedDate, requested_day: availability.dayName, available_slots: [], message: `Não há horários disponíveis em ${availability.dayName} (${formattedDate}).`, alternatives };
          } else {
            const formattedDate = formatDateDMY(dateToCheck);
            toolResult = { date: formattedDate, day_name: availability.dayName, available_slots: availability.slots, total_available: availability.slots.length };
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
          // 🔒 Verificar dados do lead — agendar SEMPRE, mas marcar pendência se faltar
          let pendingItems: string[] = [];
          let leadCheckRow: any = null;
          if (leadId) {
            const { data: leadCheck } = await supabase
              .from("leads")
              .select("cpf_cliente_final, name")
              .eq("id", leadId)
              .maybeSingle();
            leadCheckRow = leadCheck;
            const cpfStored = String(leadCheck?.cpf_cliente_final || "").replace(/\D/g, "");
            if (!isValidCPF(cpfStored)) pendingItems.push("CPF");
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
          // 🔒 Validar CPF obrigatório também aqui
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

          if (!finalCpf) {
            toolResult = {
              success: false,
              error: "CPF_REQUIRED",
              message: "Não posso finalizar o contrato sem o CPF do cliente. Peça o CPF e use register_client_cpf antes.",
            };
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
            continue;
          }

          replyText = args.message_to_lead || "Contrato finalizado! 🎉";
          const updates: any = { contract_status: "signed", bot_agent_phase: "completed", cpf_cliente_final: finalCpf };
          if (args.client_cpf) updates.cpf = finalCpf;
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
            client_cpf: finalCpf,
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
              const alertMessage = `🎉 *Contrato Fechado Automaticamente!*\n\n👤 Cliente: ${args.client_full_name || leadName || "N/A"}\n${args.client_cpf ? `📄 CPF: ${args.client_cpf}\n` : ""}${args.contract_value ? `💰 Valor: R$ ${args.contract_value}\n` : ""}\n_Fechado automaticamente pelo bot de contrato_`;
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

    return replyText || null;
  } catch (error) {
    console.error("AI agent error:", error);
    return null;
  }
}

async function enrollInCadence(supabase: any, companyId: string, leadId: string, phone: string) {
  const { data: existing } = await supabase.from("cadence_messages").select("id")
    .eq("lead_id", leadId).eq("status", "pending").limit(1);
  if (existing && existing.length > 0) return;

  const now = new Date();
  // Cadência: 10 minutos para o 1º Follow-UP, depois 1 mensagem por dia até o 5º (~5 dias).
  const delaysMs = [
    10 * 60 * 1000,           // 1º FU: 10 minutos
    24 * 60 * 60 * 1000,      // 2º FU: 1 dia
    2 * 24 * 60 * 60 * 1000,  // 3º FU: 2 dias
    3 * 24 * 60 * 60 * 1000,  // 4º FU: 3 dias
    4 * 24 * 60 * 60 * 1000,  // 5º FU: 4 dias
  ];
  const messages = delaysMs.map((delayMs, i) => ({
    company_id: companyId, lead_id: leadId, phone, day_number: i + 1,
    scheduled_at: new Date(now.getTime() + delayMs).toISOString(), status: "pending",
  }));

  const { error } = await supabase.from("cadence_messages").insert(messages);
  if (error) console.error("Error enrolling in cadence:", error);
  else console.log(`Lead ${leadId} enrolled in cadence`);
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

    if (isUaZapiMessage) {
      const msg = body.message;
      phone = msg.sender_pn || msg.chatid || "";
      senderName = msg.senderName || body.chat?.name || body.chat?.wa_contactName || "";
      messageText = msg.text || msg.content || msg.caption || "[mídia]";
      messageIdExternal = msg.messageid || msg.id || "";
      isGroup = msg.isGroup || false;
    } else {
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
      const { data: click } = await supabase.from("tracking_clicks")
        .select("id, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
        .eq("tracking_code", trackingCode).is("lead_id", null).maybeSingle();

      if (click) {
        utmData = {
          utm_source: click.utm_source || undefined, utm_medium: click.utm_medium || undefined,
          utm_campaign: click.utm_campaign || undefined, utm_content: click.utm_content || undefined,
          utm_term: click.utm_term || undefined,
        };
        const src = (click.utm_source || "").toLowerCase();
        if (src.includes("google") || src === "gads") detectedSource = "google";
        else if (src.includes("meta") || src.includes("facebook") || src.includes("instagram")) detectedSource = "meta";
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
    await supabase.from("whatsapp_messages").insert({
      company_id: companyId, lead_id: leadId || null, phone: cleanPhone,
      message_text: messageText, direction: "incoming", sender_name: senderName,
      message_id_external: messageIdExternal,
      timestamp: body.mompiont ? new Date(body.mompiont * 1000).toISOString() : new Date().toISOString(),
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

          const { data: leadData } = await supabase.from("leads").select("name").eq("id", leadId).single();
          const currentLeadName = leadData?.name || senderName || undefined;

          const { data: recentMsgs } = await supabase.from("whatsapp_messages")
            .select("message_text, direction").eq("company_id", companyId)
            .eq("phone", cleanPhone).order("timestamp", { ascending: false }).limit(15);

          const history = (recentMsgs || []).reverse().map((m: any) => ({
            role: m.direction === "incoming" ? "user" : "assistant",
            content: m.message_text || "",
          }));

          const aiReply = await handleAgentPhase(
            effectivePhase, config, agentConfigs, history,
            companyId, leadId, supabase, currentLeadName, cleanPhone
          );

          if (aiReply) {
            const SERVER_URL = "https://ziondigital.uazapi.com";
            const ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");
            const sendHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (ADMIN_TOKEN) sendHeaders["admintoken"] = ADMIN_TOKEN;

            const instanceParam = encodeURIComponent(config.zapi_instance_id);
            const tokenParam = encodeURIComponent(config.zapi_token || config.zapi_instance_id);
            const sendUrl = `${SERVER_URL}/send/text?instance=${instanceParam}&token=${tokenParam}`;

            const splitMessages = splitIntoNaturalMessages(aiReply);
            console.log(`[${effectivePhase}] Sending ${splitMessages.length} message(s) to:`, cleanPhone);

            for (let i = 0; i < splitMessages.length; i++) {
              const chunk = splitMessages[i].trim();
              if (!chunk) continue;

              if (i > 0) {
                const delayMs = Math.min(1000 + chunk.length * 30, 3500);
                await new Promise((r) => setTimeout(r, delayMs));
              }

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

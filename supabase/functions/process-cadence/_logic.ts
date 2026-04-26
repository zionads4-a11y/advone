// Pure logic for process-cadence, extracted for unit testing.

export const MAX_CADENCE_ATTEMPTS = 5;

// Cadência alinhada ao funil Kanban: 1=10min, 2=1d, 3=2d, 4=3d, 5=4d
export const CADENCE_MESSAGES: Record<number, string> = {
  1: "Oi, {nome} 🙂\n\nFiquei te esperando aqui…\n\nDependendo do seu caso, pode ter algo importante que vale a pena ver agora.\n\nMe chama que eu continuo te ajudando 👇",
  2: "Oi, {nome} 🙂\n\nOntem eu fiquei pensando no que você me falou…\n\nMuita gente só descobre que tem direito quando analisa melhor o caso.\n\nSe quiser, posso te explicar rapidinho ou já ver um horário com a equipe.",
  3: "Oi, {nome} 🙂\n\nSó te dando um toque…\n\nDependendo da situação, esperar pode acabar atrasando ou até fazendo você perder algo importante.\n\nSe quiser retomar, me chama aqui que te ajudo 👇",
  4: "Oi, {nome}.\n\nVou ser bem direto com você…\n\nJá vi muitos casos parecidos com o seu que tinham solução — e a pessoa nem imaginava.\n\nPosso te encaixar em uma análise rápida com a equipe e você já entende exatamente o que pode fazer.",
  5: "Oi, {nome} 🙂\n\nVou encerrar por aqui pra não ficar te incomodando.\n\nMas se quiser retomar depois, é só me chamar — pode ser que ainda dê tempo de resolver seu caso.\n\nFico à disposição 🙂",
};

export const INACTIVITY_NUDGES: { minutesAfter: number; message: string }[] = [
  {
    minutesAfter: 30,
    message: "Oi! Ainda estou por aqui 😊\n\nSe tiver qualquer dúvida, pode me perguntar. Estou aqui pra te ajudar!",
  },
  {
    minutesAfter: 90,
    message: "Ei, tudo bem? 🙂\n\nVi que a gente estava conversando… se quiser continuar, é só me responder!\n\nPosso te ajudar a agendar uma análise gratuita do seu caso.",
  },
  {
    minutesAfter: 150,
    message: "Oi! Passando aqui de novo 😊\n\nSeu caso pode ter solução, sabia? Muita gente na mesma situação já conseguiu resolver.\n\nQuer que eu te encaixe na agenda? É rápido e sem compromisso!",
  },
  {
    minutesAfter: 180,
    message: "Última mensagem por hoje, prometo 😅\n\nSe mudar de ideia, é só me chamar aqui. A consulta é gratuita e o advogado analisa seu caso pessoalmente.\n\nEstou por aqui! 🙂",
  },
];

// ─────────────────────────────────────────────────────────────
// Tópicos detectáveis para fallback inteligente e estado da conversa
// ─────────────────────────────────────────────────────────────
export type OpenTopic =
  | "schedule_time"      // bot perguntou manhã/tarde/horário
  | "modality"           // bot perguntou online/presencial
  | "personal_data"      // bot pediu nome/CPF/dados
  | "scheduling_link"    // bot mandou link e está esperando confirmação
  | "office_choice"      // bot perguntou qual unidade
  | "greeting"           // bot só cumprimentou / perguntou se pode ajudar
  | "other";

/**
 * Detecta o tópico em aberto a partir da ÚLTIMA mensagem que o bot enviou.
 * Determinístico, sem IA — barato.
 */
export function detectOpenTopic(lastBotMessage: string | null | undefined): OpenTopic {
  if (!lastBotMessage) return "other";
  const t = lastBotMessage.toLowerCase();

  // Horário (manhã/tarde/quando)
  if (
    /\b(manh[ãa]|tarde|noite|fim do dia|final do dia)\b/.test(t) ||
    /\bque hor[áa]rio\b/.test(t) ||
    /\bque hora\b/.test(t) ||
    /\bmelhor hor[áa]rio\b/.test(t) ||
    /\bprefere.*(manh|tarde|hor)/.test(t)
  ) {
    return "schedule_time";
  }

  // Modalidade
  if (
    /\b(online|presencial|v[íi]deo|chamada de v[íi]deo|google meet|zoom)\b/.test(t) &&
    /(prefere|fica melhor|gostaria|consegue|faz por|pode ser)/.test(t)
  ) {
    return "modality";
  }

  // Unidade
  if (/(qual unidade|qual escrit[óo]rio|qual filial)/.test(t)) {
    return "office_choice";
  }

  // Dados pessoais
  if (
    /\b(nome completo|cpf|seu nome)\b/.test(t) ||
    /\bme passa.*(nome|cpf|dados)\b/.test(t)
  ) {
    return "personal_data";
  }

  // Link de agendamento já enviado
  if (/(https?:\/\/|calendly|cal\.com|agendaaqui)/.test(t)) {
    return "scheduling_link";
  }

  // Saudação/abertura
  if (
    /\b(ol[áa]|oi|bom dia|boa tarde|boa noite)\b/.test(t) &&
    /\b(posso te ajudar|como posso ajudar|tudo bem)\b/.test(t)
  ) {
    return "greeting";
  }

  return "other";
}

/**
 * Tenta extrair a pergunta exata do bot (última frase com "?").
 * Usado para guardar como `open_question` no audit.
 */
export function extractOpenQuestion(lastBotMessage: string | null | undefined): string | null {
  if (!lastBotMessage) return null;
  const sentences = lastBotMessage.split(/(?<=[.?!\n])\s+/);
  const questions = sentences.filter((s) => s.trim().endsWith("?"));
  if (questions.length === 0) return null;
  return questions[questions.length - 1].trim().slice(0, 200);
}

/**
 * Fallback por tópico: usado se a IA falhar.
 * Mensagens curtas que retomam o assunto sem soar genérico.
 */
export const TOPIC_FALLBACKS: Record<OpenTopic, string> = {
  schedule_time:
    "Oi {nome}, tudo certo? 🙂 Só pra retomar: manhã ou tarde fica melhor pra você?",
  modality:
    "Oi {nome}! Ainda dá pra a gente acertar — prefere online ou presencial?",
  personal_data:
    "Oi {nome}, voltei aqui rapidinho 🙂 Pra eu já reservar pra você, me confirma seu nome completo e CPF?",
  scheduling_link:
    "Oi {nome}! Conseguiu abrir o link do agendamento? Se preferir, eu mesma te encaixo aqui pelo WhatsApp.",
  office_choice:
    "Oi {nome}! Qual unidade fica melhor pra você?",
  greeting:
    "Oi {nome}! Estou por aqui ainda 🙂 Quer que eu te explique como funciona ou já marcamos uma conversa rápida?",
  other:
    "Oi {nome}! Voltei rapidinho aqui 🙂 Conseguiu pensar no que conversamos?",
};

export function renderTopicFallback(topic: OpenTopic, leadName: string | null | undefined): string {
  const tpl = TOPIC_FALLBACKS[topic] ?? TOPIC_FALLBACKS.other;
  const name = (leadName || "").trim().split(" ")[0] || "tudo bem";
  return tpl.replaceAll("{nome}", name);
}

/** Replace {nome} placeholder, falling back to a friendly default. */
export function renderCadenceMessage(dayNumber: number, leadName: string | null | undefined): string {
  const template = CADENCE_MESSAGES[dayNumber];
  if (!template) return "";
  const name = (leadName || "tudo bem").trim().split(" ")[0] || "tudo bem";
  return template.replaceAll("{nome}", name);
}

/**
 * Returns the inactivity nudge that should be sent given how many minutes
 * have elapsed since the last outgoing message, or null if none applies.
 * Picks the highest threshold whose minutesAfter <= elapsedMinutes.
 */
export function selectInactivityNudge(elapsedMinutes: number): { minutesAfter: number; message: string } | null {
  let chosen: { minutesAfter: number; message: string } | null = null;
  for (const n of INACTIVITY_NUDGES) {
    if (elapsedMinutes >= n.minutesAfter) {
      if (!chosen || n.minutesAfter > chosen.minutesAfter) chosen = n;
    }
  }
  return chosen;
}

/** Compute next cadence attempt scheduling delay (in ms) based on current attempt number. */
export function nextCadenceDelayMs(currentAttempt: number): number | null {
  // 1 → 10min after first contact, 2..5 → 1d gap each subsequent
  const next = currentAttempt + 1;
  if (next > MAX_CADENCE_ATTEMPTS) return null;
  if (next === 1) return 10 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

/**
 * Normaliza para comparação: lowercase, sem acentos, sem pontuação, espaços únicos.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Similaridade Jaccard (palavras únicas).
 * Usado como pré-filtro barato ANTES de chamar IA validadora.
 * 0 = totalmente diferente, 1 = idêntico.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const wa = new Set(normalize(a).split(" ").filter(Boolean));
  const wb = new Set(normalize(b).split(" ").filter(Boolean));
  if (wa.size === 0 && wb.size === 0) return 1;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Considera "muito parecida" se Jaccard >= 0.7 OU se a normalização for idêntica.
 */
export function isTooSimilar(candidate: string, previous: string, threshold = 0.7): boolean {
  if (!candidate || !previous) return false;
  if (normalize(candidate) === normalize(previous)) return true;
  return jaccardSimilarity(candidate, previous) >= threshold;
}

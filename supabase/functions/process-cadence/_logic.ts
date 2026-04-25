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

// Pure logic for process-reminders, extracted for unit testing.

export interface ReminderWindow {
  column: "reminder_6h_sent" | "reminder_2h_sent" | "reminder_30m_sent";
  hoursBeforeMin: number;
  hoursBeforeMax: number;
  getMessage: (name: string, dateStr: string, timeStr: string) => string;
}

export const REMINDER_WINDOWS: ReminderWindow[] = [
  {
    // 5h antes — Reciprocidade
    column: "reminder_6h_sent",
    hoursBeforeMin: 4.5,
    hoursBeforeMax: 6,
    getMessage: (name, dateStr, timeStr) =>
      `Olá, ${name}! 👋\n\nPassando aqui para te avisar que o(a) Dr(a). responsável pelo seu atendimento *já foi informado(a)* sobre nossa conversa de hoje (${dateStr} às *${timeStr}*) e já está separando tudo para te ajudar a resolver o seu caso da melhor forma. ⚖️✨\n\nFoi reservado um horário exclusivo para você, então conto com a sua presença! 🤝`,
  },
  {
    // 1h antes — Compromisso ativo
    column: "reminder_2h_sent",
    hoursBeforeMin: 0.85,
    hoursBeforeMax: 1.5,
    getMessage: (name, _dateStr, timeStr) =>
      `${name}, falta *1 hora* para o seu atendimento com o(a) advogado(a)! ⏰\n\n📅 Horário: *${timeStr}*\n\nPara aproveitarmos cada minuto e já sair com encaminhamentos concretos, peço que você:\n\n✅ Separe os *documentos* relacionados ao seu caso (mesmo que sejam fotos pelo celular)\n✅ Anote suas *dúvidas* principais\n✅ Esteja em um lugar *tranquilo* na hora da ligação\n\nMe responde aqui com um *"vou estar pronto(a)"* só para eu confirmar com o(a) Dr(a)? 😉`,
  },
  {
    // 30min antes — Iminência
    column: "reminder_30m_sent",
    hoursBeforeMin: 0.25,
    hoursBeforeMax: 0.6,
    getMessage: (name, _dateStr, timeStr) =>
      `${name}, é AGORA! 🚨\n\nO(A) Dr(a). já está *preparando a sala* e em *25 minutos* vai entrar em contato com você (horário marcado: *${timeStr}*).\n\n📱 Deixe o celular por perto e o WhatsApp aberto\n📄 Documentos em mãos\n🔇 Ambiente em silêncio\n\nNos falamos em instantes! 👨‍⚖️✨`,
  },
];

export function formatDateBR(date: Date): string {
  const days = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const d = date.getUTCDate().toString().padStart(2, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${days[date.getUTCDay()]}, ${d}/${m}`;
}

export function formatTimeBR(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, "0");
  const min = date.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${min}`;
}

/**
 * Returns the reminder window that applies for a meeting due at `dueAt`,
 * relative to `now`, or null if no window matches or the corresponding
 * reminder is already marked as sent.
 */
export function selectReminderWindow(
  now: Date,
  dueAt: Date,
  sentFlags: { reminder_6h_sent?: boolean; reminder_2h_sent?: boolean; reminder_30m_sent?: boolean }
): ReminderWindow | null {
  const hoursUntil = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return null;
  for (const w of REMINDER_WINDOWS) {
    if (hoursUntil >= w.hoursBeforeMin && hoursUntil <= w.hoursBeforeMax) {
      if (!sentFlags[w.column]) return w;
    }
  }
  return null;
}

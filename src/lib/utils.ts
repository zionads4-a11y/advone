import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte um par data + hora (digitado pelo usuário) para um ISO timestamp
 * SEMPRE assumindo horário de Brasília (BRT, UTC-3), independente do fuso do navegador.
 *
 * Garante que "10:40" digitado seja salvo como 10:40 BRT no banco — não importando se
 * o operador está em Belém, São Paulo, Lisboa ou com o relógio do PC errado.
 *
 * @param date  "YYYY-MM-DD"
 * @param time  "HH:mm" (24h)
 * @returns ISO 8601 com offset -03:00 (ex: "2025-04-26T10:40:00-03:00")
 */
export function brtDateTimeToIso(date: string, time: string): string {
  const safeTime = time && time.length === 5 ? `${time}:00` : time || "00:00:00";
  return `${date}T${safeTime}-03:00`;
}

/**
 * Mesmo conceito do brtDateTimeToIso, mas aceita um único string "YYYY-MM-DDTHH:mm"
 * (formato do <input type="datetime-local" />) e devolve ISO em BRT.
 */
export function brtLocalInputToIso(localValue: string): string {
  if (!localValue) return localValue;
  // datetime-local format: "2025-04-26T10:40"
  const [d, t = "00:00"] = localValue.split("T");
  return brtDateTimeToIso(d, t);
}


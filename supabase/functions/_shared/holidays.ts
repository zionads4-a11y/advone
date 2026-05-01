// Feriados Nacionais Brasileiros — usado pelo bot para não oferecer agendamento em feriados.
// Inclui feriados fixos + móveis (Carnaval, Sexta-Santa, Páscoa, Corpus Christi).

function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Retorna Set com YYYY-MM-DD de todos os feriados nacionais brasileiros do ano.
 */
export function getBrazilianHolidaySet(year: number): Set<string> {
  const easter = calculateEaster(year);
  const carnival = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  return new Set<string>([
    `${year}-01-01`,            // Confraternização Universal
    fmt(carnival),              // Carnaval
    fmt(goodFriday),            // Sexta-feira Santa
    fmt(easter),                // Páscoa
    `${year}-04-21`,            // Tiradentes
    `${year}-05-01`,            // Dia do Trabalho
    fmt(corpusChristi),         // Corpus Christi
    `${year}-09-07`,            // Independência
    `${year}-10-12`,            // Nossa Senhora Aparecida
    `${year}-11-02`,            // Finados
    `${year}-11-15`,            // Proclamação da República
    `${year}-11-20`,            // Consciência Negra
    `${year}-12-25`,            // Natal
  ]);
}

/**
 * Retorna true se a string YYYY-MM-DD for feriado nacional.
 */
export function isBrazilianHolidayStr(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (!year) return false;
  return getBrazilianHolidaySet(year).has(dateStr);
}

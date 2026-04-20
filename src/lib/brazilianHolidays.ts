/**
 * Feriados Nacionais Brasileiros (Lei Federal nº 662/1949 e Lei nº 6.802/1980)
 * Inclui feriados fixos e móveis (calculados a partir da Páscoa via algoritmo de Meeus/Jones/Butcher)
 */

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: "national" | "optional";
}

/**
 * Calcula o domingo de Páscoa para um ano (algoritmo de Meeus/Jones/Butcher).
 */
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
 * Retorna a lista de feriados nacionais para um determinado ano.
 */
export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = calculateEaster(year);
  const carnival = addDays(easter, -47); // Terça de Carnaval
  const carnivalMonday = addDays(easter, -48);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  return [
    { date: `${year}-01-01`, name: "Confraternização Universal", type: "national" },
    { date: fmt(carnivalMonday), name: "Carnaval (segunda)", type: "optional" },
    { date: fmt(carnival), name: "Carnaval", type: "national" },
    { date: fmt(goodFriday), name: "Sexta-feira Santa", type: "national" },
    { date: fmt(easter), name: "Páscoa", type: "national" },
    { date: `${year}-04-21`, name: "Tiradentes", type: "national" },
    { date: `${year}-05-01`, name: "Dia do Trabalho", type: "national" },
    { date: fmt(corpusChristi), name: "Corpus Christi", type: "optional" },
    { date: `${year}-09-07`, name: "Independência do Brasil", type: "national" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida", type: "national" },
    { date: `${year}-11-02`, name: "Finados", type: "national" },
    { date: `${year}-11-15`, name: "Proclamação da República", type: "national" },
    { date: `${year}-11-20`, name: "Dia da Consciência Negra", type: "national" },
    { date: `${year}-12-25`, name: "Natal", type: "national" },
  ];
}

/**
 * Retorna o feriado correspondente a uma data, ou null se não for feriado.
 */
export function getHolidayForDate(date: Date): Holiday | null {
  const key = fmt(date);
  const holidays = getBrazilianHolidays(date.getFullYear());
  return holidays.find((h) => h.date === key) || null;
}

/**
 * Retorna true se a data for um feriado nacional (não opcional).
 */
export function isBrazilianHoliday(date: Date): boolean {
  const holiday = getHolidayForDate(date);
  return holiday?.type === "national";
}

/**
 * Retorna um Set com todas as datas (YYYY-MM-DD) que são feriados em um ano específico.
 */
export function getHolidayDateSet(year: number): Set<string> {
  return new Set(getBrazilianHolidays(year).filter((h) => h.type === "national").map((h) => h.date));
}

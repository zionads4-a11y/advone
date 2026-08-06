// Utilitários para número único de processo (CNJ — Resolução 65/2008)
// Formato: NNNNNNN-DD.AAAA.J.TR.OOOO

const TJ_UF: Record<string, string> = {
  "01": "AC", "02": "AL", "03": "AP", "04": "AM", "05": "BA", "06": "CE",
  "07": "DF", "08": "ES", "09": "GO", "10": "MA", "11": "MT", "12": "MS",
  "13": "MG", "14": "PA", "15": "PB", "16": "PR", "17": "PE", "18": "PI",
  "19": "RJ", "20": "RN", "21": "RS", "22": "RO", "23": "RR", "24": "SC",
  "25": "SP", "26": "SE", "27": "TO",
};

export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

/** Aplica a máscara 0000000-00.0000.0.00.0000 conforme o usuário digita */
export function maskCnj(value: string): string {
  const d = onlyDigits(value).slice(0, 20);
  let out = d.slice(0, 7);
  if (d.length > 7) out += "-" + d.slice(7, 9);
  if (d.length > 9) out += "." + d.slice(9, 13);
  if (d.length > 13) out += "." + d.slice(13, 14);
  if (d.length > 14) out += "." + d.slice(14, 16);
  if (d.length > 16) out += "." + d.slice(16, 20);
  return out;
}

/** Dígito verificador (módulo 97 base 10 — ISO 7064) */
export function cnjCheckDigits(digits20: string): string | null {
  const d = onlyDigits(digits20);
  if (d.length !== 20) return null;
  const numero = d.slice(0, 7);
  const ano = d.slice(9, 13);
  const segmento = d.slice(13, 14);
  const tribunal = d.slice(14, 16);
  const origem = d.slice(16, 20);
  const base = `${numero}${ano}${segmento}${tribunal}${origem}00`;
  // mod 97 em blocos para evitar overflow
  let rest = 0;
  for (const ch of base) rest = (rest * 10 + Number(ch)) % 97;
  const dv = 98 - rest;
  return String(dv).padStart(2, "0");
}

export function tribunalLabel(digits20: string): string | null {
  const d = onlyDigits(digits20);
  if (d.length !== 20) return null;
  const segmento = d.charAt(13);
  const tribunal = d.substring(14, 16);
  switch (segmento) {
    case "1": return "STF";
    case "3": return "STJ";
    case "4": return `TRF${parseInt(tribunal, 10)}`;
    case "5": return tribunal === "00" ? "TST" : `TRT${parseInt(tribunal, 10)}`;
    case "6": return tribunal === "00" ? "TSE" : `TRE-${TJ_UF[tribunal] ?? tribunal}`;
    case "7": return "STM";
    case "8": {
      const uf = TJ_UF[tribunal];
      return uf ? `TJ${uf}` : null;
    }
    default: return null;
  }
}

export interface CnjValidation {
  valid: boolean;
  /** 20 dígitos normalizados (quando houver) */
  digits: string;
  /** formato com máscara */
  formatted: string;
  tribunal: string | null;
  error?: string;
}

export function validateCnj(value: string): CnjValidation {
  const digits = onlyDigits(value);
  const formatted = maskCnj(digits);
  const base = { digits, formatted, tribunal: tribunalLabel(digits) };

  if (digits.length === 0) {
    return { ...base, valid: false, error: "Informe o número do processo." };
  }
  if (digits.length < 20) {
    return {
      ...base,
      valid: false,
      error: `Número incompleto: ${digits.length} de 20 dígitos. Use o formato 0000000-00.0000.0.00.0000.`,
    };
  }
  if (digits.length > 20) {
    return { ...base, valid: false, error: "Número inválido: mais de 20 dígitos." };
  }

  const ano = Number(digits.slice(9, 13));
  const anoAtual = new Date().getFullYear();
  if (ano < 1900 || ano > anoAtual + 1) {
    return { ...base, valid: false, error: `Ano do processo inválido (${ano}).` };
  }

  if (!base.tribunal) {
    return { ...base, valid: false, error: "Segmento/tribunal do CNJ não reconhecido." };
  }

  const expected = cnjCheckDigits(digits);
  if (expected && expected !== digits.slice(7, 9)) {
    return {
      ...base,
      valid: false,
      error: `Dígito verificador inválido (esperado ${expected}). Confira o número digitado.`,
    };
  }

  return { ...base, valid: true };
}

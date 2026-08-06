// Helper compartilhado para integração com DataJud (CNJ)
// API pública: https://api-publica.datajud.cnj.jus.br

const TJ_UF: Record<string, string> = {
  "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce",
  "07": "df", "08": "es", "09": "go", "10": "ma", "11": "mt", "12": "ms",
  "13": "mg", "14": "pa", "15": "pb", "16": "pr", "17": "pe", "18": "pi",
  "19": "rj", "20": "rn", "21": "rs", "22": "ro", "23": "rr", "24": "sc",
  "25": "sp", "26": "se", "27": "to",
};

export function normalizeCnj(cnj: string): string {
  return (cnj || "").replace(/\D/g, "");
}

// Retorna alias do tribunal (ex: "tjsp", "trf3", "trt2", "tst", "stj") a partir do CNJ
export function tribunalFromCnj(cnj: string): string | null {
  const c = normalizeCnj(cnj);
  if (c.length !== 20) return null;
  // NNNNNNN DD AAAA J TR OOOO  (7+2+4+1+2+4)
  const segmento = c.charAt(13);
  const tribunal = c.substring(14, 16);
  switch (segmento) {
    case "1": return "stf";
    case "3": return "stj";
    case "4": return `trf${parseInt(tribunal, 10)}`; // TRF1..TRF6
    case "5":
      if (tribunal === "00") return "tst";
      return `trt${parseInt(tribunal, 10)}`;
    case "6":
      if (tribunal === "00") return "tse";
      return `tre-${TJ_UF[tribunal] ?? tribunal}`;
    case "7": return "stm";
    case "8": {
      const uf = TJ_UF[tribunal];
      return uf ? `tj${uf}` : null;
    }
    default: return null;
  }
}

export function datajudEndpoint(alias: string): string {
  return `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`;
}

export interface DatajudMovimento {
  codigo?: number;
  nome?: string;
  dataHora?: string;
  complementosTabelados?: Array<{ nome?: string; descricao?: string }>;
}

export interface DatajudHit {
  numeroProcesso: string;
  classe?: { codigo?: number; nome?: string };
  assuntos?: Array<{ codigo?: number; nome?: string }>;
  tribunal?: string;
  orgaoJulgador?: { nome?: string };
  dataAjuizamento?: string;
  movimentos?: DatajudMovimento[];
  grau?: string;
}

export async function fetchProcessFromDatajud(
  cnj: string,
  apiKey: string,
): Promise<{ hit: DatajudHit | null; alias: string | null; raw: unknown }> {
  const alias = tribunalFromCnj(cnj);
  if (!alias) return { hit: null, alias: null, raw: null };

  const body = {
    query: { match: { numeroProcesso: normalizeCnj(cnj) } },
    size: 1,
  };

  const resp = await fetch(datajudEndpoint(alias), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `APIKey ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DataJud ${alias} ${resp.status}: ${text.slice(0, 300)}`);
  }

  const json = await resp.json();
  const hit = json?.hits?.hits?.[0]?._source ?? null;
  return { hit, alias, raw: json };
}

// Hash estável da movimentação (para dedupe)
export async function movementHash(m: DatajudMovimento): Promise<string> {
  const src = `${m.dataHora ?? ""}|${m.codigo ?? ""}|${m.nome ?? ""}|${(m.complementosTabelados ?? []).map((c) => c.descricao ?? c.nome ?? "").join(",")}`;
  const buf = new TextEncoder().encode(src);
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function movimentoTexto(m: DatajudMovimento): string {
  const compls = (m.complementosTabelados ?? [])
    .map((c) => c.descricao || c.nome)
    .filter(Boolean)
    .join(" • ");
  return [m.nome, compls].filter(Boolean).join(" — ");
}

// Busca TODAS as instâncias/graus do processo (1º grau, 2º grau, recursos internos)
export async function fetchAllProcessDegrees(
  cnj: string,
  apiKey: string,
): Promise<{ hits: DatajudHit[]; alias: string | null }> {
  const alias = tribunalFromCnj(cnj);
  if (!alias) return { hits: [], alias: null };

  const resp = await fetch(datajudEndpoint(alias), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `APIKey ${apiKey}` },
    body: JSON.stringify({
      query: { match: { numeroProcesso: normalizeCnj(cnj) } },
      size: 20,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DataJud ${alias} ${resp.status}: ${text.slice(0, 300)}`);
  }

  const json = await resp.json();
  const hits: DatajudHit[] = (json?.hits?.hits ?? []).map((h: { _source: DatajudHit }) => h._source).filter(Boolean);
  return { hits, alias };
}

// Códigos CNJ (Tabela Processual Unificada) de atos decisórios
const DECISION_CODES = new Set([
  193, 196, 219, 220, 221, 222, 226, 228, 229, 230, 231, 232, 233, 234, 235, 236,
  237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 455, 456, 457, 458, 459, 460,
  461, 462, 463, 464, 465, 466, 471, 848, 849, 850, 851, 852, 853, 854, 855, 856,
  857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872,
  873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888,
  889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 901, 902, 903, 904,
  905, 906, 907, 908, 909, 910, 911, 912, 971, 972, 973, 974, 975, 976, 977, 978,
  979, 980, 981, 982, 983, 984, 985, 11009, 11383, 12250, 12251, 12252, 12253,
  12254, 12255, 12256, 12257, 12258, 12259,
]);

const DECISION_WORDS = [
  "senten", "decis", "acórd", "acord", "julgad", "julgament", "homolog",
  "improced", "proced", "extin", "liminar", "tutela", "despach", "monocrátic",
  "provido", "provimento", "recurso", "trânsito em julgado", "transitado",
  "arquivad", "condena", "absolv", "indefer", "defer", "voto",
];

export function isDecisionMovement(m: DatajudMovimento): boolean {
  if (m.codigo && DECISION_CODES.has(m.codigo)) return true;
  const txt = `${m.nome ?? ""} ${(m.complementosTabelados ?? []).map((c) => c.descricao ?? c.nome ?? "").join(" ")}`
    .toLowerCase();
  return DECISION_WORDS.some((w) => txt.includes(w));
}

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

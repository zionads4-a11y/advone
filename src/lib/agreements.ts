// Helpers para acordos / honorários

export function calcAgreement(total: number, feePct: number) {
  const t = Number(total) || 0;
  const p = Number(feePct) || 0;
  const fee = +((t * p) / 100).toFixed(2);
  const client = +(t - fee).toFixed(2);
  return { fee, client };
}

export function buildInstallments(
  feeAmount: number,
  count: number,
  firstDue: string,
): { installment_number: number; amount: number; due_date: string }[] {
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor((feeAmount * 100) / n) / 100;
  const remainder = +(feeAmount - base * n).toFixed(2);
  const start = new Date(firstDue + "T12:00:00");
  const out = [];
  for (let i = 0; i < n; i++) {
    const due = new Date(start);
    due.setMonth(due.getMonth() + i);
    const yyyy = due.getFullYear();
    const mm = String(due.getMonth() + 1).padStart(2, "0");
    const dd = String(due.getDate()).padStart(2, "0");
    const amount = i === n - 1 ? +(base + remainder).toFixed(2) : base;
    out.push({ installment_number: i + 1, amount, due_date: `${yyyy}-${mm}-${dd}` });
  }
  return out;
}

export function brl(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const AGREEMENT_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  completed: "Concluído",
  canceled: "Cancelado",
};

export const INSTALLMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  overdue: "Vencida",
  canceled: "Cancelada",
};

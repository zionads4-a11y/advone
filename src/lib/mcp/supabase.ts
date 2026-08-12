import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (ou VITE_SUPABASE_URL) é obrigatório");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv([
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // dicionário malformado; tenta nomes legados abaixo
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS ou SUPABASE_ANON_KEY é obrigatório");
}

/** Encaminha o token OAuth verificado — RLS roda como o usuário logado. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser exige um token OAuth verificado");
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuthenticated() {
  return {
    content: [{ type: "text" as const, text: "Não autenticado. Conecte-se novamente ao AdvOne." }],
    isError: true,
  };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function jsonResult(data: unknown, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

/** Normaliza telefone BR para 55DDDNNNNNNNNN (best-effort). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length <= 11 && !digits.startsWith("55")) return `55${digits}`;
  return digits;
}

/** Variantes com/sem o nono dígito, para busca tolerante. */
export function phoneVariants(input: string): string[] {
  const p = normalizePhone(input);
  const set = new Set<string>([p, input.replace(/\D/g, "")]);
  if (p.length === 13) {
    // 55 + DDD + 9 + 8 dígitos -> remove o nono
    set.add(p.slice(0, 4) + p.slice(5));
  } else if (p.length === 12) {
    set.add(p.slice(0, 4) + "9" + p.slice(4));
  }
  return [...set].filter(Boolean);
}

/**
 * Resolve a empresa a usar. Se `companyId` vier informado, valida acesso.
 * Caso contrário, usa a primeira empresa acessível pela RLS do usuário.
 */
export async function resolveCompanyId(
  ctx: ToolContext,
  companyId?: string,
): Promise<{ companyId: string } | { error: string }> {
  const supabase = supabaseForUser(ctx);
  if (companyId) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Empresa não encontrada ou sem acesso." };
    return { companyId: data.id };
  }
  const { data, error } = await supabase
    .from("companies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(2);
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "Nenhuma empresa acessível para este usuário." };
  return { companyId: data[0].id };
}

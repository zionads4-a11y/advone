// Helper compartilhado para chamadas de IA.
// Lê company_ai_config para decidir entre Lovable AI Gateway (Gemini, grátis)
// e OpenAI direta (chave do dono da plataforma, paga, mais sofisticada).
//
// Uso típico dentro de uma edge function:
//
//   import { chatCompletion } from "../_shared/aiClient.ts";
//
//   const resp = await chatCompletion({
//     companyId,
//     messages: [{ role: "system", content: "..." }, { role: "user", content: "..." }],
//     tools,                       // opcional
//     tool_choice,                 // opcional
//     fallbackModel: "google/gemini-2.5-flash",  // se a empresa não tiver config
//   });
//   const reply = resp.choices?.[0]?.message?.content;

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type AIProvider = "lovable" | "openai";

export interface CompanyAIConfig {
  provider: AIProvider;
  model: string;
  custom_system_prompt: string | null;
  use_openai_for_testing: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  // OpenAI / Gemini extras
  tool_calls?: any;
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionParams {
  /** Carrega a config da empresa em company_ai_config para decidir provider/modelo. */
  companyId?: string;
  /** Força um provider específico (ignora company config). Útil em chamadas internas. */
  forceProvider?: AIProvider;
  /** Força um modelo específico (ignora company config). */
  forceModel?: string;
  messages: ChatMessage[];
  tools?: any;
  tool_choice?: any;
  /** Modelo usado se a empresa não tiver registro em company_ai_config. */
  fallbackModel?: string;
  /** Forçar streaming (default: false). */
  stream?: boolean;
  /** Para reasoning models (gpt-5/gpt-5-mini). */
  reasoning?: { effort: "minimal" | "low" | "medium" | "high" | "xhigh" | "none" };
}

/**
 * Busca a config de IA da empresa. Se não existir, retorna padrão (lovable + gemini flash).
 */
export async function getCompanyAIConfig(companyId: string): Promise<CompanyAIConfig> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/company_ai_config?company_id=eq.${companyId}&select=provider,model,custom_system_prompt,use_openai_for_testing&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    return {
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      custom_system_prompt: null,
      use_openai_for_testing: false,
    };
  }

  return row as CompanyAIConfig;
}

/**
 * Faz uma chamada de chat completion respeitando a configuração da empresa.
 * Retorna o JSON cru da API (formato compatível OpenAI).
 */
export async function chatCompletion(params: ChatCompletionParams): Promise<any> {
  let provider: AIProvider = params.forceProvider ?? "lovable";
  let model: string = params.forceModel ?? params.fallbackModel ?? "google/gemini-2.5-flash";

  if (params.companyId && !params.forceProvider) {
    const cfg = await getCompanyAIConfig(params.companyId);
    provider = cfg.use_openai_for_testing ? "openai" : cfg.provider;
    model = params.forceModel ?? cfg.model;
  }

  const url = provider === "openai" ? OPENAI_URL : LOVABLE_URL;
  const apiKey = provider === "openai"
    ? Deno.env.get("OPENAI_API_KEY")
    : Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    throw new Error(`${provider === "openai" ? "OPENAI_API_KEY" : "LOVABLE_API_KEY"} não configurada`);
  }

  // Se foi escolhido OpenAI mas o modelo veio com prefixo "google/" ou "openai/",
  // limpa o prefixo (OpenAI não aceita prefixo).
  if (provider === "openai" && model.includes("/")) {
    model = model.split("/").pop()!;
  }

  const body: any = {
    model,
    messages: params.messages,
    stream: params.stream ?? false,
  };
  if (params.tools) body.tools = params.tools;
  if (params.tool_choice) body.tool_choice = params.tool_choice;
  const reasoningModels = ["o1", "o3", "o4"];
  const isReasoningModel = reasoningModels.some(m => model.includes(m));

  if (params.reasoning && provider === "openai" && isReasoningModel) {
    body.reasoning = params.reasoning;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI ${provider} ${resp.status}: ${errText}`);
  }

  // Streaming: devolve a Response inteira pra quem chamou processar
  if (params.stream) return resp;

  return await resp.json();
}

/**
 * Helper simples: retorna apenas o texto da primeira resposta.
 */
export async function chatText(params: ChatCompletionParams): Promise<string> {
  const data = await chatCompletion({ ...params, stream: false });
  return data.choices?.[0]?.message?.content ?? "";
}

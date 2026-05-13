// Helper compartilhado para chamadas de IA.
// Lê company_ai_config para decidir entre Lovable AI Gateway, OpenAI e Anthropic.

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export type AIProvider = "lovable" | "openai" | "anthropic";

export interface CompanyAIConfig {
  provider: AIProvider;
  model: string;
  custom_system_prompt: string | null;
  use_openai_for_testing: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: any;
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionParams {
  companyId?: string;
  forceProvider?: AIProvider;
  forceModel?: string;
  messages: ChatMessage[];
  tools?: any;
  tool_choice?: any;
  fallbackModel?: string;
  stream?: boolean;
  reasoning?: { effort: "minimal" | "low" | "medium" | "high" | "xhigh" | "none" };
  allowOpenAIFallback?: boolean;
}

function normalizeModelForProvider(provider: AIProvider, model: string): string {
  if ((provider === "openai" || provider === "anthropic") && model.includes("/")) {
    return model.split("/").pop()!;
  }
  return model;
}

function chooseFallbackOpenAIModel(model: string): string {
  if (model.includes("gpt-5")) return "gpt-5-mini";
  return "gpt-4o-mini";
}

function withProviderMeta(data: any, provider: AIProvider, model: string) {
  return {
    ...data,
    _provider: provider,
    _model: model,
  };
}

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

async function executeAnthropicRequest(model: string, params: ChatCompletionParams): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const systemMsg = params.messages.find((m) => m.role === "system");
  const otherMessages = params.messages.filter((m) => m.role !== "system");

  const body: any = {
    model,
    max_tokens: 4096,
    messages: otherMessages.map((m) => ({
      role: m.role === "tool" ? "user" : m.role,
      content: m.content ?? "",
    })),
  };

  if (systemMsg?.content) body.system = systemMsg.content;

  if (params.reasoning && (model.includes("claude-opus") || model.includes("claude-sonnet"))) {
    body.thinking = {
      type: "enabled",
      budget_tokens:
        params.reasoning.effort === "high"
          ? 8000
          : params.reasoning.effort === "medium"
            ? 4000
            : 2000,
    };
    body.max_tokens += body.thinking.budget_tokens;
  }

  if (params.stream) body.stream = true;

  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI anthropic ${resp.status}: ${errText}`);
  }

  if (params.stream) return resp;

  const anthropicData = await resp.json();
  const textBlock = anthropicData.content?.find((b: any) => b.type === "text");

  return withProviderMeta({
    choices: [{
      message: {
        role: "assistant",
        content: textBlock?.text ?? "",
      },
      finish_reason: anthropicData.stop_reason === "end_turn" ? "stop" : anthropicData.stop_reason,
    }],
    usage: {
      prompt_tokens: anthropicData.usage?.input_tokens ?? 0,
      completion_tokens: anthropicData.usage?.output_tokens ?? 0,
      total_tokens: (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0),
    },
  }, "anthropic", model);
}

async function executeOpenAICompatibleRequest(provider: "lovable" | "openai", model: string, params: ChatCompletionParams): Promise<any> {
  const url = provider === "openai" ? OPENAI_URL : LOVABLE_URL;
  const apiKey = provider === "openai" ? Deno.env.get("OPENAI_API_KEY") : Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    throw new Error(`${provider === "openai" ? "OPENAI_API_KEY" : "LOVABLE_API_KEY"} não configurada`);
  }

  const body: any = {
    model,
    messages: params.messages,
    stream: params.stream ?? false,
  };
  if (params.tools) body.tools = params.tools;
  if (params.tool_choice) body.tool_choice = params.tool_choice;

  const reasoningModels = ["o1", "o3", "o4"];
  const isReasoningModel = reasoningModels.some((m) => model.includes(m));
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

  if (params.stream) return resp;

  const data = await resp.json();
  return withProviderMeta(data, provider, model);
}

export async function chatCompletion(params: ChatCompletionParams): Promise<any> {
  let provider: AIProvider = params.forceProvider ?? "lovable";
  let model: string = params.forceModel ?? params.fallbackModel ?? "google/gemini-2.5-flash";

  if (params.companyId && !params.forceProvider) {
    const cfg = await getCompanyAIConfig(params.companyId);
    provider = cfg.use_openai_for_testing ? "openai" : cfg.provider;
    model = params.forceModel ?? cfg.model;
  }

  const normalizedModel = normalizeModelForProvider(provider, model);

  try {
    if (provider === "anthropic") {
      return await executeAnthropicRequest(normalizedModel, params);
    }

    return await executeOpenAICompatibleRequest(provider, normalizedModel, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const canFallback =
      params.allowOpenAIFallback !== false &&
      provider === "lovable" &&
      /\b402\b/.test(message) &&
      !!Deno.env.get("OPENAI_API_KEY");

    if (!canFallback) throw error;

    const fallbackModel = chooseFallbackOpenAIModel(model);
    return await executeOpenAICompatibleRequest("openai", fallbackModel, params);
  }
}

export async function chatText(params: ChatCompletionParams): Promise<string> {
  const data = await chatCompletion({ ...params, stream: false });
  return data.choices?.[0]?.message?.content ?? "";
}
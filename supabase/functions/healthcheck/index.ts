// Healthcheck endpoint: verifies that critical environment variables are set
// and that the database connection works. Returns 200 only if all checks pass.
//
// Usage:
//   GET /functions/v1/healthcheck
//   GET /functions/v1/healthcheck?verbose=1   (lists which functions are deployed)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getErrorMessage } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OPTIONAL_ENV = [
  "OPENAI_API_KEY",
  "LOVABLE_API_KEY",
  "UAZAPI_ADMIN_TOKEN",
  "ESCAVADOR_API_TOKEN",
  "ASAAS_ADVONE_API_KEY",
];

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const checks: CheckResult[] = [];
  const startedAt = Date.now();

  // 1. Required env vars
  for (const key of REQUIRED_ENV) {
    const present = !!Deno.env.get(key);
    checks.push({ name: `env:${key}`, ok: present, detail: present ? "set" : "missing" });
  }

  // 2. Optional env vars (apenas resumo agregado para evitar info-leakage)
  const optionalConfiguredCount = OPTIONAL_ENV.filter((k) => !!Deno.env.get(k)).length;

  // 3. Database connectivity (head query on a public table)
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .limit(1);
    checks.push({
      name: "db:connectivity",
      ok: !error,
      detail: error ? getErrorMessage(error) : "ok",
    });
  } catch (e) {
    checks.push({ name: "db:connectivity", ok: false, detail: getErrorMessage(e) });
  }

  const allOk = checks.every((c) => c.ok);
  const durationMs = Date.now() - startedAt;

  return new Response(
    JSON.stringify(
      {
        status: allOk ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        durationMs,
        checks,
        optional_secrets: optionalStatus,
      },
      null,
      2
    ),
    {
      status: allOk ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});

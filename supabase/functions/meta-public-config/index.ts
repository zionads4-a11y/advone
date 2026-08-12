// Expõe os identificadores PÚBLICOS do app Meta (App ID e Embedded Signup Config ID).
// Esses valores não são secretos — a Meta os expõe no client-side por design —
// mas ficam em secrets para que a troca de Business Manager não exija deploy de frontend.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GRAPH_VERSION = "v23.0";

serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const appId = Deno.env.get("META_APP_ID") ?? null;
  const configId = Deno.env.get("META_CONFIGURATION_ID") ?? null;

  return new Response(
    JSON.stringify({
      app_id: appId,
      config_id: configId,
      graph_version: GRAPH_VERSION,
      configured: Boolean(appId && configId),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});

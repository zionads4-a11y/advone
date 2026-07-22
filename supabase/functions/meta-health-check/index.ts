// Cron 6/6h: puxa quality_rating + messaging_limit + name_status de todos números Meta ativos.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_V = "v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const fallbackToken = Deno.env.get("META_PERMANENT_ACCESS_TOKEN");
  const { data: configs } = await admin
    .from("whatsapp_configs")
    .select("company_id, meta_phone_number_id, meta_access_token")
    .eq("provider", "meta_cloud")
    .not("meta_phone_number_id", "is", null);

  const results: any[] = [];
  for (const c of configs || []) {
    try {
      const token = c.meta_access_token || fallbackToken;
      if (!token) { results.push({ company_id: c.company_id, error: "no token" }); continue; }
      const res = await fetch(
        `https://graph.facebook.com/${META_V}/${c.meta_phone_number_id}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,code_verification_status`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const info = await res.json();
      if (!res.ok) {
        results.push({ company_id: c.company_id, error: info });
        continue;
      }
      await admin.from("meta_phone_health").insert({
        company_id: c.company_id,
        phone_number_id: c.meta_phone_number_id,
        display_phone_number: info.display_phone_number || null,
        quality_rating: info.quality_rating || null,
        messaging_limit: info.messaging_limit_tier || null,
        name_status: info.name_status || null,
        verified_name: info.verified_name || null,
        raw: info,
      });
      await admin
        .from("whatsapp_configs")
        .update({
          meta_quality_rating: info.quality_rating || null,
          meta_messaging_limit: info.messaging_limit_tier || null,
          meta_health_checked_at: new Date().toISOString(),
        })
        .eq("company_id", c.company_id);
      results.push({ company_id: c.company_id, ok: true, quality: info.quality_rating });
    } catch (e) {
      results.push({ company_id: c.company_id, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

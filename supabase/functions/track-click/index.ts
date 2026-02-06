import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("s");

    if (!slug) {
      return new Response("Missing slug parameter", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find tracking link by slug
    const { data: link } = await supabase
      .from("tracking_links")
      .select("id, company_id, whatsapp_number, default_message, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (!link || !link.is_active) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Link não encontrado</title></head><body><p>Este link não está mais ativo.</p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Read UTM params
    const utmSource = url.searchParams.get("utm_source") || null;
    const utmMedium = url.searchParams.get("utm_medium") || null;
    const utmCampaign = url.searchParams.get("utm_campaign") || null;
    const utmContent = url.searchParams.get("utm_content") || null;
    const utmTerm = url.searchParams.get("utm_term") || null;

    // Generate unique tracking code (6 chars, alphanumeric, no ambiguous chars)
    const trackingCode = generateCode();

    // Record the click
    await supabase.from("tracking_clicks").insert({
      tracking_link_id: link.id,
      company_id: link.company_id,
      tracking_code: trackingCode,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "",
      user_agent: req.headers.get("user-agent") || "",
    });

    console.log(`Click recorded: slug=${slug}, code=${trackingCode}, utm_source=${utmSource}, utm_campaign=${utmCampaign}`);

    // Build WhatsApp URL with tracking code embedded in message
    const message = `${link.default_message || "Olá!"} [${trackingCode}]`;
    const waUrl = `https://wa.me/${link.whatsapp_number}?text=${encodeURIComponent(message)}`;

    // 302 redirect to WhatsApp
    return new Response(null, {
      status: 302,
      headers: { Location: waUrl },
    });
  } catch (error: unknown) {
    console.error("Track click error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(`Error: ${errorMessage}`, { status: 500 });
  }
});

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  company_id: string
): Promise<string | null> {
  const { data: conn } = await supabase
    .from("google_calendar_connections")
    .select("refresh_token, token_expires_at, access_token")
    .eq("company_id", company_id)
    .maybeSingle();
  if (!conn) return null;

  const exp = new Date(conn.token_expires_at as string).getTime();
  if (exp - Date.now() > 60_000) return conn.access_token as string;

  const { data: creds } = await supabase
    .from("google_oauth_credentials")
    .select("client_id, client_secret")
    .eq("company_id", company_id)
    .maybeSingle();
  if (!creds) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id as string,
      client_secret: creds.client_secret as string,
      refresh_token: conn.refresh_token as string,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("refresh failed", json);
    return null;
  }
  const new_access = json.access_token as string;
  const new_exp = new Date(Date.now() + (json.expires_in as number) * 1000).toISOString();
  await supabase
    .from("google_calendar_connections")
    .update({ access_token: new_access, token_expires_at: new_exp })
    .eq("company_id", company_id);
  return new_access;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: claims } = await supabase.auth.getClaims(accessToken);
    if (!claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id } = await req.json();
    const token = await refreshAccessToken(supabase, company_id);
    if (!token) {
      return new Response(JSON.stringify({ error: "Conexão Google inativa." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const calendars = (data.items || []).map((c: Record<string, unknown>) => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary || false,
      backgroundColor: c.backgroundColor,
    }));
    return new Response(JSON.stringify({ calendars }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

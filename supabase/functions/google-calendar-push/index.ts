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
    .select("refresh_token, token_expires_at, access_token, is_active")
    .eq("company_id", company_id)
    .maybeSingle();
  if (!conn || !conn.is_active) return null;

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
  if (!res.ok) return null;
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { reminder_id, company_id, operation } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ skipped: "no company" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conn } = await supabase
      .from("google_calendar_connections")
      .select("selected_calendar_id, is_active")
      .eq("company_id", company_id)
      .maybeSingle();
    if (!conn || !conn.is_active || !conn.selected_calendar_id) {
      return new Response(JSON.stringify({ skipped: "no active gcal" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await refreshAccessToken(supabase, company_id);
    if (!token) {
      return new Response(JSON.stringify({ skipped: "no token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calId = encodeURIComponent(conn.selected_calendar_id as string);

    // DELETE
    if (operation === "delete") {
      const { data: link } = await supabase
        .from("google_calendar_event_links")
        .select("google_event_id")
        .eq("reminder_id", reminder_id)
        .maybeSingle();
      if (link?.google_event_id) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${link.google_event_id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        );
        await supabase
          .from("google_calendar_event_links")
          .delete()
          .eq("reminder_id", reminder_id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // INSERT/UPDATE → fetch reminder
    const { data: reminder } = await supabase
      .from("lead_reminders")
      .select("id, title, description, due_at, reminder_type, lead_id")
      .eq("id", reminder_id)
      .maybeSingle();
    if (!reminder) {
      return new Response(JSON.stringify({ skipped: "no reminder" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(reminder.due_at as string);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const eventBody = {
      summary: `[AdvOne] ${reminder.title}`,
      description: reminder.description || "",
      start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
      extendedProperties: {
        private: { advone_reminder_id: reminder.id, advone_company_id: company_id },
      },
    };

    const { data: link } = await supabase
      .from("google_calendar_event_links")
      .select("google_event_id")
      .eq("reminder_id", reminder_id)
      .maybeSingle();

    let res: Response;
    if (link?.google_event_id) {
      res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${link.google_event_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        }
      );
    } else {
      res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        }
      );
    }
    const evJson = await res.json();
    if (!res.ok) {
      console.error("gcal push failed", evJson);
      return new Response(JSON.stringify({ error: evJson }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link?.google_event_id) {
      await supabase
        .from("google_calendar_event_links")
        .update({ etag: evJson.etag, last_synced_at: new Date().toISOString() })
        .eq("reminder_id", reminder_id);
    } else {
      await supabase.from("google_calendar_event_links").insert({
        reminder_id,
        company_id,
        google_event_id: evJson.id,
        google_calendar_id: conn.selected_calendar_id,
        etag: evJson.etag,
        source: "advone",
      });
    }

    return new Response(JSON.stringify({ ok: true, event_id: evJson.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("push error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

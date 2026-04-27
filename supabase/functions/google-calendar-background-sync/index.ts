import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGoogleToken(supabaseClient: any, integration: any) {
  console.log(`Refreshing Google token for user ${integration.user_id}...`);
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google credentials not configured");
  }

  if (!integration.refresh_token) {
    throw new Error("No refresh token available");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: integration.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await response.json();
  if (tokens.error) {
    throw new Error(`Failed to refresh token: ${tokens.error_description || tokens.error}`);
  }

  const updateData: any = {
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (tokens.refresh_token) {
    updateData.refresh_token = tokens.refresh_token;
  }

  await supabaseClient
    .from("user_integrations")
    .update(updateData)
    .eq("id", integration.id);

  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // This function is meant to be called by a cron job or background process
    // It iterates over all users with sync enabled
    const { data: integrations, error: integrationsError } = await supabaseClient
      .from("user_integrations")
      .select("*")
      .eq("provider", "google")
      .eq("sync_enabled", true);

    if (integrationsError) throw integrationsError;

    let successCount = 0;
    let failCount = 0;

    for (const integration of integrations || []) {
      try {
        let accessToken = integration.access_token;

        // Refresh if expired
        if (new Date(integration.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
          accessToken = await refreshGoogleToken(supabaseClient, integration);
        }

        const now = new Date();
        const timeMin = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago for background sync
        const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

        let eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (eventsResponse.status === 401) {
          accessToken = await refreshGoogleToken(supabaseClient, integration);
          eventsResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
        }

        const eventsData = await eventsResponse.json();
        if (eventsData.error) throw new Error(eventsData.error.message);

        const events = eventsData.items || [];
        
        for (const event of events) {
          const startTime = event.start?.dateTime || event.start?.date;
          if (!startTime) continue;

          await supabaseClient
            .from("lead_reminders")
            .upsert({
              google_event_id: event.id,
              title: event.summary || "Sem título",
              description: event.description || null,
              due_at: startTime,
              completed: false,
              reminder_type: "meeting",
              created_by: integration.user_id,
            }, {
              onConflict: "google_event_id"
            });
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to sync for user ${integration.user_id}:`, err);
        failCount++;
      }
    }

    return new Response(JSON.stringify({ successCount, failCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

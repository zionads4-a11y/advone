import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGoogleToken(supabaseClient: any, integration: any) {
  console.log("Refreshing Google token...");
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
    console.error("Error refreshing token:", tokens);
    throw new Error(`Failed to refresh token: ${tokens.error_description || tokens.error}`);
  }

  const updateData: any = {
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Google sometimes returns a new refresh token
  if (tokens.refresh_token) {
    updateData.refresh_token = tokens.refresh_token;
  }

  const { error: updateError } = await supabaseClient
    .from("user_integrations")
    .update(updateData)
    .eq("id", integration.id);

  if (updateError) {
    console.error("Error updating tokens in DB:", updateError);
    throw updateError;
  }

  console.log("Token refreshed successfully");
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

    // Get user from Authorization header or body (for background sync)
    let user;
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (userError || !authUser) throw new Error("Unauthorized");
      user = authUser;
    } else if (body.userId) {
      // Internal call with userId
      const { data: userData, error: fetchUserError } = await supabaseClient.auth.admin.getUserById(body.userId);
      if (fetchUserError || !userData.user) throw new Error("User not found");
      user = userData.user;
    } else {
      throw new Error("No authorization provided");
    }

    // Get user integration
    const { data: integration, error: integrationError } = await supabaseClient
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (integrationError || !integration) {
      throw new Error("Google integration not found");
    }

    let accessToken = integration.access_token;

    // Check if token is expired (with 5 min buffer)
    if (new Date(integration.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
      accessToken = await refreshGoogleToken(supabaseClient, integration);
    }

    // 1. Fetch reminders from DB to push/update to Google
    const { data: localReminders, error: localError } = await supabaseClient
      .from("lead_reminders")
      .select("*")
      .eq("created_by", user.id);

    if (localError) console.error("Error fetching local reminders:", localError);

    if (localReminders && localReminders.length > 0) {
      console.log(`Processing ${localReminders.length} local events for Google sync`);
      for (const reminder of localReminders) {
        try {
          const googleEvent = {
            summary: reminder.title,
            description: reminder.description,
            start: { dateTime: reminder.due_at },
            end: { dateTime: reminder.end_at || new Date(new Date(reminder.due_at).getTime() + 60 * 60 * 1000).toISOString() },
          };

          if (!reminder.google_event_id) {
            // Create new event in Google
            const pushResponse = await fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events",
              {
                method: "POST",
                headers: { 
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(googleEvent),
              }
            );

            if (pushResponse.ok) {
              const pushedData = await pushResponse.json();
              await supabaseClient
                .from("lead_reminders")
                .update({ google_event_id: pushedData.id })
                .eq("id", reminder.id);
            }
          } else {
            // Update existing event in Google (optional, but good for bidirectional)
            // Only update if needed or just skip to prioritize Google -> System
          }
        } catch (pushErr) {
          console.error(`Error processing event ${reminder.id}:`, pushErr);
        }
      }
    }

    // 2. Fetch events from Google Calendar to sync back to System
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

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
    if (eventsData.error) {
      throw new Error(`Google Calendar error: ${eventsData.error.message}`);
    }

    const events = eventsData.items || [];
    console.log(`Found ${events.length} events from Google to sync`);

    for (const event of events) {
      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) continue;

      // Upsert Google event into local lead_reminders
      const { error: upsertError } = await supabaseClient
        .from("lead_reminders")
        .upsert({
          google_event_id: event.id,
          title: event.summary || "Sem título",
          description: event.description || null,
          due_at: startTime,
          end_at: event.end?.dateTime || event.end?.date || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          completed: false,
          reminder_type: "meeting",
          created_by: user.id,
        }, {
          onConflict: "google_event_id"
        });

      if (upsertError) {
        console.error(`Error upserting event ${event.id}:`, upsertError);
      }
    }

    // 3. Update last sync time
    await supabaseClient
      .from("user_integrations")
      .update({ last_google_sync: new Date().toISOString() })
      .eq("id", integration.id);

    return new Response(JSON.stringify({ success: true, count: events.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

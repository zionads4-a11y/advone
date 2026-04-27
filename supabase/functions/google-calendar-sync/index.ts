import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      throw new Error("Unauthorized");
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
      console.log("Refreshing Google token...");
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        throw new Error("Google credentials not configured");
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

      accessToken = tokens.access_token;
      
      // Update tokens in DB
      await supabaseClient
        .from("user_integrations")
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    }

    // Fetch events from Google Calendar
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const eventsData = await eventsResponse.json();
    if (eventsData.error) {
      throw new Error(`Google Calendar error: ${eventsData.error.message}`);
    }

    const events = eventsData.items || [];
    console.log(`Found ${events.length} events to sync`);

    // Get existing Google events to avoid unnecessary updates if needed
    // or just upsert them.

    for (const event of events) {
      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) continue;

      const { error: upsertError } = await supabaseClient
        .from("lead_reminders")
        .upsert({
          google_event_id: event.id,
          title: event.summary || "Sem título",
          description: event.description || null,
          due_at: startTime,
          completed: false,
          reminder_type: "meeting", // Default type for Google events
          created_by: user.id,
          // We don't necessarily have a lead_id or company_id for generic calendar events
        }, {
          onConflict: "google_event_id"
        });

      if (upsertError) {
        console.error(`Error upserting event ${event.id}:`, upsertError);
      }
    }

    return new Response(JSON.stringify({ success: true, count: events.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

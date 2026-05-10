import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGoogleToken(supabaseClient: any, integration: any) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Google credentials not configured");
  if (!integration.refresh_token) throw new Error("No refresh token available");

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
  if (tokens.error) throw new Error(`Failed to refresh token: ${tokens.error_description || tokens.error}`);

  const updateData: any = {
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (tokens.refresh_token) updateData.refresh_token = tokens.refresh_token;

  await supabaseClient.from("user_integrations").update(updateData).eq("id", integration.id);
  return tokens.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let user;
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    const incremental = body?.incremental === true;

    // 1) Prioridade: body.userId (chamadas server-to-server)
    if (body?.userId) {
      const { data: userData, error } = await supabaseClient.auth.admin.getUserById(body.userId);
      if (!error && userData?.user) user = userData.user;
    }

    // 2) Fallback: JWT do usuário logado
    if (!user && authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user: authUser }, error: userError } = await userClient.auth.getUser();
      if (!userError && authUser) user = authUser;
    }

    if (!user) throw new Error("Não foi possível identificar o usuário — autenticação inválida.");

    const { data: integration, error: integrationError } = await supabaseClient
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (integrationError || !integration) throw new Error("Google integration not found");

    let accessToken = integration.access_token;
    if (new Date(integration.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
      accessToken = await refreshGoogleToken(supabaseClient, integration);
    }

    const { data: clientCompanies } = await supabaseClient
      .from("client_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1);
    const companyId = clientCompanies?.[0]?.company_id ?? null;
    if (!companyId) throw new Error("Usuário não está vinculado a nenhuma empresa — não é possível sincronizar.");

    // ====== 1. PUSH local -> Google ======
    const { data: localReminders } = await supabaseClient
      .from("lead_reminders")
      .select("*")
      .eq("created_by", user.id)
      .is("google_event_id", null);

    if (localReminders && localReminders.length > 0) {
      for (const reminder of localReminders) {
        try {
          const googleEvent = {
            summary: reminder.title,
            description: reminder.description,
            start: { dateTime: reminder.due_at },
            end: {
              dateTime: reminder.end_at ||
                new Date(new Date(reminder.due_at).getTime() + 60 * 60 * 1000).toISOString(),
            },
          };
          const pushResponse = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
              body: JSON.stringify(googleEvent),
            },
          );
          if (pushResponse.ok) {
            const pushed = await pushResponse.json();
            await supabaseClient
              .from("lead_reminders")
              .update({ google_event_id: pushed.id })
              .eq("id", reminder.id);
          }
        } catch (e) {
          console.error(`Error pushing event ${reminder.id}:`, e);
        }
      }
    }

    // ====== 2. PULL Google -> local ======
    const fullWindowMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fullWindowMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    let useSyncToken = incremental && !!integration.sync_token;
    let syncToken: string | null = useSyncToken ? integration.sync_token : null;

    const fetchEventsPage = async (token: string, pageToken?: string | null): Promise<Response> => {
      const params = new URLSearchParams();
      params.set("singleEvents", "true");
      params.set("showDeleted", "true");
      if (useSyncToken && syncToken) {
        params.set("syncToken", syncToken);
      } else {
        params.set("timeMin", fullWindowMin);
        params.set("timeMax", fullWindowMax);
        params.set("orderBy", "startTime");
      }
      if (pageToken) params.set("pageToken", pageToken);
      return fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    };

    let allEvents: any[] = [];
    let nextSyncToken: string | null = null;
    let pageToken: string | null = null;
    let pages = 0;

    while (true) {
      let resp = await fetchEventsPage(accessToken, pageToken);
      if (resp.status === 401) {
        accessToken = await refreshGoogleToken(supabaseClient, integration);
        resp = await fetchEventsPage(accessToken, pageToken);
      }
      if (resp.status === 410 && useSyncToken) {
        // syncToken inválido — reset e refaz com janela completa
        console.log("syncToken expirado (410) — refazendo full sync");
        useSyncToken = false;
        syncToken = null;
        pageToken = null;
        allEvents = [];
        continue;
      }

      const data = await resp.json();
      if (data.error) throw new Error(`Google Calendar error: ${data.error.message}`);

      allEvents = allEvents.concat(data.items || []);
      nextSyncToken = data.nextSyncToken || nextSyncToken;
      pageToken = data.nextPageToken || null;
      pages++;
      if (!pageToken || pages > 20) break;
    }

    console.log(
      `Found ${allEvents.length} events (${useSyncToken ? "incremental" : "full"} sync, ${pages} page(s))`,
    );

    const seenGoogleIds: string[] = [];
    const deletedGoogleIds: string[] = [];

    for (const event of allEvents) {
      if (event.status === "cancelled") {
        if (event.id) deletedGoogleIds.push(event.id);
        continue;
      }
      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) continue;
      seenGoogleIds.push(event.id);

      const { error: upsertError } = await supabaseClient
        .from("lead_reminders")
        .upsert(
          {
            company_id: companyId,
            google_event_id: event.id,
            title: event.summary || "Sem título",
            description: event.description || null,
            due_at: startTime,
            end_at: event.end?.dateTime || event.end?.date ||
              new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
            completed: false,
            reminder_type: "meeting",
            created_by: user.id,
          },
          { onConflict: "google_event_id" },
        );

      if (upsertError) console.error(`Error upserting event ${event.id}:`, upsertError);
    }

    if (deletedGoogleIds.length > 0) {
      const { error: delErr } = await supabaseClient
        .from("lead_reminders")
        .delete()
        .eq("created_by", user.id)
        .in("google_event_id", deletedGoogleIds);
      if (delErr) console.error("Error deleting cancelled events:", delErr);
      else console.log(`Deleted ${deletedGoogleIds.length} cancelled events`);
    }

    // No full sync também removemos órfãos locais que sumiram da janela do Google
    if (!useSyncToken) {
      const { data: localWithGoogle } = await supabaseClient
        .from("lead_reminders")
        .select("id, google_event_id, due_at")
        .eq("created_by", user.id)
        .not("google_event_id", "is", null)
        .gte("due_at", fullWindowMin)
        .lte("due_at", fullWindowMax);

      if (localWithGoogle) {
        const orphanIds = localWithGoogle
          .filter((r: any) => !seenGoogleIds.includes(r.google_event_id))
          .map((r: any) => r.id);
        if (orphanIds.length > 0) {
          await supabaseClient.from("lead_reminders").delete().in("id", orphanIds);
          console.log(`Deleted ${orphanIds.length} orphan events`);
        }
      }
    }

    // Persiste o syncToken para próxima execução incremental
    const updatePatch: any = {
      last_google_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (nextSyncToken) updatePatch.sync_token = nextSyncToken;

    await supabaseClient
      .from("user_integrations")
      .update(updatePatch)
      .eq("id", integration.id);

    return new Response(
      JSON.stringify({
        success: true,
        count: allEvents.length,
        mode: useSyncToken ? "incremental" : "full",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

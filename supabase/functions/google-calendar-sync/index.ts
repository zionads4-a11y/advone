import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let user;
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      
      // Tenta primeiro autenticar como usuário normal (cliente passando seu JWT)
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user: authUser }, error: userError } = await userClient.auth.getUser();
      
      if (!userError && authUser) {
        user = authUser;
      } else {
        // Se falhar (ex: JWT de service_role ou inválido para o cliente anon), 
        // tenta validar com o admin client se for um UUID válido
        const { data: userData, error: adminError } = await supabaseClient.auth.admin.getUserById(token).catch(() => ({ data: { user: null }, error: true }));
        if (!adminError && userData?.user) {
          user = userData.user;
        } else if (body.userId) {
          const { data: fallbackData } = await supabaseClient.auth.admin.getUserById(body.userId);
          if (fallbackData?.user) user = fallbackData.user;
        }
      }
    } else if (body.userId) {
      const { data: userData, error: fetchUserError } = await supabaseClient.auth.admin.getUserById(body.userId);
      if (fetchUserError || !userData.user) throw new Error("User not found");
      user = userData.user;
    }

    if (!user) {
      throw new Error("Não foi possível identificar o usuário — autenticação inválida.");
    }

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

    // Resolve company_id do usuário (necessário para NOT NULL em lead_reminders)
    const { data: clientCompanies } = await supabaseClient
      .from("client_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1);
    const companyId = clientCompanies?.[0]?.company_id ?? null;

    if (!companyId) {
      throw new Error("Usuário não está vinculado a nenhuma empresa — não é possível sincronizar.");
    }

    // 1. Push local -> Google (apenas eventos ainda não enviados)
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
            end: { dateTime: reminder.end_at || new Date(new Date(reminder.due_at).getTime() + 60 * 60 * 1000).toISOString() },
          };
          const pushResponse = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
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
        } catch (pushErr) {
          console.error(`Error pushing event ${reminder.id}:`, pushErr);
        }
      }
    }

    // 2. Pull Google -> local
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const fetchEvents = async (token: string) =>
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&showDeleted=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

    let eventsResponse = await fetchEvents(accessToken);
    if (eventsResponse.status === 401) {
      accessToken = await refreshGoogleToken(supabaseClient, integration);
      eventsResponse = await fetchEvents(accessToken);
    }

    const eventsData = await eventsResponse.json();
    if (eventsData.error) throw new Error(`Google Calendar error: ${eventsData.error.message}`);

    const events = eventsData.items || [];
    console.log(`Found ${events.length} events from Google`);

    const seenGoogleIds: string[] = [];
    const deletedGoogleIds: string[] = [];

    for (const event of events) {
      // Eventos cancelados/excluídos no Google
      if (event.status === "cancelled") {
        if (event.id) deletedGoogleIds.push(event.id);
        continue;
      }

      const startTime = event.start?.dateTime || event.start?.date;
      if (!startTime) continue;

      seenGoogleIds.push(event.id);

      const { error: upsertError } = await supabaseClient
        .from("lead_reminders")
        .upsert({
          company_id: companyId,
          google_event_id: event.id,
          title: event.summary || "Sem título",
          description: event.description || null,
          due_at: startTime,
          end_at: event.end?.dateTime || event.end?.date || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(),
          completed: false,
          reminder_type: "meeting",
          created_by: user.id,
        }, { onConflict: "google_event_id" });

      if (upsertError) console.error(`Error upserting event ${event.id}:`, upsertError);
    }

    // 3. Apagar no sistema o que foi apagado no Google
    // (a) eventos com status=cancelled vindos da API
    if (deletedGoogleIds.length > 0) {
      const { error: delErr } = await supabaseClient
        .from("lead_reminders")
        .delete()
        .eq("created_by", user.id)
        .in("google_event_id", deletedGoogleIds);
      if (delErr) console.error("Error deleting cancelled events:", delErr);
      else console.log(`Deleted ${deletedGoogleIds.length} cancelled events`);
    }

    // (b) eventos locais que tinham google_event_id mas sumiram da janela do Google
    const { data: localWithGoogle } = await supabaseClient
      .from("lead_reminders")
      .select("id, google_event_id, due_at")
      .eq("created_by", user.id)
      .not("google_event_id", "is", null)
      .gte("due_at", timeMin)
      .lte("due_at", timeMax);

    if (localWithGoogle) {
      const orphanIds = localWithGoogle
        .filter((r: any) => !seenGoogleIds.includes(r.google_event_id))
        .map((r: any) => r.id);

      if (orphanIds.length > 0) {
        const { error: orphanErr } = await supabaseClient
          .from("lead_reminders")
          .delete()
          .in("id", orphanIds);
        if (orphanErr) console.error("Error deleting orphan events:", orphanErr);
        else console.log(`Deleted ${orphanIds.length} orphan events removed from Google`);
      }
    }

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

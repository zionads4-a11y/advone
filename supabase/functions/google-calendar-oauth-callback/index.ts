import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appOrigin = req.headers.get("origin") || url.origin;

  const renderClose = (success: boolean, message: string) => `
    <!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title>
    <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#0f172a}
    .card{background:#fff;padding:24px 32px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);text-align:center;max-width:420px}
    .ok{color:#10b981}.err{color:#ef4444}</style></head>
    <body><div class="card">
    <h2 class="${success ? "ok" : "err"}">${success ? "✓ Conectado" : "✗ Falha na conexão"}</h2>
    <p>${message}</p>
    <p style="font-size:13px;color:#64748b">Você pode fechar esta janela.</p>
    </div>
    <script>
      try { window.opener && window.opener.postMessage({type:'gcal_oauth',success:${success}}, '*'); } catch(e){}
      setTimeout(()=>window.close(), 1500);
    </script></body></html>`;

  if (errorParam) {
    return new Response(renderClose(false, `Google retornou: ${errorParam}`), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (!code || !state) {
    return new Response(renderClose(false, "Parâmetros ausentes."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const decoded = JSON.parse(atob(state));
    const company_id = decoded.company_id;
    const user_id = decoded.user_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar credenciais da empresa
    const { data: creds, error: credsErr } = await supabase
      .from("google_oauth_credentials")
      .select("client_id, client_secret, redirect_uri")
      .eq("company_id", company_id)
      .maybeSingle();

    if (credsErr || !creds) {
      return new Response(renderClose(false, "Credenciais não encontradas."), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Trocar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        redirect_uri: creds.redirect_uri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("token exchange failed", tokenJson);
      return new Response(
        renderClose(false, tokenJson.error_description || "Falha ao trocar código por token."),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const access_token = tokenJson.access_token as string;
    const refresh_token = tokenJson.refresh_token as string | undefined;
    const expires_in = tokenJson.expires_in as number;
    const scope = tokenJson.scope as string;

    // Pegar email do usuário
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const google_email = userInfo.email as string;

    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // Upsert na google_calendar_connections
    const { data: existing } = await supabase
      .from("google_calendar_connections")
      .select("id, refresh_token")
      .eq("company_id", company_id)
      .maybeSingle();

    const finalRefresh = refresh_token || existing?.refresh_token;
    if (!finalRefresh) {
      return new Response(
        renderClose(
          false,
          "Não recebemos refresh token do Google. Revogue o acesso em myaccount.google.com/permissions e tente novamente."
        ),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (existing) {
      await supabase
        .from("google_calendar_connections")
        .update({
          access_token,
          refresh_token: finalRefresh,
          token_expires_at: expires_at,
          scope,
          google_email,
          is_active: true,
          connected_by: user_id,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("google_calendar_connections").insert({
        company_id,
        connected_by: user_id,
        google_email,
        access_token,
        refresh_token: finalRefresh,
        token_expires_at: expires_at,
        scope,
        is_active: true,
      });
    }

    return new Response(renderClose(true, `Conta ${google_email} conectada com sucesso.`), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("callback error", err);
    return new Response(renderClose(false, String(err)), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

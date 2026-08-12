import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Requisição inválida: authorization_id ausente.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? null);
      const { data, error: err } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) return setError(err.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("O servidor de autorização não retornou um destino de redirecionamento.");
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "aplicativo";

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">
            {error ? "Não foi possível carregar" : `Conectar ${clientName} ao AdvOne`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !details ? (
            <p className="text-sm text-muted-foreground">Carregando autorização…</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {clientName} poderá usar as ferramentas do AdvOne como você, enquanto sua conta estiver conectada.
              </p>
              <div className="rounded-md border p-3 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Conta: </span>
                  {email ?? "—"}
                </p>
                {details?.client?.redirect_uri && (
                  <p className="break-all">
                    <span className="text-muted-foreground">Destino: </span>
                    {details.client.redirect_uri}
                  </p>
                )}
                {details?.scope && (
                  <p>
                    <span className="text-muted-foreground">Permissões: </span>
                    {String(details.scope)}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Isso não ignora as permissões do AdvOne: o acesso continua limitado ao seu escritório e ao seu perfil.
              </p>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                  Aprovar
                </Button>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                  Cancelar conexão
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

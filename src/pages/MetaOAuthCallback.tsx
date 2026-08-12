import { useEffect } from "react";

/**
 * Página de retorno do OAuth da Meta (Embedded Signup).
 * Recebe ?code=... (ou ?error=...), devolve para a janela que abriu e fecha.
 */
export default function MetaOAuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      source: "advone-meta-oauth",
      code: params.get("code"),
      error: params.get("error_description") || params.get("error"),
    };
    try {
      window.opener?.postMessage(payload, window.location.origin);
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => window.close(), 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="text-lg font-semibold">Conexão concluída</p>
        <p className="text-sm text-muted-foreground">
          Você já pode fechar esta janela e voltar para o AdvOne.
        </p>
      </div>
    </div>
  );
}

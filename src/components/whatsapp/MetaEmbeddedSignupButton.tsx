import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Config ID gerado no painel Meta (Embedded Signup configuration).
// Valores públicos — expostos no client-side por design da Meta.
const META_APP_ID = "1268738996315614";
const ES_CONFIG_ID = "1598347715057707";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

function loadFbSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.FB) return resolve(true);

    const init = () => {
      try {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
        resolve(true);
      } catch {
        resolve(false);
      }
    };

    window.fbAsyncInit = init;

    if (!document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    }

    // Fallback: o script pode já ter carregado antes deste componente montar
    let tries = 0;
    const poll = window.setInterval(() => {
      tries += 1;
      if (window.FB) {
        window.clearInterval(poll);
        init();
      } else if (tries > 40) {
        window.clearInterval(poll);
        resolve(false);
      }
    }, 250);
  });
}


interface Props {
  companyId: string;
  onConnected?: () => void;
}

export default function MetaEmbeddedSignupButton({ companyId, onConnected }: Props) {
  const [ready, setReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const [running, setRunning] = useState(false);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  useEffect(() => {
    let mounted = true;
    loadFbSdk().then((ok) => {
      if (!mounted) return;
      setReady(ok);
      setSdkFailed(!ok);
    });

    // Listener das mensagens do popup Meta (retorna WABA/phone selecionados)
    const onMessage = (event: MessageEvent) => {
      if (!/(^|\.)facebook\.com$/.test(new URL(event.origin || "https://x.invalid").hostname)) return;
      try {
        const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (raw?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (raw?.data) (window as any).__metaEsPayload = raw.data;
      } catch { /* ignore */ }
    };
    window.addEventListener("message", onMessage);
    return () => {
      mounted = false;
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const start = async () => {
    if (!companyId) return toast.error("Selecione uma empresa primeiro");
    if (inIframe) {
      toast.error("Abra esta página em uma nova aba", {
        description: "O login do Facebook não funciona dentro do preview. Vamos abrir em nova aba.",
      });
      window.open(window.location.href, "_blank", "noopener");
      return;
    }
    if (!window.FB) {
      return toast.error("SDK do Facebook não carregou", {
        description: "Desative bloqueadores de anúncio/rastreamento e recarregue a página.",
      });
    }

    setRunning(true);
    (window as any).__metaEsPayload = null;

    // Se o popup for bloqueado, o callback nunca é chamado — liberamos o botão
    const safety = window.setTimeout(() => setRunning(false), 120000);

    window.FB.login(
      async (response: any) => {
        window.clearTimeout(safety);
        try {
          const code = response?.authResponse?.code;
          if (!code) {
            return toast.error("Login não concluído", {
              description: "A janela do Facebook foi fechada ou bloqueada pelo navegador.",
            });
          }
          const es = (window as any).__metaEsPayload || {};
          const { data, error } = await supabase.functions.invoke(
            "meta-embedded-signup-exchange",
            {
              body: {
                code,
                company_id: companyId,
                phone_number_id: es.phone_number_id,
                waba_id: es.waba_id,
              },
            },
          );
          if (error || (data as any)?.error) {
            toast.error("Falha ao concluir conexão", {
              description: (data as any)?.error || error?.message,
            });
          } else {
            toast.success("WhatsApp Oficial conectado!");
            onConnected?.();
          }
        } finally {
          setRunning(false);
          (window as any).__metaEsPayload = null;
        }
      },
      {
        config_id: ES_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: 3 },
      },
    );
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={start}
        disabled={running}
        className="gap-2 bg-[#1877F2] hover:bg-[#0F65D9] text-white"
        size="lg"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        Conectar WhatsApp Oficial (Meta)
      </Button>

      {inIframe && (
        <p className="text-xs text-amber-600">
          Você está no preview. O login do Facebook exige uma janela própria — clique no botão e
          continue na nova aba.
        </p>
      )}
      {sdkFailed && !inIframe && (
        <p className="text-xs text-destructive">
          Não conseguimos carregar o SDK do Facebook. Desative bloqueadores (AdBlock/uBlock) ou tente
          em outro navegador.
        </p>
      )}
      {!ready && !sdkFailed && (
        <p className="text-xs text-muted-foreground">Carregando o login do Facebook...</p>
      )}

      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Como conectar (passo a passo):</p>
        <p>1. Clique no botão azul — abre a janela oficial da Meta.</p>
        <p>2. Faça login com o Facebook do dono do WhatsApp Business.</p>
        <p>3. Escolha (ou crie) o Portfólio Empresarial e a conta do WhatsApp Business.</p>
        <p>4. Selecione o número, confirme o país e valide o código por SMS/ligação.</p>
        <p>5. Ao finalizar, a janela fecha sozinha e o número aparece conectado aqui.</p>
      </div>
    </div>
  );
}


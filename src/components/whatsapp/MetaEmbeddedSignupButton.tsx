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
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadFbSdk().then(() => setReady(true));

    // Listener das mensagens do popup Meta (retorna WABA/phone selecionados)
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "{}");
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (data?.event === "FINISH" && data?.data) {
          (window as any).__metaEsPayload = data.data;
        }
      } catch { /* ignore */ }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const start = async () => {
    if (!companyId) return toast.error("Selecione uma empresa primeiro");
    if (!ES_CONFIG_ID) {
      return toast.error(
        "Config ID do Embedded Signup não configurado. Defina VITE_META_ES_CONFIG_ID.",
      );
    }
    if (!window.FB) return toast.error("SDK do Facebook não carregou");

    setRunning(true);
    window.FB.login(
      async (response: any) => {
        try {
          const code = response?.authResponse?.code;
          if (!code) {
            setRunning(false);
            return toast.error("Cancelado — nenhum code retornado");
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
    <Button
      onClick={start}
      disabled={!ready || running}
      className="gap-2 bg-[#1877F2] hover:bg-[#0F65D9] text-white"
      size="lg"
    >
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      Conectar WhatsApp Oficial (Meta)
    </Button>
  );
}

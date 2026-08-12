import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface MetaPublicConfig {
  app_id: string | null;
  config_id: string | null;
  graph_version: string;
  configured: boolean;
}

function loadFbSdk(appId: string, version: string): Promise<boolean> {
  return new Promise((resolve) => {
    const init = () => {
      try {
        window.FB.init({ appId, cookie: true, xfbml: false, version });
        resolve(true);
      } catch {
        resolve(false);
      }
    };

    if (window.FB) return init();

    window.fbAsyncInit = init;

    if (!document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.src = "https://connect.facebook.net/pt_BR/sdk.js";
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    }

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
  const [config, setConfig] = useState<MetaPublicConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const esPayload = useRef<{ phone_number_id?: string; waba_id?: string } | null>(null);
  const safetyRef = useRef<number | null>(null);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  // 1) Busca App ID + Config ID atuais no backend (evita IDs defasados no frontend)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke<MetaPublicConfig>("meta-public-config", {
        method: "GET",
      });
      if (!mounted) return;
      if (error || !data) {
        setConfigError("Não foi possível carregar as credenciais da Meta.");
        return;
      }
      if (!data.configured) {
        setConfigError("O app da Meta ainda não está configurado (App ID / Configuration ID ausentes).");
        return;
      }
      setConfig(data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Carrega o SDK apenas quando já temos o App ID correto
  useEffect(() => {
    if (!config?.app_id) return;
    let mounted = true;
    loadFbSdk(config.app_id, config.graph_version).then((ok) => {
      if (!mounted) return;
      setReady(ok);
      setSdkFailed(!ok);
    });
    return () => {
      mounted = false;
    };
  }, [config?.app_id, config?.graph_version]);

  // 3) Escuta as mensagens do popup da Meta (WABA / número escolhidos)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let host = "";
      try {
        host = new URL(event.origin).hostname;
      } catch {
        return;
      }
      if (!/(^|\.)facebook\.com$/.test(host)) return;
      try {
        const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (raw?.type !== "WA_EMBEDDED_SIGNUP") return;
        if (raw?.data?.phone_number_id || raw?.data?.waba_id) {
          esPayload.current = {
            phone_number_id: raw.data.phone_number_id,
            waba_id: raw.data.waba_id,
          };
        }
        // Usuário cancelou / fechou o fluxo: libera o botão imediatamente
        if (raw?.event === "CANCEL" || raw?.data?.event === "CANCEL") {
          if (safetyRef.current) window.clearTimeout(safetyRef.current);
          setRunning(false);
          toast.error("Conexão cancelada na janela da Meta.");
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const start = () => {
    if (!companyId) return toast.error("Selecione uma empresa primeiro");
    if (inIframe) {
      toast.info("Abrindo em uma nova aba", {
        description: "O login do Facebook não funciona dentro do preview.",
      });
      window.open(window.location.href, "_blank", "noopener");
      return;
    }
    if (configError || !config?.config_id) {
      return toast.error("Credenciais da Meta indisponíveis", {
        description: configError ?? "Tente recarregar a página.",
      });
    }
    if (!window.FB) {
      return toast.error("SDK do Facebook não carregou", {
        description: "Desative bloqueadores de anúncio/rastreamento e recarregue a página.",
      });
    }

    setRunning(true);
    esPayload.current = null;

    // Se o popup for bloqueado, o callback nunca é chamado — libera o botão em 45s
    if (safetyRef.current) window.clearTimeout(safetyRef.current);
    safetyRef.current = window.setTimeout(() => {
      setRunning(false);
      toast.error("A janela da Meta não respondeu", {
        description: "Verifique se o navegador bloqueou o pop-up e tente novamente.",
      });
    }, 45000);

    window.FB.login(
      async (response: any) => {
        if (safetyRef.current) window.clearTimeout(safetyRef.current);
        try {
          const code = response?.authResponse?.code;
          if (!code) {
            return toast.error("Login não concluído", {
              description: "A janela do Facebook foi fechada ou bloqueada pelo navegador.",
            });
          }
          const es = esPayload.current || {};
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
          esPayload.current = null;
        }
      },
      {
        config_id: config.config_id,
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
        {running ? "Aguardando a janela da Meta..." : "Conectar WhatsApp Oficial (Meta)"}
      </Button>

      {inIframe && (
        <p className="text-xs text-amber-600">
          Você está no preview. O login do Facebook exige uma janela própria — clique no botão e
          continue na nova aba.
        </p>
      )}
      {configError && <p className="text-xs text-destructive">{configError}</p>}
      {sdkFailed && !inIframe && (
        <p className="text-xs text-destructive">
          Não conseguimos carregar o SDK do Facebook. Desative bloqueadores (AdBlock/uBlock) ou tente
          em outro navegador.
        </p>
      )}
      {!ready && !sdkFailed && !configError && (
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

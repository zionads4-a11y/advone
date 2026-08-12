import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MetaPublicConfig {
  app_id: string | null;
  config_id: string | null;
  graph_version: string;
  configured: boolean;
}

interface Props {
  companyId: string;
  onConnected?: () => void;
}

export default function MetaEmbeddedSignupButton({ companyId, onConnected }: Props) {
  const [config, setConfig] = useState<MetaPublicConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const watchRef = useRef<number | null>(null);
  const handledRef = useRef(false);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const redirectUri =
    typeof window !== "undefined" ? `${window.location.origin}/meta-oauth-callback` : "";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke<MetaPublicConfig>(
        "meta-public-config",
        { method: "GET" },
      );
      if (!mounted) return;
      if (error || !data) return setConfigError("Não foi possível carregar as credenciais da Meta.");
      if (!data.configured)
        return setConfigError("App da Meta não configurado (App ID / Configuration ID ausentes).");
      setConfig(data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cleanup = () => {
    if (watchRef.current) window.clearInterval(watchRef.current);
    watchRef.current = null;
    popupRef.current = null;
    setRunning(false);
  };

  const exchange = async (code: string) => {
    const { data, error } = await supabase.functions.invoke("meta-embedded-signup-exchange", {
      body: { code, company_id: companyId, redirect_uri: redirectUri },
    });
    if (error || (data as { error?: string })?.error) {
      toast.error("Falha ao concluir a conexão", {
        description: (data as { error?: string })?.error || error?.message,
      });
      return;
    }
    toast.success("WhatsApp Oficial conectado!");
    onConnected?.();
  };

  // Recebe o code da janela de callback
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; code?: string | null; error?: string | null };
      if (data?.source !== "advone-meta-oauth" || handledRef.current) return;
      handledRef.current = true;
      try {
        popupRef.current?.close();
      } catch {
        /* ignore */
      }
      cleanup();
      if (data.error || !data.code) {
        toast.error("Conexão não concluída", { description: data.error ?? "Nenhum código recebido." });
        return;
      }
      await exchange(data.code);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, redirectUri]);

  const start = () => {
    if (!companyId) return toast.error("Selecione uma empresa primeiro");
    if (!config?.app_id || !config?.config_id) {
      return toast.error("Credenciais da Meta indisponíveis", {
        description: configError ?? "Aguarde o carregamento e tente novamente.",
      });
    }

    handledRef.current = false;
    const url =
      `https://www.facebook.com/${config.graph_version}/dialog/oauth` +
      `?client_id=${encodeURIComponent(config.app_id)}` +
      `&config_id=${encodeURIComponent(config.config_id)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&override_default_response_type=true` +
      `&state=${encodeURIComponent(companyId)}` +
      `&extras=${encodeURIComponent(
        JSON.stringify({ setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: 3 }),
      )}`;

    // Abre imediatamente no gesto do clique (evita bloqueio de pop-up)
    const popup = window.open(url, "advone-meta-oauth", "width=600,height=760,noopener=no");
    if (!popup) {
      window.open(url, "_blank");
      return;
    }
    popupRef.current = popup;
    setRunning(true);

    watchRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        cleanup();
        if (!handledRef.current) toast.error("Janela da Meta fechada antes de concluir.");
      }
    }, 800);
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={start}
        disabled={running || !config}
        className="gap-2 bg-[#1877F2] hover:bg-[#0F65D9] text-white"
        size="lg"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        {running ? "Concluindo na janela da Meta..." : "Conectar WhatsApp Oficial (Meta)"}
      </Button>

      {configError && <p className="text-xs text-destructive">{configError}</p>}
      {inIframe && (
        <p className="text-xs text-amber-600">
          Se estiver no preview, abra a página em uma aba própria para o login do Facebook funcionar.
        </p>
      )}

      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Como conectar (passo a passo):</p>
        <p>1. Clique no botão azul — abre a janela oficial da Meta.</p>
        <p>2. Faça login com o Facebook do dono do WhatsApp Business.</p>
        <p>3. Escolha (ou crie) o Portfólio Empresarial e a conta do WhatsApp Business.</p>
        <p>4. Selecione o número, confirme o país e valide o código por SMS/ligação.</p>
        <p>5. A janela fecha sozinha e o número aparece conectado aqui.</p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1">
        <p className="font-medium">Configuração única no app da Meta</p>
        <p className="text-muted-foreground">
          Em Facebook Login → Configurações, adicione esta URL em “URIs de redirecionamento do OAuth
          válidos”:
        </p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(redirectUri);
            toast.success("URL copiada");
          }}
          className="flex items-center gap-2 font-mono break-all text-left text-foreground hover:underline"
        >
          <Copy className="h-3 w-3 shrink-0" />
          {redirectUri}
        </button>
      </div>
    </div>
  );
}

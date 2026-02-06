import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Loader2, RefreshCw, AlertCircle, Zap, Clock } from "lucide-react";

export default function ConnectWhatsApp() {
  const { token } = useParams<{ token: string }>();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQrCode = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const { data, error: fnError } = await supabase.functions.invoke("zapi-qrcode", {
      body: null,
      method: "GET",
    });

    // Use fetch directly since we need query params
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "oonteavjxzkovrzktnie";
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${projectId}.supabase.co/functions/v1/zapi-qrcode?token=${token}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erro ao carregar QR Code");
      } else {
        setQrCode(
          typeof result.qrcode === "string" ? result.qrcode : JSON.stringify(result.qrcode)
        );
        setCompanyName(result.company_name || "Empresa");
      }
    } catch (err) {
      setError("Não foi possível conectar ao servidor");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQrCode();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-xl text-foreground">
            Conectar WhatsApp
          </CardTitle>
          {companyName && (
            <Badge variant="outline" className="mx-auto mt-2 border-primary/30 text-primary">
              {companyName}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando QR Code...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground">
                Este link pode ter expirado. Solicite um novo link ao administrador.
              </p>
            </div>
          ) : qrCode ? (
            <>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground text-center">
                  Abra o <strong className="text-foreground">WhatsApp</strong> no celular →{" "}
                  <strong className="text-foreground">Dispositivos conectados</strong> →{" "}
                  <strong className="text-foreground">Conectar dispositivo</strong> → Escaneie o QR
                  Code abaixo
                </p>
              </div>

              <div className="flex justify-center">
                <div className="rounded-lg border border-border bg-white p-4">
                  <img
                    src={
                      qrCode.startsWith("data:")
                        ? qrCode
                        : `data:image/png;base64,${qrCode}`
                    }
                    alt="QR Code WhatsApp"
                    className="h-64 w-64 object-contain"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <p className="text-[10px]">
                  O QR Code expira rapidamente. Clique em atualizar se necessário.
                </p>
              </div>

              <Button
                onClick={fetchQrCode}
                variant="outline"
                className="w-full gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar QR Code
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

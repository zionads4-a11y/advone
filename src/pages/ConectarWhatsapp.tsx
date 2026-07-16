import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, QrCode, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface Company { id: string; name: string; }

export default function ConectarWhatsapp() {
  const { user } = useAuth();
  const { companyIds, isClient, loading: companiesLoading } = useUserCompanies();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) return;
      let q = supabase.from("companies").select("id, name").order("name");
      if (isClient && companyIds.length > 0) q = q.in("id", companyIds);
      const { data } = await q;
      if (data) {
        setCompanies(data);
        if (data.length >= 1) setSelected(data[0].id);
      }
    };
    if (!companiesLoading) fetchCompanies();
  }, [user, isClient, companyIds, companiesLoading]);

  const fetchStatusAndQr = async (companyId: string) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const { data: statusRes } = await supabase.functions.invoke("zapi-qrcode", {
        body: { company_id: companyId, action: "get-status" },
      });
      const notCfgMsg = /não configurad|nome da instância/i;
      if (statusRes?.error && notCfgMsg.test(statusRes.error)) {
        setNotConfigured(true);
        setConnected(false);
        setQrcode(null);
        setLoading(false);
        return;
      }
      if (statusRes?.connected) {
        setConnected(true);
        setQrcode(null);
        setLoading(false);
        return;
      }
      setConnected(false);
      const { data: qrRes } = await supabase.functions.invoke("zapi-qrcode", {
        body: { company_id: companyId, action: "get_qrcode" },
      });
      if (qrRes?.error && notCfgMsg.test(qrRes.error)) {
        setNotConfigured(true);
      } else if (qrRes?.connected) {
        setConnected(true);
        setQrcode(null);
      } else if (qrRes?.qrcode) {
        setQrcode(typeof qrRes.qrcode === "string" ? qrRes.qrcode : JSON.stringify(qrRes.qrcode));
      } else {
        setError(qrRes?.error || "Não foi possível obter o QR Code. Tente novamente em instantes.");
      }
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar QR Code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selected) return;
    fetchStatusAndQr(selected);
    // Auto-refresh a cada 25s enquanto não conectado
    const iv = setInterval(() => {
      if (!connected) fetchStatusAndQr(selected);
    }, 25000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const qrSrc = useMemo(() => {
    if (!qrcode) return null;
    return qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`;
  }, [qrcode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            Conectar WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR Code com o WhatsApp do celular para conectar sua conta
          </p>
        </div>
        {companies.length > 1 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card className="max-w-xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-primary" />
            {connected ? "WhatsApp conectado" : "Escaneie o QR Code"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Selecione uma empresa para começar.
            </p>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : connected ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                Conectado
              </Badge>
              <p className="text-sm text-muted-foreground max-w-sm">
                Seu WhatsApp está ativo e pronto para receber e enviar mensagens.
              </p>
              <Button variant="outline" onClick={() => fetchStatusAndQr(selected)} className="gap-2 mt-2">
                <RefreshCw className="h-4 w-4" /> Verificar novamente
              </Button>
            </div>
          ) : notConfigured ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <p className="text-sm font-medium text-foreground">
                Aguardando configuração do administrador
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                A instância UaZapi ainda não foi cadastrada para esta empresa. Assim que o administrador finalizar a configuração, o QR Code aparecerá aqui automaticamente.
              </p>
              <Button variant="outline" onClick={() => fetchStatusAndQr(selected)} className="gap-2 mt-2">
                <RefreshCw className="h-4 w-4" /> Verificar novamente
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-destructive font-medium">{error}</p>
              <p className="text-xs text-muted-foreground">
                Se a configuração ainda não foi feita, peça ao administrador para configurar a instância.
              </p>
              <Button variant="outline" onClick={() => fetchStatusAndQr(selected)} className="gap-2 mt-2">
                <RefreshCw className="h-4 w-4" /> Tentar novamente
              </Button>
            </div>
          ) : qrSrc ? (
            <>
              <div className="rounded-lg border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground text-center">
                  Abra o <strong className="text-foreground">WhatsApp</strong> no celular →{" "}
                  <strong className="text-foreground">Dispositivos conectados</strong> →{" "}
                  <strong className="text-foreground">Conectar dispositivo</strong> e escaneie abaixo.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="rounded-lg border bg-white p-4">
                  <img src={qrSrc} alt="QR Code WhatsApp" className="h-64 w-64 object-contain" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                O QR Code atualiza automaticamente. Se expirar, clique em atualizar.
              </p>
              <Button onClick={() => fetchStatusAndQr(selected)} variant="outline" className="w-full gap-2">
                <RefreshCw className="h-4 w-4" /> Atualizar QR Code
              </Button>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-10">
              Nenhum QR Code disponível no momento.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

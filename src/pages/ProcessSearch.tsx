import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Scale, RefreshCw, Clock, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessData {
  numero_cnj?: string;
  titulo_polo_ativo?: string;
  titulo_polo_passivo?: string;
  data_inicio?: string;
  data_ultima_movimentacao?: string;
  quantidade_movimentacoes?: number;
  fontes?: Array<{
    nome?: string;
    sigla?: string;
    grau?: number;
    status_predito?: string;
    capa?: { classe?: string; assunto?: string; area?: string; valor_causa?: any };
  }>;
}

interface Movement {
  id: number;
  data: string;
  tipo?: string;
  conteudo: string;
  fonte?: { nome?: string; sigla?: string; grau?: number };
}

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const formatCnj = (s: string) => {
  const d = onlyDigits(s);
  if (d.length !== 20) return s;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
};

export default function ProcessSearch() {
  const [cnj, setCnj] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [process, setProcess] = useState<ProcessData | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchedAt, setSearchedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const digits = onlyDigits(cnj);
    if (digits.length !== 20) {
      toast.error("CNJ inválido. Deve ter 20 dígitos.");
      return;
    }
    const numero = formatCnj(digits);
    setLoading(true);
    setError(null);
    setProcess(null);
    setMovements([]);
    try {
      const { data, error } = await supabase.functions.invoke("escavador-proxy?action=search", {
        body: { numero_cnj: numero },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProcess(data);
      setSearchedAt(new Date());
      // busca movimentações em paralelo logo após
      loadMovements(numero);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      toast.error("Erro: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (numero?: string) => {
    const target = numero || (process?.numero_cnj ?? formatCnj(onlyDigits(cnj)));
    if (!target) return;
    setLoadingMovs(true);
    try {
      const { data, error } = await supabase.functions.invoke("escavador-proxy?action=movements", {
        body: { numero_cnj: target },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMovements(data?.items || []);
    } catch (e: any) {
      toast.error("Erro ao buscar movimentações: " + (e?.message || e));
    } finally {
      setLoadingMovs(false);
    }
  };

  const fonte = process?.fontes?.[0];
  const capa = fonte?.capa;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Busca de Processos em Tempo Real
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consulta direta nos tribunais via Escavador V2 — sem cadastrar monitoramento.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pesquisar por número CNJ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="0000000-00.0000.0.00.0000"
              value={cnj}
              onChange={(e) => setCnj(e.target.value)}
              onBlur={() => setCnj((v) => formatCnj(v))}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="font-mono"
            />
            <Button onClick={search} disabled={loading} className="shrink-0">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Buscar agora
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Aceita com ou sem máscara. A busca consome 1 crédito da sua conta Escavador.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Não foi possível consultar</p>
              <p className="text-xs text-muted-foreground mt-0.5 break-all">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {process && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base font-mono">
                  {process.numero_cnj || formatCnj(onlyDigits(cnj))}
                </CardTitle>
                {searchedAt && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Consultado em {format(searchedAt, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => loadMovements()} disabled={loadingMovs}>
                {loadingMovs ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                )}
                Atualizar movimentações
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Field label="Tribunal" value={fonte?.sigla || fonte?.nome || "—"} />
              <Field label="Status" value={fonte?.status_predito || "—"} />
              <Field label="Classe" value={capa?.classe || "—"} />
              <Field label="Assunto" value={capa?.assunto || "—"} />
              <Field label="Área" value={capa?.area || "—"} />
              <Field
                label="Movimentações"
                value={String(process.quantidade_movimentacoes ?? movements.length ?? 0)}
              />
              <Field
                label="Início"
                value={
                  process.data_inicio
                    ? format(new Date(process.data_inicio), "dd/MM/yyyy", { locale: ptBR })
                    : "—"
                }
              />
              <Field
                label="Última movimentação"
                value={
                  process.data_ultima_movimentacao
                    ? format(new Date(process.data_ultima_movimentacao), "dd/MM/yyyy", { locale: ptBR })
                    : "—"
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Polo ativo</p>
                <p className="text-sm">{process.titulo_polo_ativo || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Polo passivo</p>
                <p className="text-sm">{process.titulo_polo_passivo || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {process && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Movimentações
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {movements.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMovs ? (
              <div className="text-center py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando movimentações no tribunal...
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded">
                <FileText className="h-5 w-5 mx-auto mb-1 opacity-50" />
                Nenhuma movimentação encontrada.
              </div>
            ) : (
              <ScrollArea className="max-h-[500px] pr-2">
                <div className="space-y-2">
                  {movements.map((m, idx) => (
                    <div key={m.id ?? idx} className="flex gap-2">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 bg-primary/60" />
                        {idx < movements.length - 1 && <div className="w-px flex-1 bg-border mt-0.5" />}
                      </div>
                      <div className="flex-1 text-xs p-2.5 rounded border bg-muted/30">
                        <div className="flex justify-between gap-2 mb-1 flex-wrap">
                          <span className="font-medium">{m.tipo || "Movimento"}</span>
                          <span className="text-muted-foreground">
                            {m.data ? format(new Date(m.data), "dd/MM/yyyy", { locale: ptBR }) : ""}
                          </span>
                        </div>
                        {m.conteudo && (
                          <p className="whitespace-pre-wrap text-muted-foreground">{m.conteudo}</p>
                        )}
                        {m.fonte?.nome && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">
                            Fonte: {m.fonte.nome}
                            {m.fonte.sigla ? ` (${m.fonte.sigla})` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

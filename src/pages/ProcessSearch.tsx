import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Save, Scale, Sparkles, Gavel } from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";

interface Movement {
  data?: string;
  codigo?: number;
  nome?: string;
  texto?: string;
  grau?: string;
  orgao?: string;
  is_decision?: boolean;
}

interface ProcessResult {
  ok: boolean;
  message?: string;
  alias?: string;
  process?: {
    numero_cnj?: string;
    classe?: string;
    assunto?: string;
    tribunal?: string;
    orgao?: string;
    data_ajuizamento?: string;
    grau?: string;
  };
  graus?: Array<{ grau?: string; orgao?: string; movimentos?: number }>;
  movimentos?: Movement[];
  decisoes?: Movement[];
  monitored_id?: string | null;
}

export default function ProcessSearch() {
  const [cnj, setCnj] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [explaining, setExplaining] = useState<"last" | "decisions" | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState("Explicação");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const { user } = useAuth();

  async function explain(mode: "last" | "decisions") {
    if (!result?.ok || !result.process) return;
    setExplaining(mode);
    setSummary(null);
    setSummaryTitle(mode === "decisions" ? "Todas as decisões em linguagem simples" : "Explicação da última movimentação");
    try {
      const { data, error } = await supabase.functions.invoke("explain-process-search", {
        body: {
          process: result.process,
          movimentos: result.movimentos ?? [],
          decisoes: result.decisoes ?? [],
          mode,
        },
      });
      if (error) throw error;
      setSummary((data as { summary?: string })?.summary ?? "Sem resumo disponível.");
    } catch (e) {
      toast.error("Erro ao gerar resumo: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExplaining(null);
    }
  }

  async function callFn(save: boolean) {
    if (!cnj.trim()) {
      toast.error("Informe o número CNJ");
      return;
    }
    save ? setSaving(true) : setLoading(true);
    try {
      // Descobre company_id do usuário logado
      let company_id: string | undefined;
      if (save) {
        const { data } = await supabase.from("client_companies")
          .select("company_id").eq("user_id", user?.id ?? "").maybeSingle();
        company_id = data?.company_id;
        if (!company_id) {
          toast.error("Nenhum escritório vinculado ao seu usuário");
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("datajud-search", {
        body: { cnj: cnj.trim(), save, company_id },
      });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        throw new Error(details);
      }
      const res = data as ProcessResult;
      setResult(res);
      setSummary(null);
      if (!res.ok) toast.warning(res.message ?? "Processo não localizado");
      else if (save) toast.success("Processo salvo no monitoramento");
    } catch (e: unknown) {
      toast.error("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false); setSaving(false);
    }
  }

  const decisoes = result?.decisoes ?? [];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Scale className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Busca de Processos (DataJud CNJ)</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Consulte processos diretamente na base pública do Conselho Nacional de Justiça, em todas as instâncias (1º grau, 2º grau e recursos). Cobre TJs (estaduais), TRFs (federais), TRTs (trabalho), TST e STJ.
      </p>

      <Card>
        <CardHeader><CardTitle>Consultar por número CNJ</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="0000000-00.0000.0.00.0000"
              value={cnj}
              onChange={(e) => setCnj(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && callFn(false)}
            />
            <Button onClick={() => callFn(false)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Consultar
            </Button>
            <Button variant="secondary" onClick={() => callFn(true)} disabled={saving || !result?.ok}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar & monitorar
            </Button>
          </div>
        </CardContent>
      </Card>

      {result?.ok && result.process && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              Processo {result.process.numero_cnj}
              {result.alias && <Badge variant="outline">{result.alias.toUpperCase()}</Badge>}
              {result.graus?.map((g, i) => (
                <Badge key={i} variant="secondary">{g.grau ?? "—"} · {g.movimentos ?? 0} andamentos</Badge>
              ))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><b>Classe:</b> {result.process.classe ?? "—"}</div>
            <div><b>Assunto:</b> {result.process.assunto ?? "—"}</div>
            <div><b>Órgão julgador:</b> {result.process.orgao ?? "—"}</div>
            <div><b>Data de ajuizamento:</b> {result.process.data_ajuizamento?.substring(0, 10) ?? "—"}</div>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => explain("decisions")} disabled={explaining !== null}>
                {explaining === "decisions" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Gavel className="h-4 w-4 mr-1" />}
                Resumir todas as decisões ({decisoes.length})
              </Button>
              <Button size="sm" variant="outline" onClick={() => explain("last")} disabled={explaining !== null}>
                {explaining === "last" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Explicar última movimentação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {summaryTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{summary}</pre>
          </CardContent>
        </Card>
      )}

      {decisoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" />
              Decisões, sentenças e acórdãos ({decisoes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {decisoes.map((m, i) => (
                <li key={i} className="border-l-2 border-primary pl-3">
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{m.data ? new Date(m.data).toLocaleString("pt-BR") : "—"}</span>
                    {m.grau && <Badge variant="outline" className="text-[10px] py-0">{m.grau}</Badge>}
                  </div>
                  <div className="text-sm">{m.texto || m.nome}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result?.movimentos && result.movimentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Todos os andamentos ({result.movimentos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.movimentos.map((m, i) => (
                <li key={i} className={`border-l-2 pl-3 ${m.is_decision ? "border-primary" : "border-primary/30"}`}>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{m.data ? new Date(m.data).toLocaleString("pt-BR") : "—"}</span>
                    {m.grau && <Badge variant="outline" className="text-[10px] py-0">{m.grau}</Badge>}
                  </div>
                  <div className="text-sm">{m.texto || m.nome}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

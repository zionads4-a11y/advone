import { useState } from "react";
import { Search, Scale, Loader2, ExternalLink, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Result {
  title: string;
  url: string;
  snippet: string;
}

const TRIBUNAIS = [
  { value: "todos", label: "Todos os tribunais superiores" },
  { value: "stf", label: "STF - Supremo Tribunal Federal" },
  { value: "stj", label: "STJ - Superior Tribunal de Justiça" },
  { value: "tst", label: "TST - Tribunal Superior do Trabalho" },
  { value: "trf", label: "TRFs - Tribunais Regionais Federais" },
  { value: "tj", label: "TJs - Tribunais de Justiça Estaduais" },
];

const PERIODOS = [
  { value: "any", label: "Qualquer período" },
  { value: "year", label: "Último ano" },
  { value: "month", label: "Último mês" },
];

const EXEMPLOS = [
  "Aposentadoria especial professor tempo de serviço",
  "Dano moral por atraso de voo consumidor",
  "Rescisão indireta assédio moral trabalhista",
  "Guarda compartilhada alienação parental",
  "Revisão da vida toda INSS",
];

export default function Jurisprudencia() {
  const [query, setQuery] = useState("");
  const [tribunal, setTribunal] = useState("todos");
  const [period, setPeriod] = useState("any");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);

  const handleSearch = async (q?: string) => {
    const finalQuery = (q ?? query).trim();
    if (finalQuery.length < 5) {
      toast({ variant: "destructive", title: "Consulta muito curta", description: "Descreva melhor o tema jurídico." });
      return;
    }
    setQuery(finalQuery);
    setLoading(true);
    setAnswer("");
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("jurisprudence-search", {
        body: { query: finalQuery, tribunal, period },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnswer((data as any).answer ?? "");
      setResults((data as any).results ?? []);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erro na pesquisa",
        description: e?.message ?? "Tente novamente em alguns segundos.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Pesquisa de Jurisprudência
              <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] uppercase">IA + Busca ao vivo</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Busca ações judiciais reais em STF, STJ, TST, TRFs e TJs com número CNJ para inclusão no monitoramento
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex: dano moral atraso voo, aposentadoria especial professor, súmula 385 STJ..."
                className="pl-9"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Select value={tribunal} onValueChange={setTribunal} disabled={loading}>
                <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIBUNAIS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod} disabled={loading}>
                <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => handleSearch()} disabled={loading} className="shrink-0">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Pesquisar
              </Button>
            </div>
          </div>
          {!answer && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Exemplos:</span>
              {EXEMPLOS.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleSearch(ex)}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Content */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
        <Card className="flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-5">
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Buscando em tribunais e sintetizando resultados...</p>
                </div>
              )}
              {!loading && !answer && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Sparkles className="h-10 w-10 text-accent" />
                  <h2 className="text-base font-semibold">Faça uma pesquisa</h2>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Digite o tema, súmula ou tese jurídica. A IA busca em tempo real nos sites dos tribunais e devolve uma síntese com fontes.
                  </p>
                </div>
              )}
              {!loading && answer && (
                <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
                </article>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <div className="border-b p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fontes ({results.length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {results.length === 0 && !loading && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhuma fonte ainda</p>
              )}
              {results.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group block rounded-md border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold text-foreground group-hover:text-primary">
                        {r.title}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {new URL(r.url).hostname}
                      </p>
                      {r.snippet && (
                        <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
                          {r.snippet}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                  </div>
                </a>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

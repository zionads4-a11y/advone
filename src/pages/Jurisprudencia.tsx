import { useState } from "react";
import { Search, Scale, Loader2, ExternalLink, Sparkles, BookOpen, Globe, FileText, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface Result {
  title: string;
  url: string;
  snippet: string;
}

interface FonteReal {
  nome: string;
  sigla: string;
  url: string;
  categoria: "Supremo" | "Superior" | "Trabalho" | "Federal" | "Estadual / Geral";
  descricao: string;
  orientacao: string;
  dicasBusca: string[];
}

const FONTES_REAIS: FonteReal[] = [
  {
    nome: "Supremo Tribunal Federal",
    sigla: "STF",
    url: "https://portal.stf.jus.br/jurisprudencia/",
    categoria: "Supremo",
    descricao: "Consulta à jurisprudência, acórdãos, repercussão geral, súmulas vinculantes e decisões monocráticas do STF.",
    orientacao: "Acesse o Portal do STF em Jurisprudência. Utilize a busca textual avançada para teses de Repercussão Geral e Súmulas Vinculantes.",
    dicasBusca: [
      "Use aspas para termos exatos (ex: \"dano moral\").",
      "Filtre por 'Repercussão Geral' para temas de efeito vinculante obrigatório.",
      "Busque pelo número do tema da Repercussão Geral se já o possuir."
    ]
  },
  {
    nome: "Superior Tribunal de Justiça",
    sigla: "STJ",
    url: "https://scon.stj.jus.br/SCON/",
    categoria: "Superior",
    descricao: "Sistema de Jurisprudência (SCON) do STJ com acórdãos, petições, súmulas, recursos repetitivos e jurisprudência em teses.",
    orientacao: "No SCON, utilize a pesquisa livre combinando palavras-chave com operadores booleanos (E, OU, NAO) ou escolha 'Jurisprudência em Teses' para ver entendimentos consolidados por assunto.",
    dicasBusca: [
      "Utilize a seção 'Jurisprudencia em Teses' para sumários prontos divididos por ramo do direito.",
      "Pesquise recursos repetitivos (Tema X) para teses firmadas sob o rito do art. 1.036 do CPC."
    ]
  },
  {
    nome: "Tribunal Superior do Trabalho",
    sigla: "TST",
    url: "https://www.tst.jus.br/jurisprudencia",
    categoria: "Trabalho",
    descricao: "Consulta unificada de acórdãos, OJ (Orientações Jurisprudenciais), Súmulas e precedentes normativos do TST e TRTs.",
    orientacao: "Acesse o portal do TST na aba Jurisprudência. É possível consultar a base de Súmulas e OJs atualizadas ou realizar pesquisa livre de acórdãos da SDI-1 e turmas.",
    dicasBusca: [
      "Consulte diretamente o catalogo de Súmulas e OJs para ver o entendimento vigente.",
      "Utilize filtros por Turma ou SDI para refinar o entendimento específico trabalhista."
    ]
  },
  {
    nome: "Conselho da Justiça Federal (Jurisprudência Federal)",
    sigla: "CJF / TRFs",
    url: "https://www.cjf.jus.br/cjf/jurisprudencia-das-turmas-nacionais-de-uniformizacao",
    categoria: "Federal",
    descricao: "Jurisprudência das Turmas Recursais dos Juizados Especiais Federais (TNU) e tribunais regionais federais.",
    orientacao: "Ideal para direito previdenciário (INSS), tributário federal e administrativo. Consulte a TNU para pedidos uniformizados de benefício.",
    dicasBusca: [
      "Busque por Pedidos de Uniformização (Pedilef) na TNU para teses previdenciárias de grande impacto.",
      "Acesse o TRF da sua região (TRF1, TRF2, TRF3, TRF4, TRF5 ou TRF6) para acórdãos regionais."
    ]
  },
  {
    nome: "Tribunais de Justiça Estaduais (TJs)",
    sigla: "TJs",
    url: "https://www.cnj.jus.br/poder-judiciario/tribunais/",
    descricao: "Diretório oficial do CNJ com links para todos os Tribunais de Justiça estaduais do Brasil (TJSP, TJRJ, TJMG, TJRS, etc.).",
    orientacao: "Como cada estado possui seu próprio sistema de consulta de jurisprudência (ex: e-SAJ, PJe), utilize o diretório do CNJ para acessar diretamente o portal do tribunal desejado.",
    dicasBusca: [
      "Tenha em mãos a comarca ou o estado onde tramita ou tramitará a demanda.",
      "Muitos TJs exigem cadastro gratuito simplificado para visualização integral de votos e teores de acórdãos sigilosos ou de família."
    ]
  },
  {
    nome: "Biblioteca Digital Jurídica (STJ / STF)",
    sigla: "BDJur",
    url: "https://bdjur.stj.jus.br/",
    categoria: "Superior",
    descricao: "Repositório de doutrinas, pareceres, monografias, acórdãos históricos e boletins de jurisprudência dos tribunais superiores.",
    orientacao: "Excelente para fundamentação teórica robusta em petições iniciais e recursos extraordinários ou especiais.",
    dicasBusca: [
      "Pesquise por temas doutrinários específicos para encontrar artigos e pareceres publicados no âmbito da justiça superior."
    ]
  }
];

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
  const [searchFilterCat, setSearchFilterCat] = useState<string>("todos");

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

  const filteredFontes = searchFilterCat === "todos"
    ? FONTES_REAIS
    : FONTES_REAIS.filter(f => f.categoria.toLowerCase().includes(searchFilterCat.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Fontes & Pesquisa de Jurisprudência
              <Badge className="bg-accent/15 text-accent border-accent/30 text-[10px] uppercase">Fontes Reais + IA</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Consulte fontes oficiais de tribunais sem depender de IA ou utilize a busca assistida em tempo real
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="fontes" className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList>
            <TabsTrigger value="fontes" className="gap-2 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Fontes Reais & Orientações
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Pesquisa Assistida (IA + Web)
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA DE FONTES REAIS OFICIAIS */}
        <TabsContent value="fontes" className="flex-1 flex flex-col gap-4 mt-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Lista oficial dos principais repositórios e portais judiciais brasileiros para consulta autônoma e segura de acórdãos, súmulas e precedentes:
            </p>
            <div className="flex gap-2">
              <Select value={searchFilterCat} onValueChange={setSearchFilterCat}>
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Filtrar categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as categorias</SelectItem>
                  <SelectItem value="Supremo">Supremo / STF</SelectItem>
                  <SelectItem value="Superior">Superior / STJ</SelectItem>
                  <SelectItem value="Trabalho">Trabalho / TST</SelectItem>
                  <SelectItem value="Federal">Federal / TNU</SelectItem>
                  <SelectItem value="Estadual">Estadual / TJs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFontes.map((fonte, idx) => (
              <Card key={idx} className="flex flex-col justify-between p-4 border border-border/70 hover:border-primary/50 transition-all bg-card/50 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {fonte.sigla}
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground line-clamp-1">{fonte.nome}</h2>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                          {fonte.categoria}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {fonte.descricao}
                  </p>

                  <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-foreground/90 space-y-1.5 border border-border/40">
                    <div className="flex items-center gap-1.5 font-medium text-primary text-[11px]">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>Como pesquisar nesta fonte:</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {fonte.orientacao}
                    </p>
                    {fonte.dicasBusca.length > 0 && (
                      <ul className="list-disc list-inside space-of-1 pt-1 text-[10px] text-muted-foreground/90">
                        {fonte.dicasBusca.map((dica, i) => (
                          <li key={i} className="truncate">{dica}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" /> Portal Oficial
                  </span>
                  <Button asChild size="sm" className="h-8 text-xs gap-1.5">
                    <a href={fonte.url} target="_blank" rel="noreferrer noopener">
                      Consultar Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 bg-muted/30 border-dashed">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Dica de ouro para fundamentação sólida:</p>
                <p>
                  Sempre verifique o trânsito em julgado e se a tese possui efeito vinculante ativo (como Súmula Vinculante do STF ou Tema Repetitivo do STJ). Citações diretas dos portais oficiais garantem robustez irrefutável às suas peças processuais.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ABA DE PESQUISA ASSISTIDA COM IA */}
        <TabsContent value="ia" className="flex-1 flex flex-col gap-4 mt-0">
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
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px] min-h-[400px]">
            <Card className="flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 h-[450px]">
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
                      <h2 className="text-base font-semibold">Faça uma pesquisa assistida</h2>
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
                  Fontes Encontradas ({results.length})
                </h3>
              </div>
              <ScrollArea className="flex-1 h-[450px]">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

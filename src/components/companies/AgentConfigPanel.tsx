import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, Handshake, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AgentConfigPanelProps {
  companyId: string;
  aiEnabled: boolean;
}

interface RequiredDoc {
  name: string;
  description: string;
  required: boolean;
}

interface AgentConfig {
  id?: string;
  agent_type: string;
  is_active: boolean;
  prompt: string;
  required_documents: RequiredDoc[];
  contract_template: string;
}

const defaultAgents: AgentConfig[] = [
  {
    agent_type: "document_collector",
    is_active: false,
    prompt: "",
    required_documents: [
      { name: "RG ou CNH", description: "Documento com foto", required: true },
      { name: "Comprovante de endereço", description: "Últimos 3 meses", required: true },
      { name: "Documentos do caso", description: "Laudos, negativas, etc.", required: false },
    ],
    contract_template: "",
  },
  {
    agent_type: "viability_analyzer",
    is_active: false,
    prompt: "",
    required_documents: [],
    contract_template: "",
  },
  {
    agent_type: "contract_closer",
    is_active: false,
    prompt: "",
    required_documents: [],
    contract_template: "",
  },
];

const agentMeta: Record<string, { label: string; description: string; icon: any; color: string }> = {
  document_collector: {
    label: "Coletor de Documentos",
    description: "Solicita e recebe documentos do cliente via WhatsApp automaticamente",
    icon: FileText,
    color: "text-blue-500",
  },
  viability_analyzer: {
    label: "Analisador de Viabilidade",
    description: "Analisa dados e documentos para emitir parecer de viabilidade do caso",
    icon: Brain,
    color: "text-purple-500",
  },
  contract_closer: {
    label: "Fechador de Contrato",
    description: "Conduz o cliente ao fechamento do contrato de forma natural",
    icon: Handshake,
    color: "text-green-500",
  },
};

export function AgentConfigPanel({ companyId, aiEnabled }: AgentConfigPanelProps) {
  const [agents, setAgents] = useState<AgentConfig[]>(defaultAgents);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("company_bot_agents")
        .select("*")
        .eq("company_id", companyId);

      if (data && data.length > 0) {
        const merged = defaultAgents.map((def) => {
          const existing = data.find((d: any) => d.agent_type === def.agent_type);
          if (existing) {
            return {
              id: existing.id,
              agent_type: existing.agent_type,
              is_active: existing.is_active,
              prompt: existing.prompt || "",
              required_documents: Array.isArray(existing.required_documents)
                ? (existing.required_documents as unknown as RequiredDoc[])
                : def.required_documents,
              contract_template: existing.contract_template || "",
            };
          }
          return def;
        });
        setAgents(merged);
      }
      setLoading(false);
    };
    load();
  }, [companyId]);

  const updateAgent = (index: number, updates: Partial<AgentConfig>) => {
    setAgents((prev) => prev.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const addDocument = (agentIndex: number) => {
    const agent = agents[agentIndex];
    updateAgent(agentIndex, {
      required_documents: [...agent.required_documents, { name: "", description: "", required: false }],
    });
  };

  const removeDocument = (agentIndex: number, docIndex: number) => {
    const agent = agents[agentIndex];
    updateAgent(agentIndex, {
      required_documents: agent.required_documents.filter((_, i) => i !== docIndex),
    });
  };

  const updateDocument = (agentIndex: number, docIndex: number, updates: Partial<RequiredDoc>) => {
    const agent = agents[agentIndex];
    const docs = agent.required_documents.map((d, i) =>
      i === docIndex ? { ...d, ...updates } : d
    );
    updateAgent(agentIndex, { required_documents: docs });
  };

  const handleSave = async () => {
    setSaving(true);

    for (const agent of agents) {
      const payload = {
        company_id: companyId,
        agent_type: agent.agent_type as "document_collector" | "viability_analyzer" | "contract_closer",
        is_active: agent.is_active,
        prompt: agent.prompt || null,
        required_documents: agent.required_documents.length > 0
          ? JSON.parse(JSON.stringify(agent.required_documents))
          : [],
        contract_template: agent.contract_template || null,
      };

      if (agent.id) {
        const { error } = await supabase
          .from("company_bot_agents")
          .update(payload)
          .eq("id", agent.id);
        if (error) {
          toast.error(`Erro ao salvar ${agentMeta[agent.agent_type]?.label}: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("company_bot_agents")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          toast.error(`Erro ao criar ${agentMeta[agent.agent_type]?.label}: ${error.message}`);
          setSaving(false);
          return;
        }
        if (data) {
          agent.id = data.id;
        }
      }
    }

    toast.success("Agentes de IA salvos com sucesso!");
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Agentes de IA
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure agentes especializados que atuam após o SDR qualificar o lead
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {agents.filter((a) => a.is_active).length}/3 ativos
          </Badge>
        </div>
      </div>

      {/* Pipeline visualization */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Badge className="bg-primary/10 text-primary border-primary/30 shrink-0">1. SDR (Padrão)</Badge>
        <span className="text-muted-foreground">→</span>
        {agents.map((agent, i) => {
          const meta = agentMeta[agent.agent_type];
          return (
            <div key={agent.agent_type} className="flex items-center gap-2 shrink-0">
              <Badge
                variant={agent.is_active ? "default" : "outline"}
                className={agent.is_active ? "bg-primary/10 text-primary border-primary/30" : "opacity-50"}
              >
                {i + 2}. {meta?.label?.split(" ")[0]}
              </Badge>
              {i < agents.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          );
        })}
      </div>

      {agents.map((agent, agentIndex) => {
        const meta = agentMeta[agent.agent_type];
        const Icon = meta?.icon || Brain;

        return (
          <Card key={agent.agent_type} className={`border-border/50 transition-all ${!agent.is_active ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className={`h-4 w-4 ${meta?.color}`} />
                  {meta?.label}
                </CardTitle>
                <Switch
                  checked={agent.is_active}
                  onCheckedChange={(v) => updateAgent(agentIndex, { is_active: v })}
                  disabled={!aiEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">{meta?.description}</p>
            </CardHeader>

            {agent.is_active && (
              <CardContent className="space-y-4">
                {/* Document collector specific: required documents */}
                {agent.agent_type === "document_collector" && (
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Documentos obrigatórios</Label>
                    {agent.required_documents.map((doc, docIndex) => (
                      <div key={docIndex} className="flex items-center gap-2">
                        <Input
                          value={doc.name}
                          onChange={(e) => updateDocument(agentIndex, docIndex, { name: e.target.value })}
                          placeholder="Nome do documento"
                          className="flex-1 text-sm"
                        />
                        <Input
                          value={doc.description}
                          onChange={(e) => updateDocument(agentIndex, docIndex, { description: e.target.value })}
                          placeholder="Descrição"
                          className="flex-1 text-sm"
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
                          <input
                            type="checkbox"
                            checked={doc.required}
                            onChange={(e) => updateDocument(agentIndex, docIndex, { required: e.target.checked })}
                            className="rounded"
                          />
                          Obrig.
                        </label>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeDocument(agentIndex, docIndex)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addDocument(agentIndex)} className="gap-1">
                      <Plus className="h-3.5 w-3.5" /> Adicionar documento
                    </Button>
                  </div>
                )}

                {/* Contract closer specific: contract template */}
                {agent.agent_type === "contract_closer" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Modelo de contrato (referência para o bot)</Label>
                    <Textarea
                      value={agent.contract_template}
                      onChange={(e) => updateAgent(agentIndex, { contract_template: e.target.value })}
                      placeholder="Cole aqui o modelo de contrato ou instruções sobre termos, honorários, etc."
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Common: custom prompt */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Instruções adicionais (opcional)</Label>
                  <Textarea
                    value={agent.prompt}
                    onChange={(e) => updateAgent(agentIndex, { prompt: e.target.value })}
                    placeholder="Instruções específicas para este agente..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button onClick={handleSave} disabled={saving || !aiEnabled} className="w-full gradient-primary text-primary-foreground gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "Salvando..." : "Salvar Agentes"}
      </Button>
    </div>
  );
}

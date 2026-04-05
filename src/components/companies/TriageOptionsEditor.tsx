import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

export interface TriageOption {
  id: string;
  emoji: string;
  label: string;
  questions: string[];
  closing_message: string;
  keyword_triggers: string[];
}

interface TriageOptionsEditorProps {
  options: TriageOption[];
  onChange: (options: TriageOption[]) => void;
  disabled?: boolean;
}

const EMOJI_OPTIONS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function TriageOptionsEditor({ options, onChange, disabled }: TriageOptionsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addOption = () => {
    const idx = options.length;
    const newOption: TriageOption = {
      id: generateId(),
      emoji: EMOJI_OPTIONS[idx] || `${idx + 1}️⃣`,
      label: "",
      questions: [""],
      closing_message: "",
      keyword_triggers: [],
    };
    onChange([...options, newOption]);
    setExpandedId(newOption.id);
  };

  const removeOption = (id: string) => {
    onChange(options.filter((o) => o.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateOption = (id: string, updates: Partial<TriageOption>) => {
    onChange(options.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const addQuestion = (optionId: string) => {
    const option = options.find((o) => o.id === optionId);
    if (option) {
      updateOption(optionId, { questions: [...option.questions, ""] });
    }
  };

  const updateQuestion = (optionId: string, qIndex: number, value: string) => {
    const option = options.find((o) => o.id === optionId);
    if (option) {
      const newQ = [...option.questions];
      newQ[qIndex] = value;
      updateOption(optionId, { questions: newQ });
    }
  };

  const removeQuestion = (optionId: string, qIndex: number) => {
    const option = options.find((o) => o.id === optionId);
    if (option && option.questions.length > 1) {
      updateOption(optionId, { questions: option.questions.filter((_, i) => i !== qIndex) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Menu de Triagem</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={disabled || options.length >= 8}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar opção
        </Button>
      </div>

      {options.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
          Nenhuma opção configurada. Adicione opções para criar o menu de triagem do bot.
        </p>
      )}

      {options.map((option, idx) => {
        const isExpanded = expandedId === option.id;
        return (
          <Card key={option.id} className="border-border/50">
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : option.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-base">{EMOJI_OPTIONS[idx] || `${idx + 1}`}</span>
              <span className="flex-1 text-sm font-medium truncate">
                {option.label || "Opção sem nome"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); removeOption(option.id); }}
                disabled={disabled}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nome da opção</Label>
                  <Input
                    value={option.label}
                    onChange={(e) => updateOption(option.id, { label: e.target.value })}
                    placeholder="Ex: BPC/LOAS - Benefício assistencial"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    value={option.keyword_triggers.join(", ")}
                    onChange={(e) =>
                      updateOption(option.id, {
                        keyword_triggers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Ex: bpc, loas, assistencial, idoso"
                    disabled={disabled}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    O bot identifica o assunto por essas palavras ou pelo número da opção.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Perguntas de qualificação</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addQuestion(option.id)}
                      disabled={disabled}
                      className="h-6 text-[10px] gap-1"
                    >
                      <Plus className="h-3 w-3" /> Pergunta
                    </Button>
                  </div>
                  {option.questions.map((q, qi) => (
                    <div key={qi} className="flex gap-2">
                      <Input
                        value={q}
                        onChange={(e) => updateQuestion(option.id, qi, e.target.value)}
                        placeholder={`Pergunta ${qi + 1}...`}
                        disabled={disabled}
                        className="text-sm"
                      />
                      {option.questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={() => removeQuestion(option.id, qi)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Mensagem de fechamento (conduzir ao agendamento)</Label>
                  <Textarea
                    value={option.closing_message}
                    onChange={(e) => updateOption(option.id, { closing_message: e.target.value })}
                    placeholder="Ex: Esse é exatamente o tipo de caso que nosso escritório atua. Vamos agendar uma análise gratuita?"
                    rows={2}
                    className="text-sm"
                    disabled={disabled}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

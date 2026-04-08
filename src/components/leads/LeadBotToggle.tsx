import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Bot } from "lucide-react";
import { toast } from "sonner";

interface LeadBotToggleProps {
  leadId: string;
  initialDisabled: boolean;
  onUpdate?: () => void;
  compact?: boolean;
}

export function LeadBotToggle({ leadId, initialDisabled, onUpdate, compact }: LeadBotToggleProps) {
  const [botDisabled, setBotDisabled] = useState(initialDisabled);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    const newVal = !botDisabled;
    const { error } = await supabase
      .from("leads")
      .update({ bot_disabled: newVal } as any)
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      setBotDisabled(newVal);
      toast.success(newVal ? "Bot desativado para este lead" : "Bot reativado para este lead");
      onUpdate?.();
    }
    setSaving(false);
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={saving}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        title={botDisabled ? "Bot desativado — clique para reativar" : "Bot ativo — clique para desativar"}
      >
        <Bot className={`h-3.5 w-3.5 ${botDisabled ? "text-destructive" : "text-primary"}`} />
        <span>{botDisabled ? "Bot OFF" : "Bot ON"}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <Bot className={`h-4 w-4 ${botDisabled ? "text-destructive" : "text-primary"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">
            {botDisabled ? "Bot desativado" : "Bot ativo"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {botDisabled ? "O robô não responde este lead" : "O robô responde automaticamente"}
          </p>
        </div>
      </div>
      <Switch
        checked={!botDisabled}
        onCheckedChange={toggle}
        disabled={saving}
      />
    </div>
  );
}

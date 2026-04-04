import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repeat } from "lucide-react";

export interface RecurrenceConfig {
  type: "none" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "weekdays" | "custom";
  customInterval?: number;
  customUnit?: "days" | "weeks" | "months";
  endDate?: string;
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
}

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Repeat className="h-4 w-4 text-primary" />
        Recorrência
      </div>

      <Select
        value={value.type}
        onValueChange={(v) =>
          onChange({ ...value, type: v as RecurrenceConfig["type"] })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Não repetir" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Não repetir</SelectItem>
          <SelectItem value="daily">Todos os dias</SelectItem>
          <SelectItem value="weekdays">Dias úteis (seg-sex)</SelectItem>
          <SelectItem value="weekly">Semanalmente</SelectItem>
          <SelectItem value="biweekly">Quinzenalmente</SelectItem>
          <SelectItem value="monthly">Mensalmente</SelectItem>
          <SelectItem value="yearly">Anualmente</SelectItem>
          <SelectItem value="custom">Personalizado...</SelectItem>
        </SelectContent>
      </Select>

      {value.type === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">A cada</span>
          <Input
            type="number"
            min={1}
            max={365}
            className="w-20"
            value={value.customInterval || 1}
            onChange={(e) =>
              onChange({ ...value, customInterval: parseInt(e.target.value) || 1 })
            }
          />
          <Select
            value={value.customUnit || "days"}
            onValueChange={(v) =>
              onChange({ ...value, customUnit: v as "days" | "weeks" | "months" })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">dia(s)</SelectItem>
              <SelectItem value="weeks">semana(s)</SelectItem>
              <SelectItem value="months">mês(es)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {value.type !== "none" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Termina em (opcional)</Label>
          <Input
            type="date"
            value={value.endDate || ""}
            onChange={(e) => onChange({ ...value, endDate: e.target.value || undefined })}
          />
        </div>
      )}
    </div>
  );
}

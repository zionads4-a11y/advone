import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock } from "lucide-react";

const DAYS = [
  { key: "monday", label: "Segunda-feira" },
  { key: "tuesday", label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday", label: "Quinta-feira" },
  { key: "friday", label: "Sexta-feira" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

interface TimeSlot {
  open: string;
  close: string;
}

export type BusinessHours = Record<string, TimeSlot[]>;

interface BusinessHoursConfigProps {
  value: BusinessHours;
  onChange: (hours: BusinessHours) => void;
}

const DEFAULT_SLOT: TimeSlot = { open: "08:00", close: "18:00" };

export function BusinessHoursConfig({ value, onChange }: BusinessHoursConfigProps) {
  const isDayEnabled = (dayKey: string) => {
    return (value[dayKey] && value[dayKey].length > 0);
  };

  const toggleDay = (dayKey: string) => {
    const newHours = { ...value };
    if (isDayEnabled(dayKey)) {
      newHours[dayKey] = [];
    } else {
      newHours[dayKey] = [{ ...DEFAULT_SLOT }];
    }
    onChange(newHours);
  };

  const updateSlot = (dayKey: string, index: number, field: "open" | "close", val: string) => {
    const newHours = { ...value };
    const slots = [...(newHours[dayKey] || [])];
    slots[index] = { ...slots[index], [field]: val };
    newHours[dayKey] = slots;
    onChange(newHours);
  };

  const addSlot = (dayKey: string) => {
    const newHours = { ...value };
    const slots = [...(newHours[dayKey] || [])];
    slots.push({ open: "13:00", close: "18:00" });
    newHours[dayKey] = slots;
    onChange(newHours);
  };

  const removeSlot = (dayKey: string, index: number) => {
    const newHours = { ...value };
    const slots = [...(newHours[dayKey] || [])];
    slots.splice(index, 1);
    newHours[dayKey] = slots;
    onChange(newHours);
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-primary" />
        Horário de Atendimento
      </Label>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const enabled = isDayEnabled(day.key);
          const slots = value[day.key] || [];

          return (
            <div key={day.key} className="rounded-lg border border-border bg-muted/20 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={enabled} onCheckedChange={() => toggleDay(day.key)} />
                  <span className={`text-sm font-medium ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                    {day.label}
                  </span>
                </div>
                {enabled && slots.length < 3 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => addSlot(day.key)} className="h-6 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Turno
                  </Button>
                )}
              </div>
              {enabled && slots.length > 0 && (
                <div className="mt-2 space-y-1.5 pl-10">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.open}
                        onChange={(e) => updateSlot(day.key, i, "open", e.target.value)}
                        className="h-7 w-[110px] text-xs"
                      />
                      <span className="text-xs text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={slot.close}
                        onChange={(e) => updateSlot(day.key, i, "close", e.target.value)}
                        className="h-7 w-[110px] text-xs"
                      />
                      {slots.length > 1 && (
                        <button type="button" onClick={() => removeSlot(day.key, i)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function getDefaultBusinessHours(): BusinessHours {
  return {
    monday: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }],
    tuesday: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }],
    wednesday: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }],
    thursday: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }],
    friday: [{ open: "08:00", close: "12:00" }, { open: "13:00", close: "18:00" }],
    saturday: [],
    sunday: [],
  };
}

export function parseBusinessHours(data: unknown): BusinessHours {
  if (!data || typeof data !== "object") return getDefaultBusinessHours();
  return data as BusinessHours;
}

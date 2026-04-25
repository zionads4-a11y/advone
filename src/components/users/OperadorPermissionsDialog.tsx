import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/modulePermissions";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  companyId: string;
}

export function OperadorPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  companyId,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [granted, setGranted] = useState<Set<ModuleKey>>(new Set());

  useEffect(() => {
    if (!open || !userId || !companyId) return;
    setLoading(true);

    supabase
      .from("user_module_permissions")
      .select("module, granted")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .then(({ data }) => {
        const set = new Set<ModuleKey>();
        data?.forEach((p) => {
          if (p.granted) set.add(p.module as ModuleKey);
        });
        setGranted(set);
        setLoading(false);
      });
  }, [open, userId, companyId]);

  const toggle = (key: ModuleKey) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    // upsert para todos os módulos do catálogo (granted true/false)
    const rows = MODULE_CATALOG.map((m) => ({
      user_id: userId,
      company_id: companyId,
      module: m.key,
      granted: granted.has(m.key),
      granted_by: user?.id,
    }));

    const { error } = await supabase
      .from("user_module_permissions")
      .upsert(rows, { onConflict: "user_id,company_id,module" });

    if (error) {
      toast.error("Erro ao salvar permissões: " + error.message);
    } else {
      toast.success("Permissões atualizadas!");
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissões de {userName}
          </DialogTitle>
          <DialogDescription>
            Marque os módulos que este advogado/operador poderá acessar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-3">
            {MODULE_CATALOG.map((m) => {
              const Icon = m.icon;
              const checked = granted.has(m.key);
              return (
                <label
                  key={m.key}
                  htmlFor={`perm-${m.key}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 transition-colors hover:bg-secondary/70"
                >
                  <Checkbox
                    id={`perm-${m.key}`}
                    checked={checked}
                    onCheckedChange={() => toggle(m.key)}
                    className="mt-0.5"
                  />
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`perm-${m.key}`}
                        className="cursor-pointer font-medium"
                      >
                        {m.label}
                      </Label>
                      {m.sensitive && (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 bg-destructive/10 text-[10px] text-destructive"
                        >
                          Sensível
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 gradient-primary text-primary-foreground"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Salvando..." : "Salvar Permissões"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

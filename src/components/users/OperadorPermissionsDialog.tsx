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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/modulePermissions";
import {
  OPERATOR_PROFILE_LABELS,
  OPERATOR_PROFILE_DESCRIPTIONS,
  OPERATOR_PROFILE_DEFAULT_MODULES,
} from "@/lib/operatorProfiles";
import type { OperatorProfile } from "@/hooks/useOperatorProfile";
import { Loader2, ShieldCheck, Scale, Users2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  companyId: string;
}

interface LegalArea {
  id: string;
  name: string;
  color: string | null;
}

interface AreaAssignment {
  area_id: string;
  role_in_area: "responsavel" | "estagiario";
  sees_all_area_cards: boolean;
}

const PROFILE_ORDER: OperatorProfile[] = [
  "master",
  "advogado_responsavel",
  "estagiario",
  "sdr_closer",
  "financeiro",
];

const PROFILE_NEEDS_AREAS: OperatorProfile[] = [
  "advogado_responsavel",
  "estagiario",
];

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
  const [profile, setProfile] = useState<OperatorProfile | "">("");
  const [granted, setGranted] = useState<Set<ModuleKey>>(new Set());
  const [areas, setAreas] = useState<LegalArea[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AreaAssignment>>({});

  useEffect(() => {
    if (!open || !userId || !companyId) return;
    setLoading(true);

    (async () => {
      const [permRes, profileRes, areasRes, ulaRes] = await Promise.all([
        supabase
          .from("user_module_permissions")
          .select("module, granted")
          .eq("user_id", userId)
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select("operator_profile")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("legal_areas")
          .select("id, name, color")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("position"),
        supabase
          .from("user_legal_areas")
          .select("area_id, role_in_area, sees_all_area_cards")
          .eq("user_id", userId)
          .eq("company_id", companyId),
      ]);

      const perms = new Set<ModuleKey>();
      permRes.data?.forEach((p) => {
        if (p.granted) perms.add(p.module as ModuleKey);
      });
      setGranted(perms);

      const p = (profileRes.data as any)?.operator_profile as OperatorProfile | null;
      setProfile(p || "");

      setAreas((areasRes.data as LegalArea[]) || []);

      const asg: Record<string, AreaAssignment> = {};
      (ulaRes.data || []).forEach((r: any) => {
        asg[r.area_id] = {
          area_id: r.area_id,
          role_in_area: r.role_in_area,
          sees_all_area_cards: r.sees_all_area_cards,
        };
      });
      setAssignments(asg);

      setLoading(false);
    })();
  }, [open, userId, companyId]);

  const toggleModule = (key: ModuleKey) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleArea = (areaId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (next[areaId]) {
        delete next[areaId];
      } else {
        next[areaId] = {
          area_id: areaId,
          role_in_area: profile === "estagiario" ? "estagiario" : "responsavel",
          sees_all_area_cards: true,
        };
      }
      return next;
    });
  };

  const setAreaSeesAll = (areaId: string, sees: boolean) => {
    setAssignments((prev) => ({
      ...prev,
      [areaId]: { ...prev[areaId], sees_all_area_cards: sees },
    }));
  };

  const applyProfilePreset = (newProfile: OperatorProfile) => {
    setProfile(newProfile);
    // Aplica o preset de módulos do perfil, mas mantém extras que o Master já concedeu
    const preset = new Set<ModuleKey>(OPERATOR_PROFILE_DEFAULT_MODULES[newProfile]);
    setGranted((prev) => {
      const merged = new Set<ModuleKey>(preset);
      prev.forEach((m) => merged.add(m));
      return merged;
    });
    // Se o novo perfil não usa áreas, limpa as atribuições
    if (!PROFILE_NEEDS_AREAS.includes(newProfile)) {
      setAssignments({});
    }
    // Ajusta o papel nas áreas já atribuídas
    if (PROFILE_NEEDS_AREAS.includes(newProfile)) {
      setAssignments((prev) => {
        const roleInArea: "responsavel" | "estagiario" =
          newProfile === "estagiario" ? "estagiario" : "responsavel";
        const next: Record<string, AreaAssignment> = {};
        Object.entries(prev).forEach(([id, a]) => {
          next[id] = { ...a, role_in_area: roleInArea };
        });
        return next;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1) salva o perfil no profile
      await supabase
        .from("profiles")
        .update({ operator_profile: profile || null })
        .eq("user_id", userId);

      // 2) upsert user_module_permissions (todos do catálogo)
      const rows = MODULE_CATALOG.map((m) => ({
        user_id: userId,
        company_id: companyId,
        module: m.key,
        granted: granted.has(m.key),
        granted_by: user?.id,
      }));
      const { error: permErr } = await supabase
        .from("user_module_permissions")
        .upsert(rows, { onConflict: "user_id,company_id,module" });
      if (permErr) throw permErr;

      // 3) sincroniza user_legal_areas
      // Estratégia: apagar tudo do user nesta empresa e reinserir
      const { error: delErr } = await supabase
        .from("user_legal_areas")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", companyId);
      if (delErr) throw delErr;

      const areaRows = Object.values(assignments).map((a) => ({
        user_id: userId,
        company_id: companyId,
        area_id: a.area_id,
        role_in_area: a.role_in_area,
        sees_all_area_cards: a.sees_all_area_cards,
        created_by: user?.id,
      }));
      if (areaRows.length > 0) {
        const { error: insErr } = await supabase
          .from("user_legal_areas")
          .insert(areaRows);
        if (insErr) throw insErr;
      }

      toast.success("Perfil e permissões atualizados!");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || "desconhecido"));
    }
    setSaving(false);
  };

  const showAreas = profile && PROFILE_NEEDS_AREAS.includes(profile as OperatorProfile);
  const isEstagiario = profile === "estagiario";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-foreground max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Perfil de {userName}
          </DialogTitle>
          <DialogDescription>
            Defina o perfil operacional, as áreas jurídicas e os módulos que este usuário poderá acessar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Perfil */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perfil operacional
              </Label>
              <Select value={profile} onValueChange={(v) => applyProfilePreset(v as OperatorProfile)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {OPERATOR_PROFILE_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profile && (
                <p className="rounded-md bg-secondary/40 p-2 text-xs text-muted-foreground">
                  {OPERATOR_PROFILE_DESCRIPTIONS[profile as OperatorProfile]}
                </p>
              )}
            </div>

            {/* Áreas */}
            {showAreas && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Scale className="h-3 w-3" />
                  Áreas jurídicas
                </Label>
                {areas.length === 0 ? (
                  <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs">
                    Nenhuma área cadastrada. Cadastre em Processos (Kanban).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {areas.map((a) => {
                      const asg = assignments[a.id];
                      const active = !!asg;
                      return (
                        <div
                          key={a.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            active ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30"
                          }`}
                        >
                          <label
                            htmlFor={`area-${a.id}`}
                            className="flex cursor-pointer items-center gap-3"
                          >
                            <Checkbox
                              id={`area-${a.id}`}
                              checked={active}
                              onCheckedChange={() => toggleArea(a.id)}
                            />
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ background: a.color || "#0ea5a4" }}
                            />
                            <span className="flex-1 text-sm font-medium">{a.name}</span>
                          </label>
                          {active && isEstagiario && (
                            <div className="mt-2 flex items-center justify-between rounded-md bg-background/60 px-2 py-1.5">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Users2 className="h-3 w-3 text-muted-foreground" />
                                Vê todos os cards da área
                              </div>
                              <Switch
                                checked={asg.sees_all_area_cards}
                                onCheckedChange={(v) => setAreaSeesAll(a.id, v)}
                              />
                            </div>
                          )}
                          {active && isEstagiario && !asg.sees_all_area_cards && (
                            <p className="mt-1 pl-1 text-[10px] text-muted-foreground">
                              Só verá cards em que for adicionado ao time.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Módulos */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Módulos liberados
              </Label>
              <p className="text-[11px] text-muted-foreground">
                O perfil já sugere um conjunto padrão. Você pode liberar ou restringir individualmente.
              </p>
              <div className="space-y-2">
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
                        onCheckedChange={() => toggleModule(m.key)}
                        className="mt-0.5"
                      />
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.label}</span>
                          {m.sensitive && (
                            <Badge
                              variant="outline"
                              className="border-destructive/40 bg-destructive/10 text-[10px] text-destructive"
                            >
                              Sensível
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
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
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

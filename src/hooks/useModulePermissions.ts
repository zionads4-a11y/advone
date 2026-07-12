import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import { useOperatorProfile } from "@/hooks/useOperatorProfile";
import { OPERATOR_PROFILE_DEFAULT_MODULES } from "@/lib/operatorProfiles";
import type { ModuleKey } from "@/lib/modulePermissions";

/**
 * Retorna os módulos que o usuário atual pode acessar.
 *
 * Regras:
 * - admin / member: acesso total (retorna null = "todos")
 * - gerente: acesso total na própria empresa (retorna null)
 * - operador com perfil "master": acesso total
 * - operador com outros perfis: interseção entre preset do perfil e permissões custom
 * - operador sem perfil: apenas módulos com granted=true em user_module_permissions
 * - client: usa lista padrão de cliente
 */
export function useModulePermissions() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { companyIds, loading: companiesLoading } = useUserCompanies();
  const { profile: operatorProfile, loading: profileLoading } = useOperatorProfile();
  const [allowed, setAllowed] = useState<Set<ModuleKey> | null>(null);
  const [loading, setLoading] = useState(true);

  const isUnrestricted =
    userRole === "admin" ||
    userRole === "member" ||
    userRole === "gerente" ||
    (userRole === "operador" && operatorProfile === "master");

  useEffect(() => {
    if (authLoading || companiesLoading || profileLoading) return;

    if (!user) {
      setAllowed(new Set());
      setLoading(false);
      return;
    }

    if (isUnrestricted) {
      setAllowed(null); // null = sem restrição
      setLoading(false);
      return;
    }

    if (userRole !== "operador" || companyIds.length === 0) {
      setAllowed(new Set());
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      const { data } = await supabase
        .from("user_module_permissions")
        .select("module, granted")
        .eq("user_id", user.id)
        .in("company_id", companyIds);

      const custom = new Set<ModuleKey>();
      data?.forEach((p) => {
        if (p.granted) custom.add(p.module as ModuleKey);
      });

      // Se tem perfil operacional, união entre preset do perfil e permissões custom
      // Preset dá acesso base; Master pode ampliar via módulos custom
      if (operatorProfile) {
        const preset = new Set<ModuleKey>(
          OPERATOR_PROFILE_DEFAULT_MODULES[operatorProfile]
        );
        custom.forEach((m) => preset.add(m));
        setAllowed(preset);
      } else {
        setAllowed(custom);
      }
      setLoading(false);
    };

    fetchPermissions();
  }, [user, userRole, companyIds, authLoading, companiesLoading, profileLoading, operatorProfile, isUnrestricted]);

  const can = useCallback(
    (module: ModuleKey) => {
      if (allowed === null) return true;
      return allowed.has(module);
    },
    [allowed]
  );

  return { can, allowed, loading, isUnrestricted, operatorProfile };
}

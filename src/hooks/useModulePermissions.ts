import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserCompanies } from "@/hooks/useUserCompanies";
import type { ModuleKey } from "@/lib/modulePermissions";

/**
 * Retorna os módulos que o usuário atual pode acessar.
 *
 * Regras:
 * - admin / member: acesso total (retorna null = "todos")
 * - gerente: acesso total na própria empresa (retorna null)
 * - operador: apenas módulos com granted=true em user_module_permissions
 * - client: usa lista padrão de cliente
 */
export function useModulePermissions() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { companyIds, loading: companiesLoading } = useUserCompanies();
  const [allowed, setAllowed] = useState<Set<ModuleKey> | null>(null);
  const [loading, setLoading] = useState(true);

  const isUnrestricted =
    userRole === "admin" || userRole === "member" || userRole === "gerente";

  useEffect(() => {
    if (authLoading || companiesLoading) return;

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

      const set = new Set<ModuleKey>();
      data?.forEach((p) => {
        if (p.granted) set.add(p.module as ModuleKey);
      });
      setAllowed(set);
      setLoading(false);
    };

    fetchPermissions();
  }, [user, userRole, companyIds, authLoading, companiesLoading, isUnrestricted]);

  const can = useCallback(
    (module: ModuleKey) => {
      if (allowed === null) return true;
      return allowed.has(module);
    },
    [allowed]
  );

  return { can, allowed, loading, isUnrestricted };
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type OperatorProfile =
  | "master"
  | "advogado_responsavel"
  | "estagiario"
  | "sdr_closer"
  | "financeiro";

/**
 * Perfil operacional (Advogado Master, Responsável, Estagiário, SDR/Closer, Financeiro).
 * Só é relevante quando userRole === "operador". Para os demais retorna null.
 */
export function useOperatorProfile() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("operator_profile")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(((data as any)?.operator_profile as OperatorProfile) ?? null);
      setLoading(false);
    })();
  }, [user, authLoading, userRole]);

  return { profile, loading, userRole };
}

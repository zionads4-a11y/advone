import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SubscriptionGuard {
  loading: boolean;
  blocked: boolean;
  status: string | null;
}

export function useSubscriptionGuard(): SubscriptionGuard {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Admins and members (agency) are never blocked
    if (userRole === "admin" || userRole === "member") {
      setLoading(false);
      setBlocked(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const subStatus = data?.status ?? null;
      setStatus(subStatus);
      setBlocked(subStatus === "overdue" || subStatus === "cancelled");
      setLoading(false);
    };

    check();
  }, [user, userRole]);

  return { loading, blocked, status };
}

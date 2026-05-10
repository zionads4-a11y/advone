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
    let mounted = true;

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
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;
        
        const subStatus = data?.status ?? null;
        setStatus(subStatus);
        
        // Only block if status is explicitly overdue or cancelled
        // If there's no plan linked (subStatus is null), access is allowed
        setBlocked(subStatus === "overdue" || subStatus === "cancelled");
      } catch (err) {
        console.error("Subscription check error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, [user, userRole]);

  return { loading, blocked, status };
}

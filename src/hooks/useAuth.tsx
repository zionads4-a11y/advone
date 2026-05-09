import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const isFetchingRoleRef = useRef(false);

  const fetchUserRole = async (userId: string) => {
    if (isFetchingRoleRef.current) return;
    isFetchingRoleRef.current = true;
    try {
      console.log("[Auth] Fetching role for user:", userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      const role = data?.role ?? null;
      console.log("[Auth] Fetched role:", role);
      setUserRole(role);
      return role;
    } catch (err) {
      console.error("Failed to fetch user role:", err);
      return null;
    } finally {
      isFetchingRoleRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log("[Auth] Initializing session...");
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession) {
          console.log("[Auth] Found initial session for:", initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchUserRole(initialSession.user.id);
        } else {
          console.log("[Auth] No initial session found.");
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) {
          console.log("[Auth] Loading complete.");
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        console.log("[Auth] Auth state change event:", event);

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setUserRole(null);
          setLoading(false);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (currentSession?.user) {
            const isUserChange = !user || currentSession.user.id !== user.id;
            console.log("[Auth] Session active for:", currentSession.user.id, "isUserChange:", isUserChange);
            
            setSession(currentSession);
            setUser(currentSession.user);
            
            // Fetch role if user changed or if we don't have it yet
            if (isUserChange || !userRole) {
              await fetchUserRole(currentSession.user.id);
            }
          } else if (!currentSession) {
            // Explicitly handle no session case within these events
            setSession(null);
            setUser(null);
            setUserRole(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Removed user?.id and userRole from dependencies to prevent redundant triggers

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    if (!error) {
      const { trackMetaEvent } = await import("@/lib/metaPixel");
      trackMetaEvent("CompleteRegistration", { email, contentName: fullName });
      trackMetaEvent("Lead", { email, contentName: "Signup" });
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signIn, signInWithGoogle, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

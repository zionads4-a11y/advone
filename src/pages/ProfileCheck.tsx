import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export default function ProfileCheck() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg font-medium">Usuário não autenticado.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Confirmação de Perfil</CardTitle>
          <p className="text-sm text-muted-foreground">Dados persistidos no banco de dados</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name} />
              <AvatarFallback className="text-2xl">
                {profile?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-semibold">{profile?.full_name || "N/A"}</h2>
              <p className="text-muted-foreground">{profile?.email || user.email}</p>
            </div>
          </div>
          
          <div className="rounded-lg bg-muted p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">Metadados Brutos</h3>
            <pre className="overflow-auto text-xs text-foreground">
              {JSON.stringify({
                auth_id: user.id,
                db_profile: profile
              }, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

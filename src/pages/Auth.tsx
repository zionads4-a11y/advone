import { useState, useEffect } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import logoAdvOne from "@/assets/logo-advone.png";

export default function Auth() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  useEffect(() => {
    if (mode === "login") {
      document.title = "Acesse sua conta | AdvOne";
    }
  }, [mode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !loading) {
    const from = searchParams.get("redirect") || "/dashboard";
    console.log("[Auth Page] User logged in, redirecting to:", from);
    
    // Prevent redirect loops
    if (from.includes("/auth") || from === "/" || from === "") {
      return <Navigate to="/dashboard" replace />;
    }
    
    return <Navigate to={from} replace />;
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-[hsl(220,25%,6%)] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img 
            src={logoAdvOne} 
            alt="AdvOne" 
            className="h-32 w-auto sm:h-40 drop-shadow-[0_0_20px_hsl(153,60%,45%/0.4)]" 
          />
          <p className="text-sm text-[hsl(220,10%,55%)] font-medium">
            CRM inteligente para gestão de leads
          </p>
        </div>

        <LoginForm mode={mode} />
      </div>
    </div>
  );
}

function LoginForm({ mode }: { mode: string | null }) {
  const { signInWithGoogle, signIn } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error("Erro ao entrar com Google: " + error.message);
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }
    
    setEmailLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error("Erro ao entrar: " + error.message);
      setEmailLoading(false);
    }
  };

  return (
    <Card className="border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] text-[hsl(220,10%,92%)] shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="font-display text-foreground text-center text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Acesse sua conta</CardTitle>
        <CardDescription className="text-center text-[hsl(220,10%,55%)]">Bem-vindo de volta ao AdvOne</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <button type="button" className="text-xs text-[hsl(153,60%,45%)] hover:underline">Esqueceu a senha?</button>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 gradient-primary text-white font-bold" 
            disabled={emailLoading || googleLoading}
          >
            {emailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Entrar no Painel
          </Button>
        </form>

      </CardContent>
    </Card>
  );
}


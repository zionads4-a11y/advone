import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ExternalRedirectProps {
  url: string;
}

export function ExternalRedirect({ url }: ExternalRedirectProps) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecionando...</p>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface TrackingLinkUtmTemplatesProps {
  slug: string;
  campaignName?: string;
}

export function TrackingLinkUtmTemplates({ slug, campaignName }: TrackingLinkUtmTemplatesProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "oonteavjxzkovrzktnie";
  const baseUrl = `https://${projectId}.supabase.co/functions/v1/track-click?s=${slug}`;

  const googleUrl = `${baseUrl}&utm_source=google&utm_medium=cpc&utm_campaign={campaignname}&utm_content={adgroupname}&utm_term={keyword}`;
  const metaUrl = `${baseUrl}&utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("URL copiada!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
      >
        <ChevronDown className="h-3 w-3" />
        Ver URLs para anúncios
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <button
        onClick={() => setExpanded(false)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
      >
        <ChevronUp className="h-3 w-3" />
        Ocultar URLs
      </button>

      {/* Google Ads */}
      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-xs font-medium text-foreground">Google Ads</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => copyToClipboard(googleUrl, "google")}
          >
            {copiedKey === "google" ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copiar
          </Button>
        </div>
        <code className="text-[10px] text-muted-foreground break-all block bg-background rounded p-2 leading-relaxed">
          {googleUrl}
        </code>
        <p className="text-[10px] text-muted-foreground">
          Cole no campo <strong>"URL final"</strong> do anúncio. O Google substitui automaticamente{" "}
          <code className="bg-background px-1 rounded">{"{campaignname}"}</code>,{" "}
          <code className="bg-background px-1 rounded">{"{adgroupname}"}</code> e{" "}
          <code className="bg-background px-1 rounded">{"{keyword}"}</code>.
        </p>
      </div>

      {/* Meta Ads */}
      <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
            </svg>
            <span className="text-xs font-medium text-foreground">Meta Ads</span>
            <span className="text-[10px] text-muted-foreground">(Facebook / Instagram)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => copyToClipboard(metaUrl, "meta")}
          >
            {copiedKey === "meta" ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copiar
          </Button>
        </div>
        <code className="text-[10px] text-muted-foreground break-all block bg-background rounded p-2 leading-relaxed">
          {metaUrl}
        </code>
        <p className="text-[10px] text-muted-foreground">
          Cole no campo <strong>"URL do site"</strong> do anúncio. O Meta substitui automaticamente{" "}
          <code className="bg-background px-1 rounded">{"{{campaign.name}}"}</code> e{" "}
          <code className="bg-background px-1 rounded">{"{{ad.name}}"}</code>.
        </p>
      </div>
    </div>
  );
}

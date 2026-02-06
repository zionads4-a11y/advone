import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Tag, Monitor, Hash, Info } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  name: string;
  whatsapp: string | null;
}

interface Campaign {
  id: string;
  name: string;
  source: string;
}

interface CreateTrackingLinkFormProps {
  company: Company;
  campaigns: Campaign[];
  onSuccess: () => void;
  onCancel: () => void;
}

type LinkUsage = "site" | "ads" | "organic";

export function CreateTrackingLinkForm({ company, campaigns, onSuccess, onCancel }: CreateTrackingLinkFormProps) {
  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState("55");
  const [phoneNumber, setPhoneNumber] = useState(
    company.whatsapp?.replace(/^55/, "") || ""
  );
  const [linkName, setLinkName] = useState("");
  const [defaultMessage, setDefaultMessage] = useState(
    "Olá, me interessei pelo seu produto. Pode me dar mais detalhes?"
  );
  const [campaignId, setCampaignId] = useState<string>("none");
  const [linkUsage, setLinkUsage] = useState<LinkUsage>("site");
  const [submitting, setSubmitting] = useState(false);

  const generateSlug = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let slug = "";
    for (let i = 0; i < 8; i++) {
      slug += chars[Math.floor(Math.random() * chars.length)];
    }
    return slug;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    if (!phoneNumber.replace(/\D/g, "")) {
      toast.error("Informe o número do WhatsApp");
      return;
    }

    if (!linkName.trim()) {
      toast.error("Informe o nome do link");
      return;
    }

    setSubmitting(true);

    const slug = linkName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      || generateSlug();

    const { error } = await supabase.from("tracking_links").insert({
      company_id: company.id,
      slug,
      whatsapp_number: fullNumber,
      default_message: defaultMessage,
      campaign_id: campaignId === "none" ? null : campaignId,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      if (error.message.includes("unique")) {
        toast.error("Esse nome de link já existe. Tente outro.");
      } else {
        toast.error("Erro: " + error.message);
      }
      return;
    }

    toast.success("Link rastreável criado!");
    onSuccess();
  };

  const usageOptions: { value: LinkUsage; icon: React.ReactNode; label: string; description: string }[] = [
    {
      value: "site",
      icon: <Monitor className="h-5 w-5" />,
      label: "Botão no meu Site/Landing Page",
      description: "Substitua o link wa.me no botão do seu site",
    },
    {
      value: "ads",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      label: "Diretamente no Anúncio (Meta/Google)",
      description: "Use como URL de destino nos seus anúncios",
    },
    {
      value: "organic",
      icon: <Hash className="h-5 w-5" />,
      label: "Tráfego Orgânico (Redes Sociais)",
      description: "Use em posts, bio do Instagram, etc.",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* WhatsApp + Link Name row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            Telefone WhatsApp
          </Label>
          <div className="flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="55">BR +55</SelectItem>
                <SelectItem value="1">US +1</SelectItem>
                <SelectItem value="351">PT +351</SelectItem>
                <SelectItem value="54">AR +54</SelectItem>
                <SelectItem value="56">CL +56</SelectItem>
                <SelectItem value="57">CO +57</SelectItem>
                <SelectItem value="52">MX +52</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Digite o número"
              className="flex-1"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Tag className="h-4 w-4 text-primary" />
            Nome do Link
          </Label>
          <Input
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="Ex: Campanha Black Friday"
            required
          />
        </div>
      </div>

      {/* Campaign select */}
      {campaigns.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Campanha (opcional)</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger>
              <SelectValue placeholder="Vincular a uma campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem campanha específica</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.source})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Default Message */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          Mensagem Padrão
        </Label>
        <Textarea
          value={defaultMessage}
          onChange={(e) => setDefaultMessage(e.target.value)}
          placeholder="Olá, me interessei pelo seu produto. Pode me dar mais detalhes?"
          rows={4}
          className="resize-y"
        />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" />
          Todas as mensagens terão um código de rastreio adicionado automaticamente
        </div>
      </div>

      {/* Link Usage */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          📍 Como você vai usar este link?
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {usageOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLinkUsage(option.value)}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                linkUsage === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-secondary/30 hover:border-muted-foreground/30"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  linkUsage === option.value
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {option.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          ← Voltar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 gradient-primary text-primary-foreground"
        >
          {submitting ? "Criando..." : "Criar Link Rastreável"}
        </Button>
      </div>
    </form>
  );
}

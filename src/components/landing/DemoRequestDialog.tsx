import { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  phone: z.string().trim().min(10, "Telefone inválido").max(20),
  city: z.string().trim().min(2, "Informe sua cidade").max(80),
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
});

interface Props {
  trigger: ReactNode;
  source?: string;
}

export function DemoRequestDialog({ trigger, source = "landing" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", city: "", email: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const { error } = await supabase.from("demo_requests").insert({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      email: parsed.data.email || null,
      source,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    toast.success("Solicitação enviada! Nossa equipe entrará em contato em breve.");
    setForm({ full_name: "", phone: "", city: "", email: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar apresentação</DialogTitle>
          <DialogDescription>
            Preencha seus dados e nossa equipe entrará em contato para agendar uma demonstração personalizada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dr-name">Nome completo *</Label>
            <Input id="dr-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dr-phone">Telefone (WhatsApp) *</Label>
            <Input id="dr-phone" type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dr-city">Cidade *</Label>
            <Input id="dr-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dr-email">E-mail (opcional)</Label>
            <Input id="dr-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={160} />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-[hsl(0,0%,100%)] font-semibold">
            {loading ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

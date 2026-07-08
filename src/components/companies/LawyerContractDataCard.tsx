import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Scale, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  companyId: string;
}

interface Fields {
  // Escritório
  office_legal_name: string;
  office_cnpj: string;
  office_address: string;
  office_city: string;
  office_state: string;
  office_cep: string;
  // Advogado(a) responsável
  lawyer_title: "Dra." | "Dr.";
  lawyer_name: string;
  lawyer_oab: string;
  lawyer_oab_uf: string;
  lawyer_cpf: string;
  lawyer_nationality: string;
  lawyer_marital_status: string;
  lawyer_email: string;
  lawyer_phone: string;
}

const empty: Fields = {
  office_legal_name: "",
  office_cnpj: "",
  office_address: "",
  office_city: "",
  office_state: "",
  office_cep: "",
  lawyer_title: "Dra.",
  lawyer_name: "",
  lawyer_oab: "",
  lawyer_oab_uf: "",
  lawyer_cpf: "",
  lawyer_nationality: "brasileiro(a)",
  lawyer_marital_status: "",
  lawyer_email: "",
  lawyer_phone: "",
};

export function LawyerContractDataCard({ companyId }: Props) {
  const [form, setForm] = useState<Fields>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("companies")
        .select(
          "office_legal_name, office_cnpj, office_address, office_city, office_state, office_cep, lawyer_title, lawyer_name, lawyer_oab, lawyer_oab_uf, lawyer_cpf, lawyer_nationality, lawyer_marital_status, lawyer_email, lawyer_phone"
        )
        .eq("id", companyId)
        .maybeSingle();
      if (!cancel && data) {
        setForm({
          office_legal_name: (data as any).office_legal_name || "",
          office_cnpj: (data as any).office_cnpj || "",
          office_address: (data as any).office_address || "",
          office_city: (data as any).office_city || "",
          office_state: (data as any).office_state || "",
          office_cep: (data as any).office_cep || "",
          lawyer_title: ((data as any).lawyer_title === "Dr." ? "Dr." : "Dra.") as "Dra." | "Dr.",
          lawyer_name: (data as any).lawyer_name || "",
          lawyer_oab: (data as any).lawyer_oab || "",
          lawyer_oab_uf: (data as any).lawyer_oab_uf || "",
          lawyer_cpf: (data as any).lawyer_cpf || "",
          lawyer_nationality: (data as any).lawyer_nationality || "brasileiro(a)",
          lawyer_marital_status: (data as any).lawyer_marital_status || "",
          lawyer_email: (data as any).lawyer_email || "",
          lawyer_phone: (data as any).lawyer_phone || "",
        });
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [companyId]);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload: any = {};
    for (const [k, v] of Object.entries(form)) payload[k] = (v as string).trim() || null;
    if (payload.lawyer_oab_uf) payload.lawyer_oab_uf = payload.lawyer_oab_uf.toUpperCase();
    if (payload.office_state) payload.office_state = payload.office_state.toUpperCase();

    const { error } = await supabase.from("companies").update(payload).eq("id", companyId);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Dados do escritório salvos!");
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Scale className="h-5 w-5 text-primary" />
          Dados do escritório para contratos
        </CardTitle>
        <CardDescription>
          Esses dados preenchem automaticamente as procurações, contratos de honorários
          e declarações geradas pelo sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* Escritório */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Escritório
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Razão social</Label>
                  <Input value={form.office_legal_name} onChange={(e) => set("office_legal_name", e.target.value)} placeholder="Nome jurídico do escritório" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CNPJ</Label>
                  <Input value={form.office_cnpj} onChange={(e) => set("office_cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Endereço completo</Label>
                  <Input value={form.office_address} onChange={(e) => set("office_address", e.target.value)} placeholder="Rua, número, bairro" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cidade</Label>
                  <Input value={form.office_city} onChange={(e) => set("office_city", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">UF</Label>
                    <Input maxLength={2} value={form.office_state} onChange={(e) => set("office_state", e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CEP</Label>
                    <Input value={form.office_cep} onChange={(e) => set("office_cep", e.target.value)} placeholder="00000-000" />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Advogado(a) responsável */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Advogado(a) responsável
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Tratamento (usado nos prompts do bot)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={form.lawyer_title === "Dra." ? "default" : "outline"}
                      onClick={() => set("lawyer_title", "Dra.")}
                    >
                      Dra. (feminino)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.lawyer_title === "Dr." ? "default" : "outline"}
                      onClick={() => set("lawyer_title", "Dr.")}
                    >
                      Dr. (masculino)
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome completo</Label>
                  <Input value={form.lawyer_name} onChange={(e) => set("lawyer_name", e.target.value)} placeholder="Ex: Gisele Torres" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CPF</Label>
                  <Input value={form.lawyer_cpf} onChange={(e) => set("lawyer_cpf", e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Número da OAB</Label>
                  <Input value={form.lawyer_oab} onChange={(e) => set("lawyer_oab", e.target.value)} placeholder="Ex: 123.456" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UF da OAB</Label>
                  <Input maxLength={2} value={form.lawyer_oab_uf} onChange={(e) => set("lawyer_oab_uf", e.target.value.toUpperCase())} placeholder="SP" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nacionalidade</Label>
                  <Input value={form.lawyer_nationality} onChange={(e) => set("lawyer_nationality", e.target.value)} placeholder="brasileiro(a)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estado civil</Label>
                  <Input value={form.lawyer_marital_status} onChange={(e) => set("lawyer_marital_status", e.target.value)} placeholder="Ex: Casada" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail profissional</Label>
                  <Input type="email" value={form.lawyer_email} onChange={(e) => set("lawyer_email", e.target.value)} placeholder="contato@escritorio.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone profissional</Label>
                  <Input value={form.lawyer_phone} onChange={(e) => set("lawyer_phone", e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>

            <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar dados do escritório
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

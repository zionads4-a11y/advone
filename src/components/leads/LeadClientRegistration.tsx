import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, UserSquare2 } from "lucide-react";
import { toast } from "sonner";

interface LeadClientRegistrationProps {
  leadId: string;
  onUpdate?: () => void;
}

interface ClientFields {
  name: string;
  cpf_cliente_final: string | null;
  rg: string | null;
  nacionalidade: string | null;
  profissao: string | null;
  email: string | null;
  phone: string | null;
  estado_civil: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  endereco_cep: string | null;
}

const ESTADOS_CIVIS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União Estável",
];

const empty: ClientFields = {
  name: "",
  cpf_cliente_final: "",
  rg: "",
  nacionalidade: "brasileiro(a)",
  profissao: "",
  email: "",
  phone: "",
  estado_civil: "",
  endereco_rua: "",
  endereco_numero: "",
  endereco_complemento: "",
  endereco_bairro: "",
  endereco_cidade: "",
  endereco_estado: "",
  endereco_cep: "",
};

export function LeadClientRegistration({ leadId, onUpdate }: LeadClientRegistrationProps) {
  const [form, setForm] = useState<ClientFields>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select(
          "name, cpf_cliente_final, rg, nacionalidade, profissao, email, phone, estado_civil, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep"
        )
        .eq("id", leadId)
        .maybeSingle();
      if (!cancelled && data) {
        setForm({
          name: data.name || "",
          cpf_cliente_final: data.cpf_cliente_final || "",
          rg: (data as any).rg || "",
          nacionalidade: (data as any).nacionalidade || "brasileiro(a)",
          profissao: (data as any).profissao || "",
          email: data.email || "",
          phone: data.phone || "",
          estado_civil: data.estado_civil || "",
          endereco_rua: data.endereco_rua || "",
          endereco_numero: data.endereco_numero || "",
          endereco_complemento: data.endereco_complemento || "",
          endereco_bairro: data.endereco_bairro || "",
          endereco_cidade: data.endereco_cidade || "",
          endereco_estado: data.endereco_estado || "",
          endereco_cep: data.endereco_cep || "",
        });
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const set = <K extends keyof ClientFields>(k: K, v: ClientFields[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({
        name: form.name.trim(),
        cpf_cliente_final: form.cpf_cliente_final || null,
        rg: form.rg || null,
        nacionalidade: form.nacionalidade || null,
        profissao: form.profissao || null,
        email: form.email || null,
        phone: form.phone || null,
        estado_civil: form.estado_civil || null,
        endereco_rua: form.endereco_rua || null,
        endereco_numero: form.endereco_numero || null,
        endereco_complemento: form.endereco_complemento || null,
        endereco_bairro: form.endereco_bairro || null,
        endereco_cidade: form.endereco_cidade || null,
        endereco_estado: form.endereco_estado || null,
        endereco_cep: form.endereco_cep || null,
      })
      .eq("id", leadId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Cadastro do cliente salvo!");
    onUpdate?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserSquare2 className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cadastro do Cliente
        </h4>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs">Nome completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">CPF</Label>
                <Input
                  value={form.cpf_cliente_final || ""}
                  onChange={(e) => set("cpf_cliente_final", e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label className="text-xs">RG</Label>
                <Input
                  value={form.rg || ""}
                  onChange={(e) => set("rg", e.target.value)}
                  placeholder="00.000.000-0"
                />
              </div>
              <div>
                <Label className="text-xs">Estado civil</Label>
                <Select
                  value={form.estado_civil || ""}
                  onValueChange={(v) => set("estado_civil", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_CIVIS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone fixo</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(00) 0000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Profissão</Label>
                <Input
                  value={form.profissao || ""}
                  onChange={(e) => set("profissao", e.target.value)}
                  placeholder="Ex: Aposentado(a), Autônomo(a)"
                />
              </div>
              <div>
                <Label className="text-xs">Nacionalidade</Label>
                <Input
                  value={form.nacionalidade || ""}
                  onChange={(e) => set("nacionalidade", e.target.value)}
                  placeholder="brasileiro(a)"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Rua</Label>
                <Input
                  value={form.endereco_rua || ""}
                  onChange={(e) => set("endereco_rua", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Número</Label>
                <Input
                  value={form.endereco_numero || ""}
                  onChange={(e) => set("endereco_numero", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Complemento</Label>
                <Input
                  value={form.endereco_complemento || ""}
                  onChange={(e) => set("endereco_complemento", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">CEP</Label>
                <Input
                  value={form.endereco_cep || ""}
                  onChange={(e) => set("endereco_cep", e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div>
                <Label className="text-xs">Bairro</Label>
                <Input
                  value={form.endereco_bairro || ""}
                  onChange={(e) => set("endereco_bairro", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input
                  value={form.endereco_cidade || ""}
                  onChange={(e) => set("endereco_cidade", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Input
                  maxLength={2}
                  value={form.endereco_estado || ""}
                  onChange={(e) =>
                    set("endereco_estado", e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-2" />
              {saving ? "Salvando..." : "Salvar cadastro"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

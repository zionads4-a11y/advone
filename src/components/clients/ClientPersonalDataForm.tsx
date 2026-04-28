import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { toast } from "sonner";

export interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpf_cliente_final?: string | null;
  rg?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  nacionalidade?: string | null;
  endereco_rua?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_cep?: string | null;
  banco_nome?: string | null;
  banco_agencia?: string | null;
  banco_conta?: string | null;
  banco_tipo_conta?: string | null;
  banco_pix?: string | null;
  area_direito?: string | null;
  tipo_caso_detalhado?: string | null;
}

interface Props {
  client: ClientData;
  onSaved?: () => void;
}

const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"];
const TIPOS_CONTA = ["Corrente", "Poupança", "Salário"];

export function ClientPersonalDataForm({ client, onSaved }: Props) {
  const [form, setForm] = useState<ClientData>(client);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof ClientData>(key: K, value: ClientData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    const { id, ...rest } = form;
    const { error } = await supabase.from("leads").update(rest).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Dados atualizados!");
    onSaved?.();
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} />
          </div>
          <div>
            <Label>CPF</Label>
            <Input value={form.cpf_cliente_final || ""} onChange={(e) => setField("cpf_cliente_final", e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div>
            <Label>RG</Label>
            <Input value={form.rg || ""} onChange={(e) => setField("rg", e.target.value)} />
          </div>
          <div>
            <Label>Nacionalidade</Label>
            <Input value={form.nacionalidade || ""} onChange={(e) => setField("nacionalidade", e.target.value)} />
          </div>
          <div>
            <Label>Estado civil</Label>
            <Select value={form.estado_civil || ""} onValueChange={(v) => setField("estado_civil", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ESTADOS_CIVIS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Profissão</Label>
            <Input value={form.profissao || ""} onChange={(e) => setField("profissao", e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp || ""} onChange={(e) => setField("whatsapp", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Rua</Label>
            <Input value={form.endereco_rua || ""} onChange={(e) => setField("endereco_rua", e.target.value)} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={form.endereco_numero || ""} onChange={(e) => setField("endereco_numero", e.target.value)} />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input value={form.endereco_complemento || ""} onChange={(e) => setField("endereco_complemento", e.target.value)} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.endereco_bairro || ""} onChange={(e) => setField("endereco_bairro", e.target.value)} />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={form.endereco_cep || ""} onChange={(e) => setField("endereco_cep", e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.endereco_cidade || ""} onChange={(e) => setField("endereco_cidade", e.target.value)} />
          </div>
          <div>
            <Label>Estado (UF)</Label>
            <Input maxLength={2} value={form.endereco_estado || ""} onChange={(e) => setField("endereco_estado", e.target.value.toUpperCase())} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Bancários</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Banco</Label>
            <Input value={form.banco_nome || ""} onChange={(e) => setField("banco_nome", e.target.value)} />
          </div>
          <div>
            <Label>Tipo de conta</Label>
            <Select value={form.banco_tipo_conta || ""} onValueChange={(v) => setField("banco_tipo_conta", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_CONTA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Agência</Label>
            <Input value={form.banco_agencia || ""} onChange={(e) => setField("banco_agencia", e.target.value)} />
          </div>
          <div>
            <Label>Conta</Label>
            <Input value={form.banco_conta || ""} onChange={(e) => setField("banco_conta", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Chave PIX</Label>
            <Input value={form.banco_pix || ""} onChange={(e) => setField("banco_pix", e.target.value)} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Caso Jurídico</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Área do Direito</Label>
            <Input value={form.area_direito || ""} onChange={(e) => setField("area_direito", e.target.value)} placeholder="Ex: Previdenciário, Trabalhista..." />
          </div>
          <div>
            <Label>Tipo de caso</Label>
            <Input value={form.tipo_caso_detalhado || ""} onChange={(e) => setField("tipo_caso_detalhado", e.target.value)} placeholder="Ex: Aposentadoria por idade" />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar dados"}
        </Button>
      </div>
    </div>
  );
}

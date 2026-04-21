import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Loader2, Save, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyOffices, type CompanyOffice } from "@/hooks/useCompanyOffices";

interface Props {
  companyId: string;
}

const EMPTY: Omit<CompanyOffice, "id" | "company_id" | "position"> = {
  name: "",
  address: "",
  complement: null,
  reference_point: null,
  maps_url: null,
  is_active: true,
};

export function CompanyOfficesEditor({ companyId }: Props) {
  const { offices, loading, reload } = useCompanyOffices(companyId);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!draft.name.trim() || !draft.address.trim()) {
      toast.error("Informe nome e endereço da unidade.");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("company_offices").insert({
      company_id: companyId,
      name: draft.name.trim(),
      address: draft.address.trim(),
      complement: draft.complement?.trim() || null,
      reference_point: draft.reference_point?.trim() || null,
      maps_url: draft.maps_url?.trim() || null,
      is_active: draft.is_active,
      position: offices.length,
    });
    setAdding(false);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    setDraft(EMPTY);
    toast.success("Endereço adicionado!");
    reload();
  };

  const handleUpdate = async (office: CompanyOffice, patch: Partial<CompanyOffice>) => {
    setSavingId(office.id);
    const { error } = await supabase
      .from("company_offices")
      .update(patch)
      .eq("id", office.id);
    setSavingId(null);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este endereço?")) return;
    const { error } = await supabase.from("company_offices").delete().eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Endereço removido.");
    reload();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Endereços dos Escritórios
          <Badge variant="secondary" className="ml-auto">
            {offices.length} {offices.length === 1 ? "unidade" : "unidades"}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cadastre as unidades físicas. Quando o lead pedir reunião presencial, a Laura
          oferece a escolha de qual unidade prefere.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {offices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum endereço cadastrado ainda.
              </p>
            )}

            {offices.map((office) => (
              <OfficeRow
                key={office.id}
                office={office}
                onSave={(patch) => handleUpdate(office, patch)}
                onDelete={() => handleDelete(office.id)}
                saving={savingId === office.id}
              />
            ))}

            {/* Form de novo endereço */}
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Adicionar nova unidade
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome da unidade *</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Ex: Unidade Centro"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Link do Google Maps</Label>
                  <Input
                    value={draft.maps_url || ""}
                    onChange={(e) => setDraft({ ...draft, maps_url: e.target.value })}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço completo *</Label>
                <Textarea
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="Rua Exemplo, 123 — Bairro, Cidade/UF, CEP 00000-000"
                  rows={2}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Complemento</Label>
                  <Input
                    value={draft.complement || ""}
                    onChange={(e) => setDraft({ ...draft, complement: e.target.value })}
                    placeholder="Sala 405, Bloco B..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ponto de referência</Label>
                  <Input
                    value={draft.reference_point || ""}
                    onChange={(e) => setDraft({ ...draft, reference_point: e.target.value })}
                    placeholder="Em frente ao Shopping..."
                  />
                </div>
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding}
                className="w-full gradient-primary text-primary-foreground gap-2"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar Endereço
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function OfficeRow({
  office,
  onSave,
  onDelete,
  saving,
}: {
  office: CompanyOffice;
  onSave: (patch: Partial<CompanyOffice>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(office.name);
  const [address, setAddress] = useState(office.address);
  const [complement, setComplement] = useState(office.complement || "");
  const [reference, setReference] = useState(office.reference_point || "");
  const [mapsUrl, setMapsUrl] = useState(office.maps_url || "");

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${office.is_active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Endereço" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento" />
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ponto de referência" />
              </div>
              <Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="Link Google Maps" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {office.name}
                {!office.is_active && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{office.address}</p>
              {office.complement && <p className="text-[11px] text-muted-foreground">📍 {office.complement}</p>}
              {office.reference_point && <p className="text-[11px] text-muted-foreground">🗺️ {office.reference_point}</p>}
              {office.maps_url && (
                <a href={office.maps_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1">
                  <MapIcon className="h-3 w-3" />
                  Abrir no Google Maps
                </a>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={office.is_active}
            onCheckedChange={(v) => onSave({ is_active: v })}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {editing ? (
          <>
            <Button
              size="sm"
              variant="default"
              disabled={saving}
              onClick={() => {
                onSave({
                  name,
                  address,
                  complement: complement || null,
                  reference_point: reference || null,
                  maps_url: mapsUrl || null,
                });
                setEditing(false);
              }}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

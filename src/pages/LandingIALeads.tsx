import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  oab: string | null;
  practice_area: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  status: string;
  created_at: string;
}

const COLUMNS: (keyof Lead)[] = [
  "created_at", "name", "whatsapp", "email", "oab", "practice_area",
  "preferred_date", "preferred_time", "message",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "status",
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n;]/.test(s) ? `"${s}"` : s;
}

function downloadCsv(leads: Lead[]) {
  const header = COLUMNS.join(",");
  const rows = leads.map((l) => COLUMNS.map((c) => csvEscape(l[c])).join(","));
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-landing-ia-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LandingIALeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landing_ia_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar leads: " + error.message);
    setLeads((data as Lead[]) || []);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))
    );
  };

  const handleDelete = async () => {
    if (!confirmIds?.length) return;
    setDeleting(true);
    const { error } = await supabase
      .from("landing_ia_leads")
      .delete()
      .in("id", confirmIds);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success(`${confirmIds.length} lead(s) excluído(s).`);
    setConfirmIds(null);
    await load();
  };

  const allChecked = leads.length > 0 && selected.size === leads.length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-display">Leads — Landing IA</h1>
          <p className="text-muted-foreground text-sm">
            Formulário público de /IA. Exporte para abrir no Google Sheets (Arquivo → Importar).
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {selected.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setConfirmIds([...selected])}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir ({selected.size})
            </Button>
          )}
          <Button
            onClick={() => downloadCsv(leads)}
            disabled={!leads.length}
            className="gradient-primary text-primary-foreground"
          >
            <Download className="mr-2 h-4 w-4" /> Exportar CSV ({leads.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total: {leads.length} leads</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Nenhum lead capturado ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="py-2 pr-4 w-8">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  </th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Área</th>
                  <th className="py-2 pr-4">OAB</th>
                  <th className="py-2 pr-4">Origem</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-muted/40">
                    <td className="py-2 pr-4">
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={() => toggle(l.id)}
                        aria-label={`Selecionar ${l.name}`}
                      />
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-4">{l.name}</td>
                    <td className="py-2 pr-4">{l.whatsapp}</td>
                    <td className="py-2 pr-4">{l.email || "—"}</td>
                    <td className="py-2 pr-4">{l.practice_area || "—"}</td>
                    <td className="py-2 pr-4">{l.oab || "—"}</td>
                    <td className="py-2 pr-4">
                      {l.utm_source ? (
                        <Badge variant="secondary">{l.utm_source}</Badge>
                      ) : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge>{l.status}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setConfirmIds([l.id])}
                        aria-label="Excluir lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmIds} onOpenChange={(o) => !o && setConfirmIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {confirmIds?.length} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os leads selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

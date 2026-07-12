import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INTERNAL_MODULE_CATALOG, type InternalModuleKey } from "@/lib/internalModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, ShieldCheck, UserCog, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface StaffRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  internal_job_title: string | null;
  modules: InternalModuleKey[];
  role: string | null;
}

const CATEGORIES = ["Comercial", "Financeiro", "Operação", "Administração"] as const;

export default function InternalStaff() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selected, setSelected] = useState<Set<InternalModuleKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [createdPwd, setCreatedPwd] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<StaffRow | null>(null);
  const [editSelected, setEditSelected] = useState<Set<InternalModuleKey>>(new Set());

  useEffect(() => { void checkAdmin(); }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!data);
    if (data) await loadStaff();
    else setLoading(false);
  };

  const loadStaff = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, internal_job_title")
      .eq("is_internal_staff", true)
      .order("full_name");
    const ids = (profiles ?? []).map((p) => p.user_id);
    const [{ data: perms }, { data: roles }] = await Promise.all([
      supabase.from("internal_staff_permissions").select("user_id, module, granted").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const modMap: Record<string, InternalModuleKey[]> = {};
    (perms ?? []).forEach((p) => {
      if (!p.granted) return;
      (modMap[p.user_id] ||= []).push(p.module as InternalModuleKey);
    });
    const roleMap: Record<string, string> = {};
    (roles ?? []).forEach((r) => { roleMap[r.user_id] = r.role; });
    setRows((profiles ?? []).map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      internal_job_title: p.internal_job_title,
      modules: modMap[p.user_id] ?? [],
      role: roleMap[p.user_id] ?? null,
    })));
    setLoading(false);
  };

  const toggle = (set: Set<InternalModuleKey>, key: InternalModuleKey) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  };

  const submitCreate = async () => {
    if (!name || !email) { toast.error("Preencha nome e e-mail"); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-internal-staff", {
        body: { full_name: name, email, job_title: jobTitle, modules: Array.from(selected) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCreatedPwd(data.temp_password);
      setName(""); setEmail(""); setJobTitle(""); setSelected(new Set());
      await loadStaff();
      toast.success("Funcionário criado com sucesso");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao criar funcionário");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: StaffRow) => {
    setEditingUser(row);
    setEditSelected(new Set(row.modules));
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const current = new Set(editingUser.modules);
      const toAdd = Array.from(editSelected).filter((k) => !current.has(k));
      const toRemove = Array.from(current).filter((k) => !editSelected.has(k));
      if (toAdd.length) {
        await supabase.from("internal_staff_permissions").insert(
          toAdd.map((m) => ({ user_id: editingUser.user_id, module: m, granted: true, granted_by: user?.id })),
        );
      }
      if (toRemove.length) {
        await supabase.from("internal_staff_permissions").delete()
          .eq("user_id", editingUser.user_id).in("module", toRemove);
      }
      await loadStaff();
      setEditingUser(null);
      toast.success("Permissões atualizadas");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const removeStaff = async (row: StaffRow) => {
    if (!confirm(`Remover ${row.full_name} do time interno? Ele perderá todos os acessos administrativos.`)) return;
    await supabase.from("profiles").update({ is_internal_staff: false, internal_job_title: null }).eq("user_id", row.user_id);
    await supabase.from("internal_staff_permissions").delete().eq("user_id", row.user_id);
    await loadStaff();
    toast.success("Funcionário removido do time interno");
  };

  const grouped = useMemo(() => {
    return CATEGORIES.map((c) => ({
      category: c,
      modules: INTERNAL_MODULE_CATALOG.filter((m) => m.category === c),
    }));
  }, []);

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-semibold">Acesso restrito</h2>
          <p className="mt-1 text-sm text-muted-foreground">Apenas administradores podem gerenciar o time interno AdvOne.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Time Interno AdvOne</h1>
          <p className="text-sm text-muted-foreground">Cadastre seus funcionários e defina exatamente o que cada um pode fazer no sistema.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setCreatedPwd(null); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Novo funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Novo funcionário AdvOne</DialogTitle>
            </DialogHeader>

            {createdPwd ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
                  <p className="font-semibold text-emerald-700">Funcionário criado!</p>
                  <p className="mt-1 text-muted-foreground">Envie estas credenciais para ele fazer o primeiro login (recomendamos alterar a senha em seguida):</p>
                  <div className="mt-3 rounded-md bg-background p-3 font-mono text-sm">
                    <div>E-mail: <strong>{email || rows[0]?.email}</strong></div>
                    <div className="flex items-center gap-2 mt-1">
                      Senha: <strong>{createdPwd}</strong>
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(createdPwd); toast.success("Senha copiada"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => { setDialogOpen(false); setCreatedPwd(null); }}>Fechar</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nome completo *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Souza" />
                  </div>
                  <div className="space-y-1">
                    <Label>Cargo</Label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex: Vendedor, Suporte, Gerente" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>E-mail de acesso *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="funcionario@advone.com.br" />
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-sm font-semibold">Permissões</p>
                  <p className="text-xs text-muted-foreground">Marque somente o que este funcionário pode acessar. Você pode alterar depois.</p>
                  {grouped.map((g) => (
                    <div key={g.category} className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{g.category}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {g.modules.map((m) => {
                          const Icon = m.icon;
                          const checked = selected.has(m.key);
                          return (
                            <label key={m.key} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition ${checked ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                              <Checkbox checked={checked} onCheckedChange={() => setSelected((s) => toggle(s, m.key))} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 font-medium"><Icon className="h-3.5 w-3.5" />{m.label}</div>
                                <p className="text-xs text-muted-foreground">{m.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full gradient-primary text-primary-foreground" onClick={submitCreate} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar funcionário
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCog className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhum funcionário cadastrado ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Clique em "Novo funcionário" para começar.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.user_id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.full_name || "—"}</p>
                    {r.role === "admin" && <Badge variant="default">Admin</Badge>}
                    {r.internal_job_title && <Badge variant="secondary">{r.internal_job_title}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.modules.length === 0 && r.role !== "admin" ? (
                      <span className="text-xs text-muted-foreground italic">Sem permissões definidas</span>
                    ) : r.role === "admin" ? (
                      <Badge variant="outline" className="text-xs">Acesso total (admin)</Badge>
                    ) : (
                      r.modules.map((mk) => {
                        const m = INTERNAL_MODULE_CATALOG.find((x) => x.key === mk);
                        return <Badge key={mk} variant="outline" className="text-xs">{m?.label ?? mk}</Badge>;
                      })
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.role !== "admin" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Permissões</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeStaff(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingUser} onOpenChange={(o) => { if (!o) setEditingUser(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Permissões — {editingUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {grouped.map((g) => (
              <div key={g.category} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{g.category}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.modules.map((m) => {
                    const Icon = m.icon;
                    const checked = editSelected.has(m.key);
                    return (
                      <label key={m.key} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition ${checked ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}>
                        <Checkbox checked={checked} onCheckedChange={() => setEditSelected((s) => toggle(s, m.key))} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium"><Icon className="h-3.5 w-3.5" />{m.label}</div>
                          <p className="text-xs text-muted-foreground">{m.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button className="w-full gradient-primary text-primary-foreground" onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar permissões
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

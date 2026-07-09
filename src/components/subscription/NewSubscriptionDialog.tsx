import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface CompanyOpt { id: string; name: string; }
interface UserOpt { user_id: string; full_name: string | null; email: string | null; }

interface Props {
  onCreated?: () => void;
}

export function NewSubscriptionDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOpt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<"plan_ia" | "plan_completo">("plan_completo");
  const [value, setValue] = useState("797");
  const [dueDay, setDueDay] = useState("10");
  const [billingType, setBillingType] = useState("UNDEFINED");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDoc, setCustomerDoc] = useState("");

  const [result, setResult] = useState<{ invoice_url: string | null; next_due_date: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.from("companies").select("id, name").order("name").then(({ data }) => {
      setCompanies((data as CompanyOpt[]) || []);
    });
  }, [open]);

  useEffect(() => {
    if (!companyId) { setUsers([]); setUserId(""); return; }
    setLoadingUsers(true);
    (async () => {
      const { data: links } = await supabase
        .from("client_companies")
        .select("user_id")
        .eq("company_id", companyId);
      const ids = (links || []).map(l => l.user_id);
      if (ids.length === 0) { setUsers([]); setLoadingUsers(false); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      setUsers((profs as UserOpt[]) || []);
      if (profs && profs.length === 1) setUserId(profs[0].user_id);
      setLoadingUsers(false);
    })();
  }, [companyId]);

  const reset = () => {
    setCompanyId(""); setUserId(""); setPlan("plan_completo"); setValue("797");
    setDueDay("10"); setBillingType("UNDEFINED");
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerDoc("");
    setResult(null);
  };

  const submit = async () => {
    if (!companyId || !userId) return toast.error("Empresa e gerente são obrigatórios");
    const valNum = Number(value);
    if (!valNum || valNum <= 0) return toast.error("Valor inválido");
    const dayNum = Number(dueDay);
    if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 28) return toast.error("Dia de vencimento deve ser entre 1 e 28");
    const docRaw = customerDoc.replace(/\D/g, "");
    if (docRaw.length !== 11 && docRaw.length !== 14) return toast.error("CPF/CNPJ inválido");
    if (customerName.trim().length < 2) return toast.error("Nome do cliente é obrigatório");

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-company-subscription", {
        body: {
          company_id: companyId,
          user_id: userId,
          plan,
          value: valNum,
          due_day: dayNum,
          billing_type: billingType,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          customer_cpf_cnpj: docRaw,
        },
      });
      if (error) throw error;
      const d = data as { error?: string; invoice_url: string | null; next_due_date: string };
      if (d?.error) throw new Error(d.error);
      toast.success("Assinatura criada no Asaas");
      setResult({ invoice_url: d.invoice_url, next_due_date: d.next_due_date });
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message || "Erro ao criar assinatura");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nova Assinatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Assinatura Recorrente</DialogTitle>
          <DialogDescription>
            Cria o cliente e a cobrança recorrente no Asaas. O sistema bloqueia o acesso automaticamente se o pagamento atrasar.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Próximo vencimento:</span> <strong>{new Date(result.next_due_date + "T12:00:00").toLocaleDateString("pt-BR")}</strong></p>
              {result.invoice_url && (
                <a href={result.invoice_url} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> Link de pagamento (envie ao cliente)
                </a>
              )}
            </div>
            <Button className="w-full" onClick={() => { setOpen(false); reset(); }}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Usuário gerente (será o dono da assinatura) *</Label>
              <Select value={userId} onValueChange={setUserId} disabled={!companyId || loadingUsers}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Carregando..." : users.length === 0 && companyId ? "Nenhum usuário vinculado" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name || u.email || u.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">O bloqueio por inadimplência é aplicado a este usuário.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Plano *</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as "plan_ia" | "plan_completo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_ia">🤖 Plano IA</SelectItem>
                    <SelectItem value="plan_completo">👑 Plano Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor mensal (R$) *</Label>
                <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dia do vencimento *</Label>
                <Input type="number" min={1} max={28} value={dueDay} onChange={e => setDueDay(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">1 a 28 (evita meses curtos)</p>
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={billingType} onValueChange={setBillingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNDEFINED">PIX ou Cartão (cliente escolhe)</SelectItem>
                    <SelectItem value="PIX">Somente PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD">Somente Cartão</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Dados do cliente (Asaas)</p>
              <div className="space-y-2">
                <Label>Nome / Razão social *</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome completo ou razão social" />
              </div>
              <div className="space-y-2">
                <Label>CPF / CNPJ *</Label>
                <Input value={customerDoc} onChange={e => setCustomerDoc(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="5511999999999" />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={submit} disabled={saving} className="w-full gradient-primary text-primary-foreground">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar assinatura no Asaas
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

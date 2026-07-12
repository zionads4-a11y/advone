import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
import { BILLING_MODELS, type BillingModel } from "@/lib/billingModels";
import { CheckCircle2, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CompanyFormDialog({ open, onOpenChange, onSubmit }: CompanyFormDialogProps) {
  const [selectedModel, setSelectedModel] = useState<BillingModel>("plan_gestao");
  const [sharedWhats, setSharedWhats] = useState(false);
  const [supportPhone, setSupportPhone] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [billingType, setBillingType] = useState("UNDEFINED");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [discountValidUntil, setDiscountValidUntil] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [approverPassword, setApproverPassword] = useState("");
  const [customBaseValue, setCustomBaseValue] = useState("");
  const [enterpriseUnlocked, setEnterpriseUnlocked] = useState(false);
  const [showEnterprisePwd, setShowEnterprisePwd] = useState(false);
  const [enterprisePwd, setEnterprisePwd] = useState("");
  const [verifyingPwd, setVerifyingPwd] = useState(false);
  const isFree = false;

  const handleSelectPlan = async (key: BillingModel) => {
    if (key === "plan_enterprise" && !enterpriseUnlocked) {
      setShowEnterprisePwd(true);
      return;
    }
    setSelectedModel(key);
  };

  const verifyEnterprisePassword = async () => {
    if (!enterprisePwd) return;
    setVerifyingPwd(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) {
        toast.error("Sessão expirada");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password: enterprisePwd });
      if (error) {
        toast.error("Senha do gerente incorreta");
        return;
      }
      setEnterpriseUnlocked(true);
      setSelectedModel("plan_enterprise");
      setShowEnterprisePwd(false);
      setEnterprisePwd("");
      toast.success("Plano Enterprise liberado");
    } finally {
      setVerifyingPwd(false);
    }
  };

  const currentModel = BILLING_MODELS.find((m) => m.key === selectedModel) ?? BILLING_MODELS[0];
  const isEnterprise = currentModel.key === "plan_enterprise";
  const customNum = parseFloat(customBaseValue) || 0;
  const basePrice = isEnterprise ? customNum : currentModel.monthly_value;
  const dValNum = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === "percent" ? +((basePrice * dValNum) / 100).toFixed(2) : dValNum;
  const finalPrice = Math.max(0, +(basePrice - discountAmount).toFixed(2));
  const discountPercent = basePrice > 0 ? +((discountAmount / basePrice) * 100).toFixed(2) : 0;
  const hasDiscount = dValNum > 0 && finalPrice < basePrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card text-foreground max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar Empresa</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("billing_model", selectedModel);
            fd.set("shared_whatsapp_number", sharedWhats ? "true" : "false");
            fd.set("client_support_responsible_phone", sharedWhats ? supportPhone : "");
            fd.set("due_day", dueDay);
            fd.set("billing_type", billingType);
            fd.set("has_discount", hasDiscount ? "true" : "false");
            fd.set("discount_type", discountType);
            fd.set("discount_value", String(dValNum));
            fd.set("discount_final_price", String(finalPrice));
            fd.set("discount_reason", discountReason);
            fd.set("discount_valid_until", discountValidUntil);
            fd.set("approver_email", approverEmail);
            fd.set("approver_password", approverPassword);
            fd.set("custom_base_value", isEnterprise ? String(customNum) : "");
            onSubmit(fd);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Plano da empresa *</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {BILLING_MODELS.map((m) => {
                const active = selectedModel === m.key;
                const highlight = m.key === "plan_gestao";
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleSelectPlan(m.key)}
                    className={cn(
                      "relative flex flex-col rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    {highlight && (
                      <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      {m.key === "plan_enterprise" ? (
                        <span className="text-2xl font-bold">Sob medida</span>
                      ) : (
                        <>
                          <span className="text-2xl font-bold">{brl(m.monthly_value)}</span>
                          <span className="text-xs text-muted-foreground">/mês</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{m.description}</p>
                    <ul className="mt-3 space-y-1 flex-1">
                      {m.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {active && (
                      <div className="mt-3 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                        ✓ Selecionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              O valor mensal escolhido é salvo automaticamente como base de cobrança da empresa.
            </p>
          </div>

          {isEnterprise && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Label>Valor mensal Enterprise (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="Ex: 2500.00"
                value={customBaseValue}
                onChange={(e) => setCustomBaseValue(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Plano sob medida — defina aqui o valor mensal negociado com o cliente.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome da Empresa *</Label>
            <Input name="name" required placeholder="Nome da empresa" />
          </div>

          {!isFree && (
            <>
              <div className="space-y-2">
                <Label>Nome Completo / Razão Social *</Label>
                <Input name="office_legal_name" required={!isFree} placeholder="Nome para o boleto" />
              </div>
              <div className="space-y-2">
                <Label>CPF / CNPJ *</Label>
                <Input name="office_cnpj" required={!isFree} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Endereço Completo *</Label>
                <Input name="office_address" required={!isFree} placeholder="Rua, número, bairro, cidade, UF" />
              </div>
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input name="whatsapp" placeholder="5511999999999" />
              </div>
              <div className="space-y-2">
                <Label>E-mail para cobrança</Label>
                <Input name="customer_email" type="email" placeholder="financeiro@empresa.com" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Dia do vencimento *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Entre 1 e 28.</p>
                </div>
                <div className="space-y-1">
                  <Label>Forma de pagamento</Label>
                  <Select value={billingType} onValueChange={setBillingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNDEFINED">PIX ou Cartão (cliente escolhe)</SelectItem>
                      <SelectItem value="PIX">Somente PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Somente Cartão</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                Ao salvar, a assinatura recorrente é criada automaticamente no Asaas com o
                plano selecionado.
              </p>
            </>
          )}

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label>Mesmo número para leads e clientes</Label>
                <p className="text-[11px] text-muted-foreground">
                  Ative se o escritório usa o MESMO WhatsApp para captar novos leads e
                  atender clientes que já têm processo. A Laura/Julia perguntará se a
                  pessoa já é cliente antes de qualificar.
                </p>
              </div>
              <Switch checked={sharedWhats} onCheckedChange={setSharedWhats} />
            </div>
            {sharedWhats && (
              <div className="space-y-2 animate-in fade-in">
                <Label>WhatsApp do advogado responsável (alertas)</Label>
                <Input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="5511988887777"
                />
                <p className="text-[10px] text-muted-foreground">
                  Quando um cliente existente quiser falar, esse número recebe um
                  alerta no WhatsApp. Se ficar vazio, usamos o WhatsApp principal da
                  empresa.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
            <div className="flex items-baseline justify-between">
              <Label className="text-sm font-semibold">Aplicar desconto (opcional)</Label>
              <span className="text-[11px] text-muted-foreground">
                Preço de tabela: R$ {basePrice.toFixed(2)}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desconto</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "10" : "50.00"}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vale até (opcional)</Label>
                <Input
                  type="date"
                  value={discountValidUntil}
                  onChange={(e) => setDiscountValidUntil(e.target.value)}
                />
              </div>
            </div>
            {hasDiscount && (
              <>
                <div className="rounded-md bg-background/60 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Valor final:</span>
                    <span className="font-bold text-primary">R$ {finalPrice.toFixed(2)}/mês</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Desconto aplicado:</span>
                    <span>-R$ {discountAmount.toFixed(2)} ({discountPercent}%)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Motivo do desconto *</Label>
                  <Input
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    required={hasDiscount}
                    placeholder="Ex: cliente parceiro, campanha de lançamento…"
                    maxLength={500}
                  />
                </div>
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 space-y-2">
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    🔒 Autorização do gerente obrigatória
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Gerente aprova até 20%. Admin aprova qualquer valor. A aprovação fica registrada em auditoria.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail do aprovador *</Label>
                      <Input
                        type="email"
                        value={approverEmail}
                        onChange={(e) => setApproverEmail(e.target.value)}
                        required={hasDiscount}
                        placeholder="gerente@escritorio.com"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Senha *</Label>
                      <Input
                        type="password"
                        value={approverPassword}
                        onChange={(e) => setApproverPassword(e.target.value)}
                        required={hasDiscount}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground">
            Adicionar Empresa
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import logoAdvOne from "@/assets/logo-advone.png";

type PlanKey = "mensal" | "bimestral" | "anual";

const COMMON_FEATURES = [
  "CRM completo com Kanban",
  "Bot com IA no WhatsApp",
  "Cadência automática",
  "Agenda integrada",
  "Monitoramento de até 50 processos",
  "Alertas automáticos de movimentação",
  "Financeiro integrado com Asaas",
];

const PLANS: Record<PlanKey, {
  label: string;
  monthly: number;       // valor mensal exibido
  charged: number;       // valor que o Asaas cobra de fato
  billingLabel: string;  // descrição da cobrança
  ctaSuffix: string;     // texto do botão
  color: string;
  features: string[];
}> = {
  mensal: {
    label: "Mensal",
    monthly: 997,
    charged: 997,
    billingLabel: "Cobrança recorrente mensal (PIX ou cartão)",
    ctaSuffix: "R$ 997/mês",
    color: "hsl(210,80%,55%)",
    features: COMMON_FEATURES,
  },
  bimestral: {
    label: "Bimestral",
    monthly: 797,
    charged: 1594,
    billingLabel: "Cobrança única de R$ 1.594 (2x R$ 797)",
    ctaSuffix: "R$ 1.594 à vista",
    color: "hsl(153,60%,45%)",
    features: COMMON_FEATURES,
  },
  anual: {
    label: "Anual",
    monthly: 597,
    charged: 7164,
    billingLabel: "Cobrança única de R$ 7.164 (12x R$ 597)",
    ctaSuffix: "R$ 7.164 à vista",
    color: "hsl(38,90%,55%)",
    features: COMMON_FEATURES,
  },
};

export default function Signup() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planParam = (searchParams.get("plan") || "mensal") as PlanKey;
  const planKey: PlanKey = PLANS[planParam] ? planParam : "mensal";
  const plan = PLANS[planKey];

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    company_name: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
        d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
      );
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) =>
      e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    );
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : "");
    }
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : "");
  };

  const handleChange = (field: string, value: string) => {
    if (field === "cpf_cnpj") value = formatCpfCnpj(value);
    if (field === "phone") value = formatPhone(value);
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (form.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (form.cpf_cnpj.replace(/\D/g, "").length < 11) {
      toast.error("CPF/CNPJ inválido");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone.replace(/\D/g, ""),
          cpf_cnpj: form.cpf_cnpj,
          plan: planKey,
          company_name: form.company_name,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      if (data?.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("Conta criada com sucesso! Faça login para acessar.");
      }

      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-[hsl(220,25%,6%)] text-[hsl(220,10%,92%)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <button onClick={() => navigate("/")} className="mb-6 flex items-center gap-2 text-sm text-[hsl(220,10%,55%)] hover:text-[hsl(153,60%,45%)] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o site
        </button>

        <div className="flex flex-col items-center gap-2 mb-8">
          <img src={logoAdvOne} alt="AdvOne" className="h-20 w-auto sm:h-24" />
          <p className="text-sm text-[hsl(220,10%,55%)]">Crie sua conta e comece a usar agora</p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Plan Summary */}
          <div className="md:col-span-2">
            <Card className="border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] text-[hsl(220,10%,92%)] sticky top-8">
              <CardHeader>
                <div className="mb-2">
                  <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${plan.color}20`, color: plan.color }}>
                    Plano {plan.label}
                  </span>
                </div>
                <CardTitle className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  R$ {plan.monthly}<span className="text-base font-normal text-[hsl(220,10%,55%)]">/mês</span>
                </CardTitle>
                <CardDescription className="text-[hsl(220,10%,55%)]">{plan.billingLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[hsl(220,10%,75%)]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(153,60%,45%)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex gap-2">
                  {Object.entries(PLANS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => navigate(`/signup?plan=${key}`, { replace: true })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        key === planKey
                          ? "border-[hsl(153,60%,45%)] bg-[hsl(153,60%,45%)]/10 text-[hsl(153,60%,45%)]"
                          : "border-[hsl(220,20%,16%)] text-[hsl(220,10%,55%)] hover:border-[hsl(220,10%,55%)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <div className="md:col-span-3">
            <Card className="border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] text-[hsl(220,10%,92%)]">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dados da conta</CardTitle>
                <CardDescription className="text-[hsl(220,10%,55%)]">Preencha seus dados para criar a conta e ativar a assinatura</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo *</Label>
                    <Input id="full_name" value={form.full_name} onChange={(e) => handleChange("full_name", e.target.value)} required placeholder="Seu nome completo" className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required placeholder="seu@email.com" className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="(11) 99999-9999" maxLength={15} className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf_cnpj">CPF/CNPJ *</Label>
                      <Input id="cpf_cnpj" value={form.cpf_cnpj} onChange={(e) => handleChange("cpf_cnpj", e.target.value)} required placeholder="000.000.000-00" maxLength={18} className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome do escritório</Label>
                    <Input id="company_name" value={form.company_name} onChange={(e) => handleChange("company_name", e.target.value)} placeholder="Ex: Torres & Souza Advocacia" className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input id="password" type="password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} required placeholder="Mínimo 6 caracteres" className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                      <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => handleChange("confirmPassword", e.target.value)} required placeholder="Repita a senha" className="bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)]" />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full gradient-primary text-[hsl(0,0%,100%)] font-semibold py-6 text-base">
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Criar conta e assinar — {plan.ctaSuffix}
                  </Button>

                  <p className="text-center text-xs text-[hsl(220,10%,45%)]">
                    Já tem uma conta?{" "}
                    <button type="button" onClick={() => navigate("/auth")} className="text-[hsl(153,60%,45%)] hover:underline">
                      Faça login
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, Building2, UserCircle2, Wallet2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import logoAdvOne from "@/assets/logo-advone.png";
import { Progress } from "@/components/ui/progress";

type PlanKey = "admin" | "completo" | "mensal" | "semestral" | "trimestral" | "anual";

const FEATURES_ADMIN = [
  "CRM completo com Kanban",
  "WhatsApp (Só notificações)",
  "Agenda integrada",
  "Financeiro completo",
  "IA com Gemini Flash",
  "Documentos e Templates",
  "20 monitoramentos inclusos",
  "Adicional: R$ 2,58/processo",
];

const FEATURES_COMPLETO = [
  "Tudo do Plano Admin",
  "Bot SDR (Atende, qualifica, agenda)",
  "IA Jurídica Claude (Petições)",
  "Alertas de fraude",
  "Boards e Tarefas avançadas",
  "50 monitoramentos inclusos",
  "Adicional: R$ 2,58/processo",
  "Suporte prioritário",
];

const PLANS: Record<PlanKey, {
  label: string;
  monthly: number;
  charged: number;
  billingLabel: string;
  ctaSuffix: string;
  color: string;
  features: string[];
}> = {
  admin: {
    label: "Admin",
    monthly: 297,
    charged: 297,
    billingLabel: "Recorrente mensal",
    ctaSuffix: "R$ 297/mês",
    color: "hsl(210,80%,55%)",
    features: FEATURES_ADMIN,
  },
  completo: {
    label: "Completo",
    monthly: 497,
    charged: 497,
    billingLabel: "Recorrente mensal",
    ctaSuffix: "R$ 497/mês",
    color: "hsl(153,60%,45%)",
    features: FEATURES_COMPLETO,
  },
  // Legacy plans (for redirection compatibility)
  mensal: {
    label: "Mensal",
    monthly: 997,
    charged: 997,
    billingLabel: "Recorrente mensal",
    ctaSuffix: "R$ 997/mês",
    color: "hsl(210,80%,55%)",
    features: FEATURES_COMPLETO,
  },
  trimestral: {
    label: "Trimestral",
    monthly: 797,
    charged: 2391,
    billingLabel: "R$ 2.391 (3x R$ 797)",
    ctaSuffix: "R$ 2.391 à vista",
    color: "hsl(153,60%,45%)",
    features: FEATURES_COMPLETO,
  },
  anual: {
    label: "Anual",
    monthly: 597,
    charged: 7164,
    billingLabel: "R$ 7.164 (12x R$ 597)",
    ctaSuffix: "R$ 7.164 à vista",
    color: "hsl(38,90%,55%)",
    features: FEATURES_COMPLETO,
  },
};

export default function Signup() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planParam = (searchParams.get("plan") || "mensal") as PlanKey;
  const planKey: PlanKey = PLANS[planParam] ? planParam : "mensal";
  const plan = PLANS[planKey];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    cpf_cnpj: "",
    company_name: "",
    password: "",
    confirmPassword: "",
  });

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

  const nextStep = () => {
    if (step === 1) {
      if (!form.full_name || !form.email || !form.password || !form.confirmPassword) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("As senhas não coincidem");
        return;
      }
      if (form.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
    }
    if (step === 2) {
      if (!form.company_name) {
        toast.error("Informe o nome do seu escritório");
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const progress = (step / 3) * 100;

  return (
    <div className="dark min-h-screen bg-[hsl(220,25%,6%)] text-[hsl(220,10%,92%)] font-sans">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 mb-10">
          <img
            src={logoAdvOne}
            alt="AdvOne"
            className="h-20 w-auto sm:h-24 drop-shadow-[0_0_20px_hsl(153,60%,45%/0.4)]"
          />
          <div className="w-full max-w-md space-y-2">
            <div className="flex justify-between text-xs font-medium text-[hsl(220,10%,55%)] mb-1">
              <span>Passo {step} de 3</span>
              <span>{Math.round(progress)}% completo</span>
            </div>
            <Progress value={progress} className="h-2 bg-[hsl(220,20%,12%)]" />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-12 items-start">
          {/* Main Form Area */}
          <div className="md:col-span-8">
            <Card className="border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] text-[hsl(220,10%,92%)] shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-[hsl(220,20%,14%)] bg-[hsl(220,25%,10%)] pb-6">
                <div className="flex items-center gap-3 mb-1">
                  {step === 1 && <UserCircle2 className="h-5 w-5 text-[hsl(153,60%,45%)]" />}
                  {step === 2 && <Building2 className="h-5 w-5 text-[hsl(153,60%,45%)]" />}
                  {step === 3 && <Wallet2 className="h-5 w-5 text-[hsl(153,60%,45%)]" />}
                  <CardTitle className="text-xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step === 1 && "Identificação básica"}
                    {step === 2 && "Dados do escritório"}
                    {step === 3 && "Ativação da assinatura"}
                  </CardTitle>
                </div>
                <CardDescription className="text-[hsl(220,10%,55%)]">
                  {step === 1 && "Como podemos te identificar?"}
                  {step === 2 && "Conte-nos um pouco sobre seu escritório"}
                  {step === 3 && "Finalize para começar a usar a IA"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8">
                {step === 1 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome completo *</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => handleChange("full_name", e.target.value)}
                        placeholder="Seu nome completo"
                        className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email profissional *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="seu@email.com"
                        className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="password">Criar senha *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={form.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          placeholder="Mínimo 6 chars"
                          className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={form.confirmPassword}
                          onChange={(e) => handleChange("confirmPassword", e.target.value)}
                          placeholder="Repita a senha"
                          className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                        />
                      </div>
                    </div>
                    <Button onClick={nextStep} className="w-full h-14 mt-4 gradient-primary text-white font-bold text-lg group">
                      Próximo passo
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Nome do escritório *</Label>
                      <Input
                        id="company_name"
                        value={form.company_name}
                        onChange={(e) => handleChange("company_name", e.target.value)}
                        placeholder="Ex: Torres & Souza Advocacia"
                        className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp (Opcional)</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" onClick={prevStep} className="flex-1 h-14 border-[hsl(220,20%,20%)] text-[hsl(220,10%,70%)]">
                        Voltar
                      </Button>
                      <Button onClick={nextStep} className="flex-[2] h-14 gradient-primary text-white font-bold text-lg group">
                        Continuar
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="rounded-xl border border-[hsl(38,90%,55%)]/20 bg-[hsl(38,90%,55%)]/5 p-4 mb-4">
                      <p className="text-sm text-[hsl(38,90%,55%)] flex items-start gap-2">
                        <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
                        O CPF/CNPJ é necessário apenas para a emissão da nota fiscal e processamento seguro do pagamento via Asaas.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cpf_cnpj">CPF ou CNPJ para faturamento *</Label>
                      <Input
                        id="cpf_cnpj"
                        value={form.cpf_cnpj}
                        onChange={(e) => handleChange("cpf_cnpj", e.target.value)}
                        required
                        placeholder="000.000.000-00"
                        maxLength={18}
                        className="h-12 bg-[hsl(220,25%,12%)] border-[hsl(220,20%,20%)] focus:border-[hsl(153,60%,45%)] transition-all"
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" onClick={prevStep} disabled={loading} className="flex-1 h-14 border-[hsl(220,20%,20%)] text-[hsl(220,10%,70%)]">
                        Voltar
                      </Button>
                      <Button type="submit" disabled={loading} className="flex-[2] h-14 gradient-primary text-white font-bold text-lg shadow-lg shadow-[hsl(153,60%,45%)/0.2]">
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Finalizar e Ativar — {plan.monthly}/mês
                      </Button>
                    </div>
                    <p className="text-center text-xs text-[hsl(220,10%,45%)] mt-4">
                      Ao clicar em finalizar, você concorda com nossos Termos de Uso e Política de Privacidade.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Summary */}
          <div className="md:col-span-4 space-y-4">
            <Card className="border-[hsl(220,20%,16%)] bg-[hsl(220,25%,9%)] text-[hsl(220,10%,92%)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Resumo do Plano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[hsl(220,20%,14%)]">
                  <div>
                    <p className="text-sm font-medium text-[hsl(153,60%,45%)]">Plano {plan.label}</p>
                    <p className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>R$ {plan.monthly}/mês</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-[hsl(220,10%,50%)] hover:text-[hsl(153,60%,45%)]"
                    onClick={() => setStep(1)}
                  >
                    Alterar
                  </Button>
                </div>

                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[hsl(220,10%,70%)]">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(153,60%,45%)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                
                <div className="pt-4 mt-4 border-t border-[hsl(220,20%,14%)]">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[hsl(220,10%,50%)]">Faturamento:</span>
                    <span className="text-[hsl(220,10%,80%)]">{plan.billingLabel}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(220,10%,50%)]">Ativação:</span>
                    <span className="text-[hsl(153,60%,45%)]">Imediata</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-2 text-sm text-[hsl(220,10%,45%)] hover:text-[hsl(220,10%,70%)] transition-colors w-full justify-center py-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

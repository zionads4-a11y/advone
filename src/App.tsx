import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { ThemeProvider } from "@/hooks/useTheme";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eager: tiny entry redirect + primary landing pages (first paint targets)
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import LandingIA from "./pages/LandingIA";

// Lazy: everything else — keeps LP bundle lean
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Kanban = lazy(() => import("./pages/Kanban"));
const Conversations = lazy(() => import("./pages/Conversations"));
const ClientConversations = lazy(() => import("./pages/ClientConversations"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Companies = lazy(() => import("./pages/Companies"));
const CompanyDetail = lazy(() => import("./pages/CompanyDetail"));
const ClientUsers = lazy(() => import("./pages/ClientUsers"));
const InternalStaff = lazy(() => import("./pages/InternalStaff"));
const AccessManagement = lazy(() => import("./pages/AccessManagement"));
const TrackingLinks = lazy(() => import("./pages/TrackingLinks"));
const ConnectWhatsApp = lazy(() => import("@/pages/ConnectWhatsApp"));
const ConectarWhatsapp = lazy(() => import("@/pages/ConectarWhatsapp"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Profile = lazy(() => import("./pages/Profile"));
const BotConfig = lazy(() => import("./pages/BotConfig"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const Financial = lazy(() => import("./pages/Financial"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentTemplates = lazy(() => import("./pages/DocumentTemplates"));
const Cases = lazy(() => import("./pages/Cases"));
const ProcessKanban = lazy(() => import("./pages/ProcessKanban"));
const ProcessSearch = lazy(() => import("./pages/ProcessSearch"));
const Subscription = lazy(() => import("./pages/Subscription"));
const PricingInternal = lazy(() => import("./pages/PricingInternal"));
const FraudAlerts = lazy(() => import("./pages/FraudAlerts"));
const AiUsageMonitor = lazy(() => import("./pages/AiUsageMonitor"));
const MetaCloudSetup = lazy(() => import("./pages/MetaCloudSetup"));
const LegalAI = lazy(() => import("./pages/LegalAI"));
const Jurisprudencia = lazy(() => import("./pages/Jurisprudencia"));
const Calculadoras = lazy(() => import("./pages/Calculadoras"));
const LandingIALeads = lazy(() => import("./pages/LandingIALeads"));
const CrmAdvogados = lazy(() => import("./pages/CrmAdvogados"));
const WhatsappAdvogados = lazy(() => import("./pages/WhatsappAdvogados"));
const SdrIaJuridico = lazy(() => import("./pages/SdrIaJuridico"));
const Blog = lazy(() => import("./pages/Blog"));
const PostQualificarLeads = lazy(() => import("./pages/PostQualificarLeads"));
const PostSdrHumanoVsIa = lazy(() => import("./pages/PostSdrHumanoVsIa"));
const PostLgpdEscritorios = lazy(() => import("./pages/PostLgpdEscritorios"));
const AppLayout = lazy(() => import("./components/layout/AppLayout"));
const ProfileCheck = lazy(() => import("./pages/ProfileCheck"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Security = lazy(() => import("./pages/Security"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Boards = lazy(() => import("./pages/Boards"));
const WebhookLogs = lazy(() => import("./pages/WebhookLogs"));
const Obrigado = lazy(() => import("./pages/Obrigado"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/home" element={<LandingPage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/signup" element={<Navigate to="/auth" replace />} />
                  <Route path="/IA" element={<LandingIA />} />
                  <Route path="/ia" element={<LandingIA />} />
                  <Route path="/crm-advogados" element={<CrmAdvogados />} />
                  <Route path="/whatsapp-advogados" element={<WhatsappAdvogados />} />
                  <Route path="/sdr-ia-juridico" element={<SdrIaJuridico />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/como-qualificar-leads-advocacia-whatsapp" element={<PostQualificarLeads />} />
                  <Route path="/blog/sdr-humano-vs-ia-escritorio-advocacia" element={<PostSdrHumanoVsIa />} />
                  <Route path="/blog/lgpd-escritorios-advocacia-atendimento" element={<PostLgpdEscritorios />} />
                  <Route path="/connect/:token" element={<ConnectWhatsApp />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/sobre" element={<About />} />
                  <Route path="/contato" element={<Contact />} />
                  <Route path="/obrigado" element={<Obrigado />} />
                  <Route path="/seguranca" element={<Security />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/leads" element={<Leads />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/clientes/:id" element={<ClientDetail />} />
                    <Route path="/kanban" element={<Kanban />} />
                    <Route path="/conversations" element={<Conversations />} />
                    <Route path="/conversas-clientes" element={<ClientConversations />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route
                      path="/companies"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "member"]}>
                          <Companies />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route path="/companies/:id" element={<CompanyDetail />} />
                    <Route path="/tracking" element={<TrackingLinks />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/conectar-whatsapp" element={<ConectarWhatsapp />} />
                    <Route
                      path="/meta-cloud-setup"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "member"]}>
                          <MetaCloudSetup />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route path="/client-users" element={<ClientUsers />} />
                    <Route path="/time-interno" element={<InternalStaff />} />
                    <Route
                      path="/access-management"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "member", "gerente"]}>
                          <AccessManagement />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route path="/profile" element={<Profile />} />
                    <Route
                      path="/bot-config"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "member", "gerente"]}>
                          <BotConfig />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/company-settings"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "member", "gerente"]}>
                          <CompanySettings />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route path="/financeiro" element={<Financial />} />
                    <Route path="/documentos" element={<Documents />} />
                    <Route path="/modelos-documentos" element={<DocumentTemplates />} />
                    <Route path="/processos" element={<Cases />} />
                    <Route path="/processos-kanban" element={<ProcessKanban />} />
                    <Route path="/busca-processos" element={<ProcessSearch />} />
                    <Route path="/assinatura" element={<Subscription />} />
                    <Route
                      path="/webhook-logs"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "member", "gerente"]}>
                          <WebhookLogs />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route path="/fraudes" element={<FraudAlerts />} />
                    <Route path="/uso-ia" element={<RoleProtectedRoute allowedRoles={["admin", "member"]}><AiUsageMonitor /></RoleProtectedRoute>} />
                    <Route path="/tabela-precos" element={<RoleProtectedRoute allowedRoles={["admin", "member"]}><PricingInternal /></RoleProtectedRoute>} />
                    <Route path="/leads-landing-ia" element={<LandingIALeads />} />
                    <Route path="/ia-juridica" element={<LegalAI />} />
                    <Route path="/jurisprudencia" element={<Jurisprudencia />} />
                    <Route path="/calculadoras" element={<Calculadoras />} />
                    <Route path="/tarefas" element={<Tasks />} />
                    <Route path="/boards" element={<Boards />} />
                    <Route path="/perfil-check" element={<ProfileCheck />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;

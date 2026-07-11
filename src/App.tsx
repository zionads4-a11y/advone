import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import Index from "./pages/Index";

import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Kanban from "./pages/Kanban";
import Conversations from "./pages/Conversations";
import Campaigns from "./pages/Campaigns";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import ClientUsers from "./pages/ClientUsers";
import AccessManagement from "./pages/AccessManagement";
import TrackingLinks from "./pages/TrackingLinks";
import ConnectWhatsApp from "@/pages/ConnectWhatsApp";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import BotConfig from "./pages/BotConfig";
import CompanySettings from "./pages/CompanySettings";
import Financial from "./pages/Financial";
import Documents from "./pages/Documents";
import DocumentTemplates from "./pages/DocumentTemplates";
import Cases from "./pages/Cases";
import ProcessMonitoring from "./pages/ProcessMonitoring";
import ProcessKanban from "./pages/ProcessKanban";
import ProcessSearch from "./pages/ProcessSearch";
import Subscription from "./pages/Subscription";
import FraudAlerts from "./pages/FraudAlerts";

import LegalAI from "./pages/LegalAI";
import Jurisprudencia from "./pages/Jurisprudencia";
import Calculadoras from "./pages/Calculadoras";
import LandingIA from "./pages/LandingIA";
import LandingIALeads from "./pages/LandingIALeads";
import LandingPage from "./pages/LandingPage";
import CrmAdvogados from "./pages/CrmAdvogados";
import WhatsappAdvogados from "./pages/WhatsappAdvogados";
import SdrIaJuridico from "./pages/SdrIaJuridico";
import Blog from "./pages/Blog";
import PostQualificarLeads from "./pages/PostQualificarLeads";
import PostSdrHumanoVsIa from "./pages/PostSdrHumanoVsIa";
import PostLgpdEscritorios from "./pages/PostLgpdEscritorios";
import AppLayout from "./components/layout/AppLayout";
import ProfileCheck from "./pages/ProfileCheck";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Security from "./pages/Security";
import Tasks from "./pages/Tasks";
import Boards from "./pages/Boards";
import WebhookLogs from "./pages/WebhookLogs";
import { ThemeProvider } from "@/hooks/useTheme";
import { ErrorBoundary } from "./components/ErrorBoundary";


const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
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
              <Route path="/client-users" element={<ClientUsers />} />
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
              <Route path="/monitoramento" element={<ProcessMonitoring />} />
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
        </AuthProvider>
      </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);


export default App;

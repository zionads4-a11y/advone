import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Kanban from "./pages/Kanban";
import Conversations from "./pages/Conversations";
import Campaigns from "./pages/Campaigns";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import ClientUsers from "./pages/ClientUsers";
import AccessManagement from "./pages/AccessManagement";
import TrackingLinks from "./pages/TrackingLinks";
import ConnectWhatsApp from "./pages/ConnectWhatsApp";
import Agenda from "./pages/Agenda";
import Profile from "./pages/Profile";
import BotConfig from "./pages/BotConfig";
import CompanySettings from "./pages/CompanySettings";
import Financial from "./pages/Financial";
import Documents from "./pages/Documents";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/connect/:token" element={<ConnectWhatsApp />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/kanban" element={<Kanban />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/tracking" element={<TrackingLinks />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/client-users" element={<ClientUsers />} />
              <Route path="/access-management" element={<AccessManagement />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/bot-config" element={<BotConfig />} />
              <Route path="/company-settings" element={<CompanySettings />} />
              <Route path="/financeiro" element={<Financial />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import {
  Building2,
  LogOut,
  Users,
  CalendarDays,
  UserCircle,
  Bot,
  KeyRound,
  Settings,
  Wallet,
  FileText,
  Briefcase,
  Radar,
  CreditCard,
  DollarSign,
  ShieldAlert,
  Trophy,
  History,
  Scale,
  UserCheck,
  Search,
} from "lucide-react";
import logoAdvOne from "@/assets/logo-advone-light.png";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNewMessageNotifications } from "@/hooks/useNewMessageNotifications";
import { useCompanyServiceMode } from "@/hooks/useCompanyServiceMode";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { MODULE_BY_ROUTE, type ModuleKey } from "@/lib/modulePermissions";

import { LayoutDashboard, Kanban, MessageSquare } from "lucide-react";

// Rotas permitidas no modo "Apenas IA Laura" (Êxito e IA Avulsa)
// Acesso: Kanban, Agenda, Conversas, Clientes e Configuração do Escritório.
const AI_ONLY_ROUTES = new Set([
  "/dashboard",
  "/conversations",
  "/kanban",
  "/clientes",
  "/agenda",
  "/company-settings",
]);

const adminItems = [
  { title: "Empresas", url: "/companies", icon: Building2 },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Monitoramento", url: "/monitoramento", icon: Radar },
  { title: "Usuários", url: "/client-users", icon: Users },
  { title: "Acessos", url: "/access-management", icon: KeyRound },
  { title: "Assinaturas", url: "/assinatura", icon: CreditCard },
  { title: "Faturamento p/ Reunião", url: "/comissoes", icon: DollarSign },
  { title: "Agendamentos Êxito", url: "/agendamentos-exito", icon: Trophy },
  { title: "Histórico de Leads", url: "/historico-leads", icon: History },
  { title: "Alertas de Fraude", url: "/fraudes", icon: ShieldAlert },
];

const gerenteItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Clientes", url: "/clientes", icon: UserCheck },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "IA Jurídica", url: "/ia-juridica", icon: Scale, premium: true },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Monitoramento", url: "/monitoramento", icon: Radar },
  { title: "Modelos de Documentos", url: "/modelos-documentos", icon: FileText },
  { title: "Equipe", url: "/client-users", icon: Users },
  { title: "Configurações", url: "/company-settings", icon: Settings },
];

const operadorItems = [
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Clientes", url: "/clientes", icon: UserCheck },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Monitoramento", url: "/monitoramento", icon: Radar },
  { title: "IA Jurídica", url: "/ia-juridica", icon: Scale, premium: true },
];

const clientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
];

function getMenuItems(role: string | null) {
  switch (role) {
    case "admin":
    case "member":
      return adminItems;
    case "gerente":
      return gerenteItems;
    case "operador":
      return operadorItems;
    case "client":
      return clientItems;
    default:
      return clientItems;
  }
}

function getRoleLabel(role: string | null) {
  switch (role) {
    case "admin":
      return "Admin";
    case "member":
      return "Membro";
    case "gerente":
      return "Gerente";
    case "operador":
      return "Operador";
    case "client":
      return "Cliente";
    default:
      return "Usuário";
  }
}

function getGroupLabel(role: string | null) {
  switch (role) {
    case "admin":
    case "member":
      return "Menu Principal";
    default:
      return "Minha Empresa";
  }
}

export function AppSidebar() {
  const { signOut, user, userRole } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNewMessageNotifications();
  const { profile, initials } = useUserProfile();
  const { isAiOnly } = useCompanyServiceMode();
  const { can, isUnrestricted } = useModulePermissions();
  const baseItems = getMenuItems(userRole);
  
  // Se for gerente, mas NÃO for o super_admin (zionads4@gmail.com), remove o item de Configurações
  const filteredBaseItems = userRole === "gerente" && user?.email !== "zionads4@gmail.com"
    ? baseItems.filter(item => item.url !== "/company-settings")
    : baseItems;

  const aiFiltered = isAiOnly
    ? filteredBaseItems.filter((item) => AI_ONLY_ROUTES.has(item.url))
    : filteredBaseItems;
    
  // Para operador, filtra também pelos módulos liberados pelo gerente
  const menuItems =
    userRole === "operador" && !isUnrestricted
      ? aiFiltered.filter((item) => {
          const moduleKey = MODULE_BY_ROUTE[item.url] as ModuleKey | undefined;
          return moduleKey ? can(moduleKey) : true;
        })
      : aiFiltered;

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-center border-b border-sidebar-border/60 px-4 py-5">
        <img src={logoAdvOne} alt="AdvOne" className="h-16 w-auto" />
      </div>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/40">
            {getGroupLabel(userRole)}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => {
                const showBadge = item.url === "/conversations" && unreadCount > 0;
                const isPremium = (item as any).premium === true;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/80 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="!bg-sidebar-accent !text-sidebar-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-sidebar-primary"
                      >
                        <item.icon className="h-4 w-4 shrink-0 transition-colors" />
                        <span className="flex-1 truncate">{item.title}</span>
                        {isPremium && (
                          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                            Pro
                          </span>
                        )}
                        {showBadge && (
                          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground shadow-sm animate-pulse-soft">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        <div
          onClick={() => navigate("/profile")}
          className="mb-2 flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent"
        >
          <Avatar className="h-9 w-9 border border-sidebar-border ring-2 ring-sidebar-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
            <AvatarFallback className="bg-sidebar-primary/15 text-sidebar-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {profile?.full_name || "Usuário"}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/50">
              {user?.email}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 border-sidebar-primary/30 bg-sidebar-primary/10 text-[9px] font-semibold uppercase tracking-wider text-sidebar-primary">
            {getRoleLabel(userRole)}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="flex-1 justify-start text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary"
          >
            <UserCircle className="mr-2 h-3.5 w-3.5" />
            Perfil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-sidebar-foreground/70 hover:bg-destructive/15 hover:text-destructive"
            aria-label="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

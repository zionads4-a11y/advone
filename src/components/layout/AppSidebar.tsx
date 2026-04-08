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
} from "lucide-react";
import logoZionDigital from "@/assets/logo-zion-digital.png";
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

import { LayoutDashboard, Kanban, MessageSquare } from "lucide-react";

const adminItems = [
  { title: "Empresas", url: "/companies", icon: Building2 },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Usuários", url: "/client-users", icon: Users },
  { title: "Acessos", url: "/access-management", icon: KeyRound },
];

const gerenteItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Financeiro", url: "/financeiro", icon: Wallet },
  { title: "Bot", url: "/bot-config", icon: Bot },
  { title: "Equipe", url: "/client-users", icon: Users },
  { title: "Configurações", url: "/company-settings", icon: Settings },
];

const operadorItems = [
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Bot", url: "/bot-config", icon: Bot },
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
  const menuItems = getMenuItems(userRole);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center justify-center px-4 py-5">
        <img src={logoZionDigital} alt="Zion Digital" className="h-20 w-auto" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            {getGroupLabel(userRole)}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const showBadge = item.url === "/conversations" && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {showBadge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground animate-pulse">
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="mb-2 flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || "Usuário"}
            </p>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/50">
                {getRoleLabel(userRole)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mb-3 truncate text-xs text-sidebar-foreground/50 pl-12">
          {user?.email}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="flex-1 justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-primary"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Perfil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

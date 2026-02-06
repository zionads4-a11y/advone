import {
  Building2,
  LogOut,
  Zap,
  Users,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
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
import { useNewMessageNotifications } from "@/hooks/useNewMessageNotifications";

import { LayoutDashboard, Kanban, MessageSquare } from "lucide-react";

const adminItems = [
  { title: "Empresas", url: "/companies", icon: Building2 },
  { title: "Usuários", url: "/client-users", icon: Users },
];

const gerenteItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Equipe", url: "/client-users", icon: Users },
];

const operadorItems = [
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
];

const clientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Kanban", url: "/kanban", icon: Kanban },
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
  const { unreadCount } = useNewMessageNotifications();
  const menuItems = getMenuItems(userRole);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="gradient-primary rounded-lg p-1.5">
          <Zap className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold text-sidebar-accent-foreground">
          Lead Flux
        </span>
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
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/50">
            {getRoleLabel(userRole)}
          </Badge>
        </div>
        <div className="mb-3 truncate text-xs text-sidebar-foreground/50">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

import {
  LayoutDashboard,
  Users,
  Kanban,
  Megaphone,
  Building2,
  LogOut,
  Zap,
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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Kanban", url: "/kanban", icon: Kanban },
  { title: "Campanhas", url: "/campaigns", icon: Megaphone },
  { title: "Empresas", url: "/companies", icon: Building2 },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();

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
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
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

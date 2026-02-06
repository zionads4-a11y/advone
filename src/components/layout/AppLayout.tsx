import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Loader2 } from "lucide-react";

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur-md">
              <SidebarTrigger className="text-muted-foreground" />
            </header>
            <div className="p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}

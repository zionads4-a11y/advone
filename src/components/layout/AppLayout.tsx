import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Loader2, MessageSquare } from "lucide-react";
import { NewMessageNotificationProvider, useNewMessageNotifications } from "@/hooks/useNewMessageNotifications";
import { ReminderAlertProvider } from "@/hooks/useReminderAlerts";
import { ReminderAlertBell } from "./ReminderAlertBell";
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import SubscriptionBlockScreen from "./SubscriptionBlockScreen";

function HeaderNotification() {
  const { unreadCount } = useNewMessageNotifications();
  const navigate = useNavigate();

  if (unreadCount === 0) return null;

  return (
    <button
      onClick={() => navigate("/conversations")}
      className="ml-auto flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
      </span>
      <MessageSquare className="h-4 w-4" />
      <span>{unreadCount} {unreadCount === 1 ? "nova mensagem" : "novas mensagens"}</span>
    </button>
  );
}

export default function AppLayout() {
  const { user, loading } = useAuth();
  const subscription = useSubscriptionGuard();

  if (loading || subscription.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (subscription.blocked) {
    return <SubscriptionBlockScreen status={subscription.status} />;
  }

  return (
    <NewMessageNotificationProvider>
      <ReminderAlertProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex-1 overflow-auto">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground">AdvOne</span>
                  <span className="text-muted-foreground/50">/</span>
                  <span className="text-muted-foreground">Workspace</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <ReminderAlertBell />
                  <ThemeToggle />
                  <HeaderNotification />
                </div>
              </header>
              <div className="p-4 sm:p-6 md:p-8">
                <Outlet />
              </div>
            </main>
          </div>
        </SidebarProvider>
      </ReminderAlertProvider>
    </NewMessageNotificationProvider>
  );
}

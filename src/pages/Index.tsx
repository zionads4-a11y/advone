import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import LandingPage from "./LandingPage";

function getHomeRoute(role: string | null) {
  switch (role) {
    case "admin":
    case "member":
      return "/companies";
    case "gerente":
      return "/dashboard";
    case "operador":
      return "/kanban";
    case "client":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

const Index = () => {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to={getHomeRoute(userRole)} replace />;
  return <LandingPage />;
};

export default Index;

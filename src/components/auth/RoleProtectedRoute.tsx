import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/auth" replace />;
  
  if (userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

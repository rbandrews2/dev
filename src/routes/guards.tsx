import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AuthGuard() {
  const { user, loading, orgMemberships } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-amber-100">
        Loading…
      </div>
    );
  }

  const allowAnonymousPaths = ["/organization"];
  const isAllowedAnonymous = allowAnonymousPaths.some((p) =>
    location.pathname.startsWith(p)
  );
  const isOrganizationRoute = location.pathname.startsWith("/organization");
  const hasOrgMembership = orgMemberships.length > 0;

  if (!user && !isAllowedAnonymous) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (user && !hasOrgMembership && !isOrganizationRoute) {
    return <Navigate to="/organization?mode=create" replace />;
  }

  return <Outlet />;
}

export function RequireAdminPage({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-amber-100">
        Loading…
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/timeclock" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

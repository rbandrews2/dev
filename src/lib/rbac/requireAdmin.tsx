import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

// Custom hook that redirects non-admin users away from admin-only pages.
export function useRequireAdmin() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return null;
}

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

type PermissionSet = {
  role: string;
  canAdmin: boolean;
  canManageOrg: boolean;
  canSubmitForms: boolean;
  canSendMessages: boolean;
  canUseNavigation: boolean;
  canClock: boolean;
  canViewOwnTimesheet: boolean;
};

export function usePermissions(): PermissionSet {
  const { activeOrgRole, orgMemberships, activeOrgId, isAdmin } = useAuth();

  const role = useMemo(() => {
    if (activeOrgRole) return activeOrgRole;
    const activeMembership =
      orgMemberships.find((m) => m.organization_id === activeOrgId) ??
      orgMemberships[0];
    return activeMembership?.role ?? "member";
  }, [activeOrgRole, orgMemberships, activeOrgId]);

  const canAdmin = role === "owner" || role === "admin" || isAdmin;

  return {
    role,
    canAdmin,
    canManageOrg: canAdmin,
    canSubmitForms: true,
    canSendMessages: true,
    canUseNavigation: true,
    canClock: true,
    canViewOwnTimesheet: true,
  };
}

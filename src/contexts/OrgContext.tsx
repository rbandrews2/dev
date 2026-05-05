import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type OrgRole = "org_creator" | "employee";

interface OrgContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  role: OrgRole;
}

const defaultOrgContext: OrgContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  role: "employee",
};

const OrgContext = createContext<OrgContextType>(defaultOrgContext);

export const useOrgContext = () => useContext(OrgContext);
export const useOrg = useOrgContext; // alias for existing imports

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile } = useAuth();

  // org_creator = admin (elevated permissions), employee = standard user
  const role: OrgRole = userProfile?.org_creator ? "org_creator" : "employee";

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const value = useMemo(
    () => ({
      sidebarOpen,
      toggleSidebar,
      role,
    }),
    [sidebarOpen, role]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};

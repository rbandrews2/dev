
import { ReactNode } from "react";
import { useOrg } from "@/contexts/OrgContext";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { role } = useOrg();
  if (role !== "org_creator") return null;
  return <>{children}</>;
}

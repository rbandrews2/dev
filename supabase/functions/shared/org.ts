import { supabaseServiceClient } from "./supabase.ts";

export type MemberRole = "owner" | "admin" | "member";

export type Membership = {
  organization_id: string;
  role: MemberRole;
  company_size?: string | null;
};

export async function getMembershipByUser(
  userId: string,
  organizationId: string,
): Promise<Membership | null> {
  // You said org membership is loaded from organization_members by email.
  // For server-side, prefer user_id if present; fall back to email join if your schema uses email.
  const sb = supabaseServiceClient();

  // Try user_id first
  const byUserId = await sb
    .from("organization_members")
    .select("organization_id, role, company_size, user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.data) {
    return {
      organization_id: byUserId.data.organization_id,
      role: byUserId.data.role,
      company_size: byUserId.data.company_size ?? null,
    };
  }

  // If your table does not store user_id reliably, keep this path but it requires email.
  // Caller should have provided email in a prior step (session.init has it).
  return null;
}

export async function getMembershipByEmail(
  email: string,
  organizationId: string,
): Promise<Membership | null> {
  const sb = supabaseServiceClient();
  const { data } = await sb
    .from("organization_members")
    .select("organization_id, role, company_size, email")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .maybeSingle();

  if (!data) return null;
  return { organization_id: data.organization_id, role: data.role, company_size: data.company_size ?? null };
}

import { supabaseAnonClient } from "./supabase.ts";

export type AuthUser = {
  id: string;
  email: string | null;
};

export async function requireUser(req: Request): Promise<AuthUser> {
  const sb = supabaseAnonClient(req);
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) throw new Error("UNAUTHORIZED");
  return { id: data.user.id, email: data.user.email ?? null };
}

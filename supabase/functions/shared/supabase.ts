import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function supabaseAnonClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

// Service client for privileged inserts/logging.
// IMPORTANT: do not expose SUPABASE_SECRET_KEYS to client.
export function supabaseServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEYS")!;
  return createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });
}

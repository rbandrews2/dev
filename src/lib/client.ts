import { createClient } from "@supabase/supabase-js";

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEYS || import.meta.env.VITE_SUPABASE_ANON_KEY)
);

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://not-configured.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEYS ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "not-configured"
);

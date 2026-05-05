import { createClient } from "@supabase/supabase-js";
import { security } from "@/lib/security";

/**
 * Supabase client (browser-safe).
 *
 * IMPORTANT:
 * - Do not hardcode URLs/keys in repo.
 * - Set these in your .env / hosting provider:
 *   VITE_SUPABASE_URL=
 *   VITE_SUPABASE_PUBLISHABLE_KEYS=
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEYS;

if (!supabaseUrl || !supabaseKey) {
  // Fail fast: missing configuration should be obvious in dev/staging and never silently fall back.
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEYS in your environment."
  );
}

const toHeadersRecord = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {};
  const h = new Headers(headers as HeadersInit);
  return Array.from(h.entries()).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});
};

const securedFetch: typeof fetch = async (input, init = {}) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : "url" in input
      ? input.url
      : "";

  // Ensure Supabase-only traffic passes and logs appropriately.
  if (url && !security.isTrustedSource(url)) {
    security.logSecurityEvent("UNTRUSTED_REQUEST_BLOCKED", { url });
    throw new Error("Blocked outbound request to untrusted host");
  }

  const headersRecord = toHeadersRecord((init as RequestInit).headers);
  security.validateSupabaseRequest(headersRecord);
  const allowed = security.checkRateLimit("supabase_client", 500, 60_000, url);
  if (!allowed) {
    throw new Error("Rate limit exceeded for Supabase client");
  }

  return fetch(input as RequestInfo | URL, init as RequestInit);
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: securedFetch,
  },
});

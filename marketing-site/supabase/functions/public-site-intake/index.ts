/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function normalize(url: string) {
  return url.replace(/\/+$/, "");
}

function allowedOrigin(origin: string | null) {
  const site = normalize(Deno.env.get("PUBLIC_SITE_URL") || "https://workzoneos.org");
  const extraOrigins = (Deno.env.get("PUBLIC_SITE_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalize);

  if (!origin) return true;
  return [
    site,
    "https://workzoneos.netlify.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    ...extraOrigins
  ].includes(normalize(origin));
}

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !secretKey) throw new Error("Missing Supabase secret key configuration.");
  return createClient(url, secretKey, { auth: { persistSession: false } });
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function sha256(value: string | null) {
  if (!value) return null;
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!allowedOrigin(request.headers.get("origin"))) {
    return json(403, { error: "forbidden", message: "Origin not allowed." });
  }

  if (request.method !== "POST") {
    return json(400, { error: "bad_request", message: "POST required." });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const admin = supabaseAdmin();

    if (action === "page_view") {
      const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-real-ip");

      const { error } = await admin.from("site_page_views").insert({
        source: stringOrNull(body.source) || "workzoneos_org",
        visitor_session_id: stringOrNull(body.visitor_session_id),
        page_url: stringOrNull(body.page_url),
        page_path: stringOrNull(body.page_path),
        referrer: stringOrNull(body.referrer),
        screen: stringOrNull(body.screen),
        viewport: stringOrNull(body.viewport),
        language: stringOrNull(body.language),
        timezone: stringOrNull(body.timezone),
        user_agent: request.headers.get("user-agent"),
        ip_hash: await sha256(ipAddress),
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}
      });

      if (error) throw new Error(error.message);
      return json(200, { ok: true });
    }

    if (action === "newsletter_signup") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !email.includes("@")) {
        return json(400, { error: "bad_request", message: "Valid email required." });
      }

      const { error } = await admin.from("marketing_leads").upsert({
        email,
        name: typeof body.name === "string" ? body.name.trim() || null : null,
        company: typeof body.company === "string" ? body.company.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
        placement: typeof body.placement === "string" ? body.placement.trim() || null : null,
        source: stringOrNull(body.source) || "workzoneos_org",
        visitor_session_id: stringOrNull(body.visitor_session_id),
        consent: body.consent === true,
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {}
      }, { onConflict: "email" });

      if (error) throw new Error(error.message);
      return json(200, { ok: true });
    }

    return json(400, { error: "bad_request", message: "Unsupported action." });
  } catch (error) {
    return json(500, {
      error: "server_error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const decoder = new TextDecoder();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map((part) => part.toString(16).padStart(2, "0")).join("");
}

function base64Decode(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function deriveKey(secret: string) {
  const encoded = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", encoded.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoded.encode("wzos-commerce-v1"),
      iterations: 200_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function openSecret(secret: string, sealed: string) {
  const [ivPart, cipherPart] = sealed.split(".");
  if (!ivPart || !cipherPart) throw new Error("Malformed sealed activation code.");
  const key = await deriveKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64Decode(ivPart) },
    key,
    base64Decode(cipherPart),
  );
  return decoder.decode(new Uint8Array(plaintext));
}

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !secretKey) throw new Error("Missing Supabase secret key configuration.");
  return createClient(url, secretKey, { auth: { persistSession: false } });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json(400, { error: "bad_request", message: "POST required." });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const deliveryToken = typeof body.delivery_token === "string" ? body.delivery_token.trim() : "";

    if (!sessionId || !deliveryToken) {
      return json(400, { error: "bad_request", message: "session_id and delivery_token required." });
    }

    const deliveryTokenHash = await sha256Hex(deliveryToken);
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("purchase_deliveries")
      .select("status, customer_email, product_sku, company, sealed_activation_code")
      .eq("checkout_session_id", sessionId)
      .eq("delivery_token_hash", deliveryTokenHash)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return json(404, { error: "not_found", message: "Purchase not found." });
    }

    const ready = data.status === "ready" && Boolean(data.sealed_activation_code);
    const activationCode = ready
      ? await openSecret(Deno.env.get("WZOS_VAULT_MASTER_KEY") || "", data.sealed_activation_code)
      : null;

    return json(200, {
      ok: true,
      ready,
      status: data.status,
      activation_code: activationCode,
      customer_email: data.customer_email,
      company: data.company,
      product_sku: data.product_sku,
      app_url: Deno.env.get("APP_URL") || "https://app.superiorllc.org",
      app_alt_url: Deno.env.get("APP_ALT_URL") || "https://app.workzoneos.org",
      app_fallback_url: Deno.env.get("APP_FALLBACK_URL") || "https://workzoneos.netlify.app"
    });
  } catch (error) {
    return json(500, {
      error: "server_error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

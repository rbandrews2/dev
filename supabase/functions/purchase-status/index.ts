/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleCors } from "../shared/cors.ts";
import { json, badRequest, serverError } from "../shared/http.ts";
import { mustGetEnv } from "../shared/env.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";
import { openSecret, sha256Hex } from "../shared/license.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return badRequest("POST required");

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";
    const deliveryToken = typeof body?.delivery_token === "string" ? body.delivery_token.trim() : "";

    if (!sessionId || !deliveryToken) {
      return badRequest("session_id and delivery_token are required.");
    }

    const service = supabaseServiceClient();
    const tokenHash = await sha256Hex(deliveryToken);
    const { data, error } = await service
      .from("purchase_deliveries")
      .select("status, customer_email, product_sku, sealed_activation_code, checkout_session_id, email_sent_at")
      .eq("checkout_session_id", sessionId)
      .eq("delivery_token_hash", tokenHash)
      .maybeSingle();

    if (error) return serverError("Could not load purchase status.", error.message);
    if (!data) return badRequest("Purchase record not found.");

    if (data.status !== "ready" || !data.sealed_activation_code) {
      return json({
        ok: true,
        ready: false,
        status: data.status,
        customer_email: data.customer_email,
      });
    }

    const activationCode = await openSecret(mustGetEnv("WZOS_VAULT_MASTER_KEY"), data.sealed_activation_code);
    const appUrl = (Deno.env.get("WZOS_APP_URL") || "https://app.superiorllc.org").replace(/\/+$/, "");

    return json({
      ok: true,
      ready: true,
      status: data.status,
      activation_code: activationCode,
      customer_email: data.customer_email,
      product_sku: data.product_sku,
      email_sent: Boolean(data.email_sent_at),
      download_url: mustGetEnv("WZOS_DOWNLOAD_URL"),
      activate_url: `${appUrl}/organization?mode=create`,
      support_url: `${siteUrl}/contact`,
    });
  } catch (error) {
    return serverError("Failed to load purchase status.", error instanceof Error ? error.message : String(error));
  }
});

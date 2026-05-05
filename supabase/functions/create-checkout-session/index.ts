/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@22.1.0";
import { handleCors } from "../shared/cors.ts";
import { json, badRequest, forbidden, serverError } from "../shared/http.ts";
import { mustGetEnv } from "../shared/env.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";
import { createDeliveryToken, sha256Hex } from "../shared/license.ts";

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isAllowedOrigin(origin: string | null, siteUrl: string) {
  if (!origin) return true;
  const allowed = new Set([
    normalizeSiteUrl(siteUrl),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
  return allowed.has(normalizeSiteUrl(origin));
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return badRequest("POST required");

  try {
    const siteUrl = normalizeSiteUrl(mustGetEnv("PUBLIC_SITE_URL"));
    if (!isAllowedOrigin(req.headers.get("origin"), siteUrl)) {
      return forbidden("Origin is not allowed for checkout.");
    }

    const stripeSecretKey = mustGetEnv("STRIPE_SECRET_KEY");
    const stripePriceId = mustGetEnv("STRIPE_PRICE_ID_WZOS_CORE");
    const service = supabaseServiceClient();
    const stripe = new Stripe(stripeSecretKey);

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const company = typeof body?.company === "string" ? body.company.trim() : "";
    const productSku = typeof body?.product_sku === "string" && body.product_sku.trim()
      ? body.product_sku.trim()
      : "WZOS_CORE";

    const deliveryToken = createDeliveryToken();
    const deliveryTokenHash = await sha256Hex(deliveryToken);

    const { error: pendingError } = await service.from("purchase_deliveries").insert({
      delivery_token_hash: deliveryTokenHash,
      customer_email: email || null,
      product_sku: productSku,
      status: "pending",
      metadata: company ? { company } : {},
    });

    if (pendingError) {
      return serverError("Could not initialize purchase delivery.", pendingError.message);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&delivery_token=${deliveryToken}`,
      cancel_url: `${siteUrl}/cancelled.html`,
      billing_address_collection: "auto",
      customer_email: email || undefined,
      customer_creation: "always",
      allow_promotion_codes: true,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: {
        delivery_token_hash: deliveryTokenHash,
        product_sku: productSku,
        company,
      },
      custom_fields: company
        ? []
        : [{
          key: "company_name",
          label: { type: "custom", custom: "Company name" },
          type: "text",
          optional: true,
        }],
    });

    const { error: linkError } = await service
      .from("purchase_deliveries")
      .update({
        checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      })
      .eq("delivery_token_hash", deliveryTokenHash);

    if (linkError) {
      return serverError("Checkout created but delivery link update failed.", linkError.message);
    }

    return json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    return serverError("Failed to create checkout session.", error instanceof Error ? error.message : String(error));
  }
});

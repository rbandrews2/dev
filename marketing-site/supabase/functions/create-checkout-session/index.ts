/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import Stripe from "npm:stripe@22.1.0";
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

function createDeliveryToken() {
  return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map((part) => part.toString(16).padStart(2, "0")).join("");
}

function allowedOrigin(origin: string | null) {
  const site = normalize(Deno.env.get("PUBLIC_SITE_URL") || "https://workzoneos.org");
  if (!origin) return true;
  return [
    site,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ].includes(normalize(origin));
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

  if (!allowedOrigin(request.headers.get("origin"))) {
    return json(403, { error: "forbidden", message: "Origin not allowed." });
  }

  if (request.method !== "POST") {
    return json(400, { error: "bad_request", message: "POST required." });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const admin = supabaseAdmin();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
    const siteUrl = normalize(Deno.env.get("PUBLIC_SITE_URL") || "https://workzoneos.org");
    const priceId = Deno.env.get("STRIPE_PRICE_ID_WZOS_CORE") || "";

    if (!priceId) throw new Error("Missing STRIPE_PRICE_ID_WZOS_CORE.");

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const company = typeof body.company === "string" ? body.company.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const productSku = typeof body.product_sku === "string" ? body.product_sku.trim() : "WZOS_CORE";

    const deliveryToken = createDeliveryToken();
    const deliveryTokenHash = await sha256Hex(deliveryToken);

    const { error: insertError } = await admin.from("purchase_deliveries").insert({
      delivery_token_hash: deliveryTokenHash,
      customer_email: email || null,
      company: company || null,
      phone: phone || null,
      product_sku: productSku,
      status: "pending",
      metadata: {
        source: "workzoneos_org"
      }
    });

    if (insertError) throw new Error(insertError.message);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "auto",
      customer_email: email || undefined,
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&delivery_token=${deliveryToken}`,
      cancel_url: `${siteUrl}/cancelled.html`,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        delivery_token_hash: deliveryTokenHash,
        product_sku: productSku,
        company,
        phone
      }
    });

    const { error: updateError } = await admin
      .from("purchase_deliveries")
      .update({
        checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null
      })
      .eq("delivery_token_hash", deliveryTokenHash);

    if (updateError) throw new Error(updateError.message);

    return json(200, {
      ok: true,
      session_id: session.id,
      checkout_url: session.url
    });
  } catch (error) {
    return json(500, {
      error: "server_error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import Stripe from "npm:stripe@22.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const encoder = new TextEncoder();

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!url || !secretKey) throw new Error("Missing Supabase secret key configuration.");
  return createClient(url, secretKey, { auth: { persistSession: false } });
}

function generateActivationCode(length = 15) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function sha256Hex(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(hash)).map((part) => part.toString(16).padStart(2, "0")).join("");
}

function base64Encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function deriveKey(secret: string) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("wzos-commerce-v1"),
      iterations: 200_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
}

async function sealSecret(secret: string, plaintext: string) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  return `${base64Encode(iv)}.${base64Encode(new Uint8Array(ciphertext))}`;
}

Deno.serve(async (request) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
    const signature = request.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    if (!signature || !secret) {
      return new Response("Missing Stripe webhook secret.", { status: 400 });
    }

    const payload = await request.text();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
    const admin = supabaseAdmin();

    if (event.type !== "checkout.session.completed") {
      return new Response("ok", { status: 200 });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return new Response("ignored", { status: 200 });
    }

    const deliveryTokenHash = session.metadata?.delivery_token_hash;
    if (!deliveryTokenHash) {
      return new Response("Missing delivery token hash.", { status: 400 });
    }

    const customerEmail =
      session.customer_details?.email?.trim().toLowerCase() ||
      session.customer_email?.trim().toLowerCase() ||
      "";
    const productSku = session.metadata?.product_sku?.trim() || "WZOS_CORE";

    const { data: delivery, error: deliveryError } = await admin
      .from("purchase_deliveries")
      .select("id, sealed_activation_code")
      .eq("checkout_session_id", session.id)
      .eq("delivery_token_hash", deliveryTokenHash)
      .maybeSingle();

    if (deliveryError || !delivery) {
      return new Response("Purchase delivery not found.", { status: 404 });
    }

    let sealedActivationCode = delivery.sealed_activation_code as string | null;
    if (!sealedActivationCode) {
      const plainCode = generateActivationCode(15);
      sealedActivationCode = await sealSecret(Deno.env.get("WZOS_VAULT_MASTER_KEY") || "", plainCode);
      const codeHash = await sha256Hex(plainCode);

      const { error: codeError } = await admin.from("activation_codes").insert({
        code_hash: codeHash,
        customer_email: customerEmail || null,
        order_id: session.id,
        product_sku: productSku,
      });

      if (codeError) {
        return new Response(codeError.message, { status: 500 });
      }
    }

    const { error: updateError } = await admin
      .from("purchase_deliveries")
      .update({
        status: "ready",
        customer_email: customerEmail || null,
        sealed_activation_code: sealedActivationCode,
        fulfilled_at: new Date().toISOString(),
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      })
      .eq("id", delivery.id);

    if (updateError) {
      return new Response(updateError.message, { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : String(error), { status: 400 });
  }
});

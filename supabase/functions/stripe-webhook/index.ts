/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@22.1.0";
import { Resend } from "npm:resend@6.12.2";
import { mustGetEnv } from "../shared/env.ts";
import { json } from "../shared/http.ts";
import { supabaseServiceClient } from "../shared/supabase.ts";
import { generateActivationCode, openSecret, sealSecret, sha256Hex } from "../shared/license.ts";

function webhookHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: webhookHeaders() });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: webhookHeaders() });
  }

  const stripe = new Stripe(mustGetEnv("STRIPE_SECRET_KEY"));
  const resend = new Resend(mustGetEnv("RESEND_API_KEY"));
  const service = supabaseServiceClient();

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return json({ error: "Missing Stripe signature" }, { status: 400, headers: webhookHeaders() });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, mustGetEnv("STRIPE_WEBHOOK_SECRET"));

    if (event.type !== "checkout.session.completed") {
      return json({ received: true }, { headers: webhookHeaders() });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return json({ ignored: true }, { headers: webhookHeaders() });
    }

    const sessionId = session.id;
    const customerEmail = session.customer_details?.email?.trim().toLowerCase()
      || session.customer_email?.trim().toLowerCase()
      || "";
    const productSku = session.metadata?.product_sku?.trim() || "WZOS_CORE";
    const deliveryTokenHash = session.metadata?.delivery_token_hash?.trim() || "";

    if (!customerEmail || !deliveryTokenHash) {
      return json({ error: "Missing required fulfillment metadata" }, { status: 400, headers: webhookHeaders() });
    }

    const { data: delivery, error: deliveryError } = await service
      .from("purchase_deliveries")
      .select("id, status, sealed_activation_code, email_sent_at, metadata")
      .eq("checkout_session_id", sessionId)
      .eq("delivery_token_hash", deliveryTokenHash)
      .maybeSingle();

    if (deliveryError || !delivery) {
      return json({ error: "Purchase delivery not found" }, { status: 404, headers: webhookHeaders() });
    }

    let sealedActivationCode = delivery.sealed_activation_code as string | null;
    if (!sealedActivationCode) {
      const activationCode = generateActivationCode(15);
      sealedActivationCode = await sealSecret(mustGetEnv("WZOS_VAULT_MASTER_KEY"), activationCode);
      const codeHash = await sha256Hex(activationCode);

      const { error: codeError } = await service.from("activation_codes").insert({
        code_hash: codeHash,
        customer_email: customerEmail,
        order_id: sessionId,
        product_sku: productSku,
      });

      if (codeError) {
        const duplicate = String(codeError.message).toLowerCase().includes("duplicate");
        if (!duplicate) {
          return json({ error: codeError.message }, { status: 500, headers: webhookHeaders() });
        }

        const { data: existingDelivery } = await service
          .from("purchase_deliveries")
          .select("sealed_activation_code")
          .eq("id", delivery.id)
          .maybeSingle();

        if (!existingDelivery?.sealed_activation_code) {
          return json(
            { error: "Fulfillment retry detected before delivery seal was stored. Retry webhook or contact support." },
            { status: 409, headers: webhookHeaders() },
          );
        }

        sealedActivationCode = existingDelivery.sealed_activation_code;
      } else {
        const { error: purchaseUpdateError } = await service
          .from("purchase_deliveries")
          .update({
            status: "ready",
            sealed_activation_code: sealedActivationCode,
            customer_email: customerEmail,
            fulfilled_at: new Date().toISOString(),
            stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          })
          .eq("id", delivery.id);

        if (purchaseUpdateError) {
          return json({ error: purchaseUpdateError.message }, { status: 500, headers: webhookHeaders() });
        }
      }
    }

    const activationCodeForEmail = await openSecret(mustGetEnv("WZOS_VAULT_MASTER_KEY"), sealedActivationCode);

    if (!delivery.email_sent_at) {
      const siteUrl = mustGetEnv("PUBLIC_SITE_URL").replace(/\/+$/, "");
      const appUrl = (Deno.env.get("WZOS_APP_URL") || "https://app.superiorllc.org").replace(/\/+$/, "");
      const productName = Deno.env.get("WZOS_PRODUCT_NAME") || "Work Zone OS";
      const companyName = typeof delivery.metadata?.company === "string" ? delivery.metadata.company : "";

      await resend.emails.send({
        from: mustGetEnv("EMAIL_FROM"),
        to: customerEmail,
        subject: "Your Work Zone OS activation code",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
            <h2 style="margin-bottom:12px;">Purchase complete</h2>
            <p>Thank you for purchasing ${productName}${companyName ? ` for ${companyName}` : ""}.</p>
            <p>Your activation code:</p>
            <div style="font-size:24px;font-weight:700;letter-spacing:4px;margin:16px 0;">${activationCodeForEmail}</div>
            <p>Next steps:</p>
            <ol>
              <li>Open the Work Zone OS app.</li>
              <li>Create your organization.</li>
              <li>Enter this access code in the Access / activation code field.</li>
              <li>Add members and admins under that organization.</li>
            </ol>
            <p><a href="${appUrl}/organization?mode=create">Open ${productName}</a></p>
            <p><a href="${siteUrl}/contact">Schedule a Superior Consultation installation appointment</a></p>
          </div>
        `,
      });

      await service
        .from("purchase_deliveries")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", delivery.id);
    }

    await service.from("customer_profiles").upsert({
      email: customerEmail,
      company: typeof delivery.metadata?.company === "string" ? delivery.metadata.company : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    return json({ received: true }, { headers: webhookHeaders() });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400, headers: webhookHeaders() },
    );
  }
});

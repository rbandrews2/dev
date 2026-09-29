import Stripe from "npm:stripe@22.6.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("POST required", {status:405});
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret || !key) return new Response("Webhook unavailable", {status:503});
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", {status:400});
  const stripe = new Stripe(key);
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", {status:400});
  }
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Missing server configuration");
    const admin = createClient(url, serviceKey, {auth:{persistSession:false}});
    const {error} = await admin.rpc("apply_purchase_payment_event", {p_event:event});
    if (error) throw error;
    return new Response("ok", {status:200});
  } catch {
    console.error("Purchase payment event failed", {eventId:event.id});
    return new Response("Processing failed; retry required", {status:500});
  }
});

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { generateActivationCode } from "../activation/generateActivationCode";
import { sha256Hex } from "../activation/hash";
import { sendActivationEmail } from "../email/sendActivationEmail";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEYS!,
  { auth: { persistSession: false } }
);

export async function stripeWebhook(req: any, res: any) {
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return res.json({ ignored: true });
    }

    const email = session.customer_details?.email;
    const orderId = session.id;
    const productSku =
      session.metadata?.product_sku ?? "WZOS_CORE";

    if (!email) {
      return res.status(400).json({ error: "Missing customer email" });
    }

    // Generate activation code
    const activationCode = generateActivationCode(15);
    const codeHash = sha256Hex(activationCode);

    // Insert hashed code only
    const { error } = await supabase
      .from("activation_codes")
      .insert({
        code_hash: codeHash,
        customer_email: email,
        order_id: orderId,
        product_sku: productSku,
      });

    if (error) {
      console.error("Supabase insert failed", error);
      return res.status(500).json({ error: "Activation issuance failed" });
    }

    // Send activation email
    await sendActivationEmail({
      to: email,
      code: activationCode,
      product: productSku,
    });
  }

  res.json({ received: true });
}

import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { existsSync } from "node:fs";
import helmet from "helmet";
import path from "node:path";
import Stripe from "stripe";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { appendAuthorization, markAuthorizationPaid } from "./store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4242);
const isProduction = process.env.NODE_ENV === "production";

const stripeKey = process.env.STRIPE_RESTRICTED_KEY || process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" })
  : null;

const business = {
  name: "Superior Consultation, LLC",
  address: "915 Pocahontas Ave. Suite B Rke., VA 24012",
  supportEmail: "inf0@workzoneos.org",
  supportPhone: "(844) 685-7207",
  currency: "usd"
};

const authorizationSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(160),
  customerPhone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  amountCents: z.number().int().min(50).max(5000000),
  withdrawalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(2).max(180),
  signatureAccepted: z.literal(true),
  authorizationVersion: z.literal("superior-ach-card-auth-v1")
});

const intentSchema = z.object({
  authorizationId: z.string().uuid()
});

function requireStripe() {
  if (!stripe) {
    const error = new Error("Stripe is not configured. Add STRIPE_RESTRICTED_KEY and STRIPE_PUBLISHABLE_KEY.");
    error.status = 503;
    throw error;
  }
  return stripe;
}

function feeCents() {
  return Math.max(0, Number(process.env.SERVICE_FEE_CENTS || 0));
}

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://*.stripe.com"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://r.stripe.com", "https://*.stripe.com", "https://*.stripe.network"],
        imgSrc: ["'self'", "data:", "https:", "https://*.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  })
);

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signingSecret || !stripe) return res.status(503).send("Webhook not configured");

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        signingSecret
      );
    } catch (error) {
      return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      await markAuthorizationPaid(paymentIntent.metadata.authorization_id, {
        paymentIntentId: paymentIntent.id,
        amountReceived: paymentIntent.amount_received,
        paidAt: new Date().toISOString()
      });
    }

    res.json({ received: true });
  }
);

app.use(express.json({ limit: "32kb" }));

app.get("/api/checkout/config", (_req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    business,
    policies: {
      privacyUrl: process.env.PRIVACY_POLICY_URL || "https://superiorllc.org/privacy-policy",
      termsUrl: process.env.TERMS_URL || "https://superiorllc.org/dependency",
      refundUrl: process.env.REFUND_POLICY_URL || ""
    },
    fee: {
      label: process.env.SERVICE_FEE_LABEL || "Processing fee",
      amountCents: feeCents()
    }
  });
});

app.post("/api/checkout/authorization", async (req, res, next) => {
  try {
    const parsed = authorizationSchema.parse(req.body);
    const totalCents = parsed.amountCents + feeCents();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const authorization = {
      id,
      ...parsed,
      business,
      serviceFeeCents: feeCents(),
      totalCents,
      createdAt,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || "",
      status: "authorized"
    };

    await appendAuthorization(authorization);
    res.status(201).json({ authorizationId: id, totalCents });
  } catch (error) {
    next(error);
  }
});

app.post("/api/checkout/create-payment-intent", async (req, res, next) => {
  try {
    const parsed = intentSchema.parse(req.body);
    const auth = await appendAuthorization.get(parsed.authorizationId);
    if (!auth) return res.status(404).json({ error: "Authorization record was not found." });

    const stripeClient = requireStripe();
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: auth.totalCents,
      currency: business.currency,
      receipt_email: auth.customerEmail,
      description: auth.description,
      automatic_payment_methods: { enabled: true },
      payment_method_options: {
        us_bank_account: {
          verification_method: "automatic"
        }
      },
      metadata: {
        authorization_id: auth.id,
        authorization_version: auth.authorizationVersion,
        customer_name: auth.customerName,
        withdrawal_date: auth.withdrawalDate
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route was not found." });
});

app.use((error, _req, res, _next) => {
  const status = error.status || (error instanceof z.ZodError ? 400 : 500);
  const message =
    error instanceof z.ZodError
      ? "Please check the authorization form and try again."
      : error.message || "Unexpected checkout error.";
  res.status(status).json({ error: message });
});

const distPath = path.resolve(__dirname, "../dist");
if (isProduction || existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(port, () => {
  console.log(`Superior checkout server listening on http://localhost:${port}`);
});

import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { existsSync } from "node:fs";
import helmet from "helmet";
import path from "node:path";
import Stripe from "stripe";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  appendAuthorization,
  getCustomerPaymentProfileByEmail,
  markAuthorizationPaid,
  updateSubscriptionStatus,
  upsertCustomerPaymentProfile,
  upsertSubscriptionRecord
} from "./store.mjs";

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
  authorizationVersion: z.enum(["superior-ach-card-auth-v1", "superior-ach-bank-auth-v2"])
});

const checkoutDetailsSchema = authorizationSchema.omit({
  signatureAccepted: true,
  authorizationVersion: true
});

const subscriptionRequestSchema = z.object({
  enabled: z.boolean().default(false),
  amountCents: z.number().int().min(50).max(5000000).optional(),
  interval: z.enum(["day", "week", "month", "year"]).default("month"),
  intervalCount: z.number().int().min(1).max(12).default(1),
  description: z.string().trim().min(2).max(180).optional(),
  firstBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const intentSchema = z.discriminatedUnion("paymentFlow", [
  checkoutDetailsSchema.extend({
    paymentFlow: z.literal("standard"),
    authorizationId: z.string().uuid().optional(),
    subscription: subscriptionRequestSchema.optional()
  }),
  checkoutDetailsSchema.partial().extend({
    paymentFlow: z.literal("ach"),
    authorizationId: z.string().uuid(),
    subscription: subscriptionRequestSchema.optional()
  })
]);

const existingPurchaseSubscriptionSchema = z.object({
  customerEmail: z.string().trim().email().max(160).optional(),
  customerName: z.string().trim().min(2).max(120).optional(),
  customerPhone: z.string().trim().max(30).optional(),
  stripeCustomerId: z.string().trim().startsWith("cus_").optional(),
  paymentIntentId: z.string().trim().startsWith("pi_").optional(),
  paymentMethodId: z.string().trim().startsWith("pm_").optional(),
  priceId: z.string().trim().startsWith("price_").optional(),
  amountCents: z.number().int().min(50).max(5000000).optional(),
  interval: z.enum(["day", "week", "month", "year"]).default("month"),
  intervalCount: z.number().int().min(1).max(12).default(1),
  description: z.string().trim().min(2).max(180).default("Recurring consultation subscription"),
  firstBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine((value) => value.paymentIntentId || value.paymentMethodId, {
  message: "Provide paymentIntentId or paymentMethodId."
}).refine((value) => value.priceId || value.amountCents || process.env.STRIPE_SUBSCRIPTION_PRICE_ID, {
  message: "Provide priceId, amountCents, or STRIPE_SUBSCRIPTION_PRICE_ID."
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

function recurringDefaults() {
  return {
    enabled: process.env.SUBSCRIPTIONS_ENABLED !== "false",
    label: process.env.SUBSCRIPTION_LABEL || "Monthly consultation plan",
    amountCents: Math.max(50, Number(process.env.SUBSCRIPTION_AMOUNT_CENTS || 25000)),
    interval: process.env.SUBSCRIPTION_INTERVAL || "month",
    intervalCount: Math.max(1, Number(process.env.SUBSCRIPTION_INTERVAL_COUNT || 1))
  };
}

function shouldSavePaymentMethodsForFutureCharges() {
  return process.env.SAVE_PAYMENT_METHODS_FOR_FUTURE_CHARGES !== "false";
}

function nextBillingTimestamp(firstBillingDate) {
  const date = firstBillingDate ? new Date(`${firstBillingDate}T12:00:00Z`) : new Date();
  if (!firstBillingDate) date.setMonth(date.getMonth() + 1);
  return Math.floor(date.getTime() / 1000);
}

function timestampFromStripe(value) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function getOrCreateStripeCustomer(stripeClient, checkout) {
  const existingProfile = await getCustomerPaymentProfileByEmail(checkout.customerEmail);
  if (existingProfile?.stripeCustomerId) return existingProfile.stripeCustomerId;

  const customer = await stripeClient.customers.create({
    name: checkout.customerName,
    email: checkout.customerEmail,
    phone: checkout.customerPhone || undefined,
    metadata: {
      source: "checkout-superior"
    }
  });

  await upsertCustomerPaymentProfile({
    customerEmail: checkout.customerEmail,
    customerName: checkout.customerName,
    customerPhone: checkout.customerPhone || "",
    stripeCustomerId: customer.id
  });

  return customer.id;
}

async function ensurePaymentMethodAttached(stripeClient, paymentMethodId, stripeCustomerId) {
  const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId);
  const attachedCustomer =
    typeof paymentMethod.customer === "string" ? paymentMethod.customer : paymentMethod.customer?.id;

  if (attachedCustomer && attachedCustomer !== stripeCustomerId) {
    const error = new Error("Payment method belongs to a different Stripe customer.");
    error.status = 409;
    throw error;
  }

  if (!attachedCustomer) {
    await stripeClient.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
  }

  await stripeClient.customers.update(stripeCustomerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });
}

async function createStripeSubscriptionFromSavedPaymentMethod(stripeClient, input) {
  await ensurePaymentMethodAttached(stripeClient, input.paymentMethodId, input.stripeCustomerId);

  const configuredPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || "";
  const priceId = input.priceId || configuredPriceId;
  const subscriptionParams = {
    customer: input.stripeCustomerId,
    default_payment_method: input.paymentMethodId,
    collection_method: "charge_automatically",
    trial_end: nextBillingTimestamp(input.firstBillingDate),
    metadata: {
      source: input.source || "checkout-superior",
      source_payment_intent_id: input.paymentIntentId || "",
      customer_email: input.customerEmail,
      payment_method_id: input.paymentMethodId
    },
    items: [
      priceId
        ? { price: priceId }
        : {
            price_data: {
              currency: business.currency,
              unit_amount: input.amountCents,
              recurring: {
                interval: input.interval,
                interval_count: input.intervalCount
              },
              product_data: {
                name: input.description
              }
            }
          }
    ]
  };

  const subscription = await stripeClient.subscriptions.create(subscriptionParams, {
    idempotencyKey: input.paymentIntentId
      ? `subscription-from-pi-${input.paymentIntentId}`
      : `subscription-from-pm-${input.paymentMethodId}-${Date.now()}`
  });

  const profile = await upsertCustomerPaymentProfile({
    customerEmail: input.customerEmail,
    customerName: input.customerName || "",
    customerPhone: input.customerPhone || "",
    stripeCustomerId: input.stripeCustomerId,
    defaultPaymentMethodId: input.paymentMethodId,
    sourcePaymentIntentId: input.paymentIntentId || ""
  });

  return upsertSubscriptionRecord({
    customerProfileId: profile.id,
    customerEmail: input.customerEmail,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    defaultPaymentMethodId: input.paymentMethodId,
    sourcePaymentIntentId: input.paymentIntentId || "",
    priceId: priceId || "",
    amountCents: input.amountCents,
    currency: business.currency,
    interval: input.interval,
    intervalCount: input.intervalCount,
    description: input.description,
    status: subscription.status,
    currentPeriodStart: timestampFromStripe(subscription.current_period_start),
    currentPeriodEnd: timestampFromStripe(subscription.current_period_end)
  });
}

function requireSubscriptionAdmin(req) {
  const expected = process.env.SUBSCRIPTION_ADMIN_TOKEN;
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!expected || provided !== expected) {
    const error = new Error("Subscription admin token is required.");
    error.status = 401;
    throw error;
  }
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

      if (paymentIntent.customer && paymentIntent.payment_method) {
        const stripeCustomerId =
          typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer.id;
        const paymentMethodId =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method.id;

        await upsertCustomerPaymentProfile({
          customerEmail: paymentIntent.metadata.customer_email || paymentIntent.receipt_email || "",
          customerName: paymentIntent.metadata.customer_name || "",
          customerPhone: paymentIntent.metadata.customer_phone || "",
          stripeCustomerId,
          defaultPaymentMethodId: paymentMethodId,
          sourcePaymentIntentId: paymentIntent.id
        });
      }

      if (
        paymentIntent.metadata.subscription_requested === "true" &&
        paymentIntent.customer &&
        paymentIntent.payment_method
      ) {
        const stripeCustomerId =
          typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer.id;
        const paymentMethodId =
          typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method.id;

        await createStripeSubscriptionFromSavedPaymentMethod(stripe, {
          stripeCustomerId,
          paymentMethodId,
          paymentIntentId: paymentIntent.id,
          customerEmail: paymentIntent.receipt_email || paymentIntent.metadata.customer_email,
          customerName: paymentIntent.metadata.customer_name,
          customerPhone: paymentIntent.metadata.customer_phone || "",
          amountCents: Number(paymentIntent.metadata.subscription_amount_cents),
          interval: paymentIntent.metadata.subscription_interval,
          intervalCount: Number(paymentIntent.metadata.subscription_interval_count),
          description: paymentIntent.metadata.subscription_description,
          firstBillingDate: paymentIntent.metadata.subscription_first_billing_date || undefined,
          source: "checkout-payment-intent"
        });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object;
      await updateSubscriptionStatus(subscription.id, {
        status: subscription.status,
        currentPeriodStart: timestampFromStripe(subscription.current_period_start),
        currentPeriodEnd: timestampFromStripe(subscription.current_period_end)
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
    },
    recurring: recurringDefaults()
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
    const auth =
      parsed.paymentFlow === "ach" ? await appendAuthorization.get(parsed.authorizationId) : null;

    if (parsed.paymentFlow === "ach" && !auth) {
      return res.status(404).json({ error: "ACH authorization record was not found." });
    }

    const checkout = auth || parsed;
    const subscription = parsed.subscription?.enabled ? parsed.subscription : null;
    const saveForFutureCharges = shouldSavePaymentMethodsForFutureCharges() || Boolean(subscription);

    const stripeClient = requireStripe();
    const stripeCustomerId = saveForFutureCharges
      ? await getOrCreateStripeCustomer(stripeClient, checkout)
      : undefined;
    const subscriptionAmountCents = subscription?.amountCents || recurringDefaults().amountCents;
    const subscriptionDescription = subscription?.description || recurringDefaults().label;
    const paymentIntentParams = {
      amount: auth ? auth.totalCents : parsed.amountCents + feeCents(),
      currency: business.currency,
      receipt_email: checkout.customerEmail,
      description: checkout.description,
      customer: stripeCustomerId,
      setup_future_usage: saveForFutureCharges ? "off_session" : undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        payment_flow: parsed.paymentFlow,
        authorization_id: auth?.id || "",
        authorization_version: auth?.authorizationVersion || "",
        customer_name: checkout.customerName,
        customer_email: checkout.customerEmail,
        customer_phone: checkout.customerPhone || "",
        withdrawal_date: checkout.withdrawalDate,
        future_usage_requested: saveForFutureCharges ? "true" : "false",
        subscription_requested: subscription ? "true" : "false",
        subscription_amount_cents: subscription ? String(subscriptionAmountCents) : "",
        subscription_interval: subscription?.interval || recurringDefaults().interval,
        subscription_interval_count: subscription
          ? String(subscription.intervalCount)
          : String(recurringDefaults().intervalCount),
        subscription_description: subscription ? subscriptionDescription : "",
        subscription_first_billing_date: subscription?.firstBillingDate || ""
      }
    };

    if (parsed.paymentFlow === "standard") {
      paymentIntentParams.excluded_payment_method_types = ["us_bank_account"];
    } else {
      paymentIntentParams.payment_method_options = {
        us_bank_account: {
          verification_method: "automatic"
        }
      };
    }

    Object.keys(paymentIntentParams).forEach((key) => {
      if (paymentIntentParams[key] === undefined) delete paymentIntentParams[key];
    });

    const paymentIntent = await stripeClient.paymentIntents.create(paymentIntentParams);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/subscriptions/from-purchase", async (req, res, next) => {
  try {
    requireSubscriptionAdmin(req);
    const parsed = existingPurchaseSubscriptionSchema.parse(req.body);
    const stripeClient = requireStripe();

    let paymentIntent = null;
    if (parsed.paymentIntentId) {
      paymentIntent = await stripeClient.paymentIntents.retrieve(parsed.paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        return res.status(409).json({ error: "PaymentIntent must be succeeded before subscription creation." });
      }
    }

    const stripeCustomerId =
      parsed.stripeCustomerId ||
      (typeof paymentIntent?.customer === "string"
        ? paymentIntent.customer
        : paymentIntent?.customer?.id) ||
      (parsed.customerEmail
        ? await getOrCreateStripeCustomer(stripeClient, {
            customerEmail: parsed.customerEmail,
            customerName: parsed.customerName || "",
            customerPhone: parsed.customerPhone || ""
          })
        : "");

    const paymentMethodId =
      parsed.paymentMethodId ||
      (typeof paymentIntent?.payment_method === "string"
        ? paymentIntent.payment_method
        : paymentIntent?.payment_method?.id);

    if (!stripeCustomerId || !paymentMethodId) {
      return res.status(400).json({
        error: "Could not infer stripeCustomerId and paymentMethodId. Provide both values or a saved successful PaymentIntent."
      });
    }

    const customerEmail = parsed.customerEmail || paymentIntent?.receipt_email || "";
    if (!customerEmail) {
      return res.status(400).json({ error: "customerEmail is required when it cannot be inferred from PaymentIntent." });
    }

    const record = await createStripeSubscriptionFromSavedPaymentMethod(stripeClient, {
      stripeCustomerId,
      paymentMethodId,
      paymentIntentId: parsed.paymentIntentId || "",
      customerEmail,
      customerName: parsed.customerName || paymentIntent?.metadata?.customer_name || "",
      customerPhone: parsed.customerPhone || paymentIntent?.metadata?.customer_phone || "",
      priceId: parsed.priceId,
      amountCents: parsed.amountCents || Number(paymentIntent?.amount || recurringDefaults().amountCents),
      interval: parsed.interval,
      intervalCount: parsed.intervalCount,
      description: parsed.description,
      firstBillingDate: parsed.firstBillingDate,
      source: "admin-existing-purchase"
    });

    res.status(201).json({
      subscriptionId: record.stripeSubscriptionId,
      status: record.status,
      customerId: record.stripeCustomerId,
      paymentMethodId: record.defaultPaymentMethodId
    });
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

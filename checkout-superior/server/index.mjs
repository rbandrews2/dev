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
  processWebhookOnce,
  databaseReadiness,
  upsertCustomerPaymentProfile,
  upsertSubscriptionRecord
} from "./store.mjs";

import { processStripeEvent, subscriptionPeriods } from "./webhook.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4242);
const isProduction = process.env.NODE_ENV === "production";

const stripeKey = process.env.STRIPE_RESTRICTED_KEY || process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-04-22.dahlia" })
  : null;

const business = {
  name: "Luxury Choice Inc.",
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
  priceId: z.string().trim().min(1).max(200).optional(),
  requestId: z.string().uuid().optional(),
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

function nextBillingTimestamp(firstBillingDate, referenceTimestamp) {
  if (!firstBillingDate && !referenceTimestamp) throw Object.assign(new Error("A fixed first billing date is required."), { status: 400 });
  const date = firstBillingDate ? new Date(`${firstBillingDate}T12:00:00Z`) : new Date(referenceTimestamp * 1000);
  if (!firstBillingDate) date.setMonth(date.getMonth() + 1);
  return Math.floor(date.getTime() / 1000);
}

function timestampFromStripe(value) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function getOrCreateStripeCustomer(stripeClient, checkout) {
  const existingProfile = await getCustomerPaymentProfileByEmail(checkout.customerEmail);
  if (existingProfile?.stripeCustomerId) return existingProfile.stripeCustomerId;

  const email = checkout.customerEmail.trim().toLowerCase();
  const matches = await stripeClient.customers.list({email, limit: 100});
  const customer = matches.data.find(item => item.metadata?.source === 'checkout-superior') ||
    await stripeClient.customers.create({email, metadata: {source: 'checkout-superior'}}, {
      idempotencyKey: `checkout-customer-${crypto.createHash('sha256').update(email).digest('hex')}`
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
  const operationKey = input.paymentIntentId || input.requestId;
  if (!operationKey) throw Object.assign(new Error("requestId is required when no PaymentIntent is supplied."), { status: 400 });
  let existingSubscription;
  for await (const candidate of stripeClient.subscriptions.list({customer: input.stripeCustomerId, status: 'all', limit: 100})) {
    if (candidate.metadata?.source_payment_intent_id === input.paymentIntentId && input.paymentIntentId ||
        candidate.metadata?.checkout_operation_id === operationKey) { existingSubscription = candidate; break; }
  }
  await ensurePaymentMethodAttached(stripeClient, input.paymentMethodId, input.stripeCustomerId);

  const configuredPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || "";
  const priceId = input.priceId || configuredPriceId;
  const price = priceId ? await stripeClient.prices.retrieve(priceId) : null;
  if (price && (!price.active || !price.recurring || !price.unit_amount)) {
    throw Object.assign(new Error('The selected recurring price is unavailable.'), {status: 400});
  }
  if (price) {
    input.amountCents = price.unit_amount;
    input.interval = price.recurring.interval;
    input.intervalCount = price.recurring.interval_count;
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents < 50 || !['day','week','month','year'].includes(input.interval)) {
    throw Object.assign(new Error('Invalid recurring payment terms.'), {status: 400});
  }
  const product = !priceId ? await stripeClient.products.create({ name: input.description },
    {idempotencyKey: `checkout-product-${operationKey}`}) : null;
  const subscriptionParams = {
    customer: input.stripeCustomerId,
    default_payment_method: input.paymentMethodId,
    collection_method: "charge_automatically",
    trial_end: nextBillingTimestamp(input.firstBillingDate, input.referenceTimestamp),
    metadata: {
      source: input.source || "checkout-superior",
      checkout_operation_id: operationKey,
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
              product: product.id
            }
          }
    ]
  };

  if (!existingSubscription && subscriptionParams.trial_end <= Math.floor(Date.now()/1000)) {
    throw Object.assign(new Error('The agreed billing date has passed. Review this subscription before retrying.'), {status: 409});
  }
  const subscription = existingSubscription || await stripeClient.subscriptions.create(subscriptionParams, {
    idempotencyKey: input.paymentIntentId
      ? `subscription-from-pi-${input.paymentIntentId}`
      : `subscription-from-request-${operationKey}`
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
    currency: price?.currency || business.currency,
    interval: input.interval,
    intervalCount: input.intervalCount,
    description: input.description,
    status: subscription.status,
    ...subscriptionPeriods(subscription)
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

    const result = await processWebhookOnce(event, () => processStripeEvent(event, {
      getAuthorization: appendAuthorization.get,
      markPaid: markAuthorizationPaid,
      upsertProfile: upsertCustomerPaymentProfile,
      upsertSubscription: upsertSubscriptionRecord,
      retrieveSubscription: id => stripe.subscriptions.retrieve(id),
      createSubscription: input => createStripeSubscriptionFromSavedPaymentMethod(stripe, input)
    }));
    res.json({ received: true, ...result });
  }
);

app.use(express.json({ limit: "32kb" }));

app.get('/api/health/live', (_req, res) => res.json({ok: true}));
app.get('/api/health/ready', async (_req, res, next) => {
  try { await databaseReadiness(); res.json({ok: true}); } catch (error) { next(error); }
});

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
    if (parsed.withdrawalDate !== new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({error: 'This checkout initiates payment today. Future debit scheduling is not available.'});
    }
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
    if (auth && auth.withdrawalDate > new Date().toISOString().slice(0, 10)) {
      return res.status(409).json({error: 'This authorization has a future debit date; payment cannot be initiated yet.'});
    }
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
        source: "checkout-superior",
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
      requestId: parsed.requestId,
      referenceTimestamp: paymentIntent?.created,
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
  const errorId = crypto.randomUUID();
  console.error(`[checkout-error:${errorId}]`, {
    status,
    message: error.message,
    code: error.code,
    stack: error.stack
  });

  const message =
    error instanceof z.ZodError
      ? "Please check the authorization form and try again."
      : status >= 500
        ? error.publicMessage ||
          "Checkout is temporarily unavailable. Please try again shortly or contact support if the problem continues."
        : error.message || "Unexpected checkout error.";

  res.status(status).json({ error: message, errorId });
});

const distPath = path.resolve(__dirname, "../dist");
if (isProduction || existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(port, () => {
  console.log(`Luxury Choice Inc. checkout server listening on http://localhost:${port}`);
});

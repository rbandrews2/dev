import { createHmac, timingSafeEqual } from 'node:crypto';

const env = (key) => Netlify.env.get(key);

const stripeGet = async (path, secretKey) => {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Stripe request failed.');
  }

  return data;
};

const verifyStripeSignature = (payload, signatureHeader, secret) => {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );

  if (!parts.t || !parts.v1) return false;

  const expected = createHmac('sha256', secret)
    .update(`${parts.t}.${payload}`)
    .digest('hex');

  const received = Buffer.from(parts.v1, 'hex');
  const calculated = Buffer.from(expected, 'hex');

  return received.length === calculated.length && timingSafeEqual(received, calculated);
};

const supabaseRequest = async (path, options = {}) => {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message ?? 'Supabase request failed.');
  }
  return data;
};

const upsertBilling = async ({
  companyId,
  customerId,
  subscriptionId,
  productId,
  status,
  currentPeriodEnd,
}) => {
  if (!companyId) return;

  await supabaseRequest('/company_billing_2?on_conflict=company_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      company_id: companyId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_product_id: productId || 'prod_USsnAqnFjc2KIa',
      status,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
    }),
  });
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed.', { status: 405 });
  }

  const stripeSecretKey = env('STRIPE_SECRET_KEY');
  const webhookSecret = env('STRIPE_WEBHOOK_SECRET');
  const payload = await req.text();

  if (!verifyStripeSignature(payload, req.headers.get('stripe-signature'), webhookSecret)) {
    return new Response('Invalid signature.', { status: 400 });
  }

  const event = JSON.parse(payload);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const subscription = session.subscription
        ? await stripeGet(`/subscriptions/${session.subscription}`, stripeSecretKey)
        : null;

      await upsertBilling({
        companyId: session.client_reference_id || session.metadata?.company_id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        productId: session.metadata?.product_id,
        status: subscription?.status ?? 'active',
        currentPeriodEnd: subscription?.current_period_end,
      });
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object;
      await upsertBilling({
        companyId: subscription.metadata?.company_id,
        customerId: subscription.customer,
        subscriptionId: subscription.id,
        productId: subscription.metadata?.product_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      });
    }
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response('ok');
};

export const config = {
  path: '/api/stripe-webhook',
  method: ['POST'],
};

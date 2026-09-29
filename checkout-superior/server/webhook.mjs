export function subscriptionPeriods(subscription) {
  const items = subscription.items?.data || [];
  const starts = items.map(item => item.current_period_start).filter(Number.isFinite);
  const ends = items.map(item => item.current_period_end).filter(Number.isFinite);
  return {
    currentPeriodStart: starts.length ? new Date(Math.min(...starts) * 1000).toISOString() : null,
    currentPeriodEnd: ends.length ? new Date(Math.min(...ends) * 1000).toISOString() : null
  };
}

const idOf = value => typeof value === 'string' ? value : value?.id;

// Dependencies are explicit so retries and unrelated account events can be tested without charging.
export async function processStripeEvent(event, deps) {
  const object = event.data.object;
  if (event.type === 'payment_intent.succeeded') {
    const metadata = object.metadata || {};
    const auth = metadata.authorization_id ? await deps.getAuthorization(metadata.authorization_id) : null;
    const legacyCheckout = ['standard', 'ach'].includes(metadata.payment_flow) && metadata.customer_email;
    if (metadata.authorization_id && !auth) throw new Error('Referenced authorization is missing');
    if (!auth && metadata.source !== 'checkout-superior' && !legacyCheckout) return { ignored: true };
    if (auth && (auth.totalCents !== object.amount_received || auth.business.currency !== object.currency ||
        (auth.paymentIntentId && auth.paymentIntentId !== object.id))) {
      throw new Error('Payment does not match its authorization');
    }
    const email = (auth?.customerEmail || metadata.customer_email || object.receipt_email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Payment customer email is missing or invalid');
    const customer = idOf(object.customer);
    const method = idOf(object.payment_method);
    if (auth) await deps.markPaid(auth.id, {
      paymentIntentId: object.id, amountReceived: object.amount_received,
      paidAt: new Date(event.created * 1000).toISOString()
    });
    if (customer && method) await deps.upsertProfile({
      customerEmail: email, customerName: auth?.customerName || metadata.customer_name || '',
      customerPhone: auth?.customerPhone || metadata.customer_phone || '',
      stripeCustomerId: customer, defaultPaymentMethodId: method, sourcePaymentIntentId: object.id
    });
    if (metadata.subscription_requested === 'true') {
      if (!customer || !method) throw new Error('Subscription payment method is missing');
      await deps.createSubscription({
        stripeCustomerId: customer, paymentMethodId: method, paymentIntentId: object.id,
        customerEmail: email, customerName: metadata.customer_name || '',
        customerPhone: metadata.customer_phone || '',
        amountCents: Number(metadata.subscription_amount_cents), interval: metadata.subscription_interval,
        intervalCount: Number(metadata.subscription_interval_count), description: metadata.subscription_description,
        firstBillingDate: metadata.subscription_first_billing_date || undefined,
        referenceTimestamp: object.created, source: 'checkout-payment-intent'
      });
    }
    return { processed: true };
  }
  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    if (!['checkout-superior', 'checkout-payment-intent', 'admin-existing-purchase'].includes(object.metadata?.source)) {
      return { ignored: true };
    }
    // Retrieve under the per-customer transaction lock; delivery order is not authoritative.
    const current = await deps.retrieveSubscription(object.id);
    const price = current.items?.data?.[0]?.price;
    if (!price?.unit_amount || !price.recurring) throw new Error('Unsupported subscription price');
    const customer = idOf(current.customer);
    const email = current.metadata?.customer_email;
    if (!email) throw new Error('Subscription customer email is missing');
    const profile = await deps.upsertProfile({ customerEmail: email, stripeCustomerId: customer,
      defaultPaymentMethodId: idOf(current.default_payment_method) || '' });
    await deps.upsertSubscription({
      customerProfileId: profile.id, customerEmail: email, stripeCustomerId: customer,
      stripeSubscriptionId: current.id, defaultPaymentMethodId: idOf(current.default_payment_method) || '',
      sourcePaymentIntentId: current.metadata.source_payment_intent_id || '', priceId: price.id,
      amountCents: price.unit_amount, currency: price.currency,
      interval: price.recurring.interval, intervalCount: price.recurring.interval_count,
      description: price.nickname || 'Recurring consultation subscription', status: current.status,
      ...subscriptionPeriods(current)
    });
    return { processed: true };
  }
  return { ignored: true };
}

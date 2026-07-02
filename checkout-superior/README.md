# Superior Consultation Checkout

Secure checkout app for `checkout.superiorllc.org` with an explicit payment authorization step before Stripe payment collection.

## What It Supports

- Visa, Mastercard, American Express, eligible wallets, Cash App Pay, Google Pay, Samsung Pay where supported by Stripe, device, browser, and Dashboard settings.
- ACH debit with Stripe-hosted bank collection. The server requests automatic bank verification so eligible customers can use instant verification with micro-deposit fallback.
- Explicit authorization record with customer name, email, amount, withdrawal date, date/time, IP address, user agent, and electronic signature checkbox.
- Optional recurring billing opt-in that creates a Stripe Customer, saves the confirmed payment method for off-session use, and creates a Stripe Billing Subscription for future automatic charges.
- Payment summary, fee disclosure, loading states, payment errors, and a return confirmation page state through Stripe.

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add Stripe keys. Prefer a restricted key beginning with `rk_`.
4. Fix policy URLs before launch. The provided prompt had `htts://` typos.
5. Enable payment methods in the Stripe Dashboard for the connected account.
6. Provision the production database and run `server/schema.sql`.
7. Add the managed Postgres connection string as `DATABASE_URL`.
   - If using Supabase on Render, do not use the direct `db.<project>.supabase.co:5432` connection string unless your runtime supports IPv6. Use Supabase's IPv4-compatible Supavisor pooler connection string, or enable Supabase's IPv4 add-on, then set that value as `DATABASE_URL`.
8. Register the webhook endpoint:

```bash
https://checkout.superiorllc.org/api/webhooks/stripe
```

Subscribe at minimum to:

- `payment_intent.succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Development

```bash
npm run dev
```

Vite runs on `http://localhost:5174` and proxies `/api` to the Node server on `http://localhost:4242`.

## Production

```bash
npm run build
npm start
```

Serve behind HTTPS at `checkout.superiorllc.org`. Payment and authorization pages must only be delivered over TLS.

## Database

Use managed Postgres for production. Supabase Postgres or Neon are good fits for this app because they provide TLS, automated backups, point-in-time recovery options, managed patching, and low-latency hosting when placed in the same region as the app runtime.

Recommended production layout:

- App host: Render, Railway, Fly.io, Vercel serverless functions, or another HTTPS-capable Node runtime.
- Database host: Supabase or Neon managed Postgres in the same US region as the app host.
- Network/security: require SSL, store `DATABASE_URL` in the host secret manager, enable backups/PITR, and restrict database access to the app runtime where supported.
- Data boundary: store authorization, receipt, audit, and Stripe object IDs only. Do not store card numbers, bank account numbers, CVV, or raw Stripe webhook payloads with sensitive payment method details.

Apply the schema:

```bash
psql "$DATABASE_URL" -f server/schema.sql
```

If `DATABASE_URL` is not set, the server falls back to `data/authorizations.json` for local development only.

### Supabase Pooler Errors

If checkout shows a temporary-unavailable message and Render logs include:

```text
tenant/user postgres.<project-ref> not found
```

the Supabase pooler rejected the database identity. Check the `DATABASE_URL` in Render:

- Copy the connection string from the same Supabase project that owns the database.
- For Supabase pooler URLs, the username is usually `postgres.<project-ref>`.
- The pooler host must match the region/project shown in Supabase Connect settings.
- Use the database password, not the Supabase dashboard password.
- If the password was pasted into chat, logs, screenshots, or source files, rotate it and update Render.

After updating `DATABASE_URL`, redeploy or restart the Render Web Service and test checkout again.

## Compliance Notes

This code avoids collecting card or bank account numbers on your server by using Stripe-hosted Payment Element fields, reducing PCI exposure. For ACH/NACHA, keep authorization records for the required retention period, provide customer support contact information, and verify that the final authorization wording, cancellation process, fees, and timing comply with your state rules, card-network rules, and NACHA requirements.

The local JSON authorization store is a development fallback. Use the managed Postgres schema before processing live payments.

## Recurring Billing

Recurring billing uses Stripe Billing Subscriptions and saved Stripe PaymentMethods. The app stores only Stripe object IDs and audit metadata. Do not store card numbers, bank account numbers, CVV, or raw payment method details.

By default, checkout PaymentIntents are created with a Stripe Customer and `setup_future_usage=off_session` so Stripe can attach the confirmed payment method to the customer for later automatic billing. Set `SAVE_PAYMENT_METHODS_FOR_FUTURE_CHARGES=false` only if you are certain a checkout payment should never be reused for a later subscription or approved future charge.

Recommended Stripe setup:

- Create a Stripe Product and recurring Price, then set `STRIPE_SUBSCRIPTION_PRICE_ID=price_...`.
- Keep `SUBSCRIPTIONS_ENABLED=true` only after the subscription terms, cancellation process, and recurring authorization language are reviewed.
- Use a restricted API key with permissions for PaymentIntents, Customers, PaymentMethods, Subscriptions, Prices read, and Webhooks as needed.

To create a subscription for an existing customer who already made a purchase, call the admin endpoint with a server-side token. The PaymentIntent should be succeeded, and the PaymentMethod should be reusable/saved or attachable to the Stripe Customer.

```powershell
$body = @{
  paymentIntentId = "pi_replace_me"
  paymentMethodId = "pm_replace_me"
  customerEmail = "customer@example.com"
  customerName = "Customer Name"
  amountCents = 25000
  interval = "month"
  intervalCount = 1
  description = "Monthly consultation plan"
  firstBillingDate = "2026-07-09"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://checkout.superiorllc.org/api/admin/subscriptions/from-purchase" `
  -Headers @{ Authorization = "Bearer $env:SUBSCRIPTION_ADMIN_TOKEN" } `
  -ContentType "application/json" `
  -Body $body
```

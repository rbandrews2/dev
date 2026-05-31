# Superior Consultation Checkout

Secure checkout app for `checkout.superiorllc.org` with an explicit payment authorization step before Stripe payment collection.

## What It Supports

- Visa, Mastercard, American Express, eligible wallets, Cash App Pay, Google Pay, Samsung Pay where supported by Stripe, device, browser, and Dashboard settings.
- ACH debit with Stripe-hosted bank collection. The server requests automatic bank verification so eligible customers can use instant verification with micro-deposit fallback.
- Explicit authorization record with customer name, email, amount, withdrawal date, date/time, IP address, user agent, and electronic signature checkbox.
- Payment summary, fee disclosure, loading states, payment errors, and a return confirmation page state through Stripe.

## Setup

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Add Stripe keys. Prefer a restricted key beginning with `rk_`.
4. Fix policy URLs before launch. The provided prompt had `htts://` typos.
5. Enable payment methods in the Stripe Dashboard for the connected account.
6. Provision the production database and run `server/schema.sql`.
7. Add the managed Postgres connection string as `DATABASE_URL`.
8. Register the webhook endpoint:

```bash
https://checkout.superiorllc.org/api/webhooks/stripe
```

Subscribe at minimum to `payment_intent.succeeded`.

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

## Compliance Notes

This code avoids collecting card or bank account numbers on your server by using Stripe-hosted Payment Element fields, reducing PCI exposure. For ACH/NACHA, keep authorization records for the required retention period, provide customer support contact information, and verify that the final authorization wording, cancellation process, fees, and timing comply with your state rules, card-network rules, and NACHA requirements.

The local JSON authorization store is a development fallback. Use the managed Postgres schema before processing live payments.

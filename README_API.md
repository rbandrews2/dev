# Work Zone OS API Integrations (Activation Guide)

![Work Zone OS](public/wzos-logo.svg)

This guide covers the current integration surface in Work Zone OS and the secret material required to move from UI scaffolding to production-ready integrations for admin and owner accounts.

## 1) Prerequisites
1. Node 18+ installed.
2. Repo cloned locally.
3. Dependencies installed with `npm install`.
4. Browser env values set in `.env.local` or `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEYS`
   - `VITE_INTEGRATIONS_ENABLED=true`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`
5. Server-side secrets set in Supabase function secrets or your hosting secret manager:
   - `SUPABASE_SECRET_KEYS`
   - `PUBLIC_SITE_URL`
   - `WZOS_DOWNLOAD_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_WZOS_CORE`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `WZOS_WEBHOOK_SIGNING_SECRET`
   - `WZOS_VAULT_MASTER_KEY`
   - Provider OAuth secrets such as `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_TIME_CLIENT_SECRET`, `GOOGLE_DRIVE_CLIENT_SECRET`, and `MICROSOFT_GRAPH_CLIENT_SECRET`

## 2) Secret files and generators
1. Use [src/ENV.example](/c:/Users/rband/dev/src/ENV.example) for browser config.
2. Use [supabase/functions/.env.example](/c:/Users/rband/dev/supabase/functions/.env.example) for server-side integration secrets.
3. Generate first-party secrets with `node scripts/generate-integration-secrets.mjs`.
4. Do not place private signing, vault, OAuth client secret, webhook verifier, or Supabase secret key values in `VITE_` variables.

## 3) Current implementation status
1. The integrations UI exists at [src/pages/integrations/Index.tsx](/c:/Users/rband/dev/src/pages/integrations/Index.tsx).
2. Owner/admin secret readiness is exposed through the `integrations.status` action in [supabase/functions/owner-admin/index.ts](/c:/Users/rband/dev/supabase/functions/owner-admin/index.ts).
3. The owner console now includes an Integrations tab at [src/pages/owner/tabs/IntegrationsStatusTab.tsx](/c:/Users/rband/dev/src/pages/owner/tabs/IntegrationsStatusTab.tsx).
4. The in-app Vault at [src/pages/vault/Index.tsx](/c:/Users/rband/dev/src/pages/vault/Index.tsx) now uses server-side encrypted storage through `owner-admin` actions and should be provisioned with [src/sql/vault_tables.sql](/c:/Users/rband/dev/src/sql/vault_tables.sql).
5. The Stripe purchase flow now uses Supabase Edge Functions:
   - `create-checkout-session`
   - `stripe-webhook`
   - `purchase-status`
   - `activate`
6. Provision the licensing tables from [src/sql/commerce_activation_tables.sql](/c:/Users/rband/dev/src/sql/commerce_activation_tables.sql) before enabling production checkout.

## 4) Required integration secrets
### Core
- `WZOS_WEBHOOK_SIGNING_SECRET`: HMAC signing for outbound webhooks and signed internal API calls.
- `WZOS_VAULT_MASTER_KEY`: server-side encryption key for stored provider tokens and secret material.
- `SUPABASE_SECRET_KEYS`: required for owner/admin privileged operations.

### Bookkeeping
- `QUICKBOOKS_CLIENT_ID`
- `QUICKBOOKS_CLIENT_SECRET`
- `QUICKBOOKS_WEBHOOK_VERIFIER`
- `QUICKBOOKS_REDIRECT_URI`

### Timekeeping
- `QUICKBOOKS_TIME_CLIENT_ID`
- `QUICKBOOKS_TIME_CLIENT_SECRET`
- `QUICKBOOKS_TIME_WEBHOOK_VERIFIER`
- `QUICKBOOKS_TIME_REDIRECT_URI`

### Storage
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `MICROSOFT_GRAPH_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI`

### Browser-visible config
- `VITE_INTEGRATIONS_ENABLED`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_API_KEY`

## 5) Provider handoff notes
1. QuickBooks Online is the recommended bookkeeping baseline.
2. QuickBooks Time is the recommended timekeeping baseline because it maps cleanly to crew-hour export use cases.
3. Google Drive is partially wired already through the owner Drive tab.
4. SharePoint and OneDrive should be implemented through Microsoft Graph with tenant-scoped OAuth.
5. Custom webhook delivery should be signed server-side with `WZOS_WEBHOOK_SIGNING_SECRET`, plus nonce and timestamp headers.

## 6) Verification flow
1. Run `npm run build` to verify the frontend bundle after configuration changes.
2. Run `node scripts/generate-integration-secrets.mjs` to generate first-party secret values.
3. Open the owner/admin console and use the Integrations tab to confirm which secrets are still missing.
4. Replace the placeholder TODOs in the integrations UI with backend OAuth and test handlers before considering the feature live.

## 7) Security notes
1. Rotate any live browser API keys that were committed or shared.
2. Restrict Google browser API keys by domain, API, and referrer.
3. Keep OAuth refresh tokens, client secrets, webhook verifiers, and Supabase secret keys server-side only.
4. Rotate `WZOS_WEBHOOK_SIGNING_SECRET` and `WZOS_VAULT_MASTER_KEY` on a schedule.
5. Add delivery retry, dead-letter handling, and audit trails before enabling customer-facing automation.

![Construction Hero](public/hero-construction.png)

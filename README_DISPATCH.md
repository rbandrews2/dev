# Work Zone OS – Dispatch Option (Motive Integration) Setup

![Work Zone OS](public/wzos-logo.svg)

This guide covers enabling the Dispatch module and preparing the Motive integration. The UI is present but locked by a feature gate. Follow the steps to activate and supply credentials securely.

## 1) Prerequisites
1. Node 18+ installed; dependencies installed: `npm install`
2. Base env values set (`.env.local` or `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEYS`
   - `VITE_WZOS_SIGNING_SECRET`
   - `VITE_WZOS_VAULT_SECRET`
3. Motive developer access: client ID, client secret, API base URL, and allowed redirect URLs (if using OAuth).

## 2) Enable the Dispatch feature flag
1. Open `.env.local`.
2. Ensure `VITE_FEATURE_DISPATCH=true` (already default in `src/ENV.example`).
3. Restart dev server: `npm run dev`
4. The **Dispatch** nav item will still show “Available upon activation” until credentials are present and your backend proxy is ready.

## 3) Add Motive credentials securely
1. Open **Vault** (`/vault`) and store:
   - `MOTIV_CLIENT_ID`
   - `MOTIV_CLIENT_SECRET`
   - `MOTIV_REDIRECT_URI` (if OAuth)
   - Any signing/verification secrets for webhooks.
2. Do **not** put client secrets in `VITE_` variables for production; keep them server-side.

## 4) Wire the backend/proxy
1. Create a server endpoint to exchange codes for tokens (if OAuth) or to store the Motive API key.
2. Add a proxy route that:
   - Attaches auth headers to Motive API calls.
   - Signs outbound requests with `VITE_WZOS_SIGNING_SECRET` (or server-side equivalent).
   - Enforces rate limits and logs errors for observability.
3. For webhooks, validate signatures from Motive and respond with 2xx quickly.

## 5) Connect the frontend
1. Point the Dispatch UI to your proxy endpoints (fetch work orders, vehicles, drivers, jobs).
2. Surface activation state in the UI once the proxy returns healthy responses.
3. Use toast notifications for connect/test outcomes to keep the experience clear.

## 6) Test the flow
1. Run `npm run dev` and navigate to **Dispatch**.
2. Trigger a test call (e.g., list vehicles/jobs) via your proxy; confirm a 200 response.
3. Verify webhook delivery (if enabled) by sending a sample event from Motive’s dev console.
4. Check logs for HMAC verification and latency.

## 7) Deploy
1. Set production secrets in your hosting platform’s secret manager (not in `VITE_`).
2. Redeploy the app and proxy together.
3. Re-test the Dispatch UI and webhook flows in production.

![Construction Hero](public/hero-construction.png)

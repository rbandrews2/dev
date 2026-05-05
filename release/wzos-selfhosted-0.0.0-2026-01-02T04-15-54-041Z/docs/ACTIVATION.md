# WZOS Activation & Licensing (Self-Hosted)

This flow keeps activation offline, ensures no secrets ship with the app, and requires a signed license before protected routes load.

## Publisher Setup (one-time)
1) Generate an RSA keypair for activation.
2) Set the public key in builds: `VITE_ACTIVATION_PUBLIC_KEY="<public-key-pem>"`.
3) Keep the private key offline. Use it only with the signer script below.

## Create an Activation Code (offline)
```bash
# Using a private key path (preferred)
ACTIVATION_PRIVATE_KEY_PATH=/path/to/private.pem \
npm run license:sign -- --org "Acme" --plan "pro" --seats 25 --valid-days 365

# Or provide a full payload from JSON
ACTIVATION_PRIVATE_KEY_PATH=/path/to/private.pem \
npm run license:sign -- --payload ./payload.json
```
Outputs: `<base64url(payload)>.<base64url(signature)>`.

Payload defaults (when not using `--payload`): `licenseId`, `org`, `contact`, `plan`, `seats`, `issuedAt`, `expiresAt`.

## Customer Activation (offline)
```bash
npm run activate -- --code "<payload.signature>" --output ./public/license.json
```
Then run/build the app with `VITE_ACTIVATION_PUBLIC_KEY` set. The app reads `public/license.json`, verifies the signature locally, and gates protected routes until valid.

## Runtime Behavior
- `LicenseGate` blocks protected routes if the signature check fails or `license.json` is missing.
- Set `VITE_LICENSE_OPTIONAL=true` only for local development (never in production) to bypass the gate.

## Build/CI Guard
- Run `npm run check:license` to fail builds when `VITE_ACTIVATION_PUBLIC_KEY` is missing or placeholder. Bypass locally with `ALLOW_MISSING_PUBLIC_KEY=1`.

## Security Notes
- Never commit `.env*`, private keys, or customer licenses.
- Activation and verification are offline-only; no activation data is transmitted.
- Ship a sanitized `ENV.example` only; customers must supply their own Supabase/API credentials.
- Support: customerservice@superiorllc.org | 540-793-9351

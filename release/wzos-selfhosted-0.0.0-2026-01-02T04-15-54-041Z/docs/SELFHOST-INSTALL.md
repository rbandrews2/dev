# WZOS Self-Host Install

Follow these steps to deploy a sanitized, offline-activated copy of WZOS.

## Prerequisites
- Node.js 18+ (20 recommended)
- Your Supabase URL and keys (anon + service role if needed for server workflows)
- Your activation public key (set as `VITE_ACTIVATION_PUBLIC_KEY`)
- A signed activation code (from your private signer)

## 1) Unpack the bundle
If you received a tarball:
```bash
tar -xzf wzos-selfhosted-<version>.tar.gz
cd wzos-selfhosted-<version>/
```

## 2) Configure environment
- Copy `ENV.example` to `.env` (or `.env.local/.env.production`) and fill in your org values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ACTIVATION_PUBLIC_KEY` (full PEM, public key only)
  - Optional: `VITE_LICENSE_OPTIONAL=true` **for local dev only**, never production.

## 3) Install deps & build
```bash
npm install
npm run check:license   # verifies public key is present
npm run build
```

## 4) Activate offline
Use the signed activation code from your private key:
```bash
npm run activate -- --code "<payload.signature>" --output ./public/license.json
```
No data is transmitted; verification happens locally in the browser against your public key.

## 5) Run
```bash
npm run preview   # or npm run dev for local development
```
Open the app and navigate to a protected route; it will pass the gate if `license.json` is valid.

## Support
customerservice@superiorllc.org | 540-793-9351

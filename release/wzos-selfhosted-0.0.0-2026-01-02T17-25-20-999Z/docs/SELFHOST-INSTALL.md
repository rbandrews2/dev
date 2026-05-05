# WZOS Self-Host Install

Follow these steps to deploy a sanitized copy of WZOS.

## Prerequisites
- Node.js 18+ (20 recommended)
- Your Supabase URL and keys (anon + service role if needed for server workflows)
- (Optional) Google Maps API key if you want maps features

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
  - `VITE_GOOGLE_MAPS_API_KEY` (optional)

## 3) Install deps & build
```bash
npm install
npm run build
```

## 4) Run
```bash
npm run preview   # or npm run dev for local development
```
Open the app and navigate to a protected route; activation is handled via your Supabase setup.

## Support
customerservice@superiorllc.org | 540-793-9351

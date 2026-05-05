# Work Zone OS - The Operating System For Road Crews

A comprehensive management platform for road construction teams. Work Zone OS provides a unified interface to manage work orders, equipment tracking, team performance, and safety training certifications.

## Features

- **Work Order Management** - Track and manage construction projects in real-time
- **Equipment Tracking** - Monitor fleet status, maintenance schedules, and utilization
- **Team Management** - Oversee crew members, hours, and certifications
- **Training & Certifications** - Complete safety courses with quizzes and certificate generation
- **Dashboard Analytics** - Real-time insights into operations and performance

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- React Router
- Recharts for analytics

## Getting Started

```bash
npm install
npm run dev
```

Visit http://localhost:5173 to view the application.

## Activation (self-hosted)

WZOS requires a signed activation license for protected routes.

- Set the public key for verification: `VITE_ACTIVATION_PUBLIC_KEY="<public-key-pem>"`.
- Generate an activation code (offline, with your private key): `npm run license:sign -- --org "Acme" --plan "pro" --seats 25 --valid-days 365`.
- Activate a copy (offline): `npm run activate -- --code "<payload.signature>" --output ./public/license.json`.
- Verify locally: run the app; it will block until `license.json` is valid. For local dev only, you can bypass with `VITE_LICENSE_OPTIONAL=true` (never set this in production).
- CI/build guard: `npm run check:license` fails if the public key is missing or placeholder. Bypass locally with `ALLOW_MISSING_PUBLIC_KEY=1`. In CI, set `VITE_ACTIVATION_PUBLIC_KEY` via secrets (see `.github/workflows/ci.yml`).

See `docs/ACTIVATION.md` for full details.

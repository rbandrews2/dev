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

## Deployment (self-hosted)

- Provide your Supabase project URL and anon key in `.env.production`.
- Install deps and build: `npm install && npm run build`.
- Start locally: `npm run preview` (or `npm run dev` for development).
- For user activation/licensing, use the Supabase-based 15-character codes already wired into the app.

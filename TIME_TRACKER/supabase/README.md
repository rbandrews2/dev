# Supabase Setup

This folder contains the backend schema for the Work Zone OS / Road Crew Time Clock PWA.

## Apply the Schema

Use either path:

1. Supabase dashboard: open SQL Editor, paste `migrations/202605050001_initial_schema.sql`, and run it.
2. Supabase CLI: link the project, then run:

```bash
supabase db push
```

## Required Environment Variables

Create `.env` from `.env.example` and set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Only use the anon/publishable browser key in the PWA. Never put a Supabase service role key in this frontend project.

## What the Migration Creates

- `profiles_2`
- `companies_2`
- `memberships_2`
- `job_sites_2`
- `work_types_2`
- `time_entries_2`
- `gps_markers_2`

It also enables Row Level Security, creates helper functions for company membership checks, auto-creates user profiles, auto-adds the company creator as `owner`, and seeds default work types for each new company.

`202605050002_multi_company_hardening.sql` adds the multi-company guardrails used by the PWA:

- one open time entry per employee per company
- time entries cannot be moved to another company or worker
- clock entries must reference a job site and work type from the same company
- GPS markers must match the same employee, company, and time entry
- updates must keep the employee assigned to the company

`202605050003_api_grants.sql` grants Supabase API access to the authenticated role. RLS still controls row-level access, but the grants make the `_2` tables visible to the client API schema cache.

`202605060001_billing_entitlements.sql` adds `company_billing_2`, which gates each company workspace behind Stripe billing. Netlify Functions update this table from Stripe Checkout/webhook events with the service role key.

## First-Run Flow

After a user signs in, the PWA checks `memberships_2`. If none exist, it prompts the user to create a company in `companies_2`. The database trigger then creates the owner membership and default work types.

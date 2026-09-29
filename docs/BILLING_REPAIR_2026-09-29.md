# Billing repair checkpoint — September 29, 2026

## Live and verified
- Render checkout service srv-d8ds4vfavr4c73831h90 is live at code revision 618dc8f9c0c226cef9b5fc1a5589b0b3ba0e11e2; deployment dep-datk44893c1s73aufslg.
- Stripe destination we_1Td1EVCTCYI3n5kZnwtbrK8D now targets https://checkout-eywd.onrender.com/api/webhooks/stripe. Events: payment_intent.succeeded and customer.subscription.created/updated/deleted. The Stripe-hosted checkout domain's DNS was preserved.
- One inspected historical event, evt_3UGvBcCTCYI3n5kZ1u9moOHj, was resent twice: HTTP 200, then HTTP 200 with duplicate:true. Exactly one durable event record exists. It was an unrelated account payment and was safely ignored for customer/subscription changes. No new charge, refund, or customer subscription was created by testing.
- Checkout database kcihppodrufegqfvmieh: RLS enabled; browser-role privileges revoked on all three payment tables and the new event ledger. PostgreSQL/service-role access preserved. Live server connection to the correct project verified. The September 22 connection error is historical, not currently reproducible.
- Checkout webhook writes and event marker use one transaction, with per-customer serialization, rollback on errors, and duplicate suppression. Subscription events retrieve current Stripe state and upsert missing records. Subscription period dates come from items.
- Recurring fallback uses Product IDs; retries use stable inputs/keys and look for existing Stripe subscriptions. Past-due initial billing schedules require review rather than silently charging immediately. Legacy recurring price IDs are accepted on the authenticated admin route.
- Missing durable production storage now fails closed; readiness checks database/ledger access. Render health check: /api/health/ready.
- Payment UI distinguishes received, processing and unconfirmed states, catches retrieval failures, and removes the false promise of future debit scheduling.
- Render build command: npm ci && node --test server/webhook.test.mjs && npm run build. Live build passed all nine tests, TypeScript/build, and npm audit with zero vulnerabilities after compatible lockfile updates.
- Core database ebzfbuqclkumncnugbvq: company/phone purchase columns added. Atomic purchase event routine handles pending/paid/async failure, deduplication, and stale failure protection. Synthetic SQL tests rolled back without residual purchase rows.
- Core stripe-webhook version 39 uses Stripe signature authentication (verify_jwt=false), returns 500 on processing failure, and rejects absent/invalid signatures with 400. No Stripe destination was redirected to this separate Core function; its external routing/fulfillment still needs reconciliation.
- Core create-checkout-session version 42 rejects unsupported SKUs instead of charging Core while labeling Enterprise. Contact validation added. Negative live test returns 400; purchase-status nonexistent lookup now returns expected 404 instead of missing-column error.
- Core privileged routines: timesheet report requires caller admin/owner in the same organization; organization creation binds caller identity; work-type seeding is server-only. Anonymous/unauthorized denial verified. Full legitimate cross-tenant fixture suite remains to be added.
- Checkout post-repair security advisor no longer reports RLS-disabled errors. Its server-only no-policy information is intentional.
- Netlify signed-in browser inspected: app.superiorllc.org project workzoneos was manually deployed via Netlify Drop on May 8. No Netlify artifact was replaced. Connector still requires reauthentication.

## Deployment control
Render disabled automatic deployments when the exact repair commit was selected. Keep this protection until the repaired code is on main and the normal deployment workflow is deliberately restored. Do not deploy the old main revision over the repair.

## Remaining audit work
This is the first verified repair batch, not closure of all 34 original findings.
1. Reconcile the full failed-delivery backlog against purchases, customer records and entitlements before batch resend. Only one inspected event was retried.
2. Complete activation/code/email fulfillment and atomic activation redemption. Purchase status alone is not a license entitlement.
3. Add durable checkout request/PaymentIntent idempotency and prevent authorization reuse. Webhook deduplication does not solve creation retries.
4. Enforce approved edition prices server-side; resolve configured recurring-price display/consent differences. Proposed Core/Enterprise prices remain unpublished.
5. Review duplicate-email customer reconciliation; current normalization and stable customer creation reduce races but do not merge existing duplicate Stripe customers automatically.
6. Repair schedule-sync tenant authorization and reconcile remaining legacy webhook destinations.
7. Review remaining Core function grants/search paths, tenant policies, password protection and workload-specific performance advisories.
8. Publish/identify the real refund policy and reconcile legal/trading identity. https://superiorllc.org/refund and https://workzoneos.org/refund both returned 404; do not invent a replacement policy.
9. Full sandbox purchase-to-activation and renewal/failure/cancellation acceptance remains outstanding. No live payment was used as a test.

Evidence and original detailed audit are preserved locally under .local-data/checkout-audit-20260928 in the Enterprise Gemma v2 workspace. Those ignored evidence files are not GitHub-backed. This checkpoint and repair code/migrations are in the dev repository.

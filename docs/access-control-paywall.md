# Work Zone OS Access Control And Stripe Paywall

## Entitlement Model

Work Zone OS access is organization-based. A Stripe purchase creates one activation code, and one activation code can create one organization.

- Marketing site starts Stripe Checkout through `create-checkout-session`.
- Stripe webhook verifies `checkout.session.completed` with the Stripe signature.
- Webhook generates a random 15-character activation code, stores only its SHA-256 hash in `activation_codes`, and emails/displays the plaintext code through the purchase delivery flow.
- During app onboarding, the first admin enters the code in the organization creation form.
- `create_organization_with_owner` validates and consumes the code server-side, creates the organization, stores `organizations.activation_code_id`, and creates the owner membership.
- Every admin/member is linked to the paid entitlement through `organization_members.organization_id`.

## Enforcement Points

The browser is only a convenience layer. The security boundary is Supabase:

- App routes require authentication.
- Authenticated users without an organization are redirected to `/organization`.
- Organization creation requires a valid unused access code.
- The database allows only one `activation_code_id` per organization and only one `redeemed_organization_id` per activation code.
- Additional organizations require additional Stripe purchases because the code is consumed when the organization is created.

## Operational Notes

Apply SQL in this order:

1. `src/sql/commerce_activation_tables.sql`
2. `src/sql/organization_onboarding_fix.sql`
3. `src/sql/organization_access_code_gate.sql`

Stripe Checkout should remain hosted Checkout for PCI simplicity. Keep Stripe secret keys, webhook secrets, Resend keys, and Supabase service-role keys in server-side environment variables only.

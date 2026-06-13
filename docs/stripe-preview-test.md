# Stripe test-mode validation on an isolated preview

Purpose: complete a full **Checkout** + **Connect onboarding** flow from a browser
against an isolated Vercel **preview**, with Stripe in **test mode**, **without
touching production**. This branch exists only to spin up that preview; it is not
meant to merge.

## Guardrails
- All Stripe/test env vars are scoped to the **Preview** environment only.
- **Production env is never changed**, payments stay disabled in production, and
  **no live (`sk_live_…`) keys** are used.
- The preview uses a **separate test database**, not the production Neon DB.

## Preview environment variables (Vercel → Settings → Environment Variables, target = Preview only)
| Variable | Value |
| --- | --- |
| `PAYMENTS_ENABLED` | `true` |
| `STRIPE_SECRET_KEY` | your `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint (added after the URL exists) |
| `PLATFORM_FEE_BPS` | `1500` |
| `PAYOUT_HOLD_HOURS` | `0` |
| `CRON_SECRET` | (generated; supplied separately) |
| `DATABASE_URL` | the **test** Neon branch pooled connection string (Preview scope only) |
| `EMAIL_FORCE_SEND` | `1` (optional, to send real invite emails) |

## Test database
Create a Neon **branch** (or separate DB), copy its **pooled** connection string,
and set it as `DATABASE_URL` for the **Preview** environment only. Do not change
the Production `DATABASE_URL`.

## Stripe webhook (test mode)
Endpoint URL: `<preview-url>/api/webhooks/stripe`. Events:
`checkout.session.completed`, `checkout.session.expired`, `account.updated`
(enable "listen to events on connected accounts"). Copy the signing secret into
`STRIPE_WEBHOOK_SECRET`.

## End-to-end test
1. **Connect onboarding** — as a paid coach: dashboard → "Connect payouts" →
   Express test onboarding (test bank `110000000` / `000123456789`) → "Payouts: Active".
2. **Checkout** — as a student: book that coach → card `4242 4242 4242 4242` →
   `/booking/success` shows "You're booked!"; booking is `CONFIRMED/PAID/HELD`.
3. **Payout release** — after the session end time passes (hold = 0h), call
   `/api/cron/release-payouts` with the `CRON_SECRET` bearer header → a Stripe
   transfer is created and the booking flips to `RELEASED`. (Vercel Cron runs
   only on production, so on the preview this is triggered manually.)

## Teardown
Close this PR / delete the branch, and remove the Preview-scoped env vars, when
testing is complete.

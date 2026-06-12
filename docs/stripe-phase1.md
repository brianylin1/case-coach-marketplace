# Stripe payments — Phase 1 (Option B: hold funds until after the session)

Status: **implemented behind `PAYMENTS_ENABLED` (default off). Not yet enabled in
production.** With the flag off the app behaves exactly as the simulated MVP.

## What it does

- Students pay at booking via **Stripe Checkout** (hosted; we never see card data).
- A booking is **held** (`PENDING_PAYMENT`) until payment succeeds, then confirmed.
- The charge settles to the **Down to Case platform balance** (separate charges:
  no destination/application fee at charge time).
- The coach's share is **transferred after the session** + a hold window, by a
  daily cron — so pre-session cancellations are a clean refund, never a reversal.
- Coaches onboard once via **Stripe Connect Express**; a paid coach is bookable
  only when payouts are enabled. Pro bono ($0) coaches never touch Stripe.

## Money flow

`computeSplit(rate)` (in `lib/payments.ts`) splits the whole-USD rate into cents:
the student is charged the full rate; `PLATFORM_FEE_BPS` (default 1500 = 15%) is
kept by the platform; the remainder is the coach share. Stripe's processing fee
comes out of the platform's cut.

## Lifecycle

1. `POST /api/bookings` (paid coach) → create `PENDING_PAYMENT` hold + Checkout
   session (`transfer_group = booking_<id>`, 30-min expiry) → returns `checkoutUrl`.
2. `checkout.session.completed` webhook → `CONFIRMED` + `PAID`, store
   PaymentIntent/charge, `payoutStatus = HELD`, `payoutReleaseAfter = sessionEnd
   + PAYOUT_HOLD_HOURS`, send the invite email/ICS.
3. `checkout.session.expired` webhook (or stale-hold reclaim) → delete the hold.
4. Daily `GET /api/cron/release-payouts` → `transfers.create` (coach share,
   `source_transaction` = the charge) for due `HELD` bookings → `RELEASED`.
   Stripe then pays the coach's bank on its normal schedule.

## Environment variables

| Var | Purpose |
| --- | --- |
| `PAYMENTS_ENABLED` | Master switch. `false`/unset = simulated MVP behavior. |
| `STRIPE_SECRET_KEY` | `sk_test_…` in test mode, `sk_live_…` in production. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/webhooks/stripe`. |
| `PLATFORM_FEE_BPS` | Platform take rate in basis points (default 1500). |
| `PAYOUT_HOLD_HOURS` | Hours after session end before release (default 24). |
| `CRON_SECRET` | Bearer token Vercel Cron sends to the release endpoint. |

## Rollout (test mode first)

1. Set the env vars with **test** keys; create Connect + webhook in the Stripe
   test dashboard (event types: `checkout.session.completed`,
   `checkout.session.expired`, `account.updated`).
2. Deploy with `PAYMENTS_ENABLED=false` (dark). Schema is additive.
3. Test E2E: onboard a test coach (Express), book as a student, pay with card
   `4242 4242 4242 4242`, confirm the booking flips to CONFIRMED and the invite
   sends. Use `stripe listen` locally to forward webhooks.
4. Verify the release cron: set a booking's `payoutReleaseAfter` in the past and
   hit `/api/cron/release-payouts` with the `Authorization: Bearer <CRON_SECRET>`
   header; confirm a test-mode transfer is created and the row goes `RELEASED`.
5. Switch to **live** keys, configure the live webhook + Connect, onboard the
   real coach, then flip `PAYMENTS_ENABLED=true`. Watch the Stripe webhook log
   and the first payout release.

## In scope (Phase 1)

Student Checkout, Connect Express onboarding, held funds, delayed payout via
cron, the three webhooks, bookable gating, success/cancel pages.

## Out of scope (later)

Refund tooling, cancellation workflows, dispute/chargeback handling, "mark
complete/no-show" controls, instant/manual payout controls, admin dashboards,
analytics, multi-currency, coupons, subscriptions. (Holding funds until after
the session makes a future refund flow a simple refund from platform balance.)

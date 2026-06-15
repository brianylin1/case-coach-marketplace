# Stripe go-live runbook (Phase A)

Goal: reach a state where we can **safely flip `PAYMENTS_ENABLED=true` in production**.
Until every section here is done, payments stay **OFF** (the app runs the simulated
MVP path). This covers the two unvalidated flows (**webhook**, **payout cron**), the
required **test-data cleanup**, and the **live cutover**.

> **Two things to keep in mind throughout:**
> 1. **Previews share the production Neon DB** (PROJECT_STATE §3). Any booking/coach
>    you create during test-mode validation on a preview is written to the **prod DB**,
>    so it must be cleaned up before go-live (§3). Prefer validating **locally** against
>    a local Postgres to avoid polluting prod.
> 2. Confirmation has **two paths** — the Stripe **webhook** and the success-page
>    **reconcile-on-return** (`/api/bookings/[id]/status` → `reconcileBooking`). Only the
>    reconcile path has been exercised. The tests below **isolate the webhook** so we
>    prove it works on its own (the "paid, then closed the tab" case).

---

## 0. Test-mode environment

Set these for a **local** run (`npm run dev`) or a preview, using **test** keys:

| Var | Value |
| --- | --- |
| `PAYMENTS_ENABLED` | `true` |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (from `stripe listen`, or the test webhook endpoint) |
| `PLATFORM_FEE_BPS` | `1500` |
| `PAYOUT_HOLD_HOURS` | `24` (use `0` to make payout eligibility immediate while testing) |
| `CRON_SECRET` | any strong string |
| `DATABASE_URL` | **local Postgres** preferred (avoid writing test rows to prod) |

Local Postgres (sandbox can't reach Neon over TCP): PG16 at `/tmp/pgdata` port 5433,
then `npm run db:setup && npm run db:seed`.

Forward live webhook events to your local endpoint:

```bash
stripe login                      # once
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_… into STRIPE_WEBHOOK_SECRET, restart `npm run dev`
```

You also need: one **test coach** onboarded via Connect Express with payouts enabled,
and one **student** account.

---

## 1. Webhook validation test plan

Endpoint: `POST /api/webhooks/stripe`. Handlers: `checkout.session.completed`,
`checkout.session.expired`, `account.updated`. Returns `{ received: true }` on success;
`400` on bad/missing signature; `404` when `PAYMENTS_ENABLED` is off.

### T1 — `checkout.session.completed` (happy path, **webhook in isolation**)
1. As the student, book a **paid** coach's slot → you're redirected to Stripe Checkout.
2. Pay with test card `4242 4242 4242 4242`, any future expiry / any CVC / any ZIP.
3. **Do NOT return to the app.** Close the Checkout tab as soon as Stripe shows success.
   (This is the critical isolation: confirmation must come from the webhook, not the
   `/booking/success` reconcile.)
4. In the `stripe listen` log, confirm: `--> checkout.session.completed` then
   `<-- [200] POST /api/webhooks/stripe`.
5. Verify the booking flipped **via the webhook alone**:

```sql
SELECT id, status, "paymentStatus", "payoutStatus", "payoutReleaseAfter",
       "stripePaymentIntentId", "stripeChargeId"
FROM "Booking" WHERE id = <bookingId>;
```

Expect: `status=CONFIRMED`, `paymentStatus=PAID`, `payoutStatus=HELD`,
`payoutReleaseAfter` = session end + `PAYOUT_HOLD_HOURS`, `stripePaymentIntentId` and
`stripeChargeId` populated. **Exactly one** pair of invite emails was sent
(`emailStatus` = `SENT`/`SIMULATED`).

### T2 — idempotency (no double-confirm / double-email)
After T1, exercise the **other** path: open `/booking/success?b=<bookingId>` (triggers
the reconcile poll), **and** resend the event:

```bash
stripe events resend <evt_id_from_T1>
```

Expect: status stays `CONFIRMED`, **no second email**, webhook returns `200`
(status-guarded `updateMany` makes both calls no-ops after the first).

### T3 — `checkout.session.expired` (releases the held slot)
1. Book a paid slot but **do not pay** → a `PENDING_PAYMENT` hold exists. Grab its
   Checkout id:

```sql
SELECT id, status, "stripeCheckoutSessionId" FROM "Booking" WHERE id = <bookingId>;
```

2. Expire the **real** session (carries our `metadata.bookingId`):

```bash
stripe checkout sessions expire <cs_test_…>
```

3. Expect: webhook `200`; the hold is deleted (`deleteMany where status=PENDING_PAYMENT`)
   and the slot is bookable again:

```sql
SELECT id FROM "Booking" WHERE id = <bookingId>;   -- expect 0 rows
```

(Note: `stripe trigger checkout.session.expired` sends a synthetic session with no
`bookingId`, so it only proves signature + routing, not the delete. Use the real
`expire` above to prove the delete.)

### T4 — `account.updated` (coach becomes payable)
- **Faithful:** complete a real test Express onboarding for a coach who started but had
  not finished (so `stripePayoutsEnabled=false`). On completion Stripe fires
  `account.updated`; confirm the coach row flips:

```sql
SELECT id, "stripeAccountId", "stripePayoutsEnabled" FROM "Coach" WHERE id = <coachId>;
```

- **Targeted (optional):** force the handler against the real account id:

```bash
stripe trigger account.updated --override account:id=<acct_test_…>
```

Expect: `stripePayoutsEnabled=true`, coach becomes bookable. (Lower-risk handler — the
return-from-onboarding `syncConnectAccount` is a redundant, already-validated path.)

### T5 — negative cases
```bash
# bad signature → 400
curl -i -X POST https://<host>/api/webhooks/stripe -H 'stripe-signature: bad' -d '{}'
# with PAYMENTS_ENABLED unset → 404
```

✅ **Webhook done when:** T1 confirms via the webhook alone, T2 is idempotent, T3 deletes
the hold, T4 flips the coach, T5 rejects bad input.

---

## 2. Payout-release cron validation test plan

Endpoint: `GET /api/cron/release-payouts`, auth `Authorization: Bearer $CRON_SECRET`.
Returns `{ due, released, failed }`. Schedule already in `vercel.json` (`0 9 * * *`).

Start from a **CONFIRMED + HELD** booking with a real test `stripeChargeId` and
`coachStripeAccountId` (the T1 booking works).

1. Force eligibility (or set `PAYOUT_HOLD_HOURS=0` before T1):

```sql
UPDATE "Booking" SET "payoutReleaseAfter" = now() - interval '1 hour' WHERE id = <bookingId>;
```

2. Run the cron:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/release-payouts
```

3. Expect response `{"due":1,"released":1,"failed":0}` and:

```sql
SELECT id, "payoutStatus", "stripeTransferId", "payoutReleasedAt"
FROM "Booking" WHERE id = <bookingId>;   -- RELEASED, tr_… set, timestamp set
```

In the Stripe **test** dashboard: a **Transfer** to the connected account, with
`source_transaction` = the charge and `transfer_group = booking_<id>`.

4. **Idempotency:** re-run the cron → `{"due":0,...}` (row no longer HELD). To prove the
   idempotency key, set it back and re-run:

```sql
UPDATE "Booking" SET "payoutStatus"='HELD' WHERE id = <bookingId>;
```
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/release-payouts
```
Expect **no new money**: the key `transfer_booking_<id>` returns the **same** transfer —
confirm only **one** transfer exists for the booking in Stripe.

5. **Auth negative:** no/wrong bearer → `401`. With `PAYMENTS_ENABLED` off →
   `{"skipped":"payments disabled"}`.

6. **Failure path (optional):** temporarily point `coachStripeAccountId` at a bad value →
   expect `failed:1`, row stays `HELD` (retry-safe on the next run).

> Troubleshooting: if a transfer errors with insufficient balance, it's because
> `source_transaction` draws from that charge — make sure the charge from T1 settled to
> the platform's **test** available balance.

✅ **Cron done when:** a transfer is created, the row goes `RELEASED`, a re-run is a
no-op, and the idempotency key prevents a double transfer.

---

## 3. Test-data cleanup (run at cutover, against the prod DB)

Because previews share the prod DB, test Connect IDs and test bookings may already be in
production. Clean them so the **live** cron never touches a **test** charge and coaches
re-onboard under live keys.

> ⚠️ **Take a Neon backup/branch first.** Run each `SELECT` to confirm scope **before**
> the matching `DELETE`/`UPDATE`. The operator runs these against prod — not automated here.

**Stripe side (test mode):** test data is isolated from live and harmless to leave.
Optionally clear it in the Dashboard (test mode) → Developers → *Delete all test data*.
Test connected accounts (`acct_…`) exist only in test mode and never appear in live.

**App DB (required):**

```sql
-- 3a. Inspect what carries Stripe state (all of these are test artifacts:
--     payments have never been live, so any Stripe-backed row is from testing).
SELECT id, status, "paymentStatus", "payoutStatus", "stripeChargeId", "coachStripeAccountId"
FROM "Booking"
WHERE "stripeChargeId" IS NOT NULL OR "coachStripeAccountId" IS NOT NULL
   OR status = 'PENDING_PAYMENT';

SELECT id, "stripeAccountId", "stripePayoutsEnabled"
FROM "Coach" WHERE "stripeAccountId" IS NOT NULL OR "stripePayoutsEnabled" = true;

-- 3b. Delete test bookings (Stripe-backed + any abandoned holds).
DELETE FROM "Booking"
WHERE "stripeChargeId" IS NOT NULL
   OR "coachStripeAccountId" IS NOT NULL
   OR status = 'PENDING_PAYMENT';

-- 3c. Reset coach Connect state (test acct IDs are invalid under live keys;
--     coaches must re-onboard live).
UPDATE "Coach" SET "stripeAccountId" = NULL, "stripePayoutsEnabled" = false;

-- 3d. Verify clean (both expect 0 rows).
SELECT id FROM "Booking"
WHERE "stripeChargeId" IS NOT NULL OR "coachStripeAccountId" IS NOT NULL
   OR status = 'PENDING_PAYMENT';
SELECT id FROM "Coach" WHERE "stripeAccountId" IS NOT NULL OR "stripePayoutsEnabled" = true;
```

(Optional) remove the demo/seed booking if present: `DELETE FROM "Booking" WHERE
"paymentStatus" = 'SIMULATED';` — confirm with a `SELECT` first.

---

## 4. Go-live runbook

Run **in order**. `PAYMENTS_ENABLED` stays **off** until step 8.

1. **Stripe account live:** activate the account for **live** charges and **Connect**
   (complete the platform profile in live mode).
2. **Cleanup:** run §3 against the prod DB (backup first).
3. **Live env vars (Vercel → Production):**
   - `STRIPE_SECRET_KEY = sk_live_…`
   - `PLATFORM_FEE_BPS = 1500`, `PAYOUT_HOLD_HOURS = 24`
   - `CRON_SECRET` set (the cron authorizes with it)
   - leave `PAYMENTS_ENABLED` unset/false for now
4. **Register the live webhook** (Stripe **live** dashboard → Developers → Webhooks →
   Add endpoint):
   - URL `https://www.downtocase.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `account.updated`
   - Copy its signing secret → set `STRIPE_WEBHOOK_SECRET` (Production) → redeploy.
5. **Confirm the cron** is enabled for Production (`vercel.json` → `/api/cron/release-payouts`,
   `0 9 * * *`) and `CRON_SECRET` is set.
6. **Deploy** with `PAYMENTS_ENABLED` still off; smoke-test prod (no behavior change yet).
7. **Live Connect onboarding:** each bookable coach clicks **Connect payouts** on the
   dashboard (`/api/stripe/connect`) and completes **live** Express onboarding (real
   identity/bank). Confirm `Coach.stripePayoutsEnabled` → true (dashboard shows
   "Payouts: Active").
8. **Flip:** set `PAYMENTS_ENABLED=true` (Production) → redeploy. The booking modal now
   shows the Stripe-checkout copy (the "Payment simulation for MVP" line is gone) for
   paid coaches.
9. **First real booking (controlled):** use a real card on a **low-rate** coach (or your
   own coach account) to cap first-charge exposure.
   - Expect: booking `CONFIRMED` + `PAID` + `HELD`, `payoutReleaseAfter` set; invite
     emails delivered; live dashboard shows the PaymentIntent + charge **on the platform**;
     the live webhook log shows `200` for `checkout.session.completed`.
10. **First payout:** after the session end + `PAYOUT_HOLD_HOURS`, the daily cron runs
    (or invoke once manually with the live `CRON_SECRET` to verify sooner). Confirm a live
    **Transfer** to the coach, booking → `RELEASED`, `stripeTransferId` set; the coach
    sees it in their Stripe Express dashboard.
11. **Rollback:** set `PAYMENTS_ENABLED=false` → redeploy → instantly reverts to the
    simulated/instant path (no Stripe touched). Held funds stay on the platform; refund
    manually if needed (§5).
12. **Monitor (first days):** Stripe webhook delivery success rate, the daily cron
    response (`{due,released,failed}`), and any `payout release failed` logs.

---

## 5. Manual refund / cancel runbook (interim — no tooling yet)

Refund tooling is deliberately out of scope. Because funds are **held on the platform
until after the session**, a pre-session refund is clean:

1. Stripe **live** dashboard → the **PaymentIntent**/charge for the booking → **Refund**.
2. In the DB, stop the payout and mark the booking cancelled so the cron skips it:

```sql
UPDATE "Booking"
SET status = 'CANCELLED', "payoutStatus" = 'SKIPPED'
WHERE id = <bookingId>;
```

3. Notify both parties (manually for now). A reschedule/cancel flow is Phase B.

---

## Appendix — quick reference

- **Confirm path:** `reconcileBooking()` (`lib/booking-reconcile.ts`) is the single source
  of truth, called by the webhook, the success-page status poll, and the stale-hold
  reclaim. Idempotent via a status-guarded `updateMany`.
- **Split:** `computeSplit()` — student charged `amountCents`; platform keeps
  `PLATFORM_FEE_BPS` (1500 = 15%); coach gets the remainder, transferred after the session.
- **Stripe `Booking` fields:** `stripeCheckoutSessionId`, `stripePaymentIntentId`,
  `stripeChargeId`, `coachStripeAccountId`, `amountChargedCents`, `platformFeeCents`,
  `coachShareCents`, `currency`, `payoutStatus`, `payoutReleaseAfter`, `stripeTransferId`,
  `payoutReleasedAt`.
- **Coach fields:** `stripeAccountId`, `stripePayoutsEnabled`.

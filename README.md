# CaseCoach

A **calendar-first** booking marketplace — "OpenTable for MBB case coaches." It
connects students prepping for **consulting case interviews** with current and
former **McKinsey, Bain, and BCG** consultants, and lets them **book a session
instantly** from open time slots.

The product leads with *availability*: students start from open slots (the thing
they actually care about), and coach details are secondary — revealed when you
open a slot. Low friction throughout: browsing is free, sign-up is email +
password, and booking takes two clicks.

---

## What's in v1

- **Find a session** (`/sessions`) — open coaching slots across all coaches, grouped by day. Filter by **date (next 7 days), firm, focus area, and price**.
- **Slot cards** lead with the time and show coach, firm, role, focus areas, and price, each with a **Book instantly** button.
- **Slot/coach detail modal** — click any card for the full coach profile (bio, firm, role, experience, focus areas, rate, availability) and their other open times.
- **Instant booking** — review → **simulated payment** ("Payment simulation for MVP") → confirmation. The slot is marked booked and the coach's contact details are revealed.
- **Coach dashboard** — an **availability editor** to add/remove up to 5 open slots, plus a list of booked sessions with student contact.
- **Student dashboard** — upcoming booked sessions; the coach's contact details appear only **after** booking.

> **Payments are simulated.** There is no real charge. The seam lives in
> `lib/payments.ts` so Stripe can be dropped in without touching the booking
> flow — see *Adding Stripe* below.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Database | Postgres via Prisma 7 (`pg` driver adapter) |
| Auth | Email + password (scrypt) + signed-cookie sessions |

## Quick start

```bash
cp .env.example .env # then set DATABASE_URL to a Postgres (local or a free Neon DB)
npm install          # installs deps; postinstall runs `prisma generate`
npm run db:setup     # pushes the schema to Postgres, generates the client, seeds demo data
npm run dev          # http://localhost:3000
```

You need a `DATABASE_URL` (Postgres). The quickest path is a free
[Neon](https://neon.tech) database — paste its connection string into `.env`.
`SESSION_SECRET` is optional locally.

### Try the demo accounts

Sign in at `/login`. Every seeded account uses the password **`casecoach123`**:

| Role | Email | Password |
| --- | --- | --- |
| Coach | `maya.chen@coach.test` (has a booked session + open slots) | `casecoach123` |
| Coach | `david.okafor@coach.test` | `casecoach123` |
| Student | `jordan@student.test` (has an upcoming booking) | `casecoach123` |
| Student | `sam@student.test` | `casecoach123` |

The seed creates 8 coaches, ~40 open slots across the next week, and one sample
booking so the dashboards aren't empty.

## Useful scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:setup` | Push schema, generate client, and seed (first-time setup) |
| `npm run db:push` | Push schema changes **and regenerate** the client |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:reset` | Wipe, re-push, regenerate, and re-seed |

## Project structure

```
app/
  page.tsx              # Landing page
  sessions/             # "Find a session" — the slot-first marketplace
  coaches/[id]/         # Public coach profile + bookable slots
  signup/student|coach  # Signup pages (email + password)
  login/                # Email + password sign-in (+ set-password for legacy accounts)
  dashboard/            # Role-aware dashboard (student bookings / coach availability)
  api/
    bookings/           # POST: book a slot (simulated payment)
    slots/              # POST add / DELETE remove a coach's slots
    students, coaches/  # Signup (creates the account + password)
    auth/               # Login / logout / set-password (claim a legacy account)
  generated/prisma/     # Prisma client (generated; gitignored)
components/             # SessionBrowser, SlotCard, BookingModal, AvailabilityEditor, Modal, …
lib/
  prisma.ts             # Prisma client singleton (+ Postgres adapter)
  payments.ts           # Payment seam — simulated today, Stripe-ready
  session.ts            # Signed-cookie sessions + getCurrentUser()
  serialize.ts          # Prisma rows -> client-safe view types
  types.ts              # CoachView / SlotView / DaySection
  constants.ts          # Firms, focus areas, price buckets, slot cap
  format.ts             # List + date/slot formatting helpers (UTC)
prisma/
  schema.prisma         # Student, Coach, Slot, Booking
  seed.ts               # Demo coaches, students, slots, sample booking
```

## Data model

- **Slot** — a bookable time offered by a coach. Availability is derived from `isBooked` + a future `startTime`.
- **Booking** — a confirmed booking of a slot (unique per slot, which prevents double-booking). Holds the payment fields (`pricePaid`, `paymentStatus`, `paymentRef`) so a real provider slots in cleanly.

List-like fields (target firms, focus areas) are stored as JSON-string columns;
`lib/format.ts` handles (de)serialization. Times are stored and formatted in
**UTC** for determinism.

## How auth works

Auth is **email + password**. Passwords are hashed with **scrypt** (`node:crypto`,
no extra dependency) and stored in `Student.passwordHash` / `Coach.passwordHash`;
verification and hashing live in `lib/password.ts`. On success, signup/login set a
**signed (HMAC) cookie** holding `{ role, id }` (`lib/session.ts`); `getCurrentUser()`
resolves it to a DB row.

**Transitioning legacy accounts:** the columns are nullable, so accounts created
before passwords existed start "unclaimed" (`passwordHash = null`). The first time
such a user signs in, the login form detects this and prompts them to **set a
password** (`POST /api/auth/set-password`), which only works on an account that has
no password yet. No reset emails, OTP, or magic links.

> **Out of scope (by design):** self-serve "forgot password" (would need email-based
> recovery). To reset a user, clear their `passwordHash` and they'll set a new one on
> next sign-in.

## Adding Stripe (later)

Booking calls `processPayment()` in `lib/payments.ts`, which currently returns a
simulated result. To go live:

1. Add the Stripe SDK and create a PaymentIntent (or Checkout Session) inside `processPayment` (or split into create/confirm).
2. Return the PaymentIntent id as `reference` with status `"PAID"`.
3. Add a webhook route to reconcile async payment events and flip `Booking.paymentStatus`.
4. Set `Booking.paymentStatus` / `paymentRef` from the real result (fields already exist).

The booking API and UI don't need to change.

## Deploying (Vercel + Neon)

The app runs on Postgres, so it deploys to serverless hosts as-is.

1. Create a free Postgres database on [Neon](https://neon.tech) and copy the **pooled** connection string (the host contains `-pooler`).
2. Import the repo into [Vercel](https://vercel.com) — it auto-detects Next.js.
3. Add environment variables in Vercel: `DATABASE_URL` (the Neon string) and `SESSION_SECRET` (a long random value, e.g. `openssl rand -hex 32`).
4. Create the tables once — locally run `npx prisma db push` with `DATABASE_URL` pointed at Neon, then optionally `npm run db:seed` for demo data.
5. Deploy. Pushes to `main` go to production; open PRs get preview URLs.

## Ideas for next

- Real Stripe payments + payouts to coaches (Stripe Connect)
- Time-zone–aware slot display (times are UTC today)
- Reviews & ratings for coaches
- Reschedule / cancel flows and email reminders
- In-app messaging instead of email handoff

---

> Demo project — not affiliated with or endorsed by McKinsey & Company, Bain &
> Company, or Boston Consulting Group.

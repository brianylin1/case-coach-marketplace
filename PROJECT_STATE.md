# CaseCoach — Project State

> Living snapshot of the product, architecture, and roadmap. Keep this updated
> as the project evolves. Last updated after PR #3 (timezone support).

---

## 1. Product overview

**What it does:** CaseCoach is a two-sided marketplace connecting students
prepping for **MBB** (McKinsey, Bain, BCG) case interviews with current and
former MBB consultants who offer paid 1:1 coaching sessions.

**Positioning:** "OpenTable for MBB case coaches" — a **calendar-first, instant
booking** experience. Low friction on both sides (passwordless signup; coaches
set availability once; students book a time in a couple of clicks).

**Core user flows:**
- **Student:** land on `/sessions` → scan a weekly calendar of open times →
  click a time → compare the coaches free then (grouped by firm) → **Book
  instantly** (simulated payment) → coach contact is revealed → track in
  dashboard.
- **Coach:** sign up → **paint a weekly availability grid** → bookings arrive
  automatically → see booked sessions + student contact in dashboard.

---

## 2. Architecture

- **Frontend:** Next.js 16 (App Router) + React 19, TypeScript, Tailwind CSS v4,
  lucide-react. Pages are server components reading Prisma directly; mutations
  go through route handlers in `app/api/**`; interactive UI (calendar, modals,
  forms) is client components.
- **Database:** PostgreSQL (Neon) via **Prisma 7** with the `pg` driver adapter
  (`@prisma/adapter-pg`). Prisma 7 uses a WASM query compiler + driver adapters
  (no Rust engine). Client generated to `app/generated/prisma/` (gitignored).
  `DATABASE_URL` lives in `.env` / Vercel env; datasource wired in
  `prisma.config.ts`.
- **Hosting:** Vercel (serverless). Production = `main`. Build command:
  `npx prisma db push --accept-data-loss && next build` (syncs schema on deploy).
- **Auth:** lightweight **passwordless** signed-cookie sessions (HMAC over
  `{role,id}`) in `lib/session.ts`; `getCurrentUser()` is the server-only helper.
  Not production-grade — placeholder for magic-link/OAuth.
- **Payments:** **SIMULATED.** `lib/payments.ts#processPayment` returns a fake
  result ("Payment simulation for MVP"). `Booking` already stores
  `pricePaid` / `paymentStatus` / `paymentRef` so Stripe drops in behind that
  function (+ a webhook) without touching call sites.

---

## 3. Deployment setup

- **Repo:** `brianylin1/case-coach-marketplace`. Default branch `main` = production.
- **GitHub workflow:** feature branch → PR into `main` → review on Vercel preview
  → merge → production.
- **Vercel:** connected to the repo, auto-deploys. Production branch = `main`.
  Env vars set for **Production + Preview + Development**: `DATABASE_URL` (Neon
  pooled string), `SESSION_SECRET`. Build command runs `prisma db push`.
- **Neon:** free-tier Postgres. Use the **pooled** connection string (host
  contains `-pooler`) as `DATABASE_URL`. Tables are created/synced by the build's
  `prisma db push` (or locally via `npm run db:setup`); demo data via
  `npm run db:seed`.
- **Branch strategy:** `main` = production. Feature branches prefixed `claude/…`.
  Commits authored as `Claude <noreply@anthropic.com>` (repo git config) so they
  show Verified.
- **Preview deployments:** any branch with an open PR gets an automatic Vercel
  preview at `case-coach-marketplace-git-<branch>-<scope>.vercel.app`; Vercel
  posts a "Visit Preview" link + status check on the PR. Previews currently share
  the **same Neon DB** as production.

---

## 4. Database schema (Prisma / Postgres)

**Models:**
- **Student** — `id`, `name`, `email` (unique), `targetFirms` (JSON string),
  `focusAreas` (JSON string), `timeline?`, `goal?`, `createdAt`; has `bookings[]`.
- **Coach** — `id`, `name`, `email` (unique), `firm`, `title`, `yearsAtFirm`,
  `headline?`, `bio`, `focusAreas` (JSON string), `hourlyRate` (0 = pro bono),
  `availability?` (free text), `linkedinUrl?`, `timezone` (default `"UTC"`),
  `isActive`, `createdAt`; has `blocks[]`, `bookings[]`.
- **AvailabilityBlock** — `id`, `coachId`, `weekday` (0=Mon…6=Sun),
  `startMinute`, `endMinute`. A coach's **recurring weekly** availability (UTC).
- **Booking** — `id`, `coachId`, `studentId`, `startTime` (concrete UTC),
  `durationMins` (60), `focusArea?`, `pricePaid`, `paymentStatus`, `paymentRef?`,
  `status` (CONFIRMED/CANCELLED), `createdAt`. **`@@unique([coachId, startTime])`**
  prevents double-booking.

**Relationships:** Coach 1—* AvailabilityBlock; Coach 1—* Booking; Student 1—*
Booking. There is **no Slot table** — bookable 60-min sessions are **generated on
the fly** from a coach's blocks minus existing bookings (`lib/availability.ts`).

**Conventions:** list fields are JSON-string columns (`parseList` /
`serializeList` in `lib/format.ts`); enums are plain strings validated in app
code (`lib/constants.ts`). **Times:** stored as **UTC** instants
(`Booking.startTime`, generated session starts). `AvailabilityBlock` minutes are
**wall-clock in the coach's `timezone`**, converted to UTC per-date (DST-correct)
in `lib/timezone.ts` + `lib/availability.ts`. Students see times in their own
zone (browser-detected, `cc_tz` cookie — not a stored field).

---

## 5. Current features

- **Coach onboarding** (`/signup/coach`): name, email, firm, title, years,
  headline, bio, focus areas, rate (or pro bono), availability text, **timezone**
  (defaults to the browser-detected IANA zone), LinkedIn, and a **required
  "Meeting Information"** section (platform + URL, optional ID / passcode /
  instructions). Passwordless; upsert by email. **A coach is not bookable — and
  their availability is hidden — until a meeting room is configured.**
- **Availability grid** (coach dashboard): When2Meet-style weekly paint grid
  (Mon–Sun × 7am–10pm) **in the coach's own timezone** (labelled as such),
  click-and-drag to add/erase (mouse + touch), saved as `AvailabilityBlock`s via
  `PUT /api/availability`; live "hrs/week" counter.
- **Calendar-first sessions page** (`/sessions`): weekly grid (Today + next 6
  days × 7am–10pm) **rendered in the viewer's local timezone**; rows default to
  7am–10pm and expand only when cross-timezone supply would otherwise fall
  outside them. Cells show a worded count ("2 coaches") + subtle firm tags;
  populated / empty / past cells are visually distinct. Lightweight grid payload;
  per-cell coaches fetched on click via `GET /api/sessions/cell` (matches any
  coach with a session inside that local hour, so half-hour offsets work).
  **Calendar | List** toggle (`?view=`).
- **Booking flow:** click a time → coach modal → review + **simulated payment**
  → confirmation reveals coach contact. `POST /api/bookings { coachId, startTime }`
  validates the time is inside the coach's blocks and not taken; unique constraint
  guards double-booking, and the coach must have a configured meeting room. On
  success it **snapshots the coach's meeting details** (platform / URL / ID /
  passcode / instructions) onto the booking, then (via `after()`) **emails both
  parties a calendar invite** (`.ics`) with times in each recipient's zone —
  Resend, simulated unless production (see PR #5). The confirmation modal,
  dashboards, emails, and `.ics` all surface platform / URL / ID / passcode +
  Join + Google/Outlook/`.ics`; `GET /api/bookings/[id]/ics` serves the invite to
  either party.
- **Dashboards:** student = upcoming booked sessions + coach contact + profile
  summary; coach = availability grid + booked sessions (with student contact) +
  stats (hrs/week, upcoming, booked value).
- **Profile modal** (`CoachProfilePanel`): bio, firm, role, years, focus, rate,
  availability, LinkedIn. Reused in the calendar modal and on `/coaches/[id]`.
- **Coach-selection modal:** coaches at a given hour grouped by firm; **Sort**
  (Recommended / Lowest price / Most experience); rating placeholder; first 10 per
  firm + "Show more"; wide with a sticky header and internal scroll; mobile bottom
  sheet.
- **Filters:** firm, focus area, price bucket — URL-driven, forwarded to the cell
  fetch.

**Demo accounts** (seed): coaches `maya.chen@coach.test`,
`david.okafor@coach.test` (+6 more); students `jordan@student.test`,
`sam@student.test`. Sign in at `/login` (email only).

---

## 6. Completed PRs

- **PR #1 — "Pivot to a calendar-first booking marketplace"** *(merged into
  `main`).* Took the v1 coach directory (browse coaches, request → accept) and
  pivoted it to an **instant-booking** marketplace: replaced the request model
  with `Slot` then `AvailabilityBlock` + `Booking`; **converted SQLite → Postgres
  (Neon)** with the `pg` adapter; added the **When2Meet recurring availability
  grid** for coaches and **on-the-fly session generation**; simulated payments
  behind `lib/payments.ts`. (The original v1 build — directory, passwordless
  auth, signups, dashboards — was `main`'s starting point before this PR.)

- **PR #2 — "Calendar-first /sessions view with a list toggle"** *(merged into
  `main`).* Replaced the long card list with the **weekly calendar grid**
  as the primary discovery surface; added the fetch-on-click coach-selection
  modal (grouped by firm, sort, rating placeholder, Show more, compact rows);
  Calendar|List toggle; new `GET /api/sessions/cell`; plus polish: past-hour
  styling, firm monograms → subtle in-cell tags, low-supply hint + better empty
  state, worded counts, tighter rows, and a wider sticky-header modal.

- **PR #3 — "Timezone support"** *(in progress, branch
  `claude/affectionate-fermi-760RL`).* Made the whole app timezone-correct
  without a schema change. New `lib/timezone.ts` (zero-dep, `Intl`-based)
  converts between UTC instants and wall-clock parts in any IANA zone,
  DST-correct (spring-forward gaps skipped, fall-back overlaps resolved to the
  earlier instant). Coaches now author availability in their **own** zone
  (`Coach.timezone`, collected at signup, defaults to detected; grid labelled);
  `AvailabilityBlock` minutes are reinterpreted as coach-local wall time and
  generation converts per-date. Students see every time in their **browser**
  zone (detected by `TimezoneSync` → `cc_tz` cookie, read by `getViewerTimeZone`);
  the calendar buckets + labels in that zone and rows expand to never hide
  cross-zone supply. `/api/bookings` + `/api/sessions/cell` validate "on the
  hour" in the coach's zone (fixes half-hour offsets like IST). No DDL; existing
  UTC-default coaches keep their current behavior until they pick a zone. Manual
  QA in `docs/timezone-qa.md`.

- **PR #4 — "Booking calendar invites + email" (Jitsi fallback)** — *closed,
  superseded by PR #5.* Introduced the calendar/email/ICS plumbing but auto-
  generated a Jitsi room when a coach had none; Jitsi rooms didn't reliably start
  (moderator sign-in), so the auto-video approach was dropped.

- **PR #5 — "Coach-provided meeting rooms (no auto video)"** *(in progress,
  branch `claude/coach-meeting-rooms`).* Keeps PR #4's calendar/email/ICS
  plumbing (`lib/ics.ts` RFC 5545 builder, `lib/email.ts` Resend shim — real
  sends only in production, `lib/calendar-links.ts`) but **removes Jitsi and all
  auto video**. Coaches now provide their own room in a required "Meeting
  Information" section (platform + URL, optional ID / passcode / instructions);
  **a coach without one is not bookable and is filtered from `/sessions`, the
  cell API, and their public page.** Booking snapshots the coach's meeting
  details onto the `Booking`; the confirmation modal, both dashboards, emails,
  and the `.ics` (LOCATION + DESCRIPTION) all show platform / URL / ID / passcode
  + a Join button + Google/Outlook/`.ics`. New shared `components/MeetingActions`.
  Additive schema only (`meetingPlatform / meetingId / meetingPasscode /
  meetingInstructions` on both `Coach` and `Booking`; `meetingUrl` already
  existed). Existing coaches with no room become unbookable until they configure
  one. No Google/Microsoft/Zoom/Daily/Whereby integration.

---

## 7. Known limitations

- **Timezone:** ✅ handled (PR #3) — coaches author in their zone, students see
  their browser zone, DST-correct. Remaining caveats: viewer zone isn't persisted
  per student (browser-detected cookie only), so first paint in a fresh session is
  UTC until `TimezoneSync` refreshes once; ambiguous/nonexistent DST wall times
  resolve deterministically (earlier instant / skipped) rather than prompting.
- **Mobile:** the calendar is horizontal-scroll, not a dedicated single-day
  view. Functional but not ideal. (Modals are proper bottom sheets.)
- **Ratings:** placeholder only ("New · no ratings yet"); no reviews system.
- **Payments:** simulated; no real Stripe; no coach payouts.
- **Auth:** passwordless signed cookie — anyone with an email can sign in. No
  verification/OAuth. Not production-grade.
- **Other:** hourly slots only (no 30-min); `/api/sessions/cell` returns all
  coaches for an hour (display capped per firm at 10); prod seed/demo data is
  manual.

---

## 8. Product decisions made

- **Why calendar-first:** students care about *time* first; a calendar scales to
  many sessions where a card list doesn't (the grid is bounded — ≤105 cells —
  regardless of volume); "OpenTable" familiarity. Coach details are secondary and
  revealed on click.
- **Why recurring availability blocks:** coaches set a weekly pattern once
  instead of re-entering slots; far less friction, fewer rows, and sessions are
  generated on the fly (no stale slot rows, no cron job). Trade-off: one-off
  exceptions need a future "blackout" concept; timezone/DST handled at generation.
- **Why modal-based coach selection:** keeps the calendar as the primary scan
  surface; clicking a time opens a focused, sortable comparison of coaches at that
  slot (grouped by firm); reuses the booking + profile modals; closing returns to
  the same calendar position (client state, no navigation).

---

## 9. Current roadmap (ranked)

Recommended next priorities (confirm before building):

1. ~~**Timezone support**~~ — ✅ shipped in PR #3 (coach authors in their tz;
   student sees local; DST-correct). **Next-up is supply (#2).**
2. **Coach onboarding / supply** — a two-sided marketplace needs liquidity; more
   coaches + smoother onboarding (the demo has 8). No supply → no marketplace.
3. **Trust signals** — drive student conversion: firm/identity verification,
   LinkedIn proof, and the real ratings/reviews system (replaces the placeholder).
4. **Mobile improvements** — large share of student traffic; single-day calendar
   view + hover/preview parity. Current horizontal-scroll is a stopgap.
5. **Payments (Stripe)** — real charges + coach payouts (Stripe Connect). Can run
   pro-bono/pilot first, so not the very top.
6. **GTM tools** — analytics, referrals, email/reminders, SEO. After the core loop
   converts.

---

## 10. Instructions for future Claude sessions

**Workflow:** feature branch → PR into `main` → Vercel preview → merge →
production. `main` is production; don't push product changes straight to `main`
(docs/hotfixes only, with permission).

**Create a branch:** off the latest `main` —
`git fetch origin main && git checkout -b claude/<short-desc> origin/main`.

**Open a PR:** use the GitHub MCP tools (`mcp__github__create_pull_request`,
`base: main`, `head: <branch>`). Repo is `brianylin1/case-coach-marketplace`.
Don't open a PR unless asked.

**Preview deployments:** pushing a branch with an open PR triggers a Vercel
preview; the URL is in the Vercel bot's PR comment / the commit status
`target_url`. Production branch is `main`.

**Rules for changes:**
- This is **Next 16 + Prisma 7** — read `AGENTS.md` and the guides in
  `node_modules/next/dist/docs/`; don't assume training-data APIs.
- **Prisma 7:** `prisma db push` does **not** regenerate the client — use
  `npm run db:push` (push + generate). Local dev needs a Postgres `DATABASE_URL`
  in `.env`; run `npm run db:setup` then `npm run db:seed`. (Locally you can run
  Postgres 16 at `/tmp/pgdata` on port 5433 with trust auth, since the sandbox
  can't reach Neon over TCP.)
- **Verify before pushing:** `npm run build` and `npm run lint` must pass. Keep
  changes focused; commit author must be `Claude <noreply@anthropic.com>`.
- **Don't casually change:** booking logic, the data model, or timezone behavior.
  Payments stay behind `lib/payments.ts`.
- **Data conventions:** list fields are JSON strings (`parseList`/`serializeList`);
  sessions are generated on the fly in `lib/availability.ts` (no Slot table);
  times are stored as UTC instants but availability is **wall-clock in the coach's
  zone** — go through `lib/timezone.ts` for any conversion, never `getUTCHours`
  on a session time; secrets and the generated Prisma client are gitignored.

**Key files:** `app/sessions/page.tsx` (calendar), `components/SessionCalendar.tsx`,
`components/AvailabilityGrid.tsx`, `components/BookingModal.tsx`,
`lib/availability.ts` (generation), `lib/timezone.ts` (tz/DST math),
`lib/viewer-tz.ts` (viewer zone cookie), `components/TimezoneSync.tsx`,
`lib/prisma.ts`, `lib/session.ts`, `lib/payments.ts`, `prisma/schema.prisma`,
`prisma/seed.ts`.

**Useful scripts:** `npm run dev`, `npm run build`, `npm run lint`,
`npm run db:setup`, `npm run db:seed`, `npm run db:reset`.

# CaseCoach — Project State

> Living snapshot of the product, architecture, and roadmap. Keep this updated
> as the project evolves. **Last updated after PR #12 (Stripe payments Phase 1) —
> Stripe validated end-to-end in test mode; not yet live.**
>
> **Production:** live at **https://www.downtocase.com** (primary domain; the
> apex `downtocase.com` 308-redirects to `www`; `case-coach-marketplace.vercel.app`
> still resolves). Branch `main`, auto-deployed by Vercel. **Latest deployed
> commit: `572bd6a`** (merge of PR #12; healthy). Model = timezone-correct booking
> (PR #3) + coach-provided meeting room + invites (PR #5) + live "Down to Case"
> booking email (PRs #6–#7) + student preferences edit (PR #9) + coach trust
> signals & curated pricing (PR #10) + **"Down to Case" homepage rebrand &
> candidate-first positioning (PR #11)** + **Stripe payments Phase 1 (PR #12,
> dormant)**. **No auto-generated video** (Jitsi removed).
>
> 💳 **Stripe Phase 1 status:** merged + deployed but **DORMANT behind
> `PAYMENTS_ENABLED`** (unset in prod ⇒ payments OFF; production behaves exactly
> as the simulated MVP). **Validated end-to-end in TEST mode** via a Vercel
> preview: ✅ Connect Express onboarding · ✅ Stripe Checkout · ✅ test payment
> succeeded · ✅ booking confirmed. **Not yet live.** Still **un-exercised:** the
> Stripe webhook and the payout-release cron/transfer (test confirmed via the
> success-page reconcile-on-return, not the webhook). A Connect error-handling fix
> is **pending in PR #13** (not yet merged to `main`). See `docs/stripe-phase1.md`.
>
> ⚠️ **Session handoff / next priority:** **coach onboarding — a unified
> "Get booking-ready" checklist** on the coach dashboard (designed & approved, not
> yet built; consolidates the meeting-room + payouts banners, surfaces
> availability; no schema change). **Do not start new feature work** without an
> explicit go-ahead. Deferred for now (operator): taxes, refunds, disputes,
> accounting, live rollout.

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
- **Payments:** **SIMULATED in production today.** A full **Stripe Phase 1**
  implementation (Checkout + Connect Express + funds held on the platform until
  after the session, released by a daily transfer cron) ships **behind
  `PAYMENTS_ENABLED` (default off; not yet enabled in prod)** — see
  `docs/stripe-phase1.md`. Flag off ⇒ bookings confirm instantly via
  `lib/payments.ts#processPayment` exactly as before. `Booking` carries the
  payment + payout fields; `Coach` carries `stripeAccountId` /
  `stripePayoutsEnabled`. **Validated in test mode** (Vercel preview, test keys):
  ✅ Connect Express onboarding, ✅ Checkout, ✅ test payment, ✅ booking
  confirmed. **Not yet exercised:** the Stripe webhook and the payout-release
  cron/transfer (confirmation went through the success-page reconcile-on-return).
  A Connect error-handling fix is **pending in PR #13** (not yet on `main`).

---

## 3. Deployment setup

- **Repo:** `brianylin1/case-coach-marketplace`. Default branch `main` = production.
- **GitHub workflow:** feature branch → PR into `main` → review on Vercel preview
  → merge → production.
- **Vercel:** connected to the repo, auto-deploys. Production branch = `main`.
  Env vars set for **Production + Preview + Development**: `DATABASE_URL` (Neon
  pooled string), `SESSION_SECRET`. **Email (Production):** `RESEND_API_KEY`,
  `EMAIL_FROM` (`Down to Case <bookings@downtocase.com>`), `EMAIL_FROM_ADDRESS`
  (`bookings@downtocase.com`). Build command runs `prisma db push`.
- **Custom domain:** **`downtocase.com`** is the primary production domain —
  canonical host **`www.downtocase.com`** (200); the apex `downtocase.com`
  permanently redirects (308) to `www`. `case-coach-marketplace.vercel.app` still
  resolves.
- **Email (Resend):** booking email is **live in production** via Resend on the
  verified **`downtocase.com`** domain. Sends from **`bookings@downtocase.com`**
  (sender display name **"Down to Case"** from `EMAIL_FROM`); the `.ics`
  `ORGANIZER` email comes from `EMAIL_FROM_ADDRESS`. Support/replies go to
  **`support@downtocase.com`**, which forwards to the operator's inbox. Sending is
  gated to `VERCEL_ENV=production` (or `EMAIL_FORCE_SEND=1` locally), so previews
  don't email real people.
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
  **trust / positioning — all optional, added PR #10**: `bestFor?` (single
  `BEST_FOR` key; UI falls back to a phrase derived from the first focus area),
  `casesCoached?` (`CASES_COACHED` range bucket: `0-10`/`10+`/`25+`/`50+`/`100+`),
  `firmStatus?` (`"current"`|`"former"` at `firm`; null = unstated, never inferred),
  `photoUrl?` (external image URL; rendered by `Avatar` with an initials fallback —
  **no upload UI yet**); **reusable meeting room** (`meetingPlatform?` =
  teams|zoom|meet|other, `meetingUrl?`, `meetingId?`, `meetingPasscode?`,
  `meetingInstructions?`), `isActive`, `createdAt`; has `blocks[]`, `bookings[]`.
  **Bookable only when `meetingUrl` + `meetingPlatform` are set.** Curated keys +
  helpers (`bestForPhrase`, `casesCoachedLabel`, `COACH_RATES`, `rateOptionLabel`,
  `FIRM_STATUSES`) live in `lib/constants.ts`; `Coach` is projected to a
  client-safe `CoachView` in `lib/serialize.ts` (email never included).
- **AvailabilityBlock** — `id`, `coachId`, `weekday` (0=Mon…6=Sun),
  `startMinute`, `endMinute`. A coach's **recurring weekly** availability (UTC).
- **Booking** — `id`, `coachId`, `studentId`, `startTime` (concrete UTC),
  `durationMins` (60), `focusArea?`, `pricePaid`, `paymentStatus`, `paymentRef?`,
  `status` (CONFIRMED/CANCELLED), **meeting snapshot** (`meetingPlatform?`,
  `meetingUrl?`, `meetingId?`, `meetingPasscode?`, `meetingInstructions?` — copied
  from the coach at booking time), `emailStatus` (PENDING/SENT/SIMULATED/FAILED),
  `createdAt`. **`@@unique([coachId, startTime])`** prevents double-booking.

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

- **Coach onboarding / edit** (`/signup/coach`; doubles as the prefilled edit
  form when a coach is logged in): name, email, firm, title, years, headline,
  bio, focus areas, a **curated hourly-rate dropdown** (`COACH_RATES`: pro bono /
  $40–$250; a legacy off-list rate is preserved on edit), availability text,
  **timezone**, LinkedIn, an optional **"How you coach"** block (best-for select,
  cases-coached range, Current/Former-at-firm toggle — all clicks, no writing),
  and a **required "Meeting Information"** section (platform + URL, optional ID /
  passcode / instructions). Passwordless; a logged-in coach updates by session id
  (never duplicates). **A coach is not bookable — and their availability is
  hidden — until a meeting room is configured.** *(No profile-photo field yet —
  photo upload is a planned follow-on.)*
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
  Resend — **live in production** (PRs #6–#7; branded "Down to Case"). The confirmation modal,
  dashboards, emails, and `.ics` all surface platform / URL / ID / passcode +
  Join + Google/Outlook/`.ics`; `GET /api/bookings/[id]/ics` serves the invite to
  either party.
- **Dashboards:** student = upcoming booked sessions + coach contact + profile
  summary; coach = availability grid + booked sessions (with student contact) +
  stats (hrs/week, upcoming, booked value).
- **Student preferences edit** (PR #9): the dashboard "Update preferences" link
  opens `/signup/student` as a **true edit form** — prefilled, email read-only,
  "Save changes" CTA, returns to `/dashboard`; the API pins a logged-in student's
  update to their session id so changing the email can't fork a duplicate.
- **Coach profile** (`CoachProfilePanel`; reused in the calendar/list modals and
  on `/coaches/[id]`) — refreshed in PR #10: photo (initials fallback), name +
  firm, a **credibility line** ("Current/Former &lt;Firm&gt; &lt;Title&gt; · N yrs"
  when stated, else neutral), **prominent LinkedIn**, a **"Best for …"** chip, a
  **cases-coached** chip, short bio, focus areas as pills, rate ("$X/hr · 60-min"),
  availability. The student-facing cards (`CoachCard`, `SlotCard`), the booking
  modal, and the calendar coach-rows carry the same concise trust signals. Every
  field falls back gracefully — no empty sections, "Best for" derived from focus,
  no "verified"/ratings/fake social proof.
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

- **PR #3 — "Timezone support"** *(merged into `main`).* Made the whole app timezone-correct
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

- **PR #5 — "Coach-provided meeting rooms (no auto video)"** *(merged into
  `main` — current production).* Keeps PR #4's calendar/email/ICS
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

- **PR #6 — "Polish booking emails + calendar invite presentation"** *(merged
  into `main`).* Production-ready pass on the booking emails and `.ics`: cleaner
  subjects, a branded layout with a details table, a prominent Join button +
  plain-text backup link, a calendar-invite note, and a `support@…` footer;
  removed user-facing "simulated payment (MVP)" language. `.ics` now uses the
  platform name as `LOCATION` (not the raw URL), with the join link + support
  contact in the description; the in-app Google/Outlook "Add to calendar" links
  were aligned to match. Email render path only — no logic/data/timezone changes.

- **PR #7 — "Down to Case email + calendar-invite branding" (+ copy passes)**
  *(merged into `main` — current production).* Rebranded the booking email and
  invite from "CaseCoach" to **"Down to Case"** via a shared `BRAND` constant
  (wordmark, footer, subjects; `.ics` `PRODID` / `SUMMARY` / `DESCRIPTION` /
  `ORGANIZER` **display name**). The coach email was rewritten to be
  action-oriented (subject **"Someone's down to case! — <Student> booked
  <Date>"**, "Session details" table, "Before you join"); the student email
  parallels it (**"…will case you on <Date>"**). The `.ics` title is now
  **"<Student> and <Coach> are Down to Case!"** with an Outlook-friendly
  **`X-ALT-DESC`** HTML alternate (plain-text `DESCRIPTION` preserved for all
  clients). **Email render path only** — booking, availability, timezone,
  meeting-room gating, payments, auth, and Resend config untouched; the `.ics`
  organizer email, event times, and opaque `UID` (`booking-<id>@casecoach.app`)
  are unchanged. Sender **display name** is env-controlled via `EMAIL_FROM`.

- **PR #8 — "docs: update PROJECT_STATE after PR #7"** *(merged).* Docs only.

- **PR #9 — "Student preferences as a true edit form"** *(merged into `main`).*
  `/signup/student` prefills for a logged-in student (name, email, target firms,
  focus areas, timeline, notes; chips pre-selected); email is **read-only** in
  edit mode; CTA is **"Save changes"**; a successful save returns to `/dashboard`
  (fresh signups still go to `/coaches`). Server hardening: `POST /api/students`
  pins a logged-in student's update to their **session id** and ignores any
  submitted email, so changing the email can't create a duplicate. No schema change.

- **PR #10 — "Coach Trust MVP: positioning, credibility, curated pricing"**
  *(merged into `main` — current production, commit `8076143`).* Additive,
  all-optional `Coach` fields `bestFor` / `casesCoached` / `firmStatus` /
  `photoUrl` (see §4) surfaced across the student-facing UI — a "Best for …"
  positioning line, a cases-coached signal, a Current/Former credibility line,
  prominent LinkedIn, and photo support (initials fallback) on the profile, cards,
  booking modal, and calendar rows — each with a graceful fallback (no empty
  sections, no "verified"/ratings/fake social proof). The coach form gains a
  low-friction **"How you coach"** block and a **curated rate dropdown**
  (`COACH_RATES`, replacing the $1-step number input); `Avatar` renders an
  `<img>` when `photoUrl` is set. Also: homepage recurring-availability copy fix.
  **Deliberately scoped out** (after two product feedback passes): session-styles,
  a "how sessions run" checklist, dashboard nudges, and the photo-**upload** UI
  (kept the `photoUrl` column + rendering only — Vercel Blob upload is the planned
  follow-on). **Untouched:** booking, availability, timezone, email/ICS,
  meeting-room gating, auth, payments.

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
- **Payments:** simulated in prod (Stripe Phase 1 built + validated in test,
  dormant behind `PAYMENTS_ENABLED`); no live charges/payouts yet.
- **Auth:** passwordless signed cookie — anyone with an email can sign in. No
  verification/OAuth. Not production-grade.
- **Meeting rooms:** coach-provided and only *format*-validated (any `https://`
  URL + a known platform — not checked for reachability). The booking snapshot is
  **sticky**: editing the room later doesn't update past bookings or re-notify
  already-booked students; there's no reschedule/cancel (so no
  `METHOD:CANCEL`/`SEQUENCE` ICS updates). Existing prod coaches have no room and
  are **unbookable until they configure one**.
- **Email:** ✅ **live in production** via Resend on the verified `downtocase.com`
  domain — booking emails + the `.ics` send from `bookings@downtocase.com` (sender
  "Down to Case"); support at `support@downtocase.com` forwards to the operator.
  Still gated to `VERCEL_ENV=production` (or `EMAIL_FORCE_SEND=1`), so previews and
  local runs don't send. Each booking sends two emails (student + coach); if the
  second fails, the booking's `emailStatus` is marked `FAILED` even if the first
  was delivered. Coach-provided fields are HTML-escaped in email and RFC-escaped in
  the ICS. No reschedule/cancel updates (`METHOD:CANCEL`/`SEQUENCE`) yet.
- **Coach trust (PR #10):** fields are **optional and self-reported** (no
  verification). **Existing prod coaches have them empty**, so production renders
  the **fallback** everywhere (derived "Best for", neutral credential, no
  cases-coached chip, initials avatar) until coaches fill them in. **Photo
  *upload* is not built** — only `photoUrl` + `Avatar` rendering + initials
  fallback ship; there is no UI to set a photo yet (Vercel Blob upload is the
  planned follow-on). The API still accepts a `photoUrl` (harmless, dormant).
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

## 9. Current roadmap, bottlenecks & next priorities

**Done:** ~~Timezone (PR #3)~~ · ~~Meeting rooms + invites (PR #5)~~ ·
~~"Down to Case" email live (PRs #6–#7)~~ · ~~Student preferences edit form
(PR #9)~~ · ~~Coach Trust MVP (PR #10)~~ · ~~"Down to Case" homepage rebrand &
candidate-first positioning (PR #11)~~ · ~~Stripe payments Phase 1: built, merged
dormant, validated end-to-end in test mode (PR #12; webhook + payout-release still
to validate; Connect error fix pending in PR #13)~~.

**Current bottlenecks** (from the PR #10 production smoke test, 2026‑06‑11):
- **Supply is the binding constraint** — production has **~1 bookable coach**
  ("12 open sessions across 1 coach"). The trust UI only pays off with coaches to
  compare; existing prod coaches stay unbookable until they configure a meeting room.
- **Trust fields are empty in prod** — everything renders as the fallback until
  coaches populate best-for / cases / current-former / photo, and there is **no
  photo-upload UI** to capture headshots yet.
- Payments are **simulated in production** (Stripe Phase 1 is built + validated
  in test, but dormant ⇒ no revenue yet); auth is **not production-grade**
  (passwordless, anyone with an email can sign in).

**Recommended next priorities** (confirm with the operator before building):
1. **Coach onboarding — unified "Get booking-ready" checklist** *(next; designed
   & approved, not yet built).* One card atop the coach dashboard listing the
   required steps (profile ✓, rate ✓, meeting room, **availability**, connect
   payouts) with progress, one-click CTAs, a green "ready to accept bookings"
   state, and a clear "what's blocking" line; consolidates today's meeting-room +
   payouts banners; **no schema change** (derives from existing fields). Cuts
   silent coach drop-off (esp. coaches who never paint availability). Separate PR
   off `main`; ships safely with payments off.
2. **Finish Stripe Phase 1 → live rollout** — validate the **webhook** and the
   **payout-release cron/transfer** in test, merge the PR #13 Connect fix to
   `main`, then the live migration (live Connect activation, live keys/webhook,
   reset test Connect ids, flip `PAYMENTS_ENABLED`). See `docs/stripe-phase1.md`.
   *(Operator deferred taxes / refunds / disputes / accounting for now.)*
3. **Photo upload (Vercel Blob) + profile polish** — PR #10 follow-on that
   activates the trust UI (reuses the `photoUrl` column; **no schema change**).
4. **Coach supply / acquisition** — outreach + onboarding; liquidity matters most.
5. **Then:** mobile single-day calendar; reschedule/cancel
   (`METHOD:CANCEL`/`SEQUENCE` ICS + re-notify); real ratings/reviews; GTM.

> 🚫 **Don't start new feature work without an explicit operator go-ahead** —
> propose an approach first and wait for approval. The immediate next build is
> the coach **"Get booking-ready" checklist** (#1 above), already designed &
> approved with the operator.

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
`components/MeetingActions.tsx` (meeting details + Join/calendar; student vs coach
variant), `components/CoachSignupForm.tsx` (signup **and** edit/prefill),
`app/signup/coach/page.tsx`, `app/dashboard/page.tsx`, `app/api/bookings/route.ts`
(+ `[id]/ics`), `app/api/coaches/route.ts`, `lib/availability.ts` (generation),
`lib/timezone.ts` (tz/DST math), `lib/viewer-tz.ts` (viewer zone cookie),
`components/TimezoneSync.tsx`, `lib/ics.ts` (RFC 5545 builder), `lib/email.ts`
(Resend shim), `lib/calendar-links.ts` (Google/Outlook links), `lib/prisma.ts`,
`lib/session.ts`, `lib/payments.ts`, `prisma/schema.prisma`, `prisma/seed.ts`.

**Useful scripts:** `npm run dev`, `npm run build`, `npm run lint`,
`npm run db:setup`, `npm run db:seed`, `npm run db:reset`.

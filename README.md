# CaseCoach

A two-sided marketplace that connects students prepping for **consulting case
interviews** with current and former **MBB** (McKinsey, Bain, BCG) consultants
who offer 1:1 coaching.

The whole product is built around **low friction on both sides**: no passwords,
no resume uploads, browsing is free, and signup takes about a minute whether
you're a student or a coach.

---

## What's in v1

- **Landing page** explaining the value prop with separate paths for students and coaches.
- **Low-friction signup** for both sides (name + email + a few preferences). Idempotent on email, so re-submitting just updates your profile.
- **Coach directory** — browse, search, and filter coaches by firm, focus area, and rate; sort by rate or experience. Seeded with realistic coaches so it's never empty.
- **Coach profiles** with bio, focus areas, availability, and a **"Request a session"** panel.
- **Request flow** — a student sends a request; the coach **accepts or declines** from their dashboard. On accept, both sides see each other's email to coordinate.
- **Role-aware dashboards** — students track their requests; coaches triage incoming ones.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | lucide-react |
| Database | SQLite via Prisma 7 (better-sqlite3 driver adapter) |
| Auth | Lightweight signed-cookie sessions (passwordless) |

## Quick start

```bash
npm install          # installs deps; postinstall runs `prisma generate`
npm run db:setup     # creates the SQLite DB and seeds demo coaches/students
npm run dev          # http://localhost:3000
```

That's it — no `.env` required for local dev (SQLite defaults are baked in).
Copy `.env.example` to `.env` if you want to override `DATABASE_URL` or set a
`SESSION_SECRET`.

### Try the demo accounts

Sign in at `/login` (no password — just the email) using seeded accounts:

| Role | Email |
| --- | --- |
| Coach | `maya.chen@coach.test` |
| Coach | `priya.nair@coach.test` |
| Student | `jordan@student.test` |
| Student | `sam@student.test` |

Or just create your own from the landing page.

## Useful scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:setup` | Push schema + seed (first-time setup) |
| `npm run db:seed` | Re-seed demo data |
| `npm run db:reset` | Wipe, re-push schema, and re-seed |
| `npm run lint` | ESLint |

## Project structure

```
app/
  page.tsx              # Landing page
  coaches/              # Directory + [id] profile pages
  signup/student|coach  # Signup pages
  login/                # Passwordless sign-in
  dashboard/            # Role-aware dashboard (student & coach views)
  api/                  # Route handlers: students, coaches, requests, auth
  generated/prisma/     # Prisma client (generated; gitignored)
components/             # UI: forms, cards, badges, header/footer
lib/
  prisma.ts             # Prisma client singleton (+ SQLite adapter)
  session.ts            # Signed-cookie sessions + getCurrentUser()
  constants.ts          # Firms, focus areas, status enums
  format.ts             # List (de)serialization + display helpers
  validation.ts         # Tiny request-body coercion/validation
  ui.ts                 # Shared Tailwind class strings
prisma/
  schema.prisma         # Data model
  seed.ts               # Demo coaches, students, sample request
```

## Data model

Three tables: `Student`, `Coach`, and `SessionRequest` (student → coach, with a
`PENDING | ACCEPTED | DECLINED` status). List-like fields (target firms, focus
areas) are stored as JSON-string columns since SQLite has no native arrays;
`lib/format.ts` handles (de)serialization.

## How auth works (and its limits)

Signup/login set a **signed (HMAC) cookie** holding `{ role, id }`. There are no
passwords — by design, to keep friction near zero for an early marketplace.

> ⚠️ This is fine for a demo/MVP but is **not** production-grade auth: anyone who
> knows an email can sign in as that user. Before going live, add real
> verification — magic links or OAuth are the natural next step. The cookie
> signing already lives in `lib/session.ts`, so you'd mostly be adding an
> email/verification step in front of it.

## Deploying

SQLite is great locally but won't persist on most serverless hosts. To ship:

1. Provision Postgres (Neon, Supabase, Vercel Postgres, …).
2. In `prisma/schema.prisma`, set `datasource.provider = "postgresql"`.
3. Swap the adapter in `lib/prisma.ts` for `@prisma/adapter-pg` (or use Prisma's
   Postgres setup) and set `DATABASE_URL`.
4. Set a strong `SESSION_SECRET`.
5. `prisma migrate deploy` (or `db push`) against the new database.

## Ideas for next

- Email verification / magic-link sign-in
- Reviews & ratings for coaches
- In-app scheduling and payments (Stripe Connect)
- Messaging instead of email handoff
- Smarter coach recommendations from a student's focus areas

---

> Demo project — not affiliated with or endorsed by McKinsey & Company, Bain &
> Company, or Boston Consulting Group.

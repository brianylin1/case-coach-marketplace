<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CaseCoach — project notes

Two-sided marketplace connecting students (case-interview prep) with MBB
coaches. See `README.md` for the full overview.

## Stack specifics worth knowing

- **Prisma 7** uses a WASM query compiler + **driver adapters** (no Rust engine).
  The client is generated to `app/generated/prisma/` (gitignored) and the
  runtime needs a SQLite adapter — wired up in `lib/prisma.ts` via
  `@prisma/adapter-better-sqlite3`. The datasource URL lives in
  `prisma.config.ts`, not in `schema.prisma`.
- **Lists** (target firms, focus areas) are JSON-string columns — SQLite has no
  scalar lists or enums. Use `parseList` / `serializeList` from `lib/format.ts`,
  and the string unions/validators in `lib/constants.ts`.
- **Sessions** are signed cookies (`lib/session.ts`). `getCurrentUser()` is the
  one helper to read the logged-in student/coach. Server-only — never import it
  from a `"use client"` component.
- **lucide-react** here is v1: brand icons (e.g. `Linkedin`) were removed.

## Conventions

- Mutations go through `app/api/**` route handlers; pages read data directly
  from Prisma in server components.
- Shared button/input/card classes are in `lib/ui.ts` — reuse them.
- After schema changes: `npm run db:push` (and `npm run db:seed` if needed).

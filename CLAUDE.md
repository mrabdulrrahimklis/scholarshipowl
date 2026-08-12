# CLAUDE.md — Admissions Readiness Dashboard

Project-level guidance for Claude Code. See the root `README.md` for full setup.

## What this is

A standalone EdTech full-stack app: a student onboards, picks a program, gets a
tailored readiness checklist with due dates computed from the program deadline, a
live readiness score, a missing-items callout, and a chronological timeline.

## Stack (decided — do not swap without asking)

- **Backend** (`backend/`): **GraphQL-only** API (GraphQL Yoga on Express), **run on
  Node via `tsx`** (NOT Bun), Prisma + `better-sqlite3` adapter over **SQLite**, Zod
  validation, Vitest. Single endpoint `/graphql`. Resolvers in `graphql/schema.ts` are
  thin — parse inputs with Zod, delegate to `services/*`. Add features to the service
  layer, then expose them in the schema. (No REST.)
- **Frontend** (`frontend/`): Nuxt 3, Tailwind, **Headless UI** (not shadcn/reka-ui),
  Pinia, Vitest (unit) + Playwright (E2E).

## Conventions

- **Node, not Bun, for the backend.** Prisma's engine segfaults under Bun 1.1.x even
  with the driver adapter (exit 139). Scripts use `tsx`/Vitest. Keep it on Node.
- **Keep the domain logic pure.** `backend/src/domain/{dueDate,readiness}.ts` have no
  DB/IO so they stay unit-testable — put business rules there, not in services/routes.
- **Validate at the edge with Zod** (`backend/src/validation/schemas.ts`). SQLite has no
  enums, so enum-like fields are `String` in Prisma and constrained by Zod instead.
- **Dates are `YYYY-MM-DD` strings** end to end (matches the pure date math). Don't switch
  to `DateTime` columns.
- **Timeline is a persisted table** (`timeline_events`), synced with the checklist via
  `syncTimelineEvents` on generation + status changes; served by `GET …/timeline`.
- **Checklist generation is idempotent** via `@@unique([profileId, requirementId])`.
- **UI:** brand orange `#f97316` = the `secondary` variant (used for primary CTAs); white
  primary; black text. Reusable UI lives in `frontend/components/ui/*`; app components at
  `frontend/components/*`. Auto-imported by bare name (no path prefix).
- **Error shape:** all API errors return `{ error: { code, message, details? } }`.

## Commands

Backend (`backend/`): `npm run dev` · `npm test` · `npm run db:push` · `npm run seed`
· `npm run lint` · `npm run typecheck`.
Frontend (`frontend/`): `npm run dev` · `npm run test:unit` · `npm run test:e2e` · `npm run lint`.
Docker (root): `WEB_PORT=3001 docker compose up -d --build` (api + web; SQLite in a volume).

Project slash commands (in `.claude/commands/`): **/dev**, **/test**, **/db-reset**,
**/lint**, **/apidocs**.

## Gotchas

- Host port **3000** is often taken → start the UI with `WEB_PORT=3001` (CORS already
  allows 3000/3001; the E2E port **3100** is in `backend/.env`).
- Docker networking: the browser calls the API at `localhost:4000`
  (`NUXT_PUBLIC_API_BASE`); Nuxt **SSR** calls it at `http://api:4000` internally
  (`NUXT_API_BASE_SERVER`). Don't collapse these into one URL.
- `tsx`/Vitest don't auto-load `.env` — `backend/src/env.ts` loads it via
  `process.loadEnvFile()`; in Docker the vars come from compose.
- API explorer: GraphiQL at `/graphql` (self-documenting from the schema in
  `backend/src/graphql/schema.ts`). GraphQL-only — no REST, no Swagger. Keep
  it in sync when endpoints change.

## Testing expectations

Write/keep tests for new features. Core coverage: backend Vitest (pure domain + one API
flow), frontend Vitest (composables/components), Playwright (the full readiness flow).

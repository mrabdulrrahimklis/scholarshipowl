# Admissions Readiness Dashboard

A standalone full-stack app for an EdTech admissions-readiness workflow. A student
onboards, browses/searches programs, and gets a tailored **readiness checklist** with
due dates computed from the program deadline. A dashboard shows a live **readiness
score**, a **missing-items** callout, and a chronological **timeline**. Marking items
complete updates the score and timeline immediately, and progress persists across
visits.

Stretch features are also implemented: **multiple programs per profile with a
readiness comparison**, **counselor notes per requirement**, and a **reminder system**
for upcoming/overdue due dates.

## Stack

| Layer         | Tech                                                                                |
| ------------- | ----------------------------------------------------------------------------------- |
| Runtime       | Node 22 (via `tsx`)                                                                 |
| API           | **GraphQL** (GraphQL Yoga on Express) — single `/graphql` endpoint                   |
| ORM / DB      | Prisma + `better-sqlite3` driver adapter · **SQLite**                               |
| Validation    | Zod                                                                                 |
| Backend tests | Vitest (unit + integration)                                                         |
| UI            | Nuxt 3 · Tailwind CSS · Headless UI · Pinia                                         |
| UI tests      | Vitest (unit) · Playwright (E2E)                                                    |
| Lint / format | ESLint + Prettier (both apps)                                                       |
| Container     | Docker (api + web; SQLite on a volume)                                              |
| CI            | GitHub Actions (all three suites)                                                   |

> **Why Node, not Bun:** Prisma's engine segfaults under Bun 1.1.x (even with the
> better-sqlite3 driver adapter), so the API runs on Node via `tsx`. Node + Prisma +
> SQLite is rock-solid.

```
scholarshipowl/
├── docker-compose.yml       # api + web (SQLite lives in a volume)
├── .github/workflows/ci.yml # lint · typecheck · Vitest · Playwright
├── backend/                 # GraphQL API (Yoga) + Prisma (SQLite)
│   ├── prisma/schema.prisma
│   └── src/{domain,services,graphql,validation,db}
└── frontend/                # Nuxt 3 UI (Headless UI + Tailwind)
    ├── pages/ components/ stores/ composables/
    └── tests/{unit,e2e}
```

## Prerequisites

- **Docker** (Compose v2) — enough on its own for the quick start
- **Node 22** — only for host dev and running the test suites locally

## Quick start — everything in Docker (one command)

From the repo root:

```bash
docker compose up --build
# If host port 3000 is busy:  WEB_PORT=3001 docker compose up --build
```

That builds and starts two containers on one network (SQLite is a file on a volume, so
there's no database container). The `api` container applies the schema and seeds
deterministic data automatically on startup — no manual steps.

| URL                               | What                                          |
| --------------------------------- | --------------------------------------------- |
| **http://localhost:3000**         | App (UI) — or `:3001` if you set `WEB_PORT`   |
| **http://localhost:4000/graphql** | GraphQL API + interactive **GraphiQL** playground |

Stop with `docker compose down` (add `-v` to also drop the SQLite volume).

## Host dev (hot reload)

No database container needed — the API uses a local SQLite file.

```bash
# Backend (Node) → http://localhost:4000
cd backend
cp .env.example .env          # DATABASE_URL=file:./dev.db
npm install
npm run db:push               # create tables in prisma/dev.db
npm run seed                  # deterministic programs + requirements
npm run dev

# Frontend → http://localhost:3000
cd frontend
cp .env.example .env          # NUXT_PUBLIC_API_BASE=http://localhost:4000/graphql
npm install
npm run dev
```

## Tests

```bash
# Backend — Vitest (unit + integration)  [32 tests]
cd backend && npm install && npm run db:push && npm run seed && npm test

# Frontend — Vitest unit                 [11 tests]
cd frontend && npm install && npm run test:unit

# Frontend — Playwright E2E              [3 flows]  (needs the API on :4000)
cd frontend && npx playwright install chromium && npm run test:e2e
```

- **Backend:** pure-logic units (`dueDate`, `readiness`, `reminders`) + GraphQL
  integration tests covering the core flow, stretch features, and the persisted timeline.
- **Frontend unit:** composable + component tests.
- **E2E:** the full readiness flow, profile edit, and all stretch features. Playwright
  boots the Nuxt dev server itself on port **3100** (override with `E2E_PORT`); the API
  must be running on `:4000` with that port allowed in `CORS_ORIGIN` (already in
  `backend/.env.example`).

CI (`.github/workflows/ci.yml`) runs all three suites on every push/PR.

## Data model

Prisma schema: `backend/prisma/schema.prisma`. Tables:

- **`programs`** — id, name, degreeType, institution, description, applicationDeadline
- **`requirements`** — belongs to a program; type, title, dueOffsetDays, required, evidenceType
- **`student_profiles`** — id, name, email, educationLevel, gpa, testScores, targetTerm
- **`checklist_items`** — surrogate `id` PK + `@@unique([profileId, requirementId])`;
  status, dueDate, notes, counselorNotes
- **`timeline_events`** — id, title, date, status, relatedRequirementId (+ profileId,
  programId, required). Persisted per the suggested data model and kept in sync with the
  checklist on generation and every status change (`syncTimelineEvents`).

Notes: SQLite has no native enums, so enum-like fields are stored as `String` and
validated at the API edge with Zod. Dates are `String` (`YYYY-MM-DD`) so the pure domain
logic is deterministic and timezone-independent.

**Rules & computation**

- `dueDate = applicationDeadline − dueOffsetDays` (UTC, deterministic).
- A required requirement is **missing** if it has no checklist item or status ≠ `complete`.
- **Readiness score** = completed required / total required (0-of-0 required ⇒ 1.0).

**Working with the DB** (run in `backend/`): `npm run db:push` (apply schema) ·
`npm run seed` (deterministic, idempotent seed) · `npm run migrate` (versioned) ·
`npx prisma studio` (GUI). Connection: `DATABASE_URL=file:./dev.db`; the runtime resolves
its own path, overridable with `SQLITE_DB_PATH` (Docker uses `/data/dev.db`).

## API — GraphQL only

Single endpoint: **`http://localhost:4000/graphql`**. Open it in a browser for the
interactive **GraphiQL** playground (schema browser + query runner). Schema + resolvers:
`backend/src/graphql/schema.ts`.

- **Queries:** `health`, `programs`, `program`, `profile`, `checklist`, `readiness`,
  `timeline`, `programSummaries`, `reminders`
- **Mutations:** `createProfile`, `updateProfile`, `createChecklist`, `updateChecklistItem`
- Every input is validated with Zod inside the resolver; errors carry an
  `extensions.code` (e.g. `BAD_USER_INPUT`, `not_found`) with per-field details, while
  genuine server errors are masked. Liveness: `GET /graphql/health` (or the `health` query).

```graphql
mutation {
  createChecklist(profileId: "…", programId: "prog-cs-bachelors") {
    readinessScore
    missingRequirements {
      title
      dueDate
    }
    timeline {
      title
      date
      status
    }
  }
}
```

## Features

**Core:** onboarding intake (validated) → program catalog (search + degree filter +
pagination + detail) → checklist generation → dashboard (readiness ring, missing callout,
checklist grouped by category with complete-toggle + notes, chronological timeline) →
persistence (revisit re-evaluates). All acceptance criteria met.

**Stretch:**

- **Multiple programs + comparison** — a **My Programs** page ranks every started program
  by readiness; the dashboard has a program switcher (`?program=`).
- **Counselor notes per requirement** — a dedicated field per checklist item, distinct
  from the student's own notes, highlighted in the UI.
- **Reminders** — a **Reminders** page listing overdue + upcoming incomplete items across
  all programs, with a selectable window and a guiding empty state.

Bonus: a `?profile=<id>` deep link loads a specific profile (handy for demos/tracking —
see `npm run seed:demo`).

## Design decisions & tradeoffs

- **Pure domain core.** `domain/{dueDate,readiness,reminders}.ts` are pure functions with
  no DB, so the business rules are trivially unit-tested and can't drift from the API.
- **Thin GraphQL resolvers over a service layer.** Resolvers in `graphql/schema.ts`
  parse inputs with Zod and delegate to `services/*` — the resolvers hold no business
  logic, so the API stays a thin, testable shell over the services.
- **Timeline persisted + synced.** `timeline_events` is a real table (per the suggested
  model); `syncTimelineEvents` keeps it consistent with the checklist. The readiness
  payload still computes its timeline purely, so scoring has no DB dependency.
- **Idempotent checklist generation** via `@@unique([profileId, requirementId])` — revisiting
  re-evaluates without wiping progress.
- **Optimistic UI + authoritative refetch** — toggling an item updates local state
  immediately, then refetches readiness for exact sync.
- **`prisma db push`** (not versioned migrations) to stay in the timebox.

## What I'd improve with more time

- **Auth / multi-user.** Profiles are identified by an id kept in `localStorage`, so
  anyone with the id can read/write it. This is the top real gap.
- **Versioned migrations** (`prisma migrate`) instead of `db push`.
- **More coverage:** negative-path E2E, store-level unit tests, more component tests.
- **Observability:** request logging, structured errors, rate limiting on writes.
- **Richer counselor notes:** author/timestamp and true role separation once auth exists.

## Evaluation (against the rubric)

| Criterion         | How it's met                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Correctness**   | Full flow + all acceptance criteria (checklist generation, `dueDate = deadline − offset`, live score, in-sync missing list, chronological timeline). All 6 spec API operations + the 3 stretch ideas. |
| **Code quality**  | Layered structure (`domain` → `services` → `graphql`); resolvers are thin over the services; validation shared via Zod; TypeScript throughout; ESLint + Prettier green in both apps.                   |
| **API/UI design** | A single, self-documenting GraphQL schema (browse + run in GraphiQL); coded, per-field validation errors; sensible, validated UX.                                                                     |
| **Testing**       | Backend 32 (Vitest), frontend 11 (Vitest), E2E 3 (Playwright) — the core flow is covered end to end; CI runs them on every push.                                                                      |
| **Communication** | This README (setup, tests, API, DB), documented tradeoffs + "what I'd improve", plus `TODO.md` and a project `CLAUDE.md`.                                                                             |

**Known gap (documented, not hidden):** no auth yet — see "What I'd improve".

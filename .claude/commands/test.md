---
description: Run all test suites (backend Vitest, frontend unit, Playwright E2E)
---
Run the full test matrix and summarize pass/fail in a short table.

1. Backend (Vitest): `cd backend && npm test`. If it's a fresh checkout, first run `npm run db:push && npm run seed`.
2. Frontend unit (Vitest): `cd frontend && npm run test:unit`.
3. Frontend E2E (Playwright): ensure the API is running on :4000 with CORS allowing the test port (3100 is already in `backend/.env`), then `cd frontend && npm run test:e2e`. Playwright boots the Nuxt dev server itself on :3100. First run needs `npx playwright install chromium`.

Report totals for each suite and stop on the first failing suite unless asked to continue.

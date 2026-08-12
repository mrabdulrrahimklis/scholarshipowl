---
description: Lint, format, and typecheck both apps
---
Run lint/format/typecheck across the repo and report remaining issues.

1. Backend: `cd backend && npm run format && npm run lint && npm run typecheck`.
2. Frontend: `cd frontend && npm run format && npm run lint`.

Both `lint` scripts run ESLint then Prettier `--check`. Fix anything ESLint reports; formatting is auto-applied by `format`.

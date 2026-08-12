---
description: Start the full stack locally and report the URLs
---
Start the admissions-readiness app and report the URLs.

Preferred (Docker, one command, from the repo root):
1. Run `WEB_PORT=3001 docker compose up -d --build` (host port 3000 is often taken; if it's free, omit `WEB_PORT` and the UI is on 3000).
2. Wait until `curl -s -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' -d '{"query":"{health}"}'` returns `{"data":{"health":"ok"}}` (the `api` container auto-applies the schema and seeds on startup).
3. Report: UI → http://localhost:3001, GraphQL API (GraphiQL) → http://localhost:4000/graphql.

If the user wants host dev with hot reload instead:
- Backend: `cd backend && npm install && npm run db:push && npm run seed && npm run dev` (Node/tsx on :4000).
- Frontend: `cd frontend && npm install && npm run dev` (Nuxt on :3000).

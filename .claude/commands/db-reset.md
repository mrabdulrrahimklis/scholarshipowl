---
description: Reset the SQLite database and reseed deterministic data
---
Reset the backend database to a clean, seeded state.

Host (SQLite file):
1. From `backend/`: `rm -f prisma/dev.db prisma/dev.db-journal`.
2. Recreate schema: `npm run db:push`.
3. Reseed: `npm run seed`.
4. Confirm the counts (expect 5 programs, 30 requirements).

Docker: `docker compose down -v` then `WEB_PORT=3001 docker compose up -d --build` — the `api` container re-pushes the schema and reseeds automatically on startup.

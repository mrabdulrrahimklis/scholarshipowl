#!/bin/sh
set -e

echo "→ Applying database schema to SQLite (prisma db push)…"
npx prisma db push --skip-generate

echo "→ Seeding deterministic data (idempotent)…"
npx tsx src/db/seed.ts

echo "→ Starting API…"
exec npx tsx src/index.ts

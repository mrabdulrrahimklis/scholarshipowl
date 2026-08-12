# Admissions Readiness API — Node + Express + Prisma (SQLite).
# Runs on Node (not Bun) because Prisma's engine is unstable under Bun.
FROM node:22-bookworm-slim AS base
WORKDIR /app

# openssl silences a Prisma engine-detection warning (unused with the SQLite
# driver adapter, but keeps startup logs clean).
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies. Copy the prisma schema first so the postinstall
# `prisma generate` step can find it. better-sqlite3 ships prebuilt binaries
# for glibc (bookworm-slim), so no compiler toolchain is needed.
COPY package.json ./
COPY prisma ./prisma
RUN npm install

# App source
COPY . .

ENV PORT=4000
EXPOSE 4000

# On start: apply schema to the SQLite file, seed (idempotent), run the server.
ENTRYPOINT ["./docker-entrypoint.sh"]

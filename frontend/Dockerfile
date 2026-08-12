# Admissions Readiness UI — Nuxt 3 (SSR), built with Bun
FROM oven/bun:1.1 AS build
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .
# Produces the Nitro server bundle in /app/.output
RUN bun run build

# ---- Runtime image (only the built output) ----
FROM oven/bun:1.1 AS runtime
WORKDIR /app
COPY --from=build /app/.output ./.output

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]

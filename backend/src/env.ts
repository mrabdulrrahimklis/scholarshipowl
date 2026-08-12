import { z } from "zod";

// tsx/Node (unlike Bun) don't auto-load .env. Load it here so runtime config
// (PORT, CORS_ORIGIN, DATABASE_URL) is picked up. In Docker the vars come from
// the container environment instead, so a missing .env is fine.
try {
  process.loadEnvFile();
} catch {
  // no .env file — rely on process.env (Docker/CI)
}

const schema = z.object({
  // SQLite connection string used by the Prisma CLI (db push/migrate). The
  // runtime client resolves its own path (see db/client.ts), so this only needs
  // to be set for CLI commands — hence a default here.
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());

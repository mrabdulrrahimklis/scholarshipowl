import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The Prisma default query engine crashes under Bun, so we use the in-process
// better-sqlite3 driver adapter instead.
//
// The DB file lives next to schema.prisma in prisma/dev.db. We resolve it from
// this source file so the path is independent of the current working directory
// (Prisma CLI resolves file: URLs relative to the schema; the adapter would
// resolve relative to cwd — resolving here keeps both pointing at the same DB).
// SQLITE_DB_PATH overrides it (used in Docker to point at a mounted volume).
const here = path.dirname(fileURLToPath(import.meta.url)); // backend/src/db
const dbFile = process.env.SQLITE_DB_PATH ?? path.resolve(here, "../../prisma/dev.db");

const adapter = new PrismaBetterSQLite3({ url: `file:${dbFile}` });

export const prisma = new PrismaClient({ adapter });
export type DB = typeof prisma;

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// node-postgres + a shared pool, per Neon's guidance for Vercel Fluid compute.
// DATABASE_URL should be the pooled (-pooler) connection string.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool; // survive dev hot reloads

// Lets Vercel close idle connections before a function instance is suspended.
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
export { pool };

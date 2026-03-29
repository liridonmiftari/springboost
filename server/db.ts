import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const databaseExplicitlyDisabled =
  process.env.DISABLE_DATABASE === "true" ||
  process.env.DISABLE_DATABASE === "1";

const shouldUseDatabase =
  !databaseExplicitlyDisabled &&
  !!process.env.DATABASE_URL &&
  process.env.VERCEL !== "1";

export const pool = shouldUseDatabase
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

export const db = pool ? drizzle(pool, { schema }) : undefined;

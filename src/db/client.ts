import { neon } from "@neondatabase/serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | undefined;

/** Neon's HTTP driver in production; node-postgres for a local database. */
export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  cached = (isLocal ? drizzlePg(url, { schema }) : drizzleNeon(neon(url), { schema })) as unknown as Db;
  return cached;
}

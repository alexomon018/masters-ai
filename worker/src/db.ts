// Drizzle ORM instance bound to a D1 database. Built per-request because the
// D1Database binding is request-scoped on Cloudflare Workers — caching across
// requests would cross-pollinate environments in preview deployments.

import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "./env";

export type Database = ReturnType<typeof getDb>;

export function getDb(env: Env) {
	return drizzle(env.THREAD_INDEX, { schema });
}

export { schema };

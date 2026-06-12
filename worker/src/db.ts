import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "./env";

export type Database = ReturnType<typeof getDb>;

export function getDb(env: Env) {
	return drizzle(env.THREAD_INDEX, { schema });
}

export { schema };

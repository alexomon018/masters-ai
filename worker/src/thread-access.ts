import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Env } from "./env";

const AGENT_PATH_RE = /^\/agents\/masters-chat-agent\/([^/]+)/;

export function extractThreadId(pathname: string): string | null {
	const match = AGENT_PATH_RE.exec(pathname);
	return match?.[1] ?? null;
}

export type ThreadAccessResult =
	| { ok: true }
	| { ok: false; status: number; reason: string };

// Unclaimed threads pass through (eager WS connect before first submit).
export async function checkThreadAccess(
	env: Env,
	userId: string,
	threadId: string
): Promise<ThreadAccessResult> {
	const db = getDb(env);
	const row = await db
		.select({
			userId: schema.threadsTable.userId
		})
		.from(schema.threadsTable)
		.where(eq(schema.threadsTable.threadId, threadId))
		.get();

	if (!row) return { ok: true };
	if (row.userId === userId) return { ok: true };
	return { ok: false, status: 403, reason: "Thread access denied" };
}

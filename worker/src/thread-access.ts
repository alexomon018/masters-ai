// Thread ownership gate. Runs on every WS upgrade (`onBeforeConnect`) and
// REST hit (`onBeforeRequest`) into `/agents/*`. Authentication only proves
// *who* the caller is; this check proves they're allowed to talk to *this
// specific* thread room.
//
// First-claim semantics: if no D1 row exists for `(userId, threadId)` AND
// no row exists for any *other* user with that threadId, the room is
// unclaimed and access is permitted. The first submit's
// `upsertThreadRemote` then writes the row, locking the thread to the
// caller. With v4 UUIDs (122 bits of entropy) racing a legitimate user to
// claim their freshly-minted id is infeasible.

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

/**
 * Permit access iff (a) the thread is owned by `userId`, or (b) no other
 * user owns it yet. Case (b) covers the eager-connect on `/` where the WS
 * opens before the first submit writes the D1 row.
 */
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

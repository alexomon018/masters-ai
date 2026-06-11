import { getDb } from "./db";
import { makeThreadRepo } from "./repository/threads";
import type { Env } from "./env";

const AGENT_PATH_RE = /^\/agents\/masters-chat-agent\/([^/]+)/;

export function extractThreadId(pathname: string): string | null {
	const match = AGENT_PATH_RE.exec(pathname);
	return match?.[1] ?? null;
}

export type ThreadAccessResult =
	| { ok: true }
	| { ok: false; status: number; reason: string };

const DENIED: ThreadAccessResult = {
	ok: false,
	status: 403,
	reason: "Thread access denied"
};

// Unclaimed threads pass through (eager WS connect before first submit).
// A thread counts as claimed by someone else if ANY row for the threadId
// belongs to another user — the (userId, threadId) PK makes duplicate rows
// possible, and a contested id must never resolve in favour of the intruder.
export async function checkThreadAccess(
	env: Env,
	userId: string,
	threadId: string
): Promise<ThreadAccessResult> {
	const owners = await makeThreadRepo(getDb(env)).listOwnerIds(threadId);
	if (owners.length === 0) return { ok: true };
	return owners.every((o) => o === userId) ? { ok: true } : DENIED;
}

// Claim the thread for `userId` at the first chat message. Inserting the row
// server-side (instead of trusting the client POST /threads that follows)
// closes the window where a thread with history sat unclaimed in D1.
export async function claimThread(
	env: Env,
	userId: string,
	threadId: string
): Promise<ThreadAccessResult> {
	const repo = makeThreadRepo(getDb(env));
	const owners = await repo.listOwnerIds(threadId);
	if (owners.length > 0) {
		return owners.every((o) => o === userId) ? { ok: true } : DENIED;
	}
	const now = new Date();
	await repo.upsert({
		userId,
		threadId,
		title: null,
		pinned: false,
		createdAt: now,
		updatedAt: now,
		lastMessageAt: now
	});
	return { ok: true };
}

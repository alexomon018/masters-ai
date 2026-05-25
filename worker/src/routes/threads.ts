// Thread index REST surface. The browser hits these to populate the
// sidebar and to rename / pin / delete threads. All requests pass through
// `authenticateAgentConnection` in worker.ts so by the time we land here
// we know the caller's userId (either `user:<clerkId>` or `anon:<cookie>`).
//
// The actual chat history lives in each thread's Durable Object — D1 only
// holds the lightweight metadata the sidebar needs: id, title, pin flag,
// timestamps.

import { getAgentByName } from "agents";
import { z } from "zod";
import { verifyAnonId } from "../anonId";
import { getDb } from "../db";
import { makeThreadRepo } from "../repository/threads";
import type { NewThread } from "../../db/schema";
import type { Env } from "../env";

interface AuthedRequest {
	userId: string;
}

// `/threads` POST body. The sidebar uses this for both create-on-first-
// send and rename/pin updates, so most fields are optional. Validated at
// the route boundary in worker.ts — never trust the cast.
const THREAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const upsertBodySchema = z.object({
	threadId: z.string().regex(THREAD_ID_RE),
	title: z.string().max(120).nullable().optional(),
	pinned: z.boolean().optional(),
	lastMessageAt: z.number().int().nonnegative().optional()
});
export type UpsertBody = z.infer<typeof upsertBodySchema>;

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function listThreads(
	env: Env,
	auth: AuthedRequest
): Promise<Response> {
	const repo = makeThreadRepo(getDb(env));
	const rows = await repo.listForUser(auth.userId);
	return json(
		rows.map((r) => ({
			id: r.threadId,
			title: r.title ?? "New Chat",
			pinned: r.pinned,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
			lastMessageAt: r.lastMessageAt
		}))
	);
}

export async function upsertThread(
	env: Env,
	auth: AuthedRequest,
	body: UpsertBody
): Promise<Response> {
	const repo = makeThreadRepo(getDb(env));
	const now = new Date();
	const existing = await repo.get(auth.userId, body.threadId);
	const row: NewThread = {
		userId: auth.userId,
		threadId: body.threadId,
		title: body.title ?? existing?.title ?? "New Chat",
		pinned: body.pinned ?? existing?.pinned ?? false,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		lastMessageAt:
			body.lastMessageAt !== undefined ? new Date(body.lastMessageAt) : now
	};
	await repo.upsert(row);
	return json({ ok: true });
}

export async function deleteThread(
	env: Env,
	auth: AuthedRequest,
	threadId: string
): Promise<Response> {
	const repo = makeThreadRepo(getDb(env));
	await repo.delete(auth.userId, threadId);
	// Also drop the DO's persisted history. Fire-and-forget — D1 is the
	// source of truth for whether the row "exists" from the user's POV.
	try {
		const agent = await getAgentByName(env.MastersChatAgent, threadId);
		await agent.clearHistory();
	} catch {
		// DO may have never been instantiated. Nothing to clear.
	}
	return new Response(null, { status: 204 });
}

// Cascade-delete for account removal. Drops every D1 row owned by the
// user and clears the persisted history of every per-thread DO. Called
// from the Next.js delete-user route as part of GDPR-style account
// deletion — without this, threads and chat history would survive the
// Clerk user being removed.
// Re-key every D1 thread row from the caller's former anon identity to their
// Clerk account. Requires an authenticated ticket plus the signed anonId
// cookie value so a random signed-in user cannot harvest someone else's anon
// history.
export async function claimAnonThreads(
	env: Env,
	auth: AuthedRequest,
	anonIdSigned: string
): Promise<Response> {
	if (!auth.userId.startsWith("user:")) {
		return json({ error: "authenticated user required" }, 403);
	}
	if (!env.ANON_ID_SECRET) {
		return json({ error: "server misconfigured" }, 500);
	}

	const rawId = await verifyAnonId(anonIdSigned, env.ANON_ID_SECRET);
	if (!rawId) {
		return json({ error: "invalid anonId" }, 400);
	}

	const fromUserId = `anon:${rawId}`;
	if (fromUserId === auth.userId) {
		return json({ ok: true, reassigned: 0 });
	}

	const repo = makeThreadRepo(getDb(env));
	const reassigned = await repo.reassignUser(fromUserId, auth.userId);
	return json({ ok: true, reassigned });
}

export async function deleteAllForUser(
	env: Env,
	auth: AuthedRequest
): Promise<Response> {
	const repo = makeThreadRepo(getDb(env));
	const rows = await repo.listForUser(auth.userId);

	// Clear each thread's DO history in parallel. Failures are tolerated —
	// the DO may not exist, and D1 is the source of truth either way.
	await Promise.allSettled(
		rows.map(async (r) => {
			try {
				const agent = await getAgentByName(env.MastersChatAgent, r.threadId);
				await agent.clearHistory();
			} catch {
				// ignored — DO may not exist
			}
		})
	);

	const removed = await repo.deleteAllForUser(auth.userId);
	return json({ ok: true, removed });
}

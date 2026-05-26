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
	try {
		const agent = await getAgentByName(env.MastersChatAgent, threadId);
		await agent.clearHistory();
	} catch {
		// DO may never have been instantiated.
	}
	return new Response(null, { status: 204 });
}

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

	await Promise.allSettled(
		rows.map(async (r) => {
			try {
				const agent = await getAgentByName(env.MastersChatAgent, r.threadId);
				await agent.clearHistory();
			} catch {
				// ignored
			}
		})
	);

	const removed = await repo.deleteAllForUser(auth.userId);
	return json({ ok: true, removed });
}

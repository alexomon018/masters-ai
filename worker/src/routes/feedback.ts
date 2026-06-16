import { z } from "zod";
import { getDb } from "../db";
import { makeFeedbackRepo } from "../repository/feedback";
import { checkThreadAccess } from "../thread-access";
import type { Env } from "../env";

interface AuthedRequest {
	userId: string;
}

const THREAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const feedbackBodySchema = z.object({
	threadId: z.string().regex(THREAD_ID_RE),
	messageId: z.string().min(1).max(256),
	sentiment: z.enum(["up", "down"]),
	reason: z.string().max(64).nullable().optional(),
	comment: z.string().max(2000).nullable().optional()
});
export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

export const deleteFeedbackBodySchema = z.object({
	threadId: z.string().regex(THREAD_ID_RE),
	messageId: z.string().min(1).max(256)
});
export type DeleteFeedbackBody = z.infer<typeof deleteFeedbackBodySchema>;

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Reject only when a *different* user owns the thread. Unlike upsertThread, we
// do not 404 on a missing row: feedback is keyed by userId and only readable or
// deletable by that same user, so allowing it on an unclaimed thread is
// harmless and avoids blocking a legitimate rater during a claim-timing race.
// Delegates to the canonical thread-access policy so this never drifts from it.
async function denyIfForeignThread(
	env: Env,
	userId: string,
	threadId: string
): Promise<Response | null> {
	const access = await checkThreadAccess(env, userId, threadId);
	if (!access.ok) {
		return json({ error: access.reason }, access.status);
	}
	return null;
}

export async function postFeedback(
	env: Env,
	auth: AuthedRequest,
	body: FeedbackBody
): Promise<Response> {
	const denied = await denyIfForeignThread(env, auth.userId, body.threadId);
	if (denied) return denied;

	const isDown = body.sentiment === "down";
	await makeFeedbackRepo(getDb(env)).upsert({
		userId: auth.userId,
		threadId: body.threadId,
		messageId: body.messageId,
		sentiment: body.sentiment,
		reason: isDown ? (body.reason ?? null) : null,
		comment: isDown ? (body.comment ?? null) : null
	});
	return json({ ok: true });
}

export async function deleteFeedback(
	env: Env,
	auth: AuthedRequest,
	body: DeleteFeedbackBody
): Promise<Response> {
	const denied = await denyIfForeignThread(env, auth.userId, body.threadId);
	if (denied) return denied;

	await makeFeedbackRepo(getDb(env)).delete(
		auth.userId,
		body.threadId,
		body.messageId
	);
	return new Response(null, { status: 204 });
}

export async function getThreadFeedback(
	env: Env,
	auth: AuthedRequest,
	threadId: string
): Promise<Response> {
	if (!THREAD_ID_RE.test(threadId)) {
		return json({ error: "invalid threadId" }, 400);
	}
	const rows = await makeFeedbackRepo(getDb(env)).listForThread(
		auth.userId,
		threadId
	);
	return json(
		rows.map((r) => ({
			messageId: r.messageId,
			sentiment: r.sentiment,
			reason: r.reason,
			comment: r.comment
		}))
	);
}

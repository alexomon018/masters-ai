import { getDb } from "../db";
import { makeMemoryRepo, type MemoryView } from "../repository/memory";
import { tryCatch } from "../../../utils/tryCatch";
import type { Env } from "../env";

// Read/manage the caller's long-term memory. Transparency + control are part of
// the governance story: a user can see exactly what the assistant has retained
// about them and clear it. Scope is enforced by userId in every query.

interface AuthedRequest {
	userId: string;
}

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function serialize(record: MemoryView) {
	return {
		id: record.memoryId,
		type: record.type,
		key: record.key,
		content: record.content,
		source: record.source,
		confidence: record.confidence,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt
	};
}

// D1 failures must come back as a normalized 5xx so the worker's
// withCorsHeaders wrapper still runs; an unhandled throw would escape the route
// dispatch and return a CORS-less 500.
function serverError(): Response {
	return json({ error: "Internal error" }, 500);
}

export async function getMemory(
	env: Env,
	auth: AuthedRequest
): Promise<Response> {
	const { data: records, error } = await tryCatch(
		makeMemoryRepo(getDb(env)).listVisible(auth.userId)
	);
	if (error) {
		console.error("[memory] listVisible failed:", error);
		return serverError();
	}
	return json({
		preferences: records
			.filter((r) => r.type === "preference")
			.map(serialize),
		facts: records.filter((r) => r.type === "fact").map(serialize),
		episodes: records.filter((r) => r.type === "episode").map(serialize)
	});
}

export async function deleteMemoryItem(
	env: Env,
	auth: AuthedRequest,
	memoryId: string
): Promise<Response> {
	const { data: deleted, error } = await tryCatch(
		makeMemoryRepo(getDb(env)).deleteOne(auth.userId, memoryId)
	);
	if (error) {
		console.error("[memory] deleteOne failed:", error);
		return serverError();
	}
	if (!deleted) return json({ error: "Not found" }, 404);
	return new Response(null, { status: 204 });
}

export async function deleteAllMemory(
	env: Env,
	auth: AuthedRequest
): Promise<Response> {
	const { data: removed, error } = await tryCatch(
		makeMemoryRepo(getDb(env)).deleteAllForUser(auth.userId)
	);
	if (error) {
		console.error("[memory] deleteAllForUser failed:", error);
		return serverError();
	}
	return json({ ok: true, removed });
}

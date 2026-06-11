import { ANONYMOUS_LIMIT, AUTHENTICATED_LIMIT } from "../quota";
import { redisPipeline } from "../redis";
import type { Env } from "../env";

// Ported from the old Next.js app/api/user-info/route.ts. Reports the
// caller's daily message usage. Identity (ticket / anonId) is resolved at
// the worker edge and passed in; the Redis key matches the one the chat
// quota increments (`message_count:<userId>`).
interface AuthIdentity {
	userId: string;
	isAuthenticated: boolean;
}

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function getUsage(
	env: Env,
	auth: AuthIdentity
): Promise<Response> {
	const messageKey = `message_count:${auth.userId}`;

	try {
		const [getRes, ttlRes] = await redisPipeline(env, [
			["GET", messageKey],
			["TTL", messageKey]
		]);

		const used = Number(getRes?.result ?? 0) || 0;
		const ttl = Number(ttlRes?.result ?? -1);

		let resetsAt = "never";
		if (ttl > 0) {
			const resetDate = new Date();
			resetDate.setSeconds(resetDate.getSeconds() + ttl);
			resetsAt = resetDate.toLocaleDateString();
		}

		const total = auth.isAuthenticated ? AUTHENTICATED_LIMIT : ANONYMOUS_LIMIT;
		const remaining = Math.max(0, total - used);

		// `userId` keeps the old response contract: the bare Clerk id for
		// authed callers, "anonymous" otherwise.
		const userId = auth.isAuthenticated
			? auth.userId.replace(/^user:/, "")
			: "anonymous";

		return json({ userId, used, remaining, total, resetsAt });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching usage data:", error);
		return json({ error: "Failed to fetch data" }, 500);
	}
}

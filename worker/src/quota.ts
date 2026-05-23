// Daily message quota check against Upstash Redis. Mirrors the
// checkMessageLimit logic that used to live in app/api/masters/route.ts.
// Uses the REST API directly so we don't have to pull in @upstash/redis
// (the SDK uses fetch under the hood anyway).
//
// Returns `{ allowed: true }` on success or `{ allowed: false, reason }`
// when the per-day cap has been hit. Counter expires 24h after first set.

interface QuotaEnv {
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
}

interface QuotaResult {
	allowed: boolean;
	reason?: string;
}

const AUTHENTICATED_LIMIT = 20;
const ANONYMOUS_LIMIT = 10;
const ONE_DAY_S = 24 * 60 * 60;

async function redisPipeline(env: QuotaEnv, commands: unknown[][]) {
	const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
		method: "POST",
		headers: {
			authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
			"content-type": "application/json"
		},
		body: JSON.stringify(commands)
	});
	if (!res.ok) {
		throw new Error(`Redis pipeline failed: ${res.status}`);
	}
	return (await res.json()) as Array<{ result?: unknown; error?: string }>;
}

export async function checkAndIncrementQuota(
	env: QuotaEnv,
	trackingId: string,
	isAuthenticated: boolean
): Promise<QuotaResult> {
	const limit = isAuthenticated ? AUTHENTICATED_LIMIT : ANONYMOUS_LIMIT;
	const key = `message_count:${trackingId}`;

	// Atomic-ish: INCR, then EXPIRE NX so the TTL is only set once per window.
	// If the new count exceeds the limit we DECR back and report blocked.
	const [incrRes] = await redisPipeline(env, [
		["INCR", key],
		["EXPIRE", key, String(ONE_DAY_S), "NX"]
	]);

	const newCount = Number(incrRes?.result ?? 0);
	if (newCount > limit) {
		await redisPipeline(env, [["DECR", key]]);
		return {
			allowed: false,
			reason: `Daily message limit of ${limit} reached.`
		};
	}
	return { allowed: true };
}

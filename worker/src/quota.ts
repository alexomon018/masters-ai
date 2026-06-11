interface QuotaEnv {
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
}

interface QuotaResult {
	allowed: boolean;
	reason?: string;
}

export const AUTHENTICATED_LIMIT = 20;
export const ANONYMOUS_LIMIT = 10;
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

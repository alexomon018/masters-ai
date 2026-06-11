// Thin Upstash Redis REST helper shared by the API-route handlers ported
// from the old Next.js app (name-thread rate limit, usage read, account
// deletion quota wipe). Mirrors the inline pipeline helpers already used by
// quota.ts / auth-ticket.ts.
interface RedisEnv {
	UPSTASH_REDIS_REST_URL: string;
	UPSTASH_REDIS_REST_TOKEN: string;
}

export interface RedisReply {
	result?: unknown;
	error?: string;
}

export async function redisPipeline(
	env: RedisEnv,
	commands: unknown[][]
): Promise<RedisReply[]> {
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
	return (await res.json()) as RedisReply[];
}

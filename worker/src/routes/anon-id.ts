import { generateRawAnonId, signAnonId } from "../anonId";
import { redisPipeline } from "../redis";
import type { Env } from "../env";

// Replaces the Next.js middleware that minted the signed anon-id cookie.
// In the SPA there is no middleware, so the browser asks the worker for a
// freshly signed anon id and stores it in localStorage, forwarding it as
// `?anonId=` on the chat WS upgrade and API calls (same wire format as
// before — only the storage medium changed from cookie to localStorage).
const JSON_HEADERS = { "content-type": "application/json" } as const;

// Each minted id resets the anonymous message quota, so cap mints per IP per
// day. Generous enough for shared NATs; small enough that clearing
// localStorage in a loop stops paying off. Fail-open: a Redis hiccup must not
// block first-time visitors from getting an identity.
const MINT_LIMIT_PER_DAY = 20;
const ONE_DAY_S = 24 * 60 * 60;

async function mintAllowed(env: Env, ip: string | null): Promise<boolean> {
	if (!ip) return true;
	try {
		const key = `anon_mint_count:${ip}`;
		const [incrRes] = await redisPipeline(env, [
			["INCR", key],
			["EXPIRE", key, String(ONE_DAY_S), "NX"]
		]);
		return Number(incrRes?.result ?? 0) <= MINT_LIMIT_PER_DAY;
	} catch {
		return true;
	}
}

export async function issueAnonId(
	env: Env,
	request: Request
): Promise<Response> {
	if (!env.ANON_ID_SECRET) {
		// eslint-disable-next-line no-console
		console.error("[anon-id] ANON_ID_SECRET is not set on the worker");
		return new Response(JSON.stringify({ error: "Unavailable" }), {
			status: 503,
			headers: JSON_HEADERS
		});
	}

	const ip = request.headers.get("cf-connecting-ip");
	if (!(await mintAllowed(env, ip))) {
		return new Response(JSON.stringify({ error: "Too many requests" }), {
			status: 429,
			headers: JSON_HEADERS
		});
	}

	const anonId = await signAnonId(generateRawAnonId(), env.ANON_ID_SECRET);
	return new Response(JSON.stringify({ anonId }), {
		status: 200,
		headers: JSON_HEADERS
	});
}

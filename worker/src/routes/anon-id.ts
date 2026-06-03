import { generateRawAnonId, signAnonId } from "../anonId";
import type { Env } from "../env";

// Replaces the Next.js middleware that minted the signed anon-id cookie.
// In the SPA there is no middleware, so the browser asks the worker for a
// freshly signed anon id and stores it in localStorage, forwarding it as
// `?anonId=` on the chat WS upgrade and API calls (same wire format as
// before — only the storage medium changed from cookie to localStorage).
const JSON_HEADERS = { "content-type": "application/json" } as const;

export async function issueAnonId(env: Env): Promise<Response> {
	if (!env.ANON_ID_SECRET) {
		// eslint-disable-next-line no-console
		console.error("[anon-id] ANON_ID_SECRET is not set on the worker");
		return new Response(JSON.stringify({ error: "Unavailable" }), {
			status: 503,
			headers: JSON_HEADERS
		});
	}

	const anonId = await signAnonId(generateRawAnonId(), env.ANON_ID_SECRET);
	return new Response(JSON.stringify({ anonId }), {
		status: 200,
		headers: JSON_HEADERS
	});
}

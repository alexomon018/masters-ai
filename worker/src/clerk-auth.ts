// Clerk JWT verification for the agent's WebSocket upgrade. Browsers can't
// set custom headers on `new WebSocket()`, so the client passes the Clerk
// session token via the `token` query parameter. We pull it off the URL,
// verify it against the Clerk secret, and return the user id.
//
// Anonymous chat is still supported: requests with no token are accepted
// and assigned an `anon:<id>` identity sourced from an `anonId` query param
// (set by the client from the masters_anon_id cookie).

import { verifyAnonId } from "./anonId";
import { redeemTicket } from "./auth-ticket";
import type { Env } from "./env";

export interface AuthIdentity {
	userId: string;
	isAuthenticated: boolean;
}

// Generic "unauthorized" for external responses. Detailed reasons (token
// expired, signature mismatch, etc.) are logged server-side only — leaking
// them in the body helps an attacker probe the auth surface.
const UNAUTHORIZED = "Unauthorized";

// Identity resolution for `/agents/*`, `/threads`, and `/users/me`. Two
// paths:
//   - Authenticated: POST /ws-ticket with the Clerk JWT in Authorization,
//     forward `?ticket=...` on subsequent requests.
//   - Anonymous: forward the HMAC-signed `masters_anon_id` cookie as
//     `?anonId=...`. Unsigned values are rejected.
export async function authenticateAgentConnection(
	request: Request,
	env: Env
): Promise<AuthIdentity | { error: string }> {
	const url = new URL(request.url);
	const ticket = url.searchParams.get("ticket");
	const anonId = url.searchParams.get("anonId");

	if (ticket) {
		const redeemed = await redeemTicket(env, ticket);
		if (!redeemed) return { error: UNAUTHORIZED };
		return { userId: redeemed.userId, isAuthenticated: true };
	}

	if (anonId) {
		if (!env.ANON_ID_SECRET) {
			// eslint-disable-next-line no-console
			console.error(
				"[auth] anonId provided but ANON_ID_SECRET is not set on the worker"
			);
			return { error: UNAUTHORIZED };
		}
		const rawId = await verifyAnonId(anonId, env.ANON_ID_SECRET);
		if (!rawId) {
			// eslint-disable-next-line no-console
			console.warn("[auth] anonId signature verification failed");
			return { error: UNAUTHORIZED };
		}
		return { userId: `anon:${rawId}`, isAuthenticated: false };
	}

	// eslint-disable-next-line no-console
	console.warn(
		`[auth] missing credentials on ${request.method} ${url.pathname}`
	);
	return { error: UNAUTHORIZED };
}

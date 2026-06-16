import { verifyAnonId } from "./anonId";
import { redeemTicket } from "./auth-ticket";
import type { Env } from "./env";

export interface AuthIdentity {
	userId: string;
	isAuthenticated: boolean;
}

const UNAUTHORIZED = "Unauthorized";

export async function authenticateAgentConnection(
	request: Request,
	env: Env
): Promise<AuthIdentity | { error: string }> {
	const url = new URL(request.url);
	const ticket = url.searchParams.get("ticket");
	const anonId = url.searchParams.get("anonId");

	if (ticket) {
		const redeemed = await redeemTicket(env, ticket);
		if (!redeemed) {
			// eslint-disable-next-line no-console
			console.warn("[auth] ticket redemption failed (expired or reused)");
			return { error: UNAUTHORIZED };
		}
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

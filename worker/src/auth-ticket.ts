// Short-lived auth tickets for the WebSocket upgrade.
//
// Clerk session tokens are long-lived bearer JWTs. Putting them on the WS
// URL as `?token=...` parks them in any access log (Cloudflare's, your
// wrangler tail, browser dev-tools). That's a credential disclosure risk.
//
// The ticket flow keeps JWTs in headers only:
//   1. Browser POSTs `/ws-ticket` with `Authorization: Bearer <jwt>`.
//   2. Worker verifies the JWT, mints a random ticket, stores
//      `ws_ticket:<ticket>` → `<userId>` in Upstash Redis with a 30s TTL.
//   3. Browser opens the WS with `?ticket=<ticket>` instead of `?token=`.
//   4. Worker `redeemTicket` does a single-use GETDEL — even if the URL
//      leaks into logs, the credential is already invalidated.

import { verifyToken } from "@clerk/backend";
import type { Env } from "./env";

const TICKET_TTL_S = 30;
const TICKET_PREFIX = "ws_ticket:";

async function redisPipeline(env: Env, commands: unknown[][]) {
	const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
		method: "POST",
		headers: {
			authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
			"content-type": "application/json"
		},
		body: JSON.stringify(commands)
	});
	if (!res.ok) throw new Error(`Redis pipeline failed: ${res.status}`);
	return (await res.json()) as Array<{ result?: unknown; error?: string }>;
}

function newTicket(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	let hex = "";
	for (let i = 0; i < bytes.length; i += 1) {
		hex += bytes[i].toString(16).padStart(2, "0");
	}
	return hex;
}

interface IssueResult {
	ticket: string;
	expiresIn: number;
}

export async function issueTicket(
	env: Env,
	authHeader: string | null
): Promise<IssueResult | null> {
	if (!authHeader?.startsWith("Bearer ")) return null;
	const token = authHeader.slice("Bearer ".length).trim();
	if (!token) return null;
	if (!env.CLERK_SECRET_KEY) {
		// eslint-disable-next-line no-console
		console.error("[ticket] CLERK_SECRET_KEY is not set");
		return null;
	}

	try {
		const payload = await verifyToken(token, {
			secretKey: env.CLERK_SECRET_KEY
		});
		if (!payload.sub) return null;
		const ticket = newTicket();
		const key = `${TICKET_PREFIX}${ticket}`;
		await redisPipeline(env, [
			["SET", key, `user:${payload.sub}`, "EX", String(TICKET_TTL_S)]
		]);
		return { ticket, expiresIn: TICKET_TTL_S };
	} catch (err) {
		const message = err instanceof Error ? err.message : "unknown";
		// eslint-disable-next-line no-console
		console.error(`[ticket] verifyToken failed: ${message}`);
		return null;
	}
}

interface RedeemedTicket {
	userId: string;
}

export async function redeemTicket(
	env: Env,
	ticket: string
): Promise<RedeemedTicket | null> {
	// Accept only the hex shape we mint. Cheap pre-filter against probes.
	if (!/^[0-9a-f]{64}$/.test(ticket)) return null;
	const key = `${TICKET_PREFIX}${ticket}`;
	// GETDEL is atomic in Redis 6.2+; Upstash supports it. Single-use
	// guarantees that even if the ticket appears in a log, replay is dead.
	try {
		const [res] = await redisPipeline(env, [["GETDEL", key]]);
		const value = res?.result;
		if (typeof value !== "string" || !value) return null;
		return { userId: value };
	} catch {
		return null;
	}
}

// Keeps Clerk JWTs out of WebSocket URLs — tickets are single-use, 30s TTL.
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
	if (!/^[0-9a-f]{64}$/.test(ticket)) return null;
	const key = `${TICKET_PREFIX}${ticket}`;
	try {
		const [res] = await redisPipeline(env, [["GETDEL", key]]);
		const value = res?.result;
		if (typeof value !== "string" || !value) return null;
		return { userId: value };
	} catch {
		return null;
	}
}

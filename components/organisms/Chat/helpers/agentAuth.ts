// Resolves the auth payload the worker expects on every request.
//
// Authenticated users: POST the Clerk JWT to /ws-ticket (Authorization
// header) and forward the returned single-use ticket as `?ticket=...`.
// Keeps long-lived bearer tokens out of URLs and access logs.
//
// Anonymous users: forward the HMAC-signed `masters_anon_id` cookie value
// as `?anonId=...`. The cookie is issued and signed by middleware.ts; the
// worker rejects unsigned/tampered values.

export const ANON_COOKIE = "masters_anon_id";

export function readAnonCookie(): string {
	if (typeof document === "undefined") return "";
	const match = document.cookie.match(
		new RegExp(`(?:^|;\\s*)${ANON_COOKIE}=([^;]+)`)
	);
	return match?.[1] ?? "";
}

function workerBase(): string {
	const raw = process.env.NEXT_PUBLIC_WORKER_URL;
	if (!raw) return "";
	return raw.replace(/\/$/, "").replace(/^ws(s)?:\/\//, "http$1://");
}

export async function fetchWorkerTicket(jwt: string): Promise<string | null> {
	const base = workerBase();
	if (!base) return null;
	try {
		const res = await fetch(`${base}/ws-ticket`, {
			method: "POST",
			headers: { authorization: `Bearer ${jwt}` }
		});
		if (!res.ok) return null;
		const body = (await res.json()) as { ticket?: string };
		return body.ticket ?? null;
	} catch {
		return null;
	}
}

export type AgentAuthQuery = Record<string, string>;

// Single canonical resolver. Returns a plain auth-claim object that can
// be spread into URLSearchParams or passed directly to `useAgent({ query })`
// (which accepts an async function returning a Record).
export async function resolveAgentAuth(
	getToken: () => Promise<string | null>
): Promise<AgentAuthQuery> {
	const token = (await getToken()) ?? "";
	const out: AgentAuthQuery = {};
	if (token) {
		const ticket = await fetchWorkerTicket(token);
		if (ticket) out.ticket = ticket;
		return out;
	}
	const anonId = readAnonCookie();
	if (anonId) out.anonId = anonId;
	return out;
}

// Convenience for REST callers that need a URLSearchParams to spread
// into a fetch URL.
export async function buildAuthQueryParams(
	getToken: () => Promise<string | null>
): Promise<URLSearchParams> {
	const auth = await resolveAgentAuth(getToken);
	return new URLSearchParams(auth);
}

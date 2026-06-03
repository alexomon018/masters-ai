// Anon identity storage key. The Next.js middleware used to set this as an
// HMAC-signed cookie on every request; the SPA has no middleware, so the
// worker mints it (GET /anon-id) and we persist it in localStorage. The wire
// format (`<rawId>.<sig>`) is unchanged — only the storage medium differs.
const ANON_STORAGE_KEY = "masters_anon_id";

// HTTP base for worker REST calls: trims a trailing slash and normalises a
// ws(s):// origin to http(s)://. Returns "" when unconfigured.
export function workerHttpBase(): string {
	const raw = import.meta.env.VITE_WORKER_URL;
	if (!raw) return "";
	return raw.replace(/\/$/, "").replace(/^ws(s)?:\/\//, "http$1://");
}

export function readStoredAnonId(): string {
	try {
		return localStorage.getItem(ANON_STORAGE_KEY) ?? "";
	} catch {
		return "";
	}
}

let anonIdInflight: Promise<string> | null = null;

// Get-or-mint the signed anon id. Concurrent callers (e.g. the eager agent
// connect on the home page firing alongside the threads list fetch) share a
// single /anon-id request rather than racing to mint several identities.
export async function getAnonId(): Promise<string> {
	const stored = readStoredAnonId();
	if (stored) return stored;
	if (anonIdInflight) return anonIdInflight;

	const base = workerHttpBase();
	if (!base) return "";

	anonIdInflight = (async () => {
		try {
			const res = await fetch(`${base}/anon-id`);
			if (!res.ok) return "";
			const body = (await res.json()) as { anonId?: string };
			const anonId = body.anonId ?? "";
			if (anonId) {
				try {
					localStorage.setItem(ANON_STORAGE_KEY, anonId);
				} catch {
					// Ignore storage failures (private mode, blocked storage).
				}
			}
			return anonId;
		} catch {
			return "";
		} finally {
			anonIdInflight = null;
		}
	})();

	return anonIdInflight;
}

export async function fetchWorkerTicket(jwt: string): Promise<string | null> {
	const base = workerHttpBase();
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
	const anonId = await getAnonId();
	if (anonId) out.anonId = anonId;
	return out;
}

export async function buildAuthQueryParams(
	getToken: () => Promise<string | null>
): Promise<URLSearchParams> {
	const auth = await resolveAgentAuth(getToken);
	return new URLSearchParams(auth);
}

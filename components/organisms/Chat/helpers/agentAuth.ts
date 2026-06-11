// Signed anon id (`<rawId>.<sig>`), minted by the worker (GET /anon-id) and
// persisted in localStorage.
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

// Get-or-mint the signed anon id. Concurrent callers share one /anon-id
// request via anonIdInflight rather than racing to mint several identities.
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

type ClerkGlobal = {
	loaded?: boolean;
	session?: { getToken?: () => Promise<string | null> };
};

function clerkGlobal(): ClerkGlobal | undefined {
	if (typeof window === "undefined") return undefined;
	return (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
}

// Token reader for code that runs OUTSIDE React (route loaders), where the
// useAuth() hook isn't available. Returns null when Clerk isn't ready or the
// visitor is signed out — callers then fall back to the anon identity.
export async function getClerkToken(): Promise<string | null> {
	const clerk = clerkGlobal();
	const getToken = clerk?.session?.getToken;
	return getToken ? getToken() : null;
}

// Whether a route loader may prefetch authed data yet. On a Clerk-enabled app
// we wait for Clerk to load so a signed-in user is never prefetched as anon on
// a cold page load — the component query runs after Clerk is up and fills the
// cache correctly. With no Clerk key the anon identity is stable, so prefetch
// freely.
export function authReadyForPrefetch(): boolean {
	if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return true;
	return Boolean(clerkGlobal()?.loaded);
}

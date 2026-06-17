import {
	buildAuthQueryParams,
	fetchWorkerTicket,
	getAnonId,
	workerHttpBase
} from "@/components/organisms/Chat/helpers/agentAuth";

export interface ThreadDto {
	id: string;
	title: string;
	pinned: boolean;
	createdAt: number;
	updatedAt: number;
	lastMessageAt: number;
}

interface UpsertInput {
	threadId: string;
	title?: string | null;
	pinned?: boolean;
	lastMessageAt?: number;
}

// `workerHttpBase()` returns "" when VITE_WORKER_URL is unset; the callers
// below short-circuit on the falsy base.
const workerBase = workerHttpBase;

async function authParams(
	getToken: () => Promise<string | null>
): Promise<URLSearchParams> {
	return buildAuthQueryParams(getToken);
}

export async function fetchThreads(
	getToken: () => Promise<string | null>
): Promise<ThreadDto[]> {
	const base = workerBase();
	if (!base) return [];
	const params = await authParams(getToken);
	const res = await fetch(`${base}/threads?${params.toString()}`);
	if (!res.ok) return [];
	return (await res.json()) as ThreadDto[];
}

export async function upsertThreadRemote(
	getToken: () => Promise<string | null>,
	input: UpsertInput
): Promise<void> {
	const base = workerBase();
	if (!base) return;
	const params = await authParams(getToken);
	const res = await fetch(`${base}/threads?${params.toString()}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input)
	});
	if (!res.ok) {
		throw new Error("Failed to upsert thread");
	}
}

export async function deleteThreadRemote(
	getToken: () => Promise<string | null>,
	threadId: string
): Promise<void> {
	const base = workerBase();
	if (!base) return;
	const params = await authParams(getToken);
	const res = await fetch(
		`${base}/threads/${encodeURIComponent(threadId)}?${params.toString()}`,
		{ method: "DELETE" }
	);
	if (!res.ok) {
		throw new Error("Failed to delete thread");
	}
}

export async function claimAnonThreadsRemote(
	getToken: () => Promise<string | null>
): Promise<number> {
	const base = workerBase();
	if (!base) return 0;

	const anonId = await getAnonId();
	if (!anonId) return 0;

	const jwt = await getToken();
	if (!jwt) return 0;

	const ticket = await fetchWorkerTicket(jwt);
	if (!ticket) return 0;

	const params = new URLSearchParams({
		ticket,
		anonId
	});
	const res = await fetch(
		`${base}/threads/claim-anon?${params.toString()}`,
		{ method: "POST" }
	);
	if (!res.ok) return 0;
	const body = (await res.json()) as { reassigned?: number };
	return body.reassigned ?? 0;
}

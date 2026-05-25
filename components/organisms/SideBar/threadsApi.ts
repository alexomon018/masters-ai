// Thin client for the worker's /threads REST surface. The browser uses
// the same auth payload (Clerk token OR anonId cookie) as the WebSocket
// upgrade — see helpers/agentAuth.ts.

import {
	buildAuthQueryParams,
	fetchWorkerTicket,
	readAnonCookie
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

function workerBase(): string | null {
	const base = process.env.NEXT_PUBLIC_WORKER_URL;
	return base ? base.replace(/\/$/, "") : null;
}

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
	await fetch(`${base}/threads?${params.toString()}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input)
	});
}

export async function deleteThreadRemote(
	getToken: () => Promise<string | null>,
	threadId: string
): Promise<void> {
	const base = workerBase();
	if (!base) return;
	const params = await authParams(getToken);
	await fetch(
		`${base}/threads/${encodeURIComponent(threadId)}?${params.toString()}`,
		{ method: "DELETE" }
	);
}

/** Re-key anon D1 rows to the signed-in Clerk user. Idempotent. */
export async function claimAnonThreadsRemote(
	getToken: () => Promise<string | null>
): Promise<number> {
	const base = workerBase();
	if (!base) return 0;

	const anonId = readAnonCookie();
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

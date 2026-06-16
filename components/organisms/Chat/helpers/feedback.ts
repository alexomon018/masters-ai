import { buildAuthQueryParams, workerHttpBase } from "./agentAuth";

export type Sentiment = "up" | "down";

export interface FeedbackEntry {
	sentiment: Sentiment;
	reason: string | null;
	comment: string | null;
}

interface SendFeedbackInput {
	threadId: string;
	messageId: string;
	sentiment: Sentiment;
	reason?: string | null;
	comment?: string | null;
}

interface DeleteFeedbackInput {
	threadId: string;
	messageId: string;
}

interface ThreadFeedbackDto extends FeedbackEntry {
	messageId: string;
}

// `workerHttpBase()` returns "" when VITE_WORKER_URL is unset; every caller
// short-circuits on the falsy base so feedback is a no-op in that environment.
export async function sendFeedbackRemote(
	getToken: () => Promise<string | null>,
	input: SendFeedbackInput
): Promise<boolean> {
	const base = workerHttpBase();
	if (!base) return false;
	try {
		const params = await buildAuthQueryParams(getToken);
		const res = await fetch(`${base}/feedback?${params.toString()}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(input)
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function deleteFeedbackRemote(
	getToken: () => Promise<string | null>,
	input: DeleteFeedbackInput
): Promise<boolean> {
	const base = workerHttpBase();
	if (!base) return false;
	try {
		const params = await buildAuthQueryParams(getToken);
		const res = await fetch(`${base}/feedback?${params.toString()}`, {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(input)
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function fetchThreadFeedback(
	getToken: () => Promise<string | null>,
	threadId: string
): Promise<Record<string, FeedbackEntry>> {
	const base = workerHttpBase();
	if (!base) return {};
	try {
		const params = await buildAuthQueryParams(getToken);
		params.set("threadId", threadId);
		const res = await fetch(`${base}/feedback?${params.toString()}`);
		if (!res.ok) return {};
		const rows = (await res.json()) as ThreadFeedbackDto[];
		return rows.reduce<Record<string, FeedbackEntry>>((acc, row) => {
			acc[row.messageId] = {
				sentiment: row.sentiment,
				reason: row.reason,
				comment: row.comment
			};
			return acc;
		}, {});
	} catch {
		return {};
	}
}

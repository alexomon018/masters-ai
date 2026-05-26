// Builds the URL for the worker's initial-messages REST endpoint. Same path
// shape PartySocket uses (`agents/<party>/<room>/get-messages`).
//
// Extracted from useChat.ts so the host/scheme/trailing-slash logic can be
// unit-tested without rendering the hook. Returns null when the worker URL is
// unset or the threadId is empty.
export function getThreadGetMessagesUrl(threadId: string): URL | null {
	const raw = process.env.NEXT_PUBLIC_WORKER_URL;
	if (!raw || !threadId) return null;
	let host = raw.replace(/^(http|https|ws|wss):\/\//, "");
	if (host.endsWith("/")) host = host.slice(0, -1);
	const protocol =
		host.startsWith("localhost:") || host.startsWith("127.0.0.1:")
			? "http"
			: "https";
	return new URL(
		`${protocol}://${host}/agents/masters-chat-agent/${threadId}/get-messages`
	);
}

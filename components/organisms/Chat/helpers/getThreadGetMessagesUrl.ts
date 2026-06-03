export function getThreadGetMessagesUrl(threadId: string): URL | null {
	const raw = import.meta.env.VITE_WORKER_URL;
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

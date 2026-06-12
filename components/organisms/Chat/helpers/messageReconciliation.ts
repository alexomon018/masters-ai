import type { UIMessage } from "ai";

// A normal turn ends user → assistant. Two assistant messages at the tail
// means a disrupted stream resumed under a fresh message id (the DO persisted
// the turn as a single message — see useThreadMessagesSync).
export function endsWithSplitAssistant(messages: UIMessage[]): boolean {
	const len = messages.length;
	return (
		len >= 2 &&
		messages[len - 1].role === "assistant" &&
		messages[len - 2].role === "assistant"
	);
}

export function totalTextLength(messages: UIMessage[]): number {
	return messages
		.flatMap((m) => m.parts ?? [])
		.reduce(
			(n, p) =>
				n +
				(p.type === "text" && typeof p.text === "string" ? p.text.length : 0),
			0
		);
}

// Server truth replaces the client view only when the client is missing
// content, and never when doing so could lose text the user already sees
// (a lagging persist could return less). Two repair cases:
// - truncated turn: the socket dropped mid-stream, the DO finished and
//   persisted more text than the client ever received (server > client);
// - split turn: a disrupted stream resumed under a fresh message id, the DO
//   persisted it as ONE message with the same total text (server >= client).
export function shouldApplyServerMessages(
	serverMessages: UIMessage[],
	clientMessages: UIMessage[]
): boolean {
	if (serverMessages.length === 0) return false;
	const serverTextLength = totalTextLength(serverMessages);
	const clientTextLength = totalTextLength(clientMessages);
	if (serverTextLength > clientTextLength) return true;
	return (
		endsWithSplitAssistant(clientMessages) &&
		serverTextLength >= clientTextLength
	);
}

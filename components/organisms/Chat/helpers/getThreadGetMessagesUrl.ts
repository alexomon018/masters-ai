import { workerHttpBase } from "./agentAuth";

// Builds the agent's get-messages REST URL off the shared worker base
// (trailing slash trimmed, ws(s):// normalised to http(s)://).
export function getThreadGetMessagesUrl(threadId: string): URL | null {
	const base = workerHttpBase();
	if (!base || !threadId) return null;
	return new URL(`${base}/agents/masters-chat-agent/${threadId}/get-messages`);
}

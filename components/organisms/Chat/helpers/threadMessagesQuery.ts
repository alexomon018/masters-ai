import { queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { queryKeys } from "@constants";
import { resolveAgentAuth } from "./agentAuth";
import { getThreadGetMessagesUrl } from "./getThreadGetMessagesUrl";

type TokenFn = () => Promise<string | null>;

export async function fetchThreadMessages(
	tokenFn: TokenFn,
	threadId: string
): Promise<UIMessage[]> {
	const getMessagesUrl = getThreadGetMessagesUrl(threadId);
	if (!getMessagesUrl) return [];

	try {
		const auth = await resolveAgentAuth(tokenFn);
		Object.entries(auth).forEach(([key, value]) => {
			if (value) getMessagesUrl.searchParams.set(key, String(value));
		});
		const response = await fetch(getMessagesUrl.toString());
		if (!response.ok) return [];
		const text = await response.text();
		if (!text.trim()) return [];
		try {
			return JSON.parse(text) as UIMessage[];
		} catch {
			return [];
		}
	} catch {
		return [];
	}
}

// Shared by the chat's initial-messages load and the sidebar hover prefetch so
// the key and freshness window can't drift apart. useChat writes the live
// message list back into this cache after each turn, so a thread revisited
// within staleTime renders instantly instead of suspending on a refetch.
export const threadMessagesQueryOptions = (
	tokenFn: TokenFn,
	threadId: string
) =>
	queryOptions({
		queryKey: queryKeys.threadMessages(threadId),
		queryFn: () => fetchThreadMessages(tokenFn, threadId),
		staleTime: 300_000
	});

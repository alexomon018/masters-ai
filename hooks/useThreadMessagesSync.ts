import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import {
	fetchThreadMessages,
	shouldApplyServerMessages
} from "@/components/organisms/Chat/helpers";
import { useTokenFn } from "./useTokenFn";

interface Args {
	threadId: string;
	agentMessages: UIMessage[];
	isStreaming: boolean;
	setMessages: (messages: UIMessage[]) => void;
}

// Keeps the per-thread message cache and the live agent view consistent:
//
// 1. Write-through — after each turn the live message list is written into
//    the thread's query cache, so switching back to the thread renders from
//    cache instead of suspending on a refetch.
// 2. Mid-stream leave — unmounting while streaming drops the cache: it holds
//    a pre-turn snapshot, and serving it on revisit would prevent resumed
//    stream chunks from merging into the partially-persisted assistant
//    message (they'd render as a separate bubble).
// 3. End-of-turn reconcile — a socket close mid-stream silently ends the
//    client's chunk stream while the DO finishes the turn and persists the
//    full reply. The client is then either truncated (stream cut, never
//    resumed) or split into two assistant bubbles (stream resumed under a
//    fresh message id). After every turn the server history is fetched and,
//    when it holds more text than the client view (or merges a split tail),
//    replaces it. Guards: skip if the user already sent another message, and
//    never apply a server list with less text than what is on screen
//    (lagging persist).
const useThreadMessagesSync = ({
	threadId,
	agentMessages,
	isStreaming,
	setMessages
}: Args) => {
	const queryClient = useQueryClient();
	const tokenFn = useTokenFn();

	useEffect(() => {
		if (isStreaming || agentMessages.length === 0) return;
		queryClient.setQueryData(
			queryKeys.threadMessages(threadId),
			agentMessages
		);
	}, [isStreaming, agentMessages, queryClient, threadId]);

	const isStreamingRef = useRef(isStreaming);
	isStreamingRef.current = isStreaming;
	useEffect(
		() => () => {
			if (isStreamingRef.current) {
				queryClient.removeQueries({
					queryKey: queryKeys.threadMessages(threadId)
				});
			}
		},
		[queryClient, threadId]
	);

	const latestMessagesRef = useRef(agentMessages);
	latestMessagesRef.current = agentMessages;
	const wasStreamingRef = useRef(false);
	useEffect(() => {
		const wasStreaming = wasStreamingRef.current;
		wasStreamingRef.current = isStreaming;
		if (!wasStreaming || isStreaming) return undefined;
		if (agentMessages.length === 0) return undefined;

		const snapshot = agentMessages;
		let cancelled = false;
		fetchThreadMessages(tokenFn, threadId).then((serverMessages) => {
			if (cancelled) return;
			if (latestMessagesRef.current !== snapshot) return;
			if (!shouldApplyServerMessages(serverMessages, snapshot)) return;
			setMessages(serverMessages);
		});
		return () => {
			cancelled = true;
		};
	}, [isStreaming, agentMessages, tokenFn, threadId, setMessages]);
};

export default useThreadMessagesSync;

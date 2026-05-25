"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { UIMessage } from "ai";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchThreads } from "@/components/organisms/SideBar/threadsApi";
import { autoNameThread } from "../helpers";

const THREADS_QUERY_KEY = ["threads"] as const;
const UNTITLED_THREAD_TITLE = "New Chat";

// Tracks which assistant message id we've already named-against, per
// thread. Prevents re-firing `/api/name-thread` on every tab switch (Chat
// remount loses local refs). The server-side title check on the threads
// list is the real backstop — this is just to avoid redundant work.
const autoNamedAssistantByThread = new Map<string, string>();

function firstTextPart(message: UIMessage): string {
	const part = (message.parts ?? []).find(
		(p) => p.type === "text" && typeof p.text === "string"
	);
	return part?.type === "text" ? part.text : "";
}

interface Args {
	activeThreadId: string | null;
	agentMessages: UIMessage[];
	isStreaming: boolean;
	modelId: string;
}

/**
 * Posts the first user→assistant exchange to `/api/name-thread` once the
 * turn finishes streaming, then invalidates the threads list so the sidebar
 * reflects the new title.
 */
const useAutoNameThread = ({
	activeThreadId,
	agentMessages,
	isStreaming,
	modelId
}: Args) => {
	const queryClient = useQueryClient();
	const { getToken } = useAuth();

	const tokenFn = useCallback(
		async () => (typeof getToken === "function" ? getToken() : null),
		[getToken]
	);

	const { data: threads = [], isFetched: threadsFetched } = useQuery({
		queryKey: THREADS_QUERY_KEY,
		queryFn: () => fetchThreads(tokenFn),
		staleTime: 30_000
	});

	// Recompute the user/assistant pair only when the message count
	// changes — streamed chunks mutate the *last* message in place but
	// keep the array length stable, so this skips the per-chunk reverse-
	// and-find work the previous version did.
	const namingPair = useMemo(() => {
		const firstUser = agentMessages.find((m) => m.role === "user");
		let lastAssistant: UIMessage | undefined;
		for (let i = agentMessages.length - 1; i >= 0; i -= 1) {
			if (agentMessages[i].role === "assistant") {
				lastAssistant = agentMessages[i];
				break;
			}
		}
		return { firstUser, lastAssistant };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [agentMessages.length]);

	useEffect(() => {
		if (!activeThreadId) return;
		if (isStreaming) return;
		if (!threadsFetched) return;

		const meta = threads.find((t) => t.id === activeThreadId);
		if (meta?.title && meta.title !== UNTITLED_THREAD_TITLE) return;

		const { firstUser, lastAssistant } = namingPair;
		if (!firstUser || !lastAssistant) return;

		const userText = firstTextPart(firstUser);
		const assistantText = firstTextPart(lastAssistant);
		if (!userText || !assistantText) return;

		if (autoNamedAssistantByThread.get(activeThreadId) === lastAssistant.id) {
			return;
		}
		autoNamedAssistantByThread.set(activeThreadId, lastAssistant.id);

		autoNameThread({
			threadId: activeThreadId,
			userMessage: userText,
			assistantMessage: assistantText,
			modelId
		})
			.then(() => {
				queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
			})
			.catch(() => {
				if (
					autoNamedAssistantByThread.get(activeThreadId) === lastAssistant.id
				) {
					autoNamedAssistantByThread.delete(activeThreadId);
				}
			});
	}, [
		namingPair,
		isStreaming,
		activeThreadId,
		modelId,
		queryClient,
		threads,
		threadsFetched
	]);
};

export default useAutoNameThread;

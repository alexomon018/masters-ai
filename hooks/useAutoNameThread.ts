import { useEffect, useMemo } from "react";
import type { UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import { autoNameThread } from "@/components/organisms/Chat/helpers";
import { useThreadsQuery } from "./useThreadsQuery";

const THREADS_QUERY_KEY = queryKeys.threads();
const UNTITLED_THREAD_TITLE = "New Chat";

// Avoids redundant /api/name-thread calls when Chat remounts on tab switch.
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

const useAutoNameThread = ({
	activeThreadId,
	agentMessages,
	isStreaming,
	modelId
}: Args) => {
	const queryClient = useQueryClient();

	const { data: threads = [], isFetched: threadsFetched } = useThreadsQuery();

	// Streamed chunks mutate the last message in place; length is stable.
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

		// A thread absent from the fetched list either isn't registered yet
		// (first-send upsert still in flight; the effect re-runs once the
		// refetched list includes it) or was just deleted — naming it would
		// resurrect the deleted row, so never proceed without a match.
		const meta = threads.find((t) => t.id === activeThreadId);
		if (!meta) return;
		if (meta.title && meta.title !== UNTITLED_THREAD_TITLE) return;

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

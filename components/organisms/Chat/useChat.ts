import { useCallback, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { queryKeys } from "@constants";
import {
	useAutoNameThread,
	useQuotaInvalidation,
	useTokenFn
} from "@hooks";
import { useModelStore } from "@/providers";
import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";
import { getThreadGetMessagesUrl, resolveAgentAuth } from "./helpers";

const THREADS_QUERY_KEY = queryKeys.threads();
const UNTITLED_THREAD_TITLE = "New Chat";

interface Args {
	threadId: string;
	isNewThread: boolean;
}

const useChat = ({ threadId, isNewThread }: Args) => {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [input, setInput] = useState("");

	const { user } = useUser();
	const { selectedModel } = useModelStore((state) => state);

	// Once false, stays false — no repeat replaceState or thread upsert.
	const isFirstSendRef = useRef(isNewThread);

	const tokenFn = useTokenFn();

	const userData = useMemo(() => {
		if (!user) return undefined;
		return {
			name: (user.unsafeMetadata.name as string) || "",
			occupation: (user.unsafeMetadata.occupation as string) || "",
			traits: (user.unsafeMetadata.traits as string) || "",
			preferences: (user.unsafeMetadata.preferences as string) || ""
		};
	}, [user]);

	const buildAuthQuery = useCallback(() => resolveAgentAuth(tokenFn), [tokenFn]);

	const fetchInitialMessagesWithAuth = useCallback(async () => {
		const getMessagesUrl = getThreadGetMessagesUrl(threadId);
		if (!getMessagesUrl) return [];

		try {
			const auth = await buildAuthQuery();
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
	}, [threadId, buildAuthQuery]);

	const getInitialMessages = useMemo(
		() => (isNewThread ? null : fetchInitialMessagesWithAuth),
		[isNewThread, fetchInitialMessagesWithAuth]
	);

	const agent = useAgent({
		agent: "masters-chat-agent",
		name: threadId,
		host: import.meta.env.VITE_WORKER_URL,
		query: buildAuthQuery
	});

	const {
		messages: agentMessages,
		sendMessage,
		status,
		stop
	} = useAgentChat({
		agent,
		getInitialMessages,
		body: () => ({
			model: selectedModel.id,
			userData
		})
	});

	const isStreaming = status === "submitted" || status === "streaming";

	useQuotaInvalidation(isStreaming);
	useAutoNameThread({
		activeThreadId: threadId,
		agentMessages,
		isStreaming,
		modelId: selectedModel.id
	});

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value),
		[]
	);

	const runSubmit = useCallback(
		(rawText: string) => {
			const text = rawText.trim();
			if (!text) return;
			setInput("");

			// First send: register the thread and swap the URL to /chat/<id>. The
			// nav lands on the SAME id the layout keys <Chat> by, so the live agent
			// connection survives the URL change. Using navigate (not a raw
			// history.replaceState) keeps a later "New Chat" a real transition.
			if (isFirstSendRef.current) {
				isFirstSendRef.current = false;
				upsertThreadRemote(tokenFn, {
					threadId,
					title: UNTITLED_THREAD_TITLE,
					pinned: false,
					lastMessageAt: Date.now()
				})
					.then(() => {
						queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
					})
					.catch(() => {});
				navigate({
					to: "/chat/$id",
					params: { id: threadId },
					replace: true
				});
			}

			sendMessage({
				role: "user",
				parts: [{ type: "text", text }]
			});
		},
		[threadId, sendMessage, tokenFn, queryClient, navigate]
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			runSubmit(input);
		},
		[input, runSubmit]
	);

	const submitMessage = useCallback(
		(text: string) => {
			runSubmit(text);
		},
		[runSubmit]
	);

	const loading =
		isStreaming &&
		!agentMessages.some(
			(m: UIMessage) => m.role === "assistant" && (m.parts ?? []).length > 0
		);

	const isEmpty = agentMessages.length === 0;

	return {
		messages: agentMessages,
		isEmpty,
		input,
		handleInputChange,
		handleSubmit,
		submitMessage,
		setInput,
		streaming: isStreaming,
		loading,
		threadId,
		stop
	};
};

export default useChat;

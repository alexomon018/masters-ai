"use client";

import {
	useState,
	useCallback,
	useRef,
	useOptimistic,
	startTransition,
	useEffect
} from "react";
import { dxdb } from "@/localdb/dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { getQueryClient } from "@/providers/getQueryClient";
import useSync from "@/components/molecules/CloudSyncSection/useSync";
import { queryKeys } from "@/constants";
import { useModelStore } from "@/providers";
import {
	readStream,
	ensureThread,
	handleErrorResponse,
	autoNameThread
} from "./helpers";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
}

const WELCOME_MESSAGE: ChatMessage = {
	id: "0",
	role: "system",
	content:
		"**Welcome to Masters Chat** Your ultimate companion in navigating Frontend Masters courses."
};

const useAskChat = (threadId: string) => {
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const streamingRef = useRef(false);
	const [streamingContent, setStreamingContent] = useState("");
	const pendingFlushRef = useRef(false);
	const [activeThreadId, setActiveThreadId] = useState(threadId);
	const abortControllerRef = useRef<AbortController | null>(null);
	const queryClient = getQueryClient();
	const { importDBFromServer } = useSync();
	const { selectedModel } = useModelStore((state) => state);

	const activeThread = useLiveQuery(
		() => dxdb.threads.get(activeThreadId || ""),
		[activeThreadId]
	);

	const dexieMessages = useLiveQuery(
		() => dxdb.getThreadMessages(activeThreadId),
		[activeThreadId]
	);

	const baseChatMessages: ChatMessage[] = (dexieMessages ?? []).map((msg) => ({
		id: msg.id,
		role: msg.role as "user" | "assistant",
		content: msg.content
	}));

	const [optimisticMessages, addOptimisticMessage] = useOptimistic(
		baseChatMessages,
		(state, newMessage: ChatMessage) => [...state, newMessage]
	);

	useEffect(() => {
		if (pendingFlushRef.current && dexieMessages?.length) {
			const lastMsg = dexieMessages[dexieMessages.length - 1];
			if (lastMsg.role === "assistant") {
				pendingFlushRef.current = false;
				setStreaming(false);
				setStreamingContent("");
			}
		}
	}, [dexieMessages]);

	const messages: ChatMessage[] = [
		WELCOME_MESSAGE,
		...optimisticMessages,
		...(streamingContent
			? [
					{
						id: "streaming",
						role: "assistant" as const,
						content: streamingContent
					}
				]
			: [])
	];

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value),
		[]
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!input.trim()) return;

		const userMessage = input;
		const needsNavigation = !activeThreadId;

		startTransition(() => {
			addOptimisticMessage({
				id: `optimistic-${Date.now()}`,
				role: "user",
				content: userMessage
			});
		});

		setInput("");
		streamingRef.current = true;
		setStreaming(true);
		setStreamingContent("");

		const resolvedThreadId = await ensureThread(activeThreadId);

		if (needsNavigation) {
			setActiveThreadId(resolvedThreadId);
			window.history.replaceState(null, "", `/chat/${resolvedThreadId}`);
		}

		await dxdb.addMessage({
			content: userMessage,
			role: "user",
			threadId: resolvedThreadId
		});

		const history = await dxdb.getThreadMessages(resolvedThreadId);
		const apiMessages = history.map((m) => ({
			content: m.content,
			role: m.role
		}));

		const controller = new AbortController();
		abortControllerRef.current = controller;

		try {
			const response = await fetch("/api/masters", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: apiMessages,
					model: selectedModel.id,
					id: resolvedThreadId
				}),
				signal: controller.signal
			});

			const wasError = await handleErrorResponse(
				response.status,
				resolvedThreadId
			);
			if (wasError) return;

			if (!response.ok || !response.body) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const fullContent = await readStream(response.body, setStreamingContent);

			pendingFlushRef.current = true;
			streamingRef.current = false;

			await dxdb.addMessage({
				content: fullContent,
				role: "assistant",
				threadId: resolvedThreadId
			});

			await autoNameThread(resolvedThreadId, fullContent, selectedModel.id);
			await importDBFromServer();
			queryClient.invalidateQueries({
				queryKey: queryKeys.messageLimit()
			});
		} catch (error) {
			if ((error as Error).name !== "AbortError") {
				// eslint-disable-next-line no-console
				console.error("Stream error:", error);
			}
		} finally {
			streamingRef.current = false;
			abortControllerRef.current = null;
			if (!pendingFlushRef.current) {
				setStreaming(false);
				setStreamingContent("");
			}
		}
	};

	const stop = useCallback(() => {
		abortControllerRef.current?.abort();
	}, []);

	const loading = streaming && !streamingContent;

	return {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		setInput,
		streaming,
		setStreaming,
		loading,
		threadId: activeThreadId,
		activeThread,
		stop
	};
};

export default useAskChat;

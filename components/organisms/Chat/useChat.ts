"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useModelStore } from "@/providers";
import { upsertThreadRemote } from "@/components/organisms/SideBar/threadsApi";
import { resolveAgentAuth } from "./helpers";
import { useAutoNameThread, useQuotaInvalidation } from "./hooks";

const THREADS_QUERY_KEY = ["threads"] as const;
const UNTITLED_THREAD_TITLE = "New Chat";

// Same path shape PartySocket uses (`agents/<party>/<room>/get-messages`).
function getThreadGetMessagesUrl(threadId: string): URL | null {
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

interface Args {
	threadId: string;
	// True when the id was minted client-side on the home page and the
	// worker has no history for it yet. Skips the initial-messages fetch
	// and triggers `history.replaceState('/chat/<id>')` on first send so
	// refresh works. Same React tree throughout — no remount.
	isNewThread: boolean;
}

const useChat = ({ threadId, isNewThread }: Args) => {
	const queryClient = useQueryClient();
	const [input, setInput] = useState("");

	const { getToken } = useAuth();
	const { user } = useUser();
	const { selectedModel } = useModelStore((state) => state);

	// True only on the home page and only until the first message is sent.
	// Once set, we never flip back: subsequent sends on the same instance
	// don't repeat the replaceState or thread upsert.
	const isFirstSendRef = useRef(isNewThread);

	const tokenFn = useCallback(
		async () => (typeof getToken === "function" ? getToken() : null),
		[getToken]
	);

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
		// `useAgentChat` resolves initial messages during render (`use()`).
		// That can run on the Next server, where fetching localhost:8787 will
		// hang or throw — never let an error escape into `use()`. The
		// component tree is `'use client'` and the chat page disables SSR via
		// `dynamic(..., { ssr: false })`, so this guard is belt-and-braces.
		if (typeof window === "undefined") return [];

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

	// Home (new thread) skips the fetch — the worker has nothing to return
	// and a 404 round-trip per home load is wasteful.
	const getInitialMessages = useMemo(
		() => (isNewThread ? null : fetchInitialMessagesWithAuth),
		[isNewThread, fetchInitialMessagesWithAuth]
	);

	const agent = useAgent({
		agent: "masters-chat-agent",
		name: threadId,
		host: process.env.NEXT_PUBLIC_WORKER_URL,
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

			// First send from the home page: register the thread with the
			// worker and swap the URL to /chat/<id> *without* remounting.
			// Next.js plays nice with native history APIs in App Router (see
			// docs: usePathname syncs with replaceState).
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
				window.history.replaceState(null, "", `/chat/${threadId}`);
			}

			sendMessage({
				role: "user",
				parts: [{ type: "text", text }]
			});
		},
		[threadId, sendMessage, tokenFn, queryClient]
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

	// True when there are no real messages yet — used by the UI to render
	// the welcome banner + suggested questions. Welcome is a UI affordance,
	// NOT a synthesized system message in the transcript.
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
